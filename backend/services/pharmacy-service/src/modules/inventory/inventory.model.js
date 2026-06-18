const { pool: defaultPool } = require("../../db/pool");

const INVENTORY_COLUMNS = `
  id,
  pharmacy_id,
  medicine_id,
  medicine_name,
  generic_name,
  strength,
  quantity,
  batch_number,
  expiry_date,
  price,
  cold_chain_required,
  fast_moving,
  source,
  last_updated_at,
  stock_confidence_score,
  metadata,
  created_at,
  updated_at
`;

const INVENTORY_SELECT_COLUMNS = `
  pi.id,
  pi.pharmacy_id,
  pi.medicine_id,
  pi.medicine_name,
  pi.generic_name,
  pi.strength,
  pi.quantity,
  pi.batch_number,
  pi.expiry_date,
  pi.price,
  pi.cold_chain_required,
  pi.fast_moving,
  pi.source,
  pi.last_updated_at,
  pi.stock_confidence_score,
  pi.metadata,
  pi.created_at,
  pi.updated_at
`;

const MISMATCH_REPORT_COLUMNS = `
  id,
  pharmacy_id,
  inventory_id,
  order_id,
  medicine_name,
  expected_quantity,
  actual_quantity,
  reason,
  notes,
  status,
  reported_by_user_id,
  metadata,
  created_at,
  resolved_at
`;

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function mapInventoryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    medicineId: row.medicine_id,
    medicineName: row.medicine_name,
    genericName: row.generic_name || "Generic not set",
    strength: row.strength || "Strength not set",
    quantity: row.quantity,
    batchNumber: row.batch_number || "Batch not set",
    expiryDate: toDateOnly(row.expiry_date),
    price: Number(row.price),
    coldChainRequired: row.cold_chain_required,
    fastMoving: row.fast_moving,
    source: row.source,
    lastUpdatedAt: row.last_updated_at,
    stockConfidenceScore: Number(row.stock_confidence_score),
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMismatchReportRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    pharmacyId: row.pharmacy_id,
    inventoryId: row.inventory_id,
    orderId: row.order_id,
    medicineName: row.medicine_name,
    expectedQuantity: row.expected_quantity,
    actualQuantity: row.actual_quantity,
    reason: row.reason,
    notes: row.notes,
    status: row.status,
    reportedByUserId: row.reported_by_user_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

class PharmacyInventoryModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async findPharmacyById(pharmacyId) {
    const result = await this.pool.query(
      `
        SELECT id, status
        FROM pharmacies
        WHERE id = $1
      `,
      [pharmacyId],
    );

