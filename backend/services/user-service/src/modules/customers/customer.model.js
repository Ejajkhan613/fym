const { pool: defaultPool } = require("../../db/pool");

const PROFILE_COLUMNS = `
  id,
  user_id,
  date_of_birth,
  gender,
  emergency_contact_name,
  emergency_contact_phone,
  abha_id_optional,
  metadata,
  created_at,
  updated_at
`;

const ADDRESS_COLUMNS = `
  id,
  user_id,
  label,
  recipient_name,
  phone,
  address_line1,
  address_line2,
  city,
  state,
  pincode,
  latitude,
  longitude,
  is_default,
  metadata,
  created_at,
  updated_at
`;

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function mapProfileRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    abhaIdOptional: row.abha_id_optional,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAddressRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    recipientName: row.recipient_name,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    isDefault: row.is_default,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class CustomerModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async findUserById(userId) {
    const result = await this.pool.query(
      `
        SELECT id, role, status
        FROM users
        WHERE id = $1
          AND status != 'deleted'
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] || null;
  }

  async upsertProfile(userId, input) {
    const result = await this.pool.query(
      `
        INSERT INTO customer_profiles (
          user_id,
          date_of_birth,
          gender,
          emergency_contact_name,
          emergency_contact_phone,
          abha_id_optional,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id)
        DO UPDATE SET
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          emergency_contact_name = EXCLUDED.emergency_contact_name,
          emergency_contact_phone = EXCLUDED.emergency_contact_phone,
          abha_id_optional = EXCLUDED.abha_id_optional,
          metadata = EXCLUDED.metadata,
          updated_at = now()
        RETURNING ${PROFILE_COLUMNS}
      `,
      [
        userId,
        input.dateOfBirth || null,
        input.gender || null,
        input.emergencyContactName || null,
        input.emergencyContactPhone || null,
        input.abhaIdOptional || null,
        input.metadata || {},
      ],
    );

    return mapProfileRow(result.rows[0]);
  }

  async findProfileByUserId(userId) {
    const result = await this.pool.query(
      `
        SELECT ${PROFILE_COLUMNS}
        FROM customer_profiles
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId],
    );

    return mapProfileRow(result.rows[0]);
  }

  async createAddress(userId, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (input.isDefault) {
        await client.query(
          `
            UPDATE user_addresses
            SET is_default = false,
                updated_at = now()
            WHERE user_id = $1
          `,
          [userId],
        );
      }

      const result = await client.query(
        `
          INSERT INTO user_addresses (
            user_id,
            label,
            recipient_name,
            phone,
            address_line1,
            address_line2,
            city,
            state,
            pincode,
            latitude,
            longitude,
            is_default,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING ${ADDRESS_COLUMNS}
        `,
        [
          userId,
          input.label || null,
          input.recipientName || null,
          input.phone || null,
          input.addressLine1,
          input.addressLine2 || null,
          input.city,
          input.state,
          input.pincode,
          input.latitude ?? null,
          input.longitude ?? null,
          input.isDefault || false,
          input.metadata || {},
        ],
      );

      await client.query("COMMIT");
      return mapAddressRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async listAddresses(userId) {
    const result = await this.pool.query(
      `
        SELECT ${ADDRESS_COLUMNS}
        FROM user_addresses
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
      `,
      [userId],
    );

    return result.rows.map(mapAddressRow);
  }

  async findAddressById(userId, addressId) {
    const result = await this.pool.query(
      `
        SELECT ${ADDRESS_COLUMNS}
        FROM user_addresses
        WHERE user_id = $1
          AND id = $2
        LIMIT 1
      `,
      [userId, addressId],
    );

    return mapAddressRow(result.rows[0]);
  }

  async updateAddress(userId, addressId, changes) {
    const fields = {
      label: "label",
      recipientName: "recipient_name",
      phone: "phone",
      addressLine1: "address_line1",
      addressLine2: "address_line2",
      city: "city",
      state: "state",
      pincode: "pincode",
      latitude: "latitude",
      longitude: "longitude",
      isDefault: "is_default",
      metadata: "metadata",
    };

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (changes.isDefault === true) {
        await client.query(
          `
            UPDATE user_addresses
            SET is_default = false,
                updated_at = now()
            WHERE user_id = $1
          `,
          [userId],
        );
      }

      const values = [];
      const assignments = [];

      for (const [key, column] of Object.entries(fields)) {
        if (Object.prototype.hasOwnProperty.call(changes, key)) {
          values.push(changes[key] ?? null);
          assignments.push(`${column} = $${values.length}`);
        }
      }

      if (assignments.length === 0) {
        await client.query("ROLLBACK");
        return this.findAddressById(userId, addressId);
      }

      values.push(userId, addressId);

      const result = await client.query(
        `
          UPDATE user_addresses
          SET ${assignments.join(", ")},
              updated_at = now()
          WHERE user_id = $${values.length - 1}
            AND id = $${values.length}
          RETURNING ${ADDRESS_COLUMNS}
        `,
        values,
      );

      await client.query("COMMIT");
      return mapAddressRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async setDefaultAddress(userId, addressId) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE user_addresses
          SET is_default = false,
              updated_at = now()
          WHERE user_id = $1
        `,
        [userId],
      );

      const result = await client.query(
        `
          UPDATE user_addresses
          SET is_default = true,
              updated_at = now()
          WHERE user_id = $1
            AND id = $2
          RETURNING ${ADDRESS_COLUMNS}
        `,
        [userId, addressId],
      );

      await client.query("COMMIT");
      return mapAddressRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteAddress(userId, addressId) {
    const result = await this.pool.query(
      `
        DELETE FROM user_addresses
        WHERE user_id = $1
          AND id = $2
        RETURNING ${ADDRESS_COLUMNS}
      `,
      [userId, addressId],
    );

    return mapAddressRow(result.rows[0]);
  }
}

module.exports = {
  CustomerModel,
  mapProfileRow,
  mapAddressRow,
};
