const { pool: defaultPool } = require("../../db/pool");

function mapAuditLogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    reason: row.reason,
    metadata: row.metadata || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function mapPrescriptionAccessRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    prescriptionId: row.prescription_id,
    actorUserId: row.actor_user_id,
    actorType: row.actor_type,
    accessReason: row.access_reason,
    metadata: row.metadata || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function mapRegulatoryReportRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportType: row.report_type,
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    generatedByUserId: row.generated_by_user_id,
    fileUrl: row.file_url,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLicenseAlertRow(row) {
  if (!row) return null;
  return {
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    city: row.city,
    licenseNumber: row.license_number,
    licenseValidTo: row.license_valid_to,
    daysUntilExpiry:
      row.days_until_expiry === null ? null : Number(row.days_until_expiry),
  };
}

class ComplianceModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async listAuditLogs(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.actorUserId) {
      values.push(filters.actorUserId);
      clauses.push(`actor_user_id = $${values.length}`);
    }

    if (filters.entityType) {
      values.push(filters.entityType);
      clauses.push(`entity_type = $${values.length}`);
    }

    if (filters.entityId) {
      values.push(filters.entityId);
      clauses.push(`entity_id = $${values.length}`);
    }

    if (filters.action) {
      values.push(filters.action);
      clauses.push(`action = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          id,
          actor_user_id,
          action,
          entity_type,
          entity_id,
          reason,
          metadata,
          ip_address,
          user_agent,
          created_at,
          count(*) OVER()::int AS total_count
        FROM admin_audit_logs
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      logs: result.rows.map(mapAuditLogRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async logPrescriptionAccess(input) {
    const result = await this.pool.query(
      `
        INSERT INTO prescription_access_logs (
          prescription_id,
          actor_user_id,
          actor_type,
          access_reason,
          metadata,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          prescription_id,
          actor_user_id,
          actor_type,
          access_reason,
          metadata,
          ip_address,
          user_agent,
          created_at
      `,
      [
        input.prescriptionId,
        input.actorUserId || null,
        input.actorType,
        input.accessReason,
        input.metadata || {},
        input.ipAddress || null,
        input.userAgent || null,
      ],
    );

    return mapPrescriptionAccessRow(result.rows[0]);
  }

  async listPrescriptionAccess(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.prescriptionId) {
      values.push(filters.prescriptionId);
      clauses.push(`prescription_id = $${values.length}`);
    }

    if (filters.actorUserId) {
      values.push(filters.actorUserId);
      clauses.push(`actor_user_id = $${values.length}`);
    }

    if (filters.actorType) {
      values.push(filters.actorType);
      clauses.push(`actor_type = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;
    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          id,
          prescription_id,
          actor_user_id,
          actor_type,
          access_reason,
          metadata,
          ip_address,
          user_agent,
          created_at,
          count(*) OVER()::int AS total_count
        FROM prescription_access_logs
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      logs: result.rows.map(mapPrescriptionAccessRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async listLicenseAlerts(days) {
    const result = await this.pool.query(
      `
        SELECT
          id AS pharmacy_id,
          name AS pharmacy_name,
          city,
          license_number,
          license_valid_to,
          (license_valid_to - current_date)::int AS days_until_expiry
        FROM pharmacies
        WHERE license_valid_to IS NOT NULL
          AND license_valid_to <= current_date + $1::int
        ORDER BY license_valid_to ASC
      `,
      [days],
    );

    return result.rows.map(mapLicenseAlertRow);
  }

  async createRegulatoryReport(input) {
    const result = await this.pool.query(
      `
        INSERT INTO regulatory_reports (
          report_type,
          status,
          period_start,
          period_end,
          generated_by_user_id,
          file_url,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id,
          report_type,
          status,
          period_start,
          period_end,
          generated_by_user_id,
          file_url,
          metadata,
          created_at,
          updated_at
      `,
      [
        input.reportType,
        input.status || "draft",
        input.periodStart || null,
        input.periodEnd || null,
        input.generatedByUserId || null,
        input.fileUrl || null,
        input.metadata || {},
      ],
    );

    return mapRegulatoryReportRow(result.rows[0]);
  }

  async listRegulatoryReports(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.reportType) {
      values.push(filters.reportType);
      clauses.push(`report_type = $${values.length}`);
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
          id,
          report_type,
          status,
          period_start,
          period_end,
          generated_by_user_id,
          file_url,
          metadata,
          created_at,
          updated_at,
          count(*) OVER()::int AS total_count
        FROM regulatory_reports
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      reports: result.rows.map(mapRegulatoryReportRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateRegulatoryReport(id, input) {
    const fields = {
      status: "status",
      fileUrl: "file_url",
      metadata: "metadata",
    };
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        values.push(input[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    values.push(id);

    const result = await this.pool.query(
      `
        UPDATE regulatory_reports
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE id = $${values.length}
        RETURNING
          id,
          report_type,
          status,
          period_start,
          period_end,
          generated_by_user_id,
          file_url,
          metadata,
          created_at,
          updated_at
      `,
      values,
    );

    return mapRegulatoryReportRow(result.rows[0]);
  }
}

module.exports = {
  ComplianceModel,
  mapAuditLogRow,
  mapPrescriptionAccessRow,
  mapRegulatoryReportRow,
  mapLicenseAlertRow,
};
