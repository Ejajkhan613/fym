const { pool: defaultPool } = require("../../db/pool");

const MEDICINE_COLUMNS = `
  id,
  brand_name,
  generic_name,
  salt_composition,
  strength,
  dosage_form,
  manufacturer,
  pack_size,
  mrp,
  schedule_category,
  requires_prescription,
  is_restricted,
  cold_chain_required,
  substitution_allowed,
  therapeutic_class,
  storage_type,
  side_effect_warning,
  interaction_warning,
  created_at,
  updated_at
`;

const MEDICINE_SELECT_COLUMNS = `
  m.id,
  m.brand_name,
  m.generic_name,
  m.salt_composition,
  m.strength,
  m.dosage_form,
  m.manufacturer,
  m.pack_size,
  m.mrp,
  m.schedule_category,
  m.requires_prescription,
  m.is_restricted,
  m.cold_chain_required,
  m.substitution_allowed,
  m.therapeutic_class,
  m.storage_type,
  m.side_effect_warning,
  m.interaction_warning,
  m.created_at,
  m.updated_at
`;

function mapMedicineRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    brandName: row.brand_name,
    genericName: row.generic_name,
    saltComposition: row.salt_composition,
    strength: row.strength,
    dosageForm: row.dosage_form,
    manufacturer: row.manufacturer,
    packSize: row.pack_size,
    mrp: Number(row.mrp),
    scheduleCategory: row.schedule_category,
    requiresPrescription: row.requires_prescription,
    isRestricted: row.is_restricted,
    coldChainRequired: row.cold_chain_required,
    substitutionAllowed: row.substitution_allowed,
    therapeuticClass: row.therapeutic_class,
    storageType: row.storage_type,
    sideEffectWarning: row.side_effect_warning,
    interactionWarning: row.interaction_warning,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSynonymRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    medicineId: row.medicine_id,
    synonym: row.synonym,
    createdAt: row.created_at,
  };
}

class MedicineModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async create(medicine) {
    const result = await this.pool.query(
      `
        INSERT INTO medicines (
          brand_name,
          generic_name,
          salt_composition,
          strength,
          dosage_form,
          manufacturer,
          pack_size,
          mrp,
          schedule_category,
          requires_prescription,
          is_restricted,
          cold_chain_required,
          substitution_allowed,
          therapeutic_class,
          storage_type,
          side_effect_warning,
          interaction_warning
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING ${MEDICINE_COLUMNS}
      `,
      [
        medicine.brandName,
        medicine.genericName || null,
        medicine.saltComposition || null,
        medicine.strength || null,
        medicine.dosageForm || null,
        medicine.manufacturer || null,
        medicine.packSize || null,
        medicine.mrp ?? 0,
        medicine.scheduleCategory || null,
        medicine.requiresPrescription ?? false,
        medicine.isRestricted ?? false,
        medicine.coldChainRequired ?? false,
        medicine.substitutionAllowed ?? true,
        medicine.therapeuticClass || null,
        medicine.storageType || null,
        medicine.sideEffectWarning || null,
        medicine.interactionWarning || null,
      ],
    );

    return mapMedicineRow(result.rows[0]);
  }

  async findById(id) {
    const result = await this.pool.query(
      `
        SELECT ${MEDICINE_COLUMNS}
        FROM medicines
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapMedicineRow(result.rows[0]);
  }

  async search(filters = {}) {
    const values = [];
    const clauses = [];

    if (filters.query) {
      values.push(`%${filters.query}%`);
      clauses.push(`
        (
          m.brand_name ILIKE $${values.length}
          OR m.generic_name ILIKE $${values.length}
          OR m.salt_composition ILIKE $${values.length}
          OR EXISTS (
            SELECT 1
            FROM medicine_synonyms ms
            WHERE ms.medicine_id = m.id
              AND ms.synonym ILIKE $${values.length}
          )
        )
      `);
    }

    if (filters.requiresPrescription !== undefined) {
      values.push(filters.requiresPrescription);
      clauses.push(`m.requires_prescription = $${values.length}`);
    }

    if (filters.isRestricted !== undefined) {
      values.push(filters.isRestricted);
      clauses.push(`m.is_restricted = $${values.length}`);
    }

    values.push(filters.limit);
    const limitParam = values.length;

    values.push(filters.offset);
    const offsetParam = values.length;

    const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        SELECT
          ${MEDICINE_SELECT_COLUMNS},
          count(*) OVER()::int AS total_count
        FROM medicines m
        ${whereSql}
        ORDER BY m.brand_name ASC
        LIMIT $${limitParam}
        OFFSET $${offsetParam}
      `,
      values,
    );

    return {
      medicines: result.rows.map(mapMedicineRow),
      total: result.rows[0]?.total_count || 0,
    };
  }

  async updateById(id, changes) {
    const fields = {
      brandName: "brand_name",
      genericName: "generic_name",
      saltComposition: "salt_composition",
      strength: "strength",
      dosageForm: "dosage_form",
      manufacturer: "manufacturer",
      packSize: "pack_size",
      mrp: "mrp",
      scheduleCategory: "schedule_category",
      requiresPrescription: "requires_prescription",
      isRestricted: "is_restricted",
      coldChainRequired: "cold_chain_required",
      substitutionAllowed: "substitution_allowed",
      therapeuticClass: "therapeutic_class",
      storageType: "storage_type",
      sideEffectWarning: "side_effect_warning",
      interactionWarning: "interaction_warning",
    };

    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        values.push(changes[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) return this.findById(id);

    values.push(id);

    const result = await this.pool.query(
      `
        UPDATE medicines
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE id = $${values.length}
        RETURNING ${MEDICINE_COLUMNS}
      `,
      values,
    );

    return mapMedicineRow(result.rows[0]);
  }

  async addSynonym(medicineId, synonym) {
    const result = await this.pool.query(
      `
        INSERT INTO medicine_synonyms (medicine_id, synonym)
        VALUES ($1, $2)
        RETURNING id, medicine_id, synonym, created_at
      `,
      [medicineId, synonym],
    );

    return mapSynonymRow(result.rows[0]);
  }

  async listSynonyms(medicineId) {
    const result = await this.pool.query(
      `
        SELECT id, medicine_id, synonym, created_at
        FROM medicine_synonyms
        WHERE medicine_id = $1
        ORDER BY synonym ASC
      `,
      [medicineId],
    );

    return result.rows.map(mapSynonymRow);
  }
}

module.exports = {
  MedicineModel,
  mapMedicineRow,
  mapSynonymRow,
};
