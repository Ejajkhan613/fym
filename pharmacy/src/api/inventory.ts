import { apiRequest } from './http';
import type { ApiEnvelope } from '../types/api';
import type {
  CreateInventoryItemPayload,
  InventoryItem,
  StockMismatchReason,
  StockMismatchReport,
} from '../types/domain';

type ListInventoryFilters = {
  q?: string;
  lowStockOnly?: boolean;
  lowStockThreshold?: number;
  expiringWithinDays?: number;
  coldChainRequired?: boolean;
  fastMoving?: boolean;
  limit?: number;
  offset?: number;
};

export function listInventory(
  pharmacyId: string,
  filters: ListInventoryFilters = {},
  accessToken?: string,
) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return apiRequest<ApiEnvelope<InventoryItem[]>>(
    `/pharmacies/${pharmacyId}/inventory${query ? `?${query}` : ''}`,
    { accessToken },
  );
}

export function createInventoryItem(
  pharmacyId: string,
  payload: CreateInventoryItemPayload,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<InventoryItem>>(`/pharmacies/${pharmacyId}/inventory`, {
    method: 'POST',
    body: JSON.stringify(payload),
    accessToken,
  });
}

export function updateInventoryItem(
  pharmacyId: string,
  inventoryId: string,
  payload: Partial<CreateInventoryItemPayload>,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<InventoryItem>>(
    `/pharmacies/${pharmacyId}/inventory/${inventoryId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}

export function adjustInventoryQuantity(
  pharmacyId: string,
  inventoryId: string,
  quantityDelta: number,
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<InventoryItem>>(
    `/pharmacies/${pharmacyId}/inventory/${inventoryId}/adjust`,
    {
      method: 'POST',
      body: JSON.stringify({ quantityDelta }),
      accessToken,
    },
  );
}

export function bulkUploadInventory(
  pharmacyId: string,
  items: CreateInventoryItemPayload[],
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<InventoryItem[]>>(
    `/pharmacies/${pharmacyId}/inventory/bulk-upload`,
    {
      method: 'POST',
      body: JSON.stringify({ source: 'bulk_upload', items }),
      accessToken,
    },
  );
}

export function reportStockMismatch(
  pharmacyId: string,
  payload: {
    inventoryId?: string;
    orderId?: string;
    medicineName: string;
    expectedQuantity?: number;
    actualQuantity?: number;
    reason: StockMismatchReason;
    notes?: string;
    reportedByUserId?: string;
    metadata?: Record<string, unknown>;
  },
  accessToken?: string,
) {
  return apiRequest<ApiEnvelope<StockMismatchReport>>(
    `/pharmacies/${pharmacyId}/inventory/mismatch-reports`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      accessToken,
    },
  );
}
