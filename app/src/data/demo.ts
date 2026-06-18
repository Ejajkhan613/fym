import type { CartEntry, LocalOrder, Medicine } from '../types/domain';

export const quickReorders: CartEntry[] = [
  {
    id: 'quick-paracetamol',
    name: 'Paracetamol 500mg',
    pack: 'Strip of 10 tablets',
    price: 18,
    quantity: 1,
    requiresPrescription: false,
  },
  {
    id: 'quick-cetirizine',
    name: 'Cetirizine 10mg',
    pack: 'Strip of 10 tablets',
    price: 32,
    quantity: 1,
    requiresPrescription: false,
  },
];

export const demoMedicines: Medicine[] = [
  {
    id: 'demo-dolo-650',
    brandName: 'Dolo 650 Tablet',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    packSize: 'Strip of 15 tablets',
    mrp: 34,
    requiresPrescription: false,
  },
  {
    id: 'demo-crocin-650',
    brandName: 'Crocin Advance 650',
    genericName: 'Paracetamol',
    strength: '650mg',
    dosageForm: 'Tablet',
    packSize: 'Strip of 15 tablets',
    mrp: 36,
    requiresPrescription: false,
  },
  {
    id: 'demo-amoxicillin',
    brandName: 'Amoxicillin 500mg',
    genericName: 'Amoxicillin',
    strength: '500mg',
    dosageForm: 'Capsule',
    packSize: 'Strip of 10 capsules',
    mrp: 78,
    requiresPrescription: true,
  },
];

export const demoOrders: LocalOrder[] = [
  {
    id: 'FYM-1028',
    status: 'Out for delivery',
    total: 214,
    createdAt: 'Today, 10:24 AM',
    itemsCount: 3,
    itemsSummary: 'Dolo 650 Tablet, ORS sachets',
    deliveryLabel: 'Home',
    deliveryAddress: 'Koramangala 5th Block, Bengaluru, Karnataka, 560095',
    paymentStatus: 'Payment pending',
    orderType: 'OTC',
  },
  {
    id: 'FYM-1019',
    status: 'Delivered',
    total: 68,
    createdAt: '3 days ago',
    itemsCount: 1,
    itemsSummary: 'Cetirizine 10mg',
    deliveryLabel: 'Home',
    deliveryAddress: 'Koramangala 5th Block, Bengaluru, Karnataka, 560095',
    paymentStatus: 'Paid',
    orderType: 'OTC',
  },
];
