import type { PharmacyDocumentType } from '../types/domain';

export function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`)
    .join(' ');
}

export function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatMoney(value: number) {
  return `Rs ${Math.round(value)}`;
}

export function formatAddress(address?: Record<string, unknown>) {
  if (!address) {
    return 'Address not available';
  }

  return [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ');
}

export function getMissingDocuments(uploadedTypes: PharmacyDocumentType[]) {
  const required: PharmacyDocumentType[] = [
    'DRUG_LICENSE',
    'GST_CERTIFICATE',
    'SHOP_REGISTRATION',
    'OWNER_KYC',
    'PHARMACIST_REGISTRATION_CERTIFICATE',
    'BANK_ACCOUNT',
    'STORE_ADDRESS_PROOF',
    'INVOICE_FORMAT',
    'RETURN_POLICY_AGREEMENT',
    'PLATFORM_SERVICE_AGREEMENT',
    'PENALTY_AGREEMENT',
    'PRESCRIPTION_COMPLIANCE_DECLARATION',
  ];

  return required.filter((type) => !uploadedTypes.includes(type));
}
