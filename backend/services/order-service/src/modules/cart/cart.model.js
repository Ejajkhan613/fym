const { pool: defaultPool } = require("../../db/pool");

const CART_ITEM_COLUMNS = `
  id,
  customer_id,
  medicine_id,
  requested_name,
  quantity,
  unit_price,
  requires_prescription,
  metadata,
  created_at,
  updated_at
`;

function mapCartItemRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    customerId: row.customer_id,
    medicineId: row.medicine_id,
    requestedName: row.requested_name,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    requiresPrescription: row.requires_prescription,
    lineTotal: Number((Number(row.unit_price) * row.quantity).toFixed(2)),
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class CartModel {
  constructor({ pool = defaultPool } = {}) {
    this.pool = pool;
  }

  async list(customerId) {
    const result = await this.pool.query(
      `
        SELECT ${CART_ITEM_COLUMNS}
        FROM cart_items
        WHERE customer_id = $1
        ORDER BY created_at DESC
      `,
      [customerId],
    );

    return result.rows.map(mapCartItemRow);
  }

  async addItem(input) {
    const result = await this.pool.query(
      `
        INSERT INTO cart_items (
          customer_id,
          medicine_id,
          requested_name,
          quantity,
          unit_price,
          requires_prescription,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ${CART_ITEM_COLUMNS}
      `,
      [
        input.customerId,
        input.medicineId || null,
        input.requestedName,
        input.quantity,
        input.unitPrice ?? 0,
        input.requiresPrescription || false,
        input.metadata || {},
      ],
    );

    return mapCartItemRow(result.rows[0]);
  }

  async updateItem(id, changes) {
    const fields = {
      quantity: "quantity",
      unitPrice: "unit_price",
      requiresPrescription: "requires_prescription",
      metadata: "metadata",
    };
    const values = [];
    const assignments = [];

    for (const [key, column] of Object.entries(fields)) {
      if (Object.prototype.hasOwnProperty.call(changes, key)) {
        values.push(changes[key] ?? null);
        assignments.push(`${column} = $${values.length}`);
      }
    }

    if (assignments.length === 0) return this.findItemById(id);

    values.push(id);

    const result = await this.pool.query(
      `
        UPDATE cart_items
        SET ${assignments.join(", ")},
            updated_at = now()
        WHERE id = $${values.length}
        RETURNING ${CART_ITEM_COLUMNS}
      `,
      values,
    );

    return mapCartItemRow(result.rows[0]);
  }

  async findItemById(id) {
    const result = await this.pool.query(
      `
        SELECT ${CART_ITEM_COLUMNS}
        FROM cart_items
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    );

    return mapCartItemRow(result.rows[0]);
  }

  async removeItem(id) {
    const result = await this.pool.query(
      `
        DELETE FROM cart_items
        WHERE id = $1
        RETURNING ${CART_ITEM_COLUMNS}
      `,
      [id],
    );

    return mapCartItemRow(result.rows[0]);
  }

  async clear(customerId) {
    const result = await this.pool.query(
      `
        DELETE FROM cart_items
        WHERE customer_id = $1
        RETURNING ${CART_ITEM_COLUMNS}
      `,
      [customerId],
    );

    return result.rows.map(mapCartItemRow);
  }
}

module.exports = {
  CartModel,
  mapCartItemRow,
};
