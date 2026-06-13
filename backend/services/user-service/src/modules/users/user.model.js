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

const MUTABLE_FIELDS = {
  name: "name",
  phone: "phone",
  role: "role",
  status: "status",
};

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

class UserModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async create(user) {
    const result = await this.pool.query(
      `
        INSERT INTO users (name, phone, role, status)
        VALUES ($1, $2, $3, $4)
        RETURNING ${USER_COLUMNS}
      `,
      [
        user.name,
        user.phone,
        user.role || "customer",
        user.status || "pending_verification",
      ],
    );

    return mapUserRow(result.rows[0]);
  }

  async findById(id, { includeDeleted = false } = {}) {
    const result = await this.pool.query(
      `
        SELECT ${USER_COLUMNS}
        FROM users
        WHERE id = $1
          AND ($2::boolean = true OR status != 'deleted')
        LIMIT 1
      `,
      [id, includeDeleted],
    );

    return mapUserRow(result.rows[0]);
  }

  async findByPhone(phone) {
    const result = await this.pool.query(
      `
        SELECT ${USER_COLUMNS}
        FROM users
        WHERE phone = $1
          AND status != 'deleted'
        LIMIT 1
      `,
      [phone],
    );

    return mapUserRow(result.rows[0]);
  }

  async list(filters = {}) {
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

  async updateById(id, changes) {
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(MUTABLE_FIELDS)) {
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
        UPDATE users
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE id = $${values.length}
          AND status != 'deleted'
        RETURNING ${USER_COLUMNS}
      `,
      values,
    );

    return mapUserRow(result.rows[0]);
  }

  async setStatus(id, status) {
    return this.updateById(id, { status });
  }

  async softDelete(id) {
    const result = await this.pool.query(
      `
        UPDATE users
        SET status = 'deleted',
            updated_at = now()
        WHERE id = $1
          AND status != 'deleted'
        RETURNING ${USER_COLUMNS}
      `,
      [id],
    );

    return mapUserRow(result.rows[0]);
  }
}

module.exports = {
  UserModel,
  mapUserRow,
};
