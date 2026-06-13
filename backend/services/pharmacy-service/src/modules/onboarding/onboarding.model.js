const { pool: defaultPool } = require("../../db/pool");

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

class PharmacyOnboardingModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async createDraft(pharmacy) {
    const result = await this.pool.query(
      `
        INSERT INTO pharmacies (
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
          service_radius_km,
          opening_time,
          closing_time,
          is_24x7,
          has_own_delivery,
          supports_platform_delivery,
          cold_chain_capable
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22
        )
        RETURNING ${PHARMACY_COLUMNS}
      `,
      [
        pharmacy.ownerUserId,
        pharmacy.name,
        pharmacy.legalName || null,
        pharmacy.licenseNumber,
        pharmacy.licenseValidFrom || null,
        pharmacy.licenseValidTo || null,
        pharmacy.gstNumber || null,
        pharmacy.shopRegistrationNumber || null,
        pharmacy.addressLine1,
        pharmacy.addressLine2 || null,
        pharmacy.city,
        pharmacy.state,
        pharmacy.pincode,
        pharmacy.latitude ?? null,
        pharmacy.longitude ?? null,
        pharmacy.serviceRadiusKm ?? 5,
        pharmacy.openingTime || null,
        pharmacy.closingTime || null,
        pharmacy.is24x7 ?? false,
        pharmacy.hasOwnDelivery ?? false,
        pharmacy.supportsPlatformDelivery ?? true,
        pharmacy.coldChainCapable ?? false,
      ],
    );

    return mapPharmacyRow(result.rows[0]);
  }

  async findById(id) {
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

  async list(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.ownerUserId) {
      values.push(filters.ownerUserId);
      clauses.push(`owner_user_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      clauses.push(`status = $${values.length}`);
    }

    if (filters.city) {
      values.push(filters.city);
      clauses.push(`city ILIKE $${values.length}`);
    }

    if (filters.search) {
      values.push(`%${filters.search}%`);
      clauses.push(`
        (
          name ILIKE $${values.length}
          OR legal_name ILIKE $${values.length}
          OR license_number ILIKE $${values.length}
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
        FROM pharmacies
        ${whereSql}
        ORDER BY created_at DESC
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

  async updateProfile(id, changes) {
    const mutableFields = {
      name: "name",
      legalName: "legal_name",
      licenseNumber: "license_number",
      licenseValidFrom: "license_valid_from",
      licenseValidTo: "license_valid_to",
      gstNumber: "gst_number",
      shopRegistrationNumber: "shop_registration_number",
      addressLine1: "address_line1",
      addressLine2: "address_line2",
      city: "city",
      state: "state",
      pincode: "pincode",
      latitude: "latitude",
      longitude: "longitude",
      serviceRadiusKm: "service_radius_km",
      openingTime: "opening_time",
      closingTime: "closing_time",
      is24x7: "is_24x7",
      hasOwnDelivery: "has_own_delivery",
      supportsPlatformDelivery: "supports_platform_delivery",
      coldChainCapable: "cold_chain_capable",
    };

    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(mutableFields)) {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        values.push(changes[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await this.pool.query(
      `
        UPDATE pharmacies
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE id = $${values.length}
        RETURNING ${PHARMACY_COLUMNS}
      `,
      values,
    );

    return mapPharmacyRow(result.rows[0]);
  }

  async upsertDocument(pharmacyId, document) {
    const result = await this.pool.query(
      `
        INSERT INTO pharmacy_documents (
          pharmacy_id,
          document_type,
          file_url,
          document_number,
          expires_at,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (pharmacy_id, document_type)
        DO UPDATE SET
          file_url = EXCLUDED.file_url,
          document_number = EXCLUDED.document_number,
          expires_at = EXCLUDED.expires_at,
          metadata = EXCLUDED.metadata,
          status = 'UPLOADED',
          rejection_reason = NULL,
          uploaded_at = now(),
          reviewed_at = NULL,
          reviewed_by_user_id = NULL
        RETURNING ${DOCUMENT_COLUMNS}
      `,
      [
        pharmacyId,
        document.documentType,
        document.fileUrl,
        document.documentNumber || null,
        document.expiresAt || null,
        document.metadata || {},
      ],
    );

    return mapDocumentRow(result.rows[0]);
  }

  async listDocuments(pharmacyId) {
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

  async addPharmacist(pharmacyId, pharmacist) {
    const result = await this.pool.query(
      `
        INSERT INTO pharmacists (
          pharmacy_id,
          name,
          phone,
          registration_number,
          certificate_document_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${PHARMACIST_COLUMNS}
      `,
      [
        pharmacyId,
        pharmacist.name,
        pharmacist.phone,
        pharmacist.registrationNumber,
        pharmacist.certificateDocumentId || null,
      ],
    );

    return mapPharmacistRow(result.rows[0]);
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

  async updateStatus(pharmacyId, statusChange) {
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
              submitted_at = COALESCE($3, submitted_at),
              reviewed_at = COALESCE($4, reviewed_at),
              reviewed_by_user_id = COALESCE($5, reviewed_by_user_id),
              rejection_reason = $6,
              updated_at = now()
          WHERE id = $1
          RETURNING ${PHARMACY_COLUMNS}
        `,
        [
          pharmacyId,
          statusChange.toStatus,
          statusChange.submittedAt || null,
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

      await client.query("COMMIT");
      return mapPharmacyRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listStatusHistory(pharmacyId) {
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
}

module.exports = {
  PharmacyOnboardingModel,
  mapPharmacyRow,
  mapDocumentRow,
  mapPharmacistRow,
  mapStatusHistoryRow,
};
