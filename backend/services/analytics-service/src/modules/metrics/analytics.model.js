const { pool: defaultPool } = require("../../db/pool");

function toNumber(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function rowsToCounts(rows, key = "key", value = "count") {
  return Object.fromEntries(rows.map((row) => [row[key], Number(row[value])]));
}

class AnalyticsModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async getOverview() {
    const [
      userResult,
      pharmacyResult,
      orderResult,
      prescriptionResult,
      paymentResult,
      supportResult,
      penaltyResult,
    ] = await Promise.all([
      this.pool.query(`
        SELECT
          count(*)::int AS total_users,
          count(*) FILTER (WHERE status = 'active')::int AS active_users,
          count(*) FILTER (WHERE role = 'customer')::int AS customers,
          count(*) FILTER (WHERE role = 'delivery_partner')::int AS riders
        FROM users
        WHERE status != 'deleted'
      `),
      this.pool.query(`
        SELECT
          count(*)::int AS total_pharmacies,
          count(*) FILTER (WHERE status = 'APPROVED')::int AS approved_pharmacies,
          count(*) FILTER (WHERE status IN ('DOCUMENT_SUBMITTED', 'UNDER_REVIEW'))::int
            AS pending_pharmacy_reviews
        FROM pharmacies
      `),
      this.pool.query(`
        SELECT
          count(*)::int AS total_orders,
          count(*) FILTER (WHERE created_at >= current_date)::int AS orders_today,
          count(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_orders,
          count(*) FILTER (WHERE status LIKE 'CANCELLED%')::int AS cancelled_orders,
          COALESCE(sum(total_amount), 0)::numeric AS gmv
        FROM orders
      `),
      this.pool.query(`
        SELECT verification_status AS key, count(*)::int AS count
        FROM prescriptions
        GROUP BY verification_status
      `),
      this.pool.query(`
        SELECT
          count(*) FILTER (WHERE status = 'PAYMENT_CAPTURED')::int AS captured_payments,
          COALESCE(sum(amount) FILTER (WHERE status = 'PAYMENT_CAPTURED'), 0)::numeric
            AS captured_amount,
          count(*) FILTER (WHERE status = 'PAYMENT_FAILED')::int AS failed_payments
        FROM payment_transactions
      `),
      this.pool.query(`
        SELECT
          count(*) FILTER (WHERE status IN ('open', 'in_progress'))::int AS open_tickets,
          count(*) FILTER (WHERE priority = 'urgent' AND status NOT IN ('resolved', 'closed'))::int
            AS urgent_open_tickets
        FROM support_tickets
      `),
      this.pool.query(`
        SELECT
          count(*) FILTER (WHERE status = 'applied')::int AS active_penalties,
          COALESCE(sum(amount) FILTER (WHERE status = 'applied'), 0)::numeric
            AS active_penalty_amount
        FROM penalties
      `),
    ]);

    const users = userResult.rows[0];
    const pharmacies = pharmacyResult.rows[0];
    const orders = orderResult.rows[0];
    const payments = paymentResult.rows[0];
    const support = supportResult.rows[0];
    const penalties = penaltyResult.rows[0];

    return {
      users: {
        total: users.total_users,
        active: users.active_users,
        customers: users.customers,
        riders: users.riders,
      },
      pharmacies: {
        total: pharmacies.total_pharmacies,
        approved: pharmacies.approved_pharmacies,
        pendingReview: pharmacies.pending_pharmacy_reviews,
      },
      orders: {
        total: orders.total_orders,
        today: orders.orders_today,
        delivered: orders.delivered_orders,
        cancelled: orders.cancelled_orders,
        gmv: toNumber(orders.gmv),
      },
      prescriptions: rowsToCounts(prescriptionResult.rows),
      payments: {
        capturedCount: payments.captured_payments,
        capturedAmount: toNumber(payments.captured_amount),
        failedCount: payments.failed_payments,
      },
      support: {
        openTickets: support.open_tickets,
        urgentOpenTickets: support.urgent_open_tickets,
      },
      penalties: {
        activeCount: penalties.active_penalties,
        activeAmount: toNumber(penalties.active_penalty_amount),
      },
    };
  }

  async getBusinessMetrics() {
    const [dailyOrders, topMedicines, topCities] = await Promise.all([
      this.pool.query(`
        SELECT
          created_at::date AS date,
          count(*)::int AS order_count,
          COALESCE(sum(total_amount), 0)::numeric AS gmv
        FROM orders
        WHERE created_at >= current_date - interval '30 days'
        GROUP BY created_at::date
        ORDER BY date ASC
      `),
      this.pool.query(`
        SELECT requested_name, sum(quantity)::int AS quantity
        FROM order_items
        GROUP BY requested_name
        ORDER BY quantity DESC
        LIMIT 10
      `),
      this.pool.query(`
        SELECT delivery_address->>'city' AS city, count(*)::int AS order_count
        FROM orders
        WHERE delivery_address ? 'city'
        GROUP BY delivery_address->>'city'
        ORDER BY order_count DESC
        LIMIT 10
      `),
    ]);

    return {
      dailyOrders: dailyOrders.rows.map((row) => ({
        date: row.date,
        orderCount: row.order_count,
        gmv: toNumber(row.gmv),
      })),
      topMedicines: topMedicines.rows.map((row) => ({
        requestedName: row.requested_name,
        quantity: row.quantity,
      })),
      topCities: topCities.rows.map((row) => ({
        city: row.city,
        orderCount: row.order_count,
      })),
    };
  }

  async getOperationsMetrics() {
    const [statusCounts, pharmacyPerformance, deliveryPerformance] =
      await Promise.all([
        this.pool.query(`
        SELECT status AS key, count(*)::int AS count
        FROM orders
        GROUP BY status
      `),
        this.pool.query(`
        SELECT
          p.id AS pharmacy_id,
          p.name,
          count(o.id)::int AS orders,
          count(o.id) FILTER (WHERE o.status = 'DELIVERED')::int AS delivered,
          count(o.id) FILTER (WHERE o.status = 'CANCELLED_BY_VENDOR')::int AS vendor_cancelled
        FROM pharmacies p
        LEFT JOIN orders o ON o.pharmacy_id = p.id
        GROUP BY p.id, p.name
        ORDER BY orders DESC
        LIMIT 20
      `),
        this.pool.query(`
        SELECT
          count(*)::int AS total_assignments,
          count(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_assignments,
          count(*) FILTER (WHERE status = 'FAILED')::int AS failed_assignments
        FROM delivery_assignments
      `),
      ]);

    const delivery = deliveryPerformance.rows[0];

    return {
      orderStatuses: rowsToCounts(statusCounts.rows),
      pharmacyPerformance: pharmacyPerformance.rows.map((row) => ({
        pharmacyId: row.pharmacy_id,
        name: row.name,
        orders: row.orders,
        delivered: row.delivered,
        vendorCancelled: row.vendor_cancelled,
      })),
      delivery: {
        totalAssignments: delivery.total_assignments,
        deliveredAssignments: delivery.delivered_assignments,
        failedAssignments: delivery.failed_assignments,
      },
    };
  }

  async getComplianceMetrics() {
    const [prescriptionStatuses, accessCounts, licenseAlerts, penaltyLevels] =
      await Promise.all([
        this.pool.query(`
          SELECT verification_status AS key, count(*)::int AS count
          FROM prescriptions
          GROUP BY verification_status
        `),
        this.pool.query(`
          SELECT actor_type AS key, count(*)::int AS count
          FROM prescription_access_logs
          GROUP BY actor_type
        `),
        this.pool.query(`
          SELECT count(*)::int AS expiring_licenses
          FROM pharmacies
          WHERE license_valid_to IS NOT NULL
            AND license_valid_to <= current_date + 30
        `),
        this.pool.query(`
          SELECT level::text AS key, count(*)::int AS count
          FROM penalties
          GROUP BY level
        `),
      ]);

    return {
      prescriptions: rowsToCounts(prescriptionStatuses.rows),
      prescriptionAccessByActor: rowsToCounts(accessCounts.rows),
      expiringLicenses30Days: licenseAlerts.rows[0].expiring_licenses,
      penaltiesByLevel: rowsToCounts(penaltyLevels.rows),
    };
  }
}

module.exports = {
  AnalyticsModel,
};