    return result.rows[0] || null;
  }

  async listInventory(pharmacyId, filters = {}) {
    const values = [pharmacyId];
    const where = ["pi.pharmacy_id = $1"];

    if (filters.q) {
      values.push(`%${filters.q}%`);
      const param = `$${values.length}`;
      where.push(
        `(pi.medicine_name ILIKE ${param} OR pi.generic_name ILIKE ${param} OR pi.batch_number ILIKE ${param})`,
      );
    }

    if (filters.lowStockOnly) {
      values.push(filters.lowStockThreshold ?? 10);
      where.push(`pi.quantity <= $${values.length}`);
    }

    if (filters.expiringWithinDays !== undefined) {
      values.push(filters.expiringWithinDays);
      where.push(
        `pi.expiry_date IS NOT NULL AND pi.expiry_date <= CURRENT_DATE + ($${values.length}::int * INTERVAL '1 day')`,
      );
    }

    if (typeof filters.coldChainRequired === "boolean") {
      values.push(filters.coldChainRequired);
      where.push(`pi.cold_chain_required = $${values.length}`);
    }

    if (typeof filters.fastMoving === "boolean") {
      values.push(filters.fastMoving);
      where.push(`pi.fast_moving = $${values.length}`);
    }

    values.push(filters.limit ?? 100);
    const limitParam = `$${values.length}`;
    values.push(filters.offset ?? 0);
    const offsetParam = `$${values.length}`;

    const result = await this.pool.query(
      `
        SELECT
          ${INVENTORY_SELECT_COLUMNS},
          COUNT(*) OVER() AS total_count
        FROM pharmacy_inventory pi
        WHERE ${where.join(" AND ")}
        ORDER BY
          CASE WHEN pi.quantity <= 10 THEN 0 ELSE 1 END,
          pi.expiry_date ASC NULLS LAST,
          pi.last_updated_at DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      values,
    );

    return {
      items: result.rows.map(mapInventoryRow),
      total: Number(result.rows[0]?.total_count || 0),
    };
  }

  async createInventoryItem(pharmacyId, input) {
    const result = await this.insertInventoryItem(this.pool, pharmacyId, input);
    return mapInventoryRow(result.rows[0]);
  }

  async bulkCreateInventoryItems(pharmacyId, items) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const created = [];
      for (const item of items) {
        const result = await this.insertInventoryItem(client, pharmacyId, item);
        created.push(mapInventoryRow(result.rows[0]));
      }

      await client.query("COMMIT");
      return created;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateInventoryItem(pharmacyId, inventoryId, input) {
    const values = [];
    const assignments = [];

    const set = (column, value) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (Object.prototype.hasOwnProperty.call(input, "medicineId")) {
      set("medicine_id", input.medicineId);
    }

    if (Object.prototype.hasOwnProperty.call(input, "medicineName")) {
      set("medicine_name", input.medicineName);
    }

    if (Object.prototype.hasOwnProperty.call(input, "genericName")) {
      set("generic_name", input.genericName);
    }

    if (Object.prototype.hasOwnProperty.call(input, "strength")) {
      set("strength", input.strength);
    }

    if (Object.prototype.hasOwnProperty.call(input, "quantity")) {
      set("quantity", input.quantity);
    }

    if (Object.prototype.hasOwnProperty.call(input, "batchNumber")) {
      set("batch_number", input.batchNumber);
    }

    if (Object.prototype.hasOwnProperty.call(input, "expiryDate")) {
      set("expiry_date", input.expiryDate);
    }

    if (Object.prototype.hasOwnProperty.call(input, "price")) {
      set("price", input.price);
    }

    if (Object.prototype.hasOwnProperty.call(input, "coldChainRequired")) {
      set("cold_chain_required", input.coldChainRequired);
    }

    if (Object.prototype.hasOwnProperty.call(input, "fastMoving")) {
      set("fast_moving", input.fastMoving);
    }

    if (Object.prototype.hasOwnProperty.call(input, "source")) {
      set("source", input.source);
    }

    if (Object.prototype.hasOwnProperty.call(input, "stockConfidenceScore")) {
      set("stock_confidence_score", input.stockConfidenceScore);
    }

    if (Object.prototype.hasOwnProperty.call(input, "metadata")) {
      set("metadata", input.metadata);
    }

    assignments.push("last_updated_at = now()", "updated_at = now()");
    values.push(pharmacyId);
    const pharmacyParam = `$${values.length}`;
    values.push(inventoryId);
    const inventoryParam = `$${values.length}`;

    const result = await this.pool.query(
      `
        UPDATE pharmacy_inventory
        SET ${assignments.join(", ")}
        WHERE pharmacy_id = ${pharmacyParam}
          AND id = ${inventoryParam}
        RETURNING ${INVENTORY_COLUMNS}
      `,
      values,
    );

    return mapInventoryRow(result.rows[0]);
  }

  async adjustInventoryQuantity(pharmacyId, inventoryId, quantityDelta) {
    const result = await this.pool.query(
      `
        UPDATE pharmacy_inventory
        SET
          quantity = GREATEST(0, quantity + $3),
          source = 'manual',
          stock_confidence_score = GREATEST(stock_confidence_score, 65),
          last_updated_at = now(),
          updated_at = now()
        WHERE pharmacy_id = $1
          AND id = $2
        RETURNING ${INVENTORY_COLUMNS}
      `,
      [pharmacyId, inventoryId, quantityDelta],
    );

    return mapInventoryRow(result.rows[0]);
  }

  async createMismatchReport(pharmacyId, input) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      if (input.inventoryId) {
        const inventoryResult = await client.query(
          `
            SELECT id
            FROM pharmacy_inventory
            WHERE pharmacy_id = $1
              AND id = $2
          `,
          [pharmacyId, input.inventoryId],
        );

        if (inventoryResult.rowCount === 0) {
          await client.query("ROLLBACK");
          return null;
        }

        await client.query(
          `
            UPDATE pharmacy_inventory
            SET
              stock_confidence_score = GREATEST(0, stock_confidence_score - 15),
              last_updated_at = now(),
              updated_at = now()
            WHERE pharmacy_id = $1
              AND id = $2
          `,
          [pharmacyId, input.inventoryId],
        );
      }

      const result = await client.query(
        `
          INSERT INTO pharmacy_stock_mismatch_reports (
            pharmacy_id,
            inventory_id,
            order_id,
            medicine_name,
            expected_quantity,
            actual_quantity,
            reason,
            notes,
            reported_by_user_id,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING ${MISMATCH_REPORT_COLUMNS}
        `,
        [
          pharmacyId,
          input.inventoryId || null,
          input.orderId || null,
          input.medicineName,
          input.expectedQuantity ?? null,
          input.actualQuantity ?? null,
          input.reason,
          input.notes || null,
          input.reportedByUserId || null,
          input.metadata || {},
        ],
      );

      await client.query("COMMIT");
      return mapMismatchReportRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  insertInventoryItem(queryTarget, pharmacyId, input) {
    return queryTarget.query(
      `
        INSERT INTO pharmacy_inventory (
          pharmacy_id,
          medicine_id,
          medicine_name,
          generic_name,
          strength,
          quantity,
          batch_number,
          expiry_date,
          price,
          cold_chain_required,
          fast_moving,
          source,
          stock_confidence_score,
          metadata
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14
        )
        RETURNING ${INVENTORY_COLUMNS}
      `,
      [
        pharmacyId,
        input.medicineId || null,
        input.medicineName,
        input.genericName || null,
        input.strength || null,
        input.quantity,
        input.batchNumber || null,
        input.expiryDate || null,
        input.price,
        input.coldChainRequired,
        input.fastMoving,
        input.source || "manual",
        input.stockConfidenceScore ?? 55,
        input.metadata || {},
      ],
    );
  }
}

module.exports = {
  PharmacyInventoryModel,
  mapInventoryRow,
  mapMismatchReportRow,
};
