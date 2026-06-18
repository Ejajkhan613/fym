import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Check,
  ClipboardList,
  Clock,
  FileText,
  MapPin,
  PackageCheck,
  Pill,
  ShieldCheck,
  Truck,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { Order, PharmacyOrderDetails } from '../../types/domain';
import {
  formatAddress,
  formatDateTime,
  formatMoney,
  shortId,
  titleCase,
} from '../../utils/format';

type OrdersScreenProps = {
  orders: Order[];
  orderDetailsById: Record<string, PharmacyOrderDetails>;
  isSaving: boolean;
  onMarkPacking: (order: Order) => void;
  onMarkPacked: (order: Order) => void;
  onCancelOrder: (order: Order, reason: string) => void;
};

type PackingChecklist = {
  itemsPicked: boolean;
  batchExpiryChecked: boolean;
  invoiceReady: boolean;
  packageSealed: boolean;
  note: string;
};

const cancellationReasons = [
  'Prescription invalid',
  'Medicine damaged',
  'Customer requested illegal quantity',
  'Emergency store closure',
  'System duplicate order',
];

export function OrdersScreen({
  orders,
  orderDetailsById,
  isSaving,
  onMarkPacking,
  onMarkPacked,
  onCancelOrder,
}: OrdersScreenProps) {
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>(
    {},
  );
  const [packingChecklists, setPackingChecklists] = useState<
    Record<string, PackingChecklist>
  >({});
  const activeOrders = orders.filter((order) =>
    [
      'VENDOR_ACCEPTED',
      'PHARMACIST_APPROVED',
      'PACKING',
      'PACKED',
      'RIDER_ASSIGNED',
    ].includes(order.status),
  );
  const packingRisk = activeOrders.filter(
    (order) => getPackingSla(order, orderDetailsById[order.id]).isAtRisk,
  ).length;

  function getPackingChecklist(order: Order): PackingChecklist {
    return (
      packingChecklists[order.id] || {
        itemsPicked: false,
        batchExpiryChecked: false,
        invoiceReady: false,
        packageSealed: false,
        note: '',
      }
    );
  }

  function updatePackingChecklist(
    order: Order,
    changes: Partial<PackingChecklist>,
  ) {
    setPackingChecklists((current) => ({
      ...current,
      [order.id]: {
        ...getPackingChecklist(order),
        ...changes,
      },
    }));
  }

  function cancel(order: Order) {
    const reason = cancelReasons[order.id]?.trim();

    if (!reason) {
      Alert.alert(
        'Cancel reason required',
        'Vendor cancellation requires a valid regulatory or operational reason.',
      );
      return;
    }

    Alert.alert(
      'Cancel accepted order?',
      'This can trigger penalty review if the reason is not valid. Continue only if the order cannot legally or operationally be fulfilled.',
      [
        { text: 'Keep order', style: 'cancel' },
        {
          text: 'Cancel order',
          style: 'destructive',
          onPress: () => onCancelOrder(order, reason),
        },
      ],
    );
  }

  function pack(order: Order) {
    const checklist = getPackingChecklist(order);

    if (getPackingProgress(checklist) < 4) {
      Alert.alert(
        'Complete packing checklist',
        'Confirm picked items, batch/expiry, invoice, and sealed package before marking ready.',
      );
      return;
    }

    onMarkPacked(order);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Order Queue</Text>
        <Text style={styles.subtitle}>
          Move accepted orders through audited packing and pickup readiness.
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.summaryRow}>
          <SummaryTile
            label="Active"
            value={String(activeOrders.length)}
            tone="blue"
          />
          <SummaryTile
            label="Packing risk"
            value={String(packingRisk)}
            tone={packingRisk > 0 ? 'warning' : 'teal'}
          />
          <SummaryTile
            label="Ready"
            value={String(
              activeOrders.filter((order) => order.status === 'PACKED').length,
            )}
            tone="teal"
          />
        </View>

        {activeOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <ClipboardList
                color={colors.primary}
                size={34}
                strokeWidth={2.4}
              />
            </View>
            <Text style={styles.emptyTitle}>No active orders</Text>
            <Text style={styles.emptyText}>
              Accepted orders will appear here for checklist packing and pickup
              updates.
            </Text>
          </View>
        ) : null}

        {activeOrders.map((order) => {
          const details = orderDetailsById[order.id];
          const tone = getStatusTone(order.status);
          const checklist = getPackingChecklist(order);
          const checklistDone = getPackingProgress(checklist);
          const sla = getPackingSla(order, details);
          const canStartPacking = [
            'VENDOR_ACCEPTED',
            'PHARMACIST_APPROVED',
          ].includes(order.status);
          const canMarkPacked = [
            'VENDOR_ACCEPTED',
            'PHARMACIST_APPROVED',
            'PACKING',
          ].includes(order.status);

          return (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View
                  style={[
                    styles.orderIcon,
                    { backgroundColor: tone.background },
                  ]}
                >
                  <PackageCheck
                    color={tone.color}
                    size={27}
                    strokeWidth={2.4}
                  />
                </View>
                <View style={styles.orderCopy}>
                  <Text style={styles.orderTitle}>
                    Order {shortId(order.id)}
                  </Text>
                  <Text style={styles.orderMeta}>
                    {titleCase(order.status)} - {formatMoney(order.totalAmount)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: tone.background },
                  ]}
                >
                  <Text style={[styles.statusText, { color: tone.color }]}>
                    {titleCase(order.orderType)}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineRow}>
                {['Accepted', 'Packing', 'Ready'].map((step, index) => (
                  <View key={step} style={styles.timelineStep}>
                    <View
                      style={[
                        styles.timelineDot,
                        index <= getProgressIndex(order.status)
                          ? styles.timelineDotActive
                          : null,
                      ]}
                    />
                    <Text
                      style={[
                        styles.timelineLabel,
                        index <= getProgressIndex(order.status)
                          ? styles.timelineLabelActive
                          : null,
                      ]}
                    >
                      {step}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.opsGrid}>
                <InfoPill
                  Icon={Clock}
                  label="Packing SLA"
                  value={sla.label}
                  tone={sla.isAtRisk ? 'warning' : 'blue'}
                />
                <InfoPill
                  Icon={ShieldCheck}
                  label="Checklist"
                  value={`${checklistDone}/4 done`}
                  tone={checklistDone === 4 ? 'teal' : 'blue'}
                />
              </View>

              <View style={styles.detailCard}>
                <MapPin color={colors.primary} size={19} strokeWidth={2.4} />
                <View style={styles.detailCopy}>
                  <Text style={styles.detailLabel}>Delivery address</Text>
                  <Text style={styles.detailValue}>
                    {formatAddress(order.deliveryAddress)}
                  </Text>
                </View>
              </View>

              <View style={styles.medicineList}>
                {(details?.items || []).map((item) => (
                  <View key={item.id} style={styles.medicineRow}>
                    <View style={styles.medicineIcon}>
                      <Pill
                        color={
                          item.requiresPrescription ? '#9A6500' : colors.primary
                        }
                        size={20}
                        strokeWidth={2.4}
                      />
                    </View>
                    <View style={styles.medicineCopy}>
                      <Text style={styles.medicineName}>
                        {item.requestedName}
                      </Text>
                      <Text style={styles.medicineMeta}>
                        Qty {item.quantity} - {formatMoney(item.lineTotal)} line
                        total
                      </Text>
                    </View>
                    {item.requiresPrescription ? (
                      <View style={styles.rxPill}>
                        <Text style={styles.rxText}>Rx</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
                {!details ? (
                  <Text style={styles.syncText}>
                    Order details are syncing from backend.
                  </Text>
                ) : null}
              </View>

              <View style={styles.auditCard}>
                <Truck color={colors.teal} size={20} strokeWidth={2.4} />
                <Text style={styles.auditText}>
                  Accepted {formatDateTime(order.acceptedAt || order.createdAt)}
                  . Keep invoice, batch, expiry, and pharmacist checks ready for
                  audit.
                </Text>
              </View>

              <View style={styles.packingBox}>
                <View style={styles.packingHeader}>
                  <FileText
                    color={colors.primary}
                    size={20}
                    strokeWidth={2.4}
                  />
                  <Text style={styles.packingTitle}>Packing checklist</Text>
                </View>
                <ChecklistRow
                  label="All medicines picked with matching strength"
                  value={checklist.itemsPicked}
                  onToggle={(value) =>
                    updatePackingChecklist(order, { itemsPicked: value })
                  }
                />
                <ChecklistRow
                  label="Batch number and expiry checked"
                  value={checklist.batchExpiryChecked}
                  onToggle={(value) =>
                    updatePackingChecklist(order, { batchExpiryChecked: value })
                  }
                />
                <ChecklistRow
                  label="Invoice generated or attached"
                  value={checklist.invoiceReady}
                  onToggle={(value) =>
                    updatePackingChecklist(order, { invoiceReady: value })
                  }
                />
                <ChecklistRow
                  label="Package sealed and ready for handoff"
                  value={checklist.packageSealed}
                  onToggle={(value) =>
                    updatePackingChecklist(order, { packageSealed: value })
                  }
                />
                <AppTextInput
                  value={checklist.note}
                  onChangeText={(value) =>
                    updatePackingChecklist(order, { note: value })
                  }
                  placeholder="Batch / invoice note for internal audit"
                  multiline
                />
              </View>

              <View style={styles.buttonStack}>
                <AppButton
                  label="Mark Packing"
                  disabled={!canStartPacking}
                  loading={isSaving}
                  onPress={() => onMarkPacking(order)}
                />
                <AppButton
                  label="Mark Ready for Pickup"
                  disabled={!canMarkPacked || checklistDone < 4}
                  loading={isSaving}
                  onPress={() => pack(order)}
                />
              </View>

              <View style={styles.cancelBox}>
                <View style={styles.cancelHeader}>
                  <AlertTriangle
                    color={colors.danger}
                    size={19}
                    strokeWidth={2.4}
                  />
                  <Text style={styles.cancelTitle}>Vendor cancellation</Text>
                </View>
                <View style={styles.reasonRow}>
                  {cancellationReasons.map((reason) => (
                    <Pressable
                      key={reason}
                      accessibilityRole="button"
                      onPress={() =>
                        setCancelReasons((current) => ({
                          ...current,
                          [order.id]: reason,
                        }))
                      }
                      style={[
                        styles.reasonChip,
                        cancelReasons[order.id] === reason
                          ? styles.reasonChipActive
                          : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reasonText,
                          cancelReasons[order.id] === reason
                            ? styles.reasonTextActive
                            : null,
                        ]}
                      >
                        {reason}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <AppTextInput
                  value={cancelReasons[order.id] || ''}
                  onChangeText={(value) =>
                    setCancelReasons((current) => ({
                      ...current,
                      [order.id]: value,
                    }))
                  }
                  placeholder="Only valid cancellation reason..."
                  multiline
                />
                <AppButton
                  label="Cancel Order"
                  variant="danger"
                  loading={isSaving}
                  disabled={order.status === 'PACKED'}
                  onPress={() => cancel(order)}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'teal' | 'warning';
}) {
  const toneStyle = getTone(tone);

  return (
    <View
      style={[styles.summaryTile, { backgroundColor: toneStyle.background }]}
    >
      <Text style={[styles.summaryValue, { color: toneStyle.color }]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function InfoPill({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: typeof Clock;
  label: string;
  value: string;
  tone: 'blue' | 'teal' | 'warning';
}) {
  const toneStyle = getTone(tone);

  return (
    <View style={[styles.infoPill, { backgroundColor: toneStyle.background }]}>
      <Icon color={toneStyle.color} size={18} strokeWidth={2.4} />
      <View style={styles.infoCopy}>
        <Text style={[styles.infoLabel, { color: toneStyle.color }]}>
          {label}
        </Text>
        <Text style={[styles.infoValue, { color: toneStyle.color }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ChecklistRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onToggle(!value)}
      style={styles.checkRow}
    >
      <View style={[styles.checkbox, value ? styles.checkboxChecked : null]}>
        {value ? <Check color="#FFFFFF" size={16} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );
}

function getPackingProgress(checklist: PackingChecklist) {
  return [
    checklist.itemsPicked,
    checklist.batchExpiryChecked,
    checklist.invoiceReady,
    checklist.packageSealed,
  ].filter(Boolean).length;
}

function getProgressIndex(status: Order['status']) {
  if (
    [
      'PACKED',
      'RIDER_ASSIGNED',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ].includes(status)
  ) {
    return 2;
  }

  if (status === 'PACKING') {
    return 1;
  }

  return 0;
}

function getPackingSla(order: Order, details?: PharmacyOrderDetails) {
  const acceptedOffer = details?.offers.find(
    (offer) => offer.status === 'OFFER_ACCEPTED',
  );
  const packingMinutes = acceptedOffer?.packingTimeMinutes || 20;
  const acceptedAt = new Date(
    order.acceptedAt || order.createdAt || '',
  ).getTime();

  if (
    Number.isNaN(acceptedAt) ||
    ['PACKED', 'RIDER_ASSIGNED'].includes(order.status)
  ) {
    return { label: 'Ready', isAtRisk: false };
  }

  const deadline = acceptedAt + packingMinutes * 60_000;
  const remainingMs = deadline - Date.now();

  if (remainingMs <= 0) {
    return { label: 'Overdue', isAtRisk: true };
  }

  const minutes = Math.ceil(remainingMs / 60_000);

  return {
    label: minutes <= 1 ? '<1m left' : `${minutes}m left`,
    isAtRisk: minutes <= 5,
  };
}

function getStatusTone(status: Order['status']) {
  if (status === 'PACKED') {
    return { color: colors.teal, background: colors.tealSoft };
  }

  if (status === 'PACKING') {
    return { color: '#9A6500', background: colors.warningSoft };
  }

  return { color: colors.primary, background: colors.primarySoft };
}

function getTone(tone: 'blue' | 'teal' | 'warning') {
  if (tone === 'teal') {
    return { color: colors.teal, background: colors.tealSoft };
  }

  if (tone === 'warning') {
    return { color: '#9A6500', background: colors.warningSoft };
  }

  return { color: colors.primary, background: colors.primarySoft };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 17,
    padding: 12,
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 23,
    fontWeight: '900',
  },
  summaryLabel: {
    marginTop: 2,
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyState: {
    minHeight: 300,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 18,
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  orderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCopy: {
    flex: 1,
    gap: 3,
  },
  orderTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  orderMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  timelineRow: {
    borderRadius: 17,
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#EEF0F4',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D9DCE4',
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
  },
  timelineLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineLabelActive: {
    color: colors.text,
  },
  opsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoPill: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
  },
  infoCopy: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C9DDFF',
    backgroundColor: colors.primarySofter,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  detailCopy: {
    flex: 1,
    gap: 3,
  },
  detailLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  detailValue: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  medicineList: {
    gap: 9,
  },
  medicineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  medicineIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineCopy: {
    flex: 1,
    gap: 2,
  },
  medicineName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  medicineMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  rxPill: {
    borderRadius: 999,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rxText: {
    color: '#9A6500',
    fontSize: 11,
    fontWeight: '900',
  },
  syncText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  auditCard: {
    borderRadius: 16,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: '#CDECE8',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  auditText: {
    flex: 1,
    color: colors.mutedDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  packingBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 11,
  },
  packingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  buttonStack: {
    gap: 10,
  },
  cancelBox: {
    borderRadius: 18,
    backgroundColor: '#FFF9FA',
    borderWidth: 1,
    borderColor: '#F1C7CE',
    padding: 14,
    gap: 12,
  },
  cancelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  reasonChipActive: {
    borderColor: '#F1C7CE',
    backgroundColor: colors.dangerSoft,
  },
  reasonText: {
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '900',
  },
  reasonTextActive: {
    color: colors.danger,
  },
});
