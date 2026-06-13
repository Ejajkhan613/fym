const crypto = require("crypto");
const { pool: defaultPool } = require("../../db/pool");

const ASSIGNMENT_COLUMNS = `
  id,
  order_id,
  rider_user_id,
  pharmacy_id,
  status,
  pickup_otp,
  delivery_otp,
  assigned_at,
  picked_up_at,
  delivered_at,
  failed_at,
  failure_reason,
  created_at,
  updated_at
`;

function mapAssignmentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    riderUserId: row.rider_user_id,
    pharmacyId: row.pharmacy_id,
    status: row.status,
    pickupOtp: row.pickup_otp,
    deliveryOtp: row.delivery_otp,
    assignedAt: row.assigned_at,
    pickedUpAt: row.picked_up_at,
    deliveredAt: row.delivered_at,
    failedAt: row.failed_at,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTrackingRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
  };
}

function mapProofRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    recipientName: row.recipient_name,
    otpVerified: row.otp_verified,
    signatureUrl: row.signature_url,
    photoUrl: row.photo_url,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

class DeliveryModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async assign(input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `
          SELECT id, customer_id, pharmacy_id, status
          FROM orders
          WHERE id = $1
          FOR UPDATE
        `,
        [input.orderId],
      );

      const order = orderResult.rows[0];

      if (!order) {
        await client.query("ROLLBACK");
        return null;
      }

      const result = await client.query(
        `
          INSERT INTO delivery_assignments (
            order_id,
            rider_user_id,
            pharmacy_id,
            pickup_otp,
            delivery_otp
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING ${ASSIGNMENT_COLUMNS}
        `,
        [
          input.orderId,
          input.riderUserId || null,
          input.pharmacyId || order.pharmacy_id || null,
          input.pickupOtp || generateOtp(),
          input.deliveryOtp || generateOtp(),
        ],
      );

      const assignment = mapAssignmentRow(result.rows[0]);

      await client.query(
        `
          UPDATE orders
          SET pharmacy_id = COALESCE($2, pharmacy_id),
              status = 'RIDER_ASSIGNED',
              updated_at = now()
          WHERE id = $1
        `,
        [assignment.orderId, assignment.pharmacyId],
      );

      await this.insertOrderStatusHistory(client, {
        orderId: assignment.orderId,
        fromStatus: order.status,
        toStatus: "RIDER_ASSIGNED",
        actorType: input.riderUserId ? "rider" : "system",
        actorId: input.riderUserId || null,
        reason: "Delivery assigned",
        metadata: {
          assignmentId: assignment.id,
          pharmacyId: assignment.pharmacyId,
          riderUserId: assignment.riderUserId,
        },
      });

      await this.insertRealtimeEvent(client, {
        aggregateType: "order",
        aggregateId: assignment.orderId,
        eventName: "RiderAssigned",
        channel: `customer:${order.customer_id}`,
        payload: { assignment },
      });

      if (assignment.pharmacyId) {
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: assignment.orderId,
          eventName: "RiderAssigned",
          channel: `pharmacy:${assignment.pharmacyId}`,
          payload: { assignment },
        });
      }

      if (assignment.riderUserId) {
        await this.insertRealtimeEvent(client, {
          aggregateType: "delivery",
          aggregateId: assignment.id,
          eventName: "DeliveryAssigned",
          channel: `rider:${assignment.riderUserId}`,
          payload: { assignment },
        });
      }

      await client.query("COMMIT");
      return assignment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const result = await this.pool.query(
      `
        SELECT ${ASSIGNMENT_COLUMNS}
        FROM delivery_assignments
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapAssignmentRow(result.rows[0]);
  }

  async list(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.riderUserId) {
      values.push(filters.riderUserId);
      clauses.push(`rider_user_id = $${values.length}`);
    }

    if (filters.orderId) {
      values.push(filters.orderId);
      clauses.push(`order_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${ASSIGNMENT_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM delivery_assignments
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      assignments: result.rows.map(mapAssignmentRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateStatus(id, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const assignmentResult = await client.query(
        `
          UPDATE delivery_assignments
          SET status = $2,
              picked_up_at = CASE WHEN $2 = 'PICKED_UP' THEN now() ELSE picked_up_at END,
              delivered_at = CASE WHEN $2 = 'DELIVERED' THEN now() ELSE delivered_at END,
              failed_at = CASE WHEN $2 = 'FAILED' THEN now() ELSE failed_at END,
              failure_reason = COALESCE($3, failure_reason),
              updated_at = now()
          WHERE id = $1
          RETURNING ${ASSIGNMENT_COLUMNS}
        `,
        [id, input.status, input.reason || null],
      );

      const assignment = mapAssignmentRow(assignmentResult.rows[0]);

      if (!assignment) {
        await client.query("ROLLBACK");
        return null;
      }

      const orderStatus = {
        PICKED_UP: "PICKED_UP",
        OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
        DELIVERED: "DELIVERED",
        FAILED: "FAILED_DELIVERY",
      }[input.status];

      if (orderStatus) {
        const currentOrderResult = await client.query(
          `
            SELECT id, customer_id, pharmacy_id, status
            FROM orders
            WHERE id = $1
            FOR UPDATE
          `,
          [assignment.orderId],
        );
        const currentOrder = currentOrderResult.rows[0];

        await client.query(
          `
            UPDATE orders
            SET status = $2,
                delivered_at = CASE WHEN $2 = 'DELIVERED' THEN now() ELSE delivered_at END,
                updated_at = now()
            WHERE id = $1
          `,
          [assignment.orderId, orderStatus],
        );

        await this.insertOrderStatusHistory(client, {
          orderId: assignment.orderId,
          fromStatus: currentOrder?.status,
          toStatus: orderStatus,
          actorType: input.riderUserId ? "rider" : "system",
          actorId: input.riderUserId || null,
          reason: input.reason || `Delivery status changed to ${input.status}`,
          metadata: {
            assignmentId: assignment.id,
          },
        });

        if (currentOrder?.customer_id) {
          await this.insertRealtimeEvent(client, {
            aggregateType: "order",
            aggregateId: assignment.orderId,
            eventName: this.toOrderEventName(orderStatus),
            channel: `customer:${currentOrder.customer_id}`,
            payload: { assignment, orderStatus },
          });
        }

        if (assignment.pharmacyId || currentOrder?.pharmacy_id) {
          await this.insertRealtimeEvent(client, {
            aggregateType: "order",
            aggregateId: assignment.orderId,
            eventName: this.toOrderEventName(orderStatus),
            channel: `pharmacy:${assignment.pharmacyId || currentOrder.pharmacy_id}`,
            payload: { assignment, orderStatus },
          });
        }

        if (assignment.riderUserId) {
          await this.insertRealtimeEvent(client, {
            aggregateType: "delivery",
            aggregateId: assignment.id,
            eventName: this.toDeliveryEventName(input.status),
            channel: `rider:${assignment.riderUserId}`,
            payload: { assignment, orderStatus },
          });
        }
      }

      await client.query("COMMIT");
      return assignment;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async addTrackingEvent(assignmentId, input) {
    const result = await this.pool.query(
      `
        INSERT INTO delivery_tracking_events (
          assignment_id,
          latitude,
          longitude,
          status,
          note
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, assignment_id, latitude, longitude, status, note, created_at
      `,
      [
        assignmentId,
        input.latitude ?? null,
        input.longitude ?? null,
        input.status || null,
        input.note || null,
      ],
    );

    return mapTrackingRow(result.rows[0]);
  }

  async listTrackingEvents(assignmentId) {
    const result = await this.pool.query(
      `
        SELECT id, assignment_id, latitude, longitude, status, note, created_at
        FROM delivery_tracking_events
        WHERE assignment_id = $1
        ORDER BY created_at ASC
      `,
      [assignmentId],
    );

    return result.rows.map(mapTrackingRow);
  }

  async createProofOfDelivery(assignmentId, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const proofResult = await client.query(
        `
          INSERT INTO proof_of_delivery (
            assignment_id,
            recipient_name,
            otp_verified,
            signature_url,
            photo_url,
            latitude,
            longitude,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING
            id,
            assignment_id,
            recipient_name,
            otp_verified,
            signature_url,
            photo_url,
            latitude,
            longitude,
            metadata,
            created_at
        `,
        [
          assignmentId,
          input.recipientName,
          input.otpVerified,
          input.signatureUrl || null,
          input.photoUrl || null,
          input.latitude ?? null,
          input.longitude ?? null,
          input.metadata || {},
        ],
      );

      const assignment = await this.updateStatusWithClient(
        client,
        assignmentId,
        {
          status: "DELIVERED",
          riderUserId: input.riderUserId,
        },
      );

      await client.query("COMMIT");
      return {
        proof: mapProofRow(proofResult.rows[0]),
        assignment,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatusWithClient(client, id, input) {
    const assignmentResult = await client.query(
      `
        SELECT ${ASSIGNMENT_COLUMNS}
        FROM delivery_assignments
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    );
    const existingAssignment = mapAssignmentRow(assignmentResult.rows[0]);

    if (!existingAssignment) {
      return null;
    }

    const currentOrderResult = await client.query(
      `
        SELECT id, customer_id, pharmacy_id, status
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
      [existingAssignment.orderId],
    );
    const currentOrder = currentOrderResult.rows[0];

    const result = await client.query(
      `
        UPDATE delivery_assignments
        SET status = $2,
            delivered_at = CASE WHEN $2 = 'DELIVERED' THEN now() ELSE delivered_at END,
            updated_at = now()
        WHERE id = $1
        RETURNING ${ASSIGNMENT_COLUMNS}
      `,
      [id, input.status],
    );

    const assignment = mapAssignmentRow(result.rows[0]);

    if (assignment) {
      await client.query(
        `
          UPDATE orders
          SET status = 'DELIVERED',
              delivered_at = now(),
              updated_at = now()
          WHERE id = $1
        `,
        [assignment.orderId],
      );

      await this.insertOrderStatusHistory(client, {
        orderId: assignment.orderId,
        fromStatus: currentOrder?.status,
        toStatus: "DELIVERED",
        actorType: input.riderUserId ? "rider" : "system",
        actorId: input.riderUserId || null,
        reason: "Proof of delivery submitted",
        metadata: { assignmentId: assignment.id },
      });

      if (currentOrder?.customer_id) {
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: assignment.orderId,
          eventName: "OrderDelivered",
          channel: `customer:${currentOrder.customer_id}`,
          payload: { assignment },
        });
      }

      if (assignment.pharmacyId || currentOrder?.pharmacy_id) {
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: assignment.orderId,
          eventName: "OrderDelivered",
          channel: `pharmacy:${assignment.pharmacyId || currentOrder.pharmacy_id}`,
          payload: { assignment },
        });
      }
    }

    return assignment;
  }

  async insertOrderStatusHistory(client, history) {
    await client.query(
      `
        INSERT INTO order_status_history (
          order_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        history.orderId,
        history.fromStatus || null,
        history.toStatus,
        history.actorType || null,
        history.actorId || null,
        history.reason || null,
        history.metadata || {},
      ],
    );
  }

  async insertRealtimeEvent(client, event) {
    await client.query(
      `
        INSERT INTO realtime_events (
          aggregate_type,
          aggregate_id,
          event_name,
          channel,
          payload
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        event.aggregateType,
        event.aggregateId,
        event.eventName,
        event.channel,
        event.payload,
      ],
    );
  }

  toOrderEventName(orderStatus) {
    return {
      RIDER_ASSIGNED: "RiderAssigned",
      PICKED_UP: "OrderPickedUp",
      OUT_FOR_DELIVERY: "OrderOutForDelivery",
      DELIVERED: "OrderDelivered",
      FAILED_DELIVERY: "DeliveryFailed",
    }[orderStatus];
  }

  toDeliveryEventName(deliveryStatus) {
    return {
      PICKED_UP: "DeliveryPickedUp",
      OUT_FOR_DELIVERY: "DeliveryOutForDelivery",
      DELIVERED: "DeliveryCompleted",
      FAILED: "DeliveryFailed",
    }[deliveryStatus];
  }
}

module.exports = {
  DeliveryModel,
  mapAssignmentRow,
  mapTrackingRow,
  mapProofRow,
};
