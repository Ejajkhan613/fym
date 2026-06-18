const { pool: defaultPool } = require("../../db/pool");

const ORDER_COLUMNS = `
  id,
  customer_id,
  pharmacy_id,
  status,
  order_type,
  payment_status,
  subtotal,
  delivery_fee,
  platform_fee,
  discount,
  total_amount,
  delivery_address,
  prescription_id,
  accepted_at,
  packed_at,
  delivered_at,
  cancelled_at,
  cancellation_reason,
  created_at,
  updated_at
`;

const ITEM_COLUMNS = `
  id,
  order_id,
  medicine_id,
  requested_name,
  quantity,
  unit_price,
  line_total,
  substitution_of_item_id,
  requires_prescription,
  status,
  created_at,
  updated_at
`;

const OFFER_COLUMNS = `
  id,
  order_id,
  pharmacy_id,
  status,
  sent_at,
  viewed_at,
  responded_at,
  expires_at,
  rejection_reason,
  stock_confirmed,
  expiry_confirmed,
  pharmacist_verified,
  packing_time_minutes,
  created_at,
  updated_at
`;

const OFFER_SELECT_COLUMNS = `
  o.id,
  o.order_id,
  o.pharmacy_id,
  o.status,
  o.sent_at,
  o.viewed_at,
  o.responded_at,
  o.expires_at,
  o.rejection_reason,
  o.stock_confirmed,
  o.expiry_confirmed,
  o.pharmacist_verified,
  o.packing_time_minutes,
  o.created_at,
  o.updated_at
`;

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapOrderRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    customerId: row.customer_id,
    pharmacyId: row.pharmacy_id,
    status: row.status,
    orderType: row.order_type,
    paymentStatus: row.payment_status,
    subtotal: toNumber(row.subtotal),
    deliveryFee: toNumber(row.delivery_fee),
    platformFee: toNumber(row.platform_fee),
    discount: toNumber(row.discount),
    totalAmount: toNumber(row.total_amount),
    deliveryAddress: row.delivery_address,
    prescriptionId: row.prescription_id,
    acceptedAt: row.accepted_at,
    packedAt: row.packed_at,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id,
    medicineId: row.medicine_id,
    requestedName: row.requested_name,
    quantity: row.quantity,
    unitPrice: toNumber(row.unit_price),
    lineTotal: toNumber(row.line_total),
    substitutionOfItemId: row.substitution_of_item_id,
    requiresPrescription: row.requires_prescription,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOfferRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id,
    pharmacyId: row.pharmacy_id,
    status: row.status,
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    respondedAt: row.responded_at,
    expiresAt: row.expires_at,
    rejectionReason: row.rejection_reason,
    stockConfirmed: row.stock_confirmed,
    expiryConfirmed: row.expiry_confirmed,
    pharmacistVerified: row.pharmacist_verified,
    packingTimeMinutes: row.packing_time_minutes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapHistoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    orderId: row.order_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorType: row.actor_type,
    actorId: row.actor_id,
    reason: row.reason,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapRealtimeEventRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    aggregateType: row.aggregate_type,
    aggregateId: row.aggregate_id,
    eventName: row.event_name,
    channel: row.channel,
    payload: row.payload,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

class OrderModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async createOrder(order, options = {}) {
    const client = await this.pool.connect();
    const offerExpiresAt =
      options.offerExpiresAt || new Date(Date.now() + 45_000);

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `
          INSERT INTO orders (
            customer_id,
            status,
            order_type,
            payment_status,
            subtotal,
            delivery_fee,
            platform_fee,
            discount,
            total_amount,
            delivery_address,
            prescription_id
          )
          VALUES ($1, 'VENDOR_MATCHING', $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING ${ORDER_COLUMNS}
        `,
        [
          order.customerId,
          order.orderType,
          order.paymentStatus || "PAYMENT_PENDING",
          order.subtotal,
          order.deliveryFee,
          order.platformFee,
          order.discount,
          order.totalAmount,
          order.deliveryAddress,
          order.prescriptionId || null,
        ],
      );

      const createdOrder = mapOrderRow(orderResult.rows[0]);
      const items = [];

      for (const item of order.items) {
        const itemResult = await client.query(
          `
            INSERT INTO order_items (
              order_id,
              medicine_id,
              requested_name,
              quantity,
              unit_price,
              line_total,
              requires_prescription
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING ${ITEM_COLUMNS}
          `,
          [
            createdOrder.id,
            item.medicineId || null,
            item.requestedName,
            item.quantity,
            item.unitPrice,
            item.lineTotal,
            item.requiresPrescription || false,
          ],
        );

        items.push(mapItemRow(itemResult.rows[0]));
      }

      await this.insertStatusHistory(client, {
        orderId: createdOrder.id,
        fromStatus: null,
        toStatus: "VENDOR_MATCHING",
        actorType: "customer",
        actorId: createdOrder.customerId,
        reason: "Order created and sent for vendor matching",
      });

      const offers = [];

      for (const pharmacyId of order.candidatePharmacyIds) {
        const offerResult = await client.query(
          `
            INSERT INTO vendor_order_offers (
              order_id,
              pharmacy_id,
              expires_at
            )
            VALUES ($1, $2, $3)
            ON CONFLICT (order_id, pharmacy_id)
            DO NOTHING
            RETURNING ${OFFER_COLUMNS}
          `,
          [createdOrder.id, pharmacyId, offerExpiresAt],
        );

        if (offerResult.rows[0]) {
          offers.push(mapOfferRow(offerResult.rows[0]));
        }
      }

      const realtimeEvents = [
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: createdOrder.id,
          eventName: "OrderCreated",
          channel: `customer:${createdOrder.customerId}`,
          payload: { order: createdOrder, items },
        }),
      ];

      for (const offer of offers) {
        realtimeEvents.push(
          await this.insertRealtimeEvent(client, {
            aggregateType: "order",
            aggregateId: createdOrder.id,
            eventName: "VendorOfferSent",
            channel: `pharmacy:${offer.pharmacyId}`,
            payload: { order: createdOrder, offer, items },
          }),
        );
      }

      await client.query("COMMIT");

      return {
        order: createdOrder,
        items,
        offers,
        realtimeEvents,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findApprovedCandidatePharmacies({ city, limit }) {
    const result = await this.pool.query(
      `
        SELECT id
        FROM pharmacies
        WHERE status = 'APPROVED'
          AND ($1::text IS NULL OR city ILIKE $1)
        ORDER BY trust_score DESC, created_at ASC
        LIMIT $2
      `,
      [city || null, limit],
    );

    return result.rows.map((row) => row.id);
  }

  async findOrderById(id) {
    const result = await this.pool.query(
      `
        SELECT ${ORDER_COLUMNS}
        FROM orders
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapOrderRow(result.rows[0]);
  }

  async getOrderDetails(id) {
    const [order, items, offers, timeline] = await Promise.all([
      this.findOrderById(id),
      this.listOrderItems(id),
      this.listOrderOffers(id),
      this.listOrderTimeline(id),
    ]);

    if (!order) {
      return null;
    }

    return { order, items, offers, timeline };
  }

  async listOrders(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.customerId) {
      values.push(filters.customerId);
      clauses.push(`customer_id = $${values.length}`);
    }

    if (filters.pharmacyId) {
      values.push(filters.pharmacyId);
      clauses.push(`pharmacy_id = $${values.length}`);
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
          ${ORDER_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM orders
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      orders: result.rows.map(mapOrderRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async listOrderItems(orderId) {
    const result = await this.pool.query(
      `
        SELECT ${ITEM_COLUMNS}
        FROM order_items
        WHERE order_id = $1
        ORDER BY created_at ASC
      `,
      [orderId],
    );

    return result.rows.map(mapItemRow);
  }

  async listOrderOffers(orderId) {
    const result = await this.pool.query(
      `
        SELECT ${OFFER_COLUMNS}
        FROM vendor_order_offers
        WHERE order_id = $1
        ORDER BY sent_at ASC
      `,
      [orderId],
    );

    return result.rows.map(mapOfferRow);
  }

  async listOrderTimeline(orderId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          order_id,
          from_status,
          to_status,
          actor_type,
          actor_id,
          reason,
          metadata,
          created_at
        FROM order_status_history
        WHERE order_id = $1
        ORDER BY created_at ASC
      `,
      [orderId],
    );

    return result.rows.map(mapHistoryRow);
  }

  async listRealtimeEvents(filters = {}) {
    const values = [filters.channel];
    const clauses = ["e.channel = $1"];

    if (filters.aggregateId) {
      values.push(filters.aggregateId);
      clauses.push(`e.aggregate_id = $${values.length}`);
    }

    if (filters.eventName) {
      values.push(filters.eventName);
      clauses.push(`e.event_name = $${values.length}`);
    }

    if (filters.afterId) {
      values.push(filters.afterId);
      const cursorParam = values.length;
      clauses.push(`
        (
          NOT EXISTS (
            SELECT 1
            FROM realtime_events cursor_event
            WHERE cursor_event.id = $${cursorParam}
          )
          OR (e.created_at, e.id) > (
            SELECT cursor_event.created_at, cursor_event.id
            FROM realtime_events cursor_event
            WHERE cursor_event.id = $${cursorParam}
          )
        )
      `);
    } else if (filters.after) {
      values.push(filters.after);
      clauses.push(`e.created_at > $${values.length}::timestamptz`);
    }

    values.push(filters.limit || 50);
    const limitParam = values.length;
    const direction = filters.direction === "desc" ? "DESC" : "ASC";

    const result = await this.pool.query(
      `
        SELECT
          e.id,
          e.aggregate_type,
          e.aggregate_id,
          e.event_name,
          e.channel,
          e.payload,
          e.published_at,
          e.created_at
        FROM realtime_events e
        WHERE ${clauses.join(" AND ")}
        ORDER BY e.created_at ${direction}, e.id ${direction}
        LIMIT $${limitParam}
      `,
      values,
    );

    return {
      events: result.rows.map(mapRealtimeEventRow),
      total: result.rows.length,
    };
  }

  async listPharmacyOffers(filters) {
    const values = [filters.pharmacyId];
    const clauses = ["o.pharmacy_id = $1"];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`o.status = $${values.length}`);
    } else {
      clauses.push("o.status IN ('OFFER_SENT', 'OFFER_VIEWED')");
    }

    values.push(filters.limit);
    const limitParam = values.length;

    values.push(filters.offset);
    const offsetParam = values.length;

    const result = await this.pool.query(
      `
        SELECT
          ${OFFER_SELECT_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM vendor_order_offers o
        WHERE ${clauses.join(" AND ")}
        ORDER BY o.sent_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      offers: result.rows.map(mapOfferRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async expirePharmacyOffers(pharmacyId) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE vendor_order_offers
          SET status = 'OFFER_EXPIRED',
              updated_at = now()
          WHERE pharmacy_id = $1
            AND status IN ('OFFER_SENT', 'OFFER_VIEWED')
            AND expires_at <= now()
          RETURNING ${OFFER_COLUMNS}
        `,
        [pharmacyId],
      );

      const offers = result.rows.map(mapOfferRow);
      const realtimeEvents = [];

      for (const offer of offers) {
        realtimeEvents.push(
          await this.insertRealtimeEvent(client, {
            aggregateType: "order",
            aggregateId: offer.orderId,
            eventName: "VendorOfferExpired",
            channel: `pharmacy:${offer.pharmacyId}`,
            payload: { offer },
          }),
        );
      }

      await client.query("COMMIT");

      return { offers, realtimeEvents };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async markOfferViewed(orderId, pharmacyId) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE vendor_order_offers
          SET status = CASE
                WHEN status = 'OFFER_SENT' THEN 'OFFER_VIEWED'
                ELSE status
              END,
              viewed_at = COALESCE(viewed_at, now()),
              updated_at = now()
          WHERE order_id = $1
            AND pharmacy_id = $2
            AND status IN ('OFFER_SENT', 'OFFER_VIEWED')
          RETURNING ${OFFER_COLUMNS}
        `,
        [orderId, pharmacyId],
      );

      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      const offer = mapOfferRow(result.rows[0]);
      const event = await this.insertRealtimeEvent(client, {
        aggregateType: "order",
        aggregateId: orderId,
        eventName: "VendorOfferViewed",
        channel: `pharmacy:${pharmacyId}`,
        payload: { offer },
      });

      await client.query("COMMIT");

      return { offer, realtimeEvents: [event] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async acceptOffer(orderId, pharmacyId, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const offerResult = await client.query(
        `
          SELECT ${OFFER_COLUMNS}
          FROM vendor_order_offers
          WHERE order_id = $1
            AND pharmacy_id = $2
          FOR UPDATE
        `,
        [orderId, pharmacyId],
      );

      const offer = offerResult.rows[0];

      if (!offer) {
        await client.query("ROLLBACK");
        return { outcome: "OFFER_NOT_FOUND" };
      }

      if (!["OFFER_SENT", "OFFER_VIEWED"].includes(offer.status)) {
        await client.query("ROLLBACK");
        return { outcome: "OFFER_NOT_ACCEPTABLE", offer: mapOfferRow(offer) };
      }

      if (new Date(offer.expires_at).getTime() <= Date.now()) {
        const expiredOfferResult = await client.query(
          `
            UPDATE vendor_order_offers
            SET status = 'OFFER_EXPIRED',
                updated_at = now()
            WHERE id = $1
            RETURNING ${OFFER_COLUMNS}
          `,
          [offer.id],
        );
        const expiredOffer = mapOfferRow(expiredOfferResult.rows[0]);
        const expiredEvent = await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: orderId,
          eventName: "VendorOfferExpired",
          channel: `pharmacy:${pharmacyId}`,
          payload: { offer: expiredOffer },
        });

        await client.query("COMMIT");
        return {
          outcome: "OFFER_EXPIRED",
          offer: expiredOffer,
          realtimeEvents: [expiredEvent],
        };
      }

      const orderUpdate = await client.query(
        `
          UPDATE orders
          SET pharmacy_id = $2,
              status = 'VENDOR_ACCEPTED',
              accepted_at = now(),
              updated_at = now()
          WHERE id = $1
            AND status = 'VENDOR_MATCHING'
          RETURNING ${ORDER_COLUMNS}
        `,
        [orderId, pharmacyId],
      );

      if (orderUpdate.rowCount !== 1) {
        const closedOfferResult = await client.query(
          `
            UPDATE vendor_order_offers
            SET status = 'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE',
                responded_at = now(),
                updated_at = now()
            WHERE order_id = $1
              AND pharmacy_id = $2
              AND status IN ('OFFER_SENT', 'OFFER_VIEWED')
            RETURNING ${OFFER_COLUMNS}
          `,
          [orderId, pharmacyId],
        );
        const closedOffer = mapOfferRow(closedOfferResult.rows[0]);
        const realtimeEvents = [];

        if (closedOffer) {
          realtimeEvents.push(
            await this.insertRealtimeEvent(client, {
              aggregateType: "order",
              aggregateId: orderId,
              eventName: "VendorOfferClosed",
              channel: `pharmacy:${pharmacyId}`,
              payload: { offer: closedOffer },
            }),
          );
        }

        await client.query("COMMIT");
        return {
          outcome: "ORDER_ALREADY_ASSIGNED",
          offer: closedOffer,
          realtimeEvents,
        };
      }

      const acceptedOfferResult = await client.query(
        `
          UPDATE vendor_order_offers
          SET status = 'OFFER_ACCEPTED',
              responded_at = now(),
              stock_confirmed = $3,
              expiry_confirmed = $4,
              pharmacist_verified = $5,
              packing_time_minutes = $6,
              updated_at = now()
          WHERE order_id = $1
            AND pharmacy_id = $2
          RETURNING ${OFFER_COLUMNS}
        `,
        [
          orderId,
          pharmacyId,
          input.stockConfirmed,
          input.expiryConfirmed,
          input.pharmacistVerified,
          input.packingTimeMinutes,
        ],
      );

      const closedOffersResult = await client.query(
        `
          UPDATE vendor_order_offers
          SET status = 'OFFER_CLOSED_ORDER_ASSIGNED_ELSEWHERE',
              updated_at = now()
          WHERE order_id = $1
            AND pharmacy_id != $2
            AND status IN ('OFFER_SENT', 'OFFER_VIEWED')
          RETURNING ${OFFER_COLUMNS}
        `,
        [orderId, pharmacyId],
      );

      const order = mapOrderRow(orderUpdate.rows[0]);
      const acceptedOffer = mapOfferRow(acceptedOfferResult.rows[0]);
      const closedOffers = closedOffersResult.rows.map(mapOfferRow);

      await this.insertStatusHistory(client, {
        orderId,
        fromStatus: "VENDOR_MATCHING",
        toStatus: "VENDOR_ACCEPTED",
        actorType: "pharmacy",
        actorId: pharmacyId,
        reason: "Pharmacy accepted order",
        metadata: {
          offerId: acceptedOffer.id,
          packingTimeMinutes: acceptedOffer.packingTimeMinutes,
        },
      });

      const customerEvent = await this.insertRealtimeEvent(client, {
        aggregateType: "order",
        aggregateId: orderId,
        eventName: "VendorAccepted",
        channel: `customer:${order.customerId}`,
        payload: { order, offer: acceptedOffer },
      });

      const pharmacyEvent = await this.insertRealtimeEvent(client, {
        aggregateType: "order",
        aggregateId: orderId,
        eventName: "VendorAccepted",
        channel: `pharmacy:${pharmacyId}`,
        payload: { order, offer: acceptedOffer },
      });

      const closedOfferEvents = [];

      for (const closedOffer of closedOffers) {
        closedOfferEvents.push(
          await this.insertRealtimeEvent(client, {
            aggregateType: "order",
            aggregateId: orderId,
            eventName: "VendorOfferClosed",
            channel: `pharmacy:${closedOffer.pharmacyId}`,
            payload: { order, offer: closedOffer },
          }),
        );
      }

      await client.query("COMMIT");

      return {
        outcome: "ACCEPTED",
        order,
        offer: acceptedOffer,
        realtimeEvents: [customerEvent, pharmacyEvent, ...closedOfferEvents],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async rejectOffer(orderId, pharmacyId, reason) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          UPDATE vendor_order_offers
          SET status = 'OFFER_REJECTED',
              responded_at = now(),
              rejection_reason = $3,
              updated_at = now()
          WHERE order_id = $1
            AND pharmacy_id = $2
            AND status IN ('OFFER_SENT', 'OFFER_VIEWED')
          RETURNING ${OFFER_COLUMNS}
        `,
        [orderId, pharmacyId, reason],
      );

      if (!result.rows[0]) {
        await client.query("ROLLBACK");
        return null;
      }

      const offer = mapOfferRow(result.rows[0]);
      const event = await this.insertRealtimeEvent(client, {
        aggregateType: "order",
        aggregateId: orderId,
        eventName: "VendorRejected",
        channel: `pharmacy:${pharmacyId}`,
        payload: { offer },
      });

      await client.query("COMMIT");

      return { offer, realtimeEvents: [event] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateOrderStatus(orderId, statusChange) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query(
        `
          SELECT ${ORDER_COLUMNS}
          FROM orders
          WHERE id = $1
          FOR UPDATE
        `,
        [orderId],
      );

      const current = currentResult.rows[0];

      if (!current) {
        await client.query("ROLLBACK");
        return null;
      }

      const result = await client.query(
        `
          UPDATE orders
          SET status = $2,
              packed_at = CASE WHEN $2 = 'PACKED' THEN now() ELSE packed_at END,
              cancelled_at = CASE
                WHEN $2 IN ('CANCELLED_BY_USER', 'CANCELLED_BY_VENDOR', 'CANCELLED_BY_ADMIN')
                THEN now()
                ELSE cancelled_at
              END,
              cancellation_reason = COALESCE($3, cancellation_reason),
              updated_at = now()
          WHERE id = $1
          RETURNING ${ORDER_COLUMNS}
        `,
        [orderId, statusChange.toStatus, statusChange.reason || null],
      );

      await this.insertStatusHistory(client, {
        orderId,
        fromStatus: current.status,
        toStatus: statusChange.toStatus,
        actorType: statusChange.actorType,
        actorId: statusChange.actorId,
        reason: statusChange.reason,
        metadata: statusChange.metadata || {},
      });

      const order = mapOrderRow(result.rows[0]);
      const events = [
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: orderId,
          eventName: statusChange.eventName,
          channel: `customer:${order.customerId}`,
          payload: { order },
        }),
      ];

      if (order.pharmacyId) {
        events.push(
          await this.insertRealtimeEvent(client, {
            aggregateType: "order",
            aggregateId: orderId,
            eventName: statusChange.eventName,
            channel: `pharmacy:${order.pharmacyId}`,
            payload: { order },
          }),
        );
      }

      await client.query("COMMIT");

      return { order, realtimeEvents: events };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async insertStatusHistory(client, history) {
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
    const result = await client.query(
      `
        INSERT INTO realtime_events (
          aggregate_type,
          aggregate_id,
          event_name,
          channel,
          payload
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
          id,
          aggregate_type,
          aggregate_id,
          event_name,
          channel,
          payload,
          published_at,
          created_at
      `,
      [
        event.aggregateType,
        event.aggregateId,
        event.eventName,
        event.channel,
        event.payload,
      ],
    );

    return mapRealtimeEventRow(result.rows[0]);
  }
}

module.exports = {
  OrderModel,
  mapOrderRow,
  mapItemRow,
  mapOfferRow,
  mapHistoryRow,
  mapRealtimeEventRow,
};
