const { query } = require("../db");

const USER_FIELDS = `
    id,
    name,
    phone,
    email,
    role,
    status,
    created_at,
    updated_at
`;

async function createUser({
    name,
    phone,
    email = null,
    role = "CUSTOMER",
    status = "ACTIVE"
}) {
    const result = await query(
        `
            INSERT INTO users (
                name,
                phone,
                email,
                role,
                status
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING ${USER_FIELDS}
        `,
        [name, phone, email, role, status]
    );

    return result.rows[0];
}

async function findUserById(id) {
    const result = await query(
        `
            SELECT ${USER_FIELDS}
            FROM users
            WHERE id = $1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findUserByPhone(phone) {
    const result = await query(
        `
            SELECT ${USER_FIELDS}
            FROM users
            WHERE phone = $1
        `,
        [phone]
    );

    return result.rows[0] || null;
}

async function findUserByEmail(email) {
    const result = await query(
        `
            SELECT ${USER_FIELDS}
            FROM users
            WHERE LOWER(email) = LOWER($1)
        `,
        [email]
    );

    return result.rows[0] || null;
}

async function listUsers({ role = null, status = null, limit = 50, offset = 0 } = {}) {
    const filters = [];
    const params = [];

    if (role) {
        params.push(role);
        filters.push(`role = $${params.length}`);
    }

    if (status) {
        params.push(status);
        filters.push(`status = $${params.length}`);
    }

    params.push(limit);
    const limitPosition = params.length;
    params.push(offset);
    const offsetPosition = params.length;
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await query(
        `
            SELECT ${USER_FIELDS}
            FROM users
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${limitPosition} OFFSET $${offsetPosition}
        `,
        params
    );

    return result.rows;
}

async function listCustomers(options = {}) {
    return listUsers({
        ...options,
        role: "CUSTOMER"
    });
}

async function updateUser(id, { name, email }) {
    const updates = [];
    const params = [id];

    if (name !== undefined) {
        params.push(name);
        updates.push(`name = $${params.length}`);
    }

    if (email !== undefined) {
        params.push(email);
        updates.push(`email = $${params.length}`);
    }

    if (updates.length === 0) {
        return findUserById(id);
    }

    const result = await query(
        `
            UPDATE users
            SET ${updates.join(", ")}
            WHERE id = $1
            RETURNING ${USER_FIELDS}
        `,
        params
    );

    return result.rows[0] || null;
}

async function updateUserStatus(id, status) {
    const result = await query(
        `
            UPDATE users
            SET status = $2
            WHERE id = $1
            RETURNING ${USER_FIELDS}
        `,
        [id, status]
    );

    return result.rows[0] || null;
}

module.exports = {
    createUser,
    findUserByEmail,
    findUserById,
    findUserByPhone,
    listCustomers,
    listUsers,
    updateUser,
    updateUserStatus
};
