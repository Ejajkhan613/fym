const { pool: defaultPool } = require("../../db/pool");

const PHARMACY_CANDIDATE_COLUMNS = `
  id,
  name,
  city,
  state,
  pincode,
  latitude,
  longitude,
  trust_score,
  service_radius_km,
  has_own_delivery,
  supports_platform_delivery,
  cold_chain_capable
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

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapCandidateRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    trustScore: toNumber(row.trust_score),
    serviceRadiusKm: toNumber(row.service_radius_km),
    hasOwnDelivery: row.has_own_delivery,
    supportsPlatformDelivery: row.supports_platform_delivery,
    coldChainCapable: row.cold_chain_capable,
    distanceKm: toNumber(row.distance_km),
  };
}

function mapOfferRow(row) {
  if (!row) return null;

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

class MatchingModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async selectCandidates(filters = {}) {
    if (filters.latitude !== undefined && filters.longitude !== undefined) {
      return this.selectCandidatesByDistance(filters);
    }

    return this.selectCandidatesByCity(filters);
  }

  async selectCandidatesByDistance(filters) {
    const values = [
      filters.latitude,
      filters.longitude,
      filters.radiusKm,
      filters.minimumTrustScore,
      filters.limit,
    ];

    const result = await this.pool.query(
      `
        SELECT *
        FROM (
          SELECT
            ${PHARMACY_CANDIDATE_COLUMNS},
            (
              6371 * acos(
                LEAST(1, GREATEST(-1,
                  cos(radians($1)) * cos(radians(latitude)) *
                  cos(radians(longitude) - radians($2)) +
                  sin(radians($1)) * sin(radians(latitude))
                ))
              )
            ) AS distance_km
          FROM pharmacies
          WHERE status = 'APPROVED'
            AND latitude IS NOT NULL
            AND longitude IS NOT NULL
            AND trust_score >= $4
        ) candidates
        WHERE distance_km <= LEAST($3, service_radius_km)
        ORDER BY distance_km ASC, trust_score DESC, id ASC
        LIMIT $5
      `,
      values,
    );

    return result.rows.map(mapCandidateRow);
  }

  async selectCandidatesByCity(filters) {
    const values = [filters.minimumTrustScore];
    const clauses = ["status = 'APPROVED'", `trust_score >= $1`];

    if (filters.city) {
      values.push(filters.city);
      clauses.push(`city ILIKE $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;

    const result = await this.pool.query(
      `
        SELECT
          ${PHARMACY_CANDIDATE_COLUMNS},
          NULL::numeric AS distance_km
        FROM pharmacies
        WHERE ${clauses.join(" AND ")}
        ORDER BY trust_score DESC, created_at ASC
        LIMIT $${limitParam}
      `,
      values,
    );

    return result.rows.map(mapCandidateRow);
  }

  async findCandidatesByIds(ids) {
    const result = await this.pool.query(
      `
        SELECT
          ${PHARMACY_CANDIDATE_COLUMNS},
          NULL::numeric AS distance_km
        FROM pharmacies
        WHERE id = ANY($1::uuid[])
          AND status = 'APPROVED'
        ORDER BY trust_score DESC, created_at ASC
      `,
      [ids],
    );

    return result.rows.map(mapCandidateRow);
  }

  async dispatchOrder(input) {
    const client = await this.pool.connect();
    const expiresAt =
      input.offerExpiresAt ||
      new Date(Date.now() + Number(input.offerTtlSeconds || 45) * 1000);

    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `
          SELECT id, customer_id, status
          FROM orders
          WHERE id = $1
          FOR UPDATE
        `,
        [input.orderId],
      );
      const order = orderResult.rows[0];

      if (!order) {
        await client.query("ROLLBACK");
        return { outcome: "ORDER_NOT_FOUND" };
      }

      if (
        !["CREATED", "VENDOR_MATCHING", "VENDOR_OFFERED"].includes(order.status)
      ) {
        await client.query("ROLLBACK");
        return { outcome: "ORDER_NOT_DISPATCHABLE", orderStatus: order.status };
      }

      const offers = [];

      for (const pharmacyId of input.pharmacyIds) {
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
          [input.orderId, pharmacyId, expiresAt],
        );

        if (offerResult.rows[0]) {
          offers.push(mapOfferRow(offerResult.rows[0]));
        }
      }

      if (order.status !== "VENDOR_OFFERED" && offers.length > 0) {
        await client.query(
          `
            UPDATE orders
            SET status = 'VENDOR_OFFERED',
                updated_at = now()
            WHERE id = $1
          `,
          [input.orderId],
        );

        await this.insertOrderStatusHistory(client, {
          orderId: input.orderId,
          fromStatus: order.status,
          toStatus: "VENDOR_OFFERED",
          reason: "Order dispatched to pharmacy candidates",
          metadata: {
            waveNumber: input.waveNumber,
            pharmacyIds: input.pharmacyIds,
          },
        });
      }

      for (const offer of offers) {
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: input.orderId,
          eventName: "VendorOfferSent",
          channel: `pharmacy:${offer.pharmacyId}`,
          payload: {
            offer,
            waveNumber: input.waveNumber,
          },
        });
      }

      if (offers.length > 0) {
        await this.insertRealtimeEvent(client, {
          aggregateType: "order",
          aggregateId: input.orderId,
          eventName: "OrderDispatched",
          channel: `customer:${order.customer_id}`,
          payload: {
            orderId: input.orderId,
            waveNumber: input.waveNumber,
            offerCount: offers.length,
          },
        });
      }

      await client.query("COMMIT");
      return {
        outcome: "DISPATCHED",
        orderId: input.orderId,
        orderStatus: offers.length > 0 ? "VENDOR_OFFERED" : order.status,
        offers,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listOffers(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.orderId) {
      values.push(filters.orderId);
      clauses.push(`order_id = $${values.length}`);
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
          ${OFFER_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM vendor_order_offers
        ${whereSql}
        ORDER BY sent_at DESC
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
        VALUES ($1, $2, $3, 'system', NULL, $4, $5)
      `,
      [
        history.orderId,
        history.fromStatus || null,
        history.toStatus,
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
}

module.exports = {
  MatchingModel,
  mapCandidateRow,
  mapOfferRow,
};
