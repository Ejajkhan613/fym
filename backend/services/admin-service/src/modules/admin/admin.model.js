const { pool: defaultPool } = require("../../db/pool");

const USER_COLUMNS = `
  id,
  name,
  phone,
  role,
  status,
  created_at,
  updated_at
`;

const PHARMACY_COLUMNS = `
  id,
  owner_user_id,
  name,
  legal_name,
  license_number,
  license_valid_from,
  license_valid_to,
  gst_number,
  shop_registration_number,
  address_line1,
  address_line2,
  city,
  state,
  pincode,
  latitude,
  longitude,
  status,
  trust_score,
  service_radius_km,
  opening_time,
  closing_time,
  is_24x7,
  has_own_delivery,
  supports_platform_delivery,
  cold_chain_capable,
  submitted_at,
  reviewed_at,
  reviewed_by_user_id,
  rejection_reason,
  created_at,
  updated_at
`;

const DOCUMENT_COLUMNS = `
  id,
  pharmacy_id,
  document_type,
  file_url,
  document_number,
  expires_at,
  status,
  rejection_reason,
  metadata,
  uploaded_at,
  reviewed_at,
  reviewed_by_user_id
`;

const PHARMACIST_COLUMNS = `
  id,
  pharmacy_id,
  name,
  phone,
  registration_number,
  certificate_document_id,
  status,
  verified_at,
  rejection_reason,
  created_at,
  updated_at
`;

function mapUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPharmacyRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    legalName: row.legal_name,
    licenseNumber: row.license_number,
    licenseValidFrom: row.license_valid_from,
    licenseValidTo: row.license_valid_to,
    gstNumber: row.gst_number,
    shopRegistrationNumber: row.shop_registration_number,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    status: row.status,
    trustScore: Number(row.trust_score),
    serviceRadiusKm: Number(row.service_radius_km),
    openingTime: row.opening_time,
    closingTime: row.closing_time,
    is24x7: row.is_24x7,
    hasOwnDelivery: row.has_own_delivery,
    supportsPlatformDelivery: row.supports_platform_delivery,
    coldChainCapable: row.cold_chain_capable,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocumentRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    documentType: row.document_type,
    fileUrl: row.file_url,
    documentNumber: row.document_number,
    expiresAt: row.expires_at,
    status: row.status,
    rejectionReason: row.rejection_reason,
    metadata: row.metadata || {},
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at,
    reviewedByUserId: row.reviewed_by_user_id,
  };
}

function mapPharmacistRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    name: row.name,
    phone: row.phone,
    registrationNumber: row.registration_number,
    certificateDocumentId: row.certificate_document_id,
    status: row.status,
    verifiedAt: row.verified_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStatusHistoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    reason: row.reason,
    actorUserId: row.actor_user_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapAuditLogRow(row) {
  if (!row) {
    return null;
  }

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

function rowsToCountObject(rows, key = "key") {
  return rows.reduce((accumulator, row) => {
    accumulator[row[key]] = Number(row.count);
    return accumulator;
  }, {});
}

class AdminModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async getDashboardMetrics() {
    const [
      usersByRole,
      usersByStatus,
      pharmaciesByStatus,
      documentsByStatus,
      pharmacistsByStatus,
      pendingPharmacyReview,
      expiringLicenses,
      recentAuditLogs,
    ] = await Promise.all([
      this.pool.query(
        "SELECT role AS key, count(*)::int FROM users GROUP BY role",
      ),
      this.pool.query(
        "SELECT status AS key, count(*)::int FROM users GROUP BY status",
      ),
      this.pool.query(
        "SELECT status AS key, count(*)::int FROM pharmacies GROUP BY status",
      ),
      this.pool.query(
        "SELECT status AS key, count(*)::int FROM pharmacy_documents GROUP BY status",
      ),
      this.pool.query(
        "SELECT status AS key, count(*)::int FROM pharmacists GROUP BY status",
      ),
      this.pool.query(
        `
          SELECT count(*)::int AS count
          FROM pharmacies
          WHERE status IN ('DOCUMENT_SUBMITTED', 'UNDER_REVIEW')
        `,
      ),
      this.pool.query(
        `
          SELECT count(*)::int AS count
          FROM pharmacies
          WHERE license_valid_to IS NOT NULL
            AND license_valid_to <= current_date + interval '30 days'
            AND status NOT IN ('BLACKLISTED', 'REJECTED')
        `,
      ),
      this.pool.query(
        `
          SELECT *
          FROM admin_audit_logs
          ORDER BY created_at DESC
          LIMIT 10
        `,
      ),
    ]);

    return {
      users: {
        byRole: rowsToCountObject(usersByRole.rows),
        byStatus: rowsToCountObject(usersByStatus.rows),
      },
      pharmacies: {
        byStatus: rowsToCountObject(pharmaciesByStatus.rows),
        pendingReview: pendingPharmacyReview.rows[0]?.count || 0,
        licensesExpiringWithin30Days: expiringLicenses.rows[0]?.count || 0,
      },
      documents: {
        byStatus: rowsToCountObject(documentsByStatus.rows),
      },
      pharmacists: {
        byStatus: rowsToCountObject(pharmacistsByStatus.rows),
      },
      recentAdminActions: recentAuditLogs.rows.map(mapAuditLogRow),
    };
  }

  async listUsers(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.role) {
      values.push(filters.role);
      clauses.push(`role = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    } else {
      clauses.push("status != 'deleted'");
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(`
        (
          name ILIKE $${values.length}
          OR phone ILIKE $${values.length}
        )
      `);
    }

    values.push(filters.limit);
    const limitParam = values.length;

    values.push(filters.offset);
    const offsetParam = values.length;

    const result = await this.pool.query(
      `
        SELECT
          ${USER_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM users
        WHERE ${clauses.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      users: result.rows.map(mapUserRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async findUserById(id) {
    const result = await this.pool.query(
      `
        SELECT ${USER_COLUMNS}
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapUserRow(result.rows[0]);
  }

  async updateUserStatus(id, status, audit) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query(
        `
          UPDATE users
          SET status = $2,
              updated_at = now()
          WHERE id = $1
          RETURNING ${USER_COLUMNS}
        `,
        [id, status],
      );

      const user = mapUserRow(userResult.rows[0]);

      if (!user) {
        await client.query("ROLLBACK");
        return null;
      }

      await this.insertAuditLog(client, {
        ...audit,
        action: "USER_STATUS_UPDATED",
        entityType: "user",
        entityId: id,
        metadata: {
          status,
          ...(audit.metadata || {}),
        },
      });

      await client.query("COMMIT");
      return user;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listPharmacies(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`p.status = $${values.length}`);
    }

    if (filters.city) {
      values.push(filters.city);
      clauses.push(`p.city ILIKE $${values.length}`);
    }

    if (filters.ownerUserId) {
      values.push(filters.ownerUserId);
      clauses.push(`p.owner_user_id = $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(`
        (
          p.name ILIKE $${values.length}
          OR p.legal_name ILIKE $${values.length}
          OR p.license_number ILIKE $${values.length}
        )
      `);
    }

    values.push(filters.limit);
    const limitParam = values.length;

    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${PHARMACY_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM pharmacies p
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      pharmacies: result.rows.map(mapPharmacyRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async findPharmacyById(id) {
    const result = await this.pool.query(
      `
        SELECT ${PHARMACY_COLUMNS}
        FROM pharmacies
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapPharmacyRow(result.rows[0]);
  }

  async getPharmacyProfile(id) {
    const [pharmacy, documents, pharmacists, statusHistory, auditLogs] =
      await Promise.all([
        this.findPharmacyById(id),
        this.listPharmacyDocuments(id),
        this.listPharmacists(id),
        this.listPharmacyStatusHistory(id),
        this.listAuditLogs({
          entityType: "pharmacy",
          entityId: id,
          limit: 25,
          offset: 0,
        }),
      ]);

    if (!pharmacy) {
      return null;
    }

    return {
      pharmacy,
      documents,
      pharmacists,
      statusHistory,
      auditLogs: auditLogs.logs,
    };
  }

  async listPharmacyDocuments(pharmacyId) {
    const result = await this.pool.query(
      `
        SELECT ${DOCUMENT_COLUMNS}
        FROM pharmacy_documents
        WHERE pharmacy_id = $1
        ORDER BY document_type ASC
      `,
      [pharmacyId],
    );

    return result.rows.map(mapDocumentRow);
  }

  async listPharmacists(pharmacyId) {
    const result = await this.pool.query(
      `
        SELECT ${PHARMACIST_COLUMNS}
        FROM pharmacists
        WHERE pharmacy_id = $1
        ORDER BY created_at DESC
      `,
      [pharmacyId],
    );

    return result.rows.map(mapPharmacistRow);
  }

  async listPharmacyStatusHistory(pharmacyId) {
    const result = await this.pool.query(
      `
        SELECT
          id,
          pharmacy_id,
          from_status,
          to_status,
          reason,
          actor_user_id,
          metadata,
          created_at
        FROM pharmacy_status_history
        WHERE pharmacy_id = $1
        ORDER BY created_at DESC
      `,
      [pharmacyId],
    );

    return result.rows.map(mapStatusHistoryRow);
  }

  async updatePharmacyStatus(pharmacyId, statusChange) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const currentResult = await client.query(
        `
          SELECT ${PHARMACY_COLUMNS}
          FROM pharmacies
          WHERE id = $1
          FOR UPDATE
        `,
        [pharmacyId],
      );

      const current = currentResult.rows[0];

      if (!current) {
        await client.query("ROLLBACK");
        return null;
      }

      const result = await client.query(
        `
          UPDATE pharmacies
          SET status = $2,
              reviewed_at = COALESCE($3, reviewed_at),
              reviewed_by_user_id = COALESCE($4, reviewed_by_user_id),
              rejection_reason = $5,
              updated_at = now()
          WHERE id = $1
          RETURNING ${PHARMACY_COLUMNS}
        `,
        [
          pharmacyId,
          statusChange.toStatus,
          statusChange.reviewedAt || null,
          statusChange.reviewedByUserId || null,
          statusChange.rejectionReason || null,
        ],
      );

      await client.query(
        `
          INSERT INTO pharmacy_status_history (
            pharmacy_id,
            from_status,
            to_status,
            reason,
            actor_user_id,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          pharmacyId,
          current.status,
          statusChange.toStatus,
          statusChange.reason || null,
          statusChange.actorUserId || null,
          statusChange.metadata || {},
        ],
      );

      await this.insertAuditLog(client, {
        actorUserId: statusChange.actorUserId,
        action: statusChange.auditAction,
        entityType: "pharmacy",
        entityId: pharmacyId,
        reason: statusChange.reason,
        metadata: {
          fromStatus: current.status,
          toStatus: statusChange.toStatus,
          ...(statusChange.metadata || {}),
        },
        ipAddress: statusChange.ipAddress,
        userAgent: statusChange.userAgent,
      });

      await client.query("COMMIT");
      return mapPharmacyRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async insertAuditLog(client, log) {
    await client.query(
      `
        INSERT INTO admin_audit_logs (
          actor_user_id,
          action,
          entity_type,
          entity_id,
          reason,
          metadata,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        log.actorUserId || null,
        log.action,
        log.entityType,
        log.entityId || null,
        log.reason || null,
        log.metadata || {},
        log.ipAddress || null,
        log.userAgent || null,
      ],
    );
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
}

module.exports = {
  AdminModel,
  mapUserRow,
  mapPharmacyRow,
  mapDocumentRow,
  mapPharmacistRow,
  mapStatusHistoryRow,
  mapAuditLogRow,
};
