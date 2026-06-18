const { pool: defaultPool } = require("../../db/pool");

const PROFILE_COLUMNS = `
  id,
  user_id,
  date_of_birth,
  gender,
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

const FAMILY_PROFILE_COLUMNS = `
  id,
  user_id,
  full_name,
  relationship,
  date_of_birth,
  gender,
  created_at,
  updated_at
`;

const MEDICINE_REMINDER_COLUMNS = `
  id,
  user_id,
  family_profile_id,
  medicine_name,
  dosage,
  frequency,
  schedule_time,
  start_date,
  end_date,
  notes,
  is_active,
  created_at,
  updated_at
`;

const PRIVACY_SETTINGS_COLUMNS = `
  user_id,
  push_notifications_enabled,
  sms_notifications_enabled,
  order_updates_enabled,
  prescription_updates_enabled,
  support_updates_enabled,
  medicine_reminders_enabled,
  promotional_offers_enabled,
  data_sharing_consent,
  gps_for_addresses_enabled,
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

function mapFamilyProfileRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    relationship: row.relationship,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMedicineReminderRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    familyProfileId: row.family_profile_id,
    medicineName: row.medicine_name,
    dosage: row.dosage,
    frequency: row.frequency,
    scheduleTime:
      typeof row.schedule_time === "string"
        ? row.schedule_time.slice(0, 5)
        : row.schedule_time,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPrivacySettingsRow(row) {
  if (!row) return null;

  return {
    userId: row.user_id,
    pushNotificationsEnabled: row.push_notifications_enabled,
    smsNotificationsEnabled: row.sms_notifications_enabled,
    orderUpdatesEnabled: row.order_updates_enabled,
    prescriptionUpdatesEnabled: row.prescription_updates_enabled,
    supportUpdatesEnabled: row.support_updates_enabled,
    medicineRemindersEnabled: row.medicine_reminders_enabled,
    promotionalOffersEnabled: row.promotional_offers_enabled,
    dataSharingConsent: row.data_sharing_consent,
    gpsForAddressesEnabled: row.gps_for_addresses_enabled,
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
          gender
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          date_of_birth = EXCLUDED.date_of_birth,
          gender = EXCLUDED.gender,
          updated_at = now()
        RETURNING ${PROFILE_COLUMNS}
      `,
      [userId, input.dateOfBirth || null, input.gender || null],
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

  async listFamilyProfiles(userId) {
    const result = await this.pool.query(
      `
        SELECT ${FAMILY_PROFILE_COLUMNS}
        FROM customer_family_profiles
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows.map(mapFamilyProfileRow);
  }

  async findFamilyProfileById(userId, familyProfileId) {
    const result = await this.pool.query(
      `
        SELECT ${FAMILY_PROFILE_COLUMNS}
        FROM customer_family_profiles
        WHERE user_id = $1
          AND id = $2
        LIMIT 1
      `,
      [userId, familyProfileId],
    );

    return mapFamilyProfileRow(result.rows[0]);
  }

  async createFamilyProfile(userId, input) {
    const result = await this.pool.query(
      `
        INSERT INTO customer_family_profiles (
          user_id,
          full_name,
          relationship,
          date_of_birth,
          gender
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${FAMILY_PROFILE_COLUMNS}
      `,
      [
        userId,
        input.fullName,
        input.relationship,
        input.dateOfBirth || null,
        input.gender || null,
      ],
    );

    return mapFamilyProfileRow(result.rows[0]);
  }

  async updateFamilyProfile(userId, familyProfileId, changes) {
    const fields = {
      fullName: "full_name",
      relationship: "relationship",
      dateOfBirth: "date_of_birth",
      gender: "gender",
    };
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        values.push(changes[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) {
      return this.findFamilyProfileById(userId, familyProfileId);
    }

    values.push(userId, familyProfileId);

    const result = await this.pool.query(
      `
        UPDATE customer_family_profiles
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE user_id = $${values.length - 1}
          AND id = $${values.length}
        RETURNING ${FAMILY_PROFILE_COLUMNS}
      `,
      values,
    );

    return mapFamilyProfileRow(result.rows[0]);
  }

  async deleteFamilyProfile(userId, familyProfileId) {
    const result = await this.pool.query(
      `
        DELETE FROM customer_family_profiles
        WHERE user_id = $1
          AND id = $2
        RETURNING ${FAMILY_PROFILE_COLUMNS}
      `,
      [userId, familyProfileId],
    );

    return mapFamilyProfileRow(result.rows[0]);
  }

  async listMedicineReminders(userId) {
    const result = await this.pool.query(
      `
        SELECT ${MEDICINE_REMINDER_COLUMNS}
        FROM medicine_reminders
        WHERE user_id = $1
        ORDER BY is_active DESC, schedule_time ASC, created_at DESC
      `,
      [userId],
    );

    return result.rows.map(mapMedicineReminderRow);
  }

  async findMedicineReminderById(userId, reminderId) {
    const result = await this.pool.query(
      `
        SELECT ${MEDICINE_REMINDER_COLUMNS}
        FROM medicine_reminders
        WHERE user_id = $1
          AND id = $2
        LIMIT 1
      `,
      [userId, reminderId],
    );

    return mapMedicineReminderRow(result.rows[0]);
  }

  async createMedicineReminder(userId, input) {
    const result = await this.pool.query(
      `
        INSERT INTO medicine_reminders (
          user_id,
          family_profile_id,
          medicine_name,
          dosage,
          frequency,
          schedule_time,
          start_date,
          end_date,
          notes,
          is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING ${MEDICINE_REMINDER_COLUMNS}
      `,
      [
        userId,
        input.familyProfileId || null,
        input.medicineName,
        input.dosage || null,
        input.frequency,
        input.scheduleTime,
        input.startDate,
        input.endDate || null,
        input.notes || null,
        input.isActive ?? true,
      ],
    );

    return mapMedicineReminderRow(result.rows[0]);
  }

  async updateMedicineReminder(userId, reminderId, changes) {
    const fields = {
      familyProfileId: "family_profile_id",
      medicineName: "medicine_name",
      dosage: "dosage",
      frequency: "frequency",
      scheduleTime: "schedule_time",
      startDate: "start_date",
      endDate: "end_date",
      notes: "notes",
      isActive: "is_active",
    };
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        values.push(changes[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) {
      return this.findMedicineReminderById(userId, reminderId);
    }

    values.push(userId, reminderId);

    const result = await this.pool.query(
      `
        UPDATE medicine_reminders
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE user_id = $${values.length - 1}
          AND id = $${values.length}
        RETURNING ${MEDICINE_REMINDER_COLUMNS}
      `,
      values,
    );

    return mapMedicineReminderRow(result.rows[0]);
  }

  async deleteMedicineReminder(userId, reminderId) {
    const result = await this.pool.query(
      `
        DELETE FROM medicine_reminders
        WHERE user_id = $1
          AND id = $2
        RETURNING ${MEDICINE_REMINDER_COLUMNS}
      `,
      [userId, reminderId],
    );

    return mapMedicineReminderRow(result.rows[0]);
  }

  async getPrivacySettings(userId) {
    const result = await this.pool.query(
      `
        INSERT INTO customer_privacy_settings (user_id)
        VALUES ($1)
        ON CONFLICT (user_id)
        DO UPDATE SET user_id = EXCLUDED.user_id
        RETURNING ${PRIVACY_SETTINGS_COLUMNS}
      `,
      [userId],
    );

    return mapPrivacySettingsRow(result.rows[0]);
  }

  async updatePrivacySettings(userId, input) {
    const result = await this.pool.query(
      `
        INSERT INTO customer_privacy_settings (
          user_id,
          push_notifications_enabled,
          sms_notifications_enabled,
          order_updates_enabled,
          prescription_updates_enabled,
          support_updates_enabled,
          medicine_reminders_enabled,
          promotional_offers_enabled,
          data_sharing_consent,
          gps_for_addresses_enabled
        )
        VALUES (
          $1,
          COALESCE($2, true),
          COALESCE($3, true),
          COALESCE($4, true),
          COALESCE($5, true),
          COALESCE($6, true),
          COALESCE($7, true),
          COALESCE($8, false),
          COALESCE($9, false),
          COALESCE($10, true)
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          push_notifications_enabled = COALESCE($2, customer_privacy_settings.push_notifications_enabled),
          sms_notifications_enabled = COALESCE($3, customer_privacy_settings.sms_notifications_enabled),
          order_updates_enabled = COALESCE($4, customer_privacy_settings.order_updates_enabled),
          prescription_updates_enabled = COALESCE($5, customer_privacy_settings.prescription_updates_enabled),
          support_updates_enabled = COALESCE($6, customer_privacy_settings.support_updates_enabled),
          medicine_reminders_enabled = COALESCE($7, customer_privacy_settings.medicine_reminders_enabled),
          promotional_offers_enabled = COALESCE($8, customer_privacy_settings.promotional_offers_enabled),
          data_sharing_consent = COALESCE($9, customer_privacy_settings.data_sharing_consent),
          gps_for_addresses_enabled = COALESCE($10, customer_privacy_settings.gps_for_addresses_enabled),
          updated_at = now()
        RETURNING ${PRIVACY_SETTINGS_COLUMNS}
      `,
      [
        userId,
        input.pushNotificationsEnabled,
        input.smsNotificationsEnabled,
        input.orderUpdatesEnabled,
        input.prescriptionUpdatesEnabled,
        input.supportUpdatesEnabled,
        input.medicineRemindersEnabled,
        input.promotionalOffersEnabled,
        input.dataSharingConsent,
        input.gpsForAddressesEnabled,
      ],
    );

    return mapPrivacySettingsRow(result.rows[0]);
  }
}

module.exports = {
  CustomerModel,
  mapProfileRow,
  mapAddressRow,
  mapFamilyProfileRow,
  mapMedicineReminderRow,
  mapPrivacySettingsRow,
};
