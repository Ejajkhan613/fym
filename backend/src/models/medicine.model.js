const { query } = require("../db");
const {
    insertRow,
    mapDefinedFields,
    updateRowById
} = require("./model-utils");

const MEDICINE_FIELDS = `
    id,
    brand_name,
    generic_name,
    salt_composition,
    strength,
    form,
    manufacturer,
    pack_size,
    mrp,
    schedule_category,
    requires_prescription,
    is_restricted,
    storage_type,
    cold_chain_required,
    substitution_group_id,
    therapeutic_class,
    side_effect_warning,
    interaction_warning,
    created_at,
    updated_at
`;

const FIELD_MAP = {
    brandName: "brand_name",
    genericName: "generic_name",
    saltComposition: "salt_composition",
    strength: "strength",
    form: "form",
    manufacturer: "manufacturer",
    packSize: "pack_size",
    mrp: "mrp",
    scheduleCategory: "schedule_category",
    requiresPrescription: "requires_prescription",
    isRestricted: "is_restricted",
    storageType: "storage_type",
    coldChainRequired: "cold_chain_required",
    substitutionGroupId: "substitution_group_id",
    therapeuticClass: "therapeutic_class",
    sideEffectWarning: "side_effect_warning",
    interactionWarning: "interaction_warning"
};

async function createMedicine(input) {
    return insertRow("medicines", mapDefinedFields(input, FIELD_MAP), MEDICINE_FIELDS);
}

async function findMedicineById(id) {
    const result = await query(
        `
            SELECT ${MEDICINE_FIELDS}
            FROM medicines
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function listMedicines({ limit = 50, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${MEDICINE_FIELDS}
            FROM medicines
            ORDER BY brand_name ASC
            LIMIT $1 OFFSET $2
        `,
        [limit, offset]
    );

    return result.rows;
}

async function searchMedicines(searchTerm, { limit = 20, offset = 0 } = {}) {
    const result = await query(
        `
            SELECT ${MEDICINE_FIELDS}
            FROM medicines
            WHERE brand_name ILIKE $1
                OR generic_name ILIKE $1
                OR salt_composition ILIKE $1
            ORDER BY brand_name ASC
            LIMIT $2 OFFSET $3
        `,
        [`%${searchTerm}%`, limit, offset]
    );

    return result.rows;
}

async function updateMedicine(id, updates) {
    return updateRowById(
        "medicines",
        id,
        mapDefinedFields(updates, FIELD_MAP),
        MEDICINE_FIELDS
    );
}

module.exports = {
    createMedicine,
    findMedicineById,
    listMedicines,
    searchMedicines,
    updateMedicine
};
