const { query } = require("../db");

function mapDefinedFields(source, fieldMap) {
    return Object.entries(fieldMap).reduce((payload, [inputKey, columnName]) => {
        if (source[inputKey] !== undefined) {
            payload[columnName] = source[inputKey];
        }

        return payload;
    }, {});
}

function buildReturningClause(fields) {
    return Array.isArray(fields) ? fields.join(", ") : fields;
}

async function insertRow(tableName, payload, returningFields) {
    const entries = Object.entries(payload);

    if (entries.length === 0) {
        throw new Error(`Cannot insert ${tableName} without values`);
    }

    const columns = entries.map(([columnName]) => columnName);
    const values = entries.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const result = await query(
        `
            INSERT INTO ${tableName} (${columns.join(", ")})
            VALUES (${placeholders.join(", ")})
            RETURNING ${buildReturningClause(returningFields)}
        `,
        values
    );

    return result.rows[0];
}

async function updateRowById(tableName, id, payload, returningFields) {
    const entries = Object.entries(payload);

    if (entries.length === 0) {
        throw new Error(`Cannot update ${tableName} without values`);
    }

    const values = entries.map(([, value]) => value);
    const setters = entries.map(
        ([columnName], index) => `${columnName} = $${index + 2}`
    );

    const result = await query(
        `
            UPDATE ${tableName}
            SET ${setters.join(", ")}
            WHERE id = $1
            RETURNING ${buildReturningClause(returningFields)}
        `,
        [id, ...values]
    );

    return result.rows[0] || null;
}

module.exports = {
    insertRow,
    mapDefinedFields,
    updateRowById
};
