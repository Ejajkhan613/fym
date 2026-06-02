const { query } = require("../db");
const { insertRow, mapDefinedFields } = require("./model-utils");

const AUDIT_LOG_FIELDS = `
    id,
    actor_type,
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata_json,
    ip_address,
    created_at
`;

const FIELD_MAP = {
    actorType: "actor_type",
    actorId: "actor_id",
    action: "action",
    entityType: "entity_type",
    entityId: "entity_id",
    metadataJson: "metadata_json",
    ipAddress: "ip_address"
};

async function createAuditLog(input) {
    return insertRow(
        "audit_logs",
        mapDefinedFields(input, FIELD_MAP),
        AUDIT_LOG_FIELDS
    );
}

async function listAuditLogsForEntity(
    entityType,
    entityId,
    { limit = 50, offset = 0 } = {}
) {
    const result = await query(
        `
            SELECT ${AUDIT_LOG_FIELDS}
            FROM audit_logs
            WHERE entity_type = $1 AND entity_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `,
        [entityType, entityId, limit, offset]
    );

    return result.rows;
}

async function listAuditLogsByActor(
    actorType,
    actorId,
    { limit = 50, offset = 0 } = {}
) {
    const result = await query(
        `
            SELECT ${AUDIT_LOG_FIELDS}
            FROM audit_logs
            WHERE actor_type = $1 AND actor_id = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        `,
        [actorType, actorId, limit, offset]
    );

    return result.rows;
}

async function listAuditLogs({ actorType = null, entityType = null, action = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (actorType) {
        params.push(actorType);
        filters.push(`actor_type = $${params.length}`);
    }

    if (entityType) {
        params.push(entityType);
        filters.push(`entity_type = $${params.length}`);
    }

    if (action) {
        params.push(action);
        filters.push(`action = $${params.length}`);
    }

    params.push(limit);
    const limitPosition = params.length;
    params.push(offset);
    const offsetPosition = params.length;
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await query(
        `
            SELECT ${AUDIT_LOG_FIELDS}
            FROM audit_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

module.exports = {
    createAuditLog,
    listAuditLogs,
    listAuditLogsByActor,
    listAuditLogsForEntity
};
