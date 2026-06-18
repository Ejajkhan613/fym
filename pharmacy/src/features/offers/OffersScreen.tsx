import { useMemo, useState } from 'react';
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
  Clock,
  FileText,
  PackageCheck,
  Pill,
  RefreshCcw,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  Pharmacy,
  PharmacyOrderDetails,
  VendorOffer,
} from '../../types/domain';
import {
  formatAddress,
  formatMoney,
  shortId,
  titleCase,
} from '../../utils/format';

type OffersScreenProps = {
  pharmacy: Pharmacy;
  offers: VendorOffer[];
  orderDetailsById: Record<string, PharmacyOrderDetails>;
  isSaving: boolean;
  realtimeStatus?: 'connected' | 'disconnected' | 'fallback';
  realtimeLabel?: string;
  onRefresh: () => void;
  onViewOffer: (offer: VendorOffer) => void;
  onAcceptOffer: (
    offer: VendorOffer,
    checklist: {
      stockConfirmed: boolean;
      expiryConfirmed: boolean;
      pharmacistVerified: boolean;
      packingTimeMinutes: number;
    },
  ) => void;
  onRejectOffer: (offer: VendorOffer, reason: string) => void;
};

type Checklist = {
  stockConfirmed: boolean;
  expiryConfirmed: boolean;
  pharmacistVerified: boolean;
  invoiceReady: boolean;
  packingTimeMinutes: string;
  rejectReason: string;
};

type OfferFilter = 'all' | 'urgent' | 'rx' | 'viewed';

const rejectReasons = [
  'Out of stock',
  'Wrong strength unavailable',
  'Prescription unclear',
  'Cannot meet packing SLA',
  'Store temporarily busy',
];

const filters: Array<{ key: OfferFilter; label: string }> = [
  { key: 'all', label: 'Live' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'rx', label: 'Rx' },
  { key: 'viewed', label: 'Viewed' },
];

export function OffersScreen({
  pharmacy,
  offers,
  orderDetailsById,
  isSaving,
  realtimeStatus = 'fallback',
  realtimeLabel,
  onRefresh,
  onViewOffer,
  onAcceptOffer,
  onRejectOffer,
}: OffersScreenProps) {
  const [activeFilter, setActiveFilter] = useState<OfferFilter>('all');
  const [checklists, setChecklists] = useState<Record<string, Checklist>>({});
  const actionableOffers = useMemo(
    () =>
      offers.filter((offer) =>
        ['OFFER_SENT', 'OFFER_VIEWED'].includes(offer.status),
      ),
    [offers],
  );
  const stats = useMemo(() => {
    const urgent = actionableOffers.filter(
      (offer) => getTimeState(offer).isUrgent,
    );
    const rx = actionableOffers.filter((offer) =>
      orderDetailsById[offer.orderId]?.items.some(
        (item) => item.requiresPrescription,
      ),
    );

    return {
      urgent: urgent.length,
      rx: rx.length,
      viewed: actionableOffers.filter(
        (offer) => offer.status === 'OFFER_VIEWED',
      ).length,
    };
  }, [actionableOffers, orderDetailsById]);
  const visibleOffers = actionableOffers.filter((offer) => {
    const details = orderDetailsById[offer.orderId];

    if (activeFilter === 'urgent') {
      return getTimeState(offer).isUrgent;
    }

    if (activeFilter === 'rx') {
      return details?.items.some((item) => item.requiresPrescription);
    }

    if (activeFilter === 'viewed') {
      return offer.status === 'OFFER_VIEWED';
    }

    return true;
  });
  const liveTone = getRealtimeTone(realtimeStatus);

  function getChecklist(offer: VendorOffer): Checklist {
    return (
      checklists[offer.id] || {
        stockConfirmed: false,
        expiryConfirmed: false,
        pharmacistVerified: false,
        invoiceReady: false,
        packingTimeMinutes: '20',
        rejectReason: '',
      }
    );
  }

  function updateChecklist(offer: VendorOffer, changes: Partial<Checklist>) {
    setChecklists((current) => ({
      ...current,
      [offer.id]: {
        ...getChecklist(offer),
        ...changes,
      },
    }));
  }

  function accept(offer: VendorOffer) {
    const checklist = getChecklist(offer);
    const packingTimeMinutes = Number(checklist.packingTimeMinutes);

    if (getTimeState(offer).isExpired) {
      Alert.alert('Offer expired', 'Refresh live offers before taking action.');
      return;
    }

    if (
      !checklist.stockConfirmed ||
      !checklist.expiryConfirmed ||
      !checklist.pharmacistVerified ||
      !checklist.invoiceReady ||
      Number.isNaN(packingTimeMinutes) ||
      packingTimeMinutes < 1
    ) {
      Alert.alert(
        'Complete acceptance checklist',
        'Confirm stock, expiry, pharmacist verification, invoice readiness, and packing time before accepting.',
      );
      return;
    }

    onAcceptOffer(offer, {
      stockConfirmed: checklist.stockConfirmed,
      expiryConfirmed: checklist.expiryConfirmed,
      pharmacistVerified: checklist.pharmacistVerified,
      packingTimeMinutes,
    });
  }

  function reject(offer: VendorOffer) {
    const reason = getChecklist(offer).rejectReason.trim();

    if (!reason) {
      Alert.alert(
        'Reject reason required',
        'Choose or enter a clear reason so matching can continue.',
      );
      return;
    }

    onRejectOffer(offer, reason);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Order Offers</Text>
            <Text style={styles.subtitle}>
              {pharmacy.name} receives only matched orders inside compliance
              limits.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <RefreshCcw color={colors.primary} size={20} strokeWidth={2.5} />
          </Pressable>
        </View>

        <View style={styles.liveRow}>
          <View
            style={[styles.livePill, { backgroundColor: liveTone.background }]}
          >
            <View
              style={[styles.liveDot, { backgroundColor: liveTone.color }]}
            />
            <Text style={[styles.liveText, { color: liveTone.color }]}>
              {liveTone.label}
            </Text>
          </View>
          {realtimeLabel ? (
            <Text style={styles.liveMeta}>Latest: {realtimeLabel}</Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.summaryRow}>
          <SummaryTile
            label="Urgent"
            value={String(stats.urgent)}
            tone="warning"
          />
          <SummaryTile label="Rx checks" value={String(stats.rx)} tone="blue" />
          <SummaryTile
            label="Viewed"
            value={String(stats.viewed)}
            tone="teal"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <Pressable
                key={filter.key}
                accessibilityRole="button"
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterChip,
                  active ? styles.filterChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active ? styles.filterTextActive : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {visibleOffers.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardEmpty />
            <Text style={styles.emptyTitle}>No matching offers</Text>
            <Text style={styles.emptyText}>
              New orders, expired offers, and accepted-by-others updates will
              sync here automatically.
            </Text>
          </View>
        ) : null}

        {visibleOffers.map((offer) => {
          const details = orderDetailsById[offer.orderId];
          const checklist = getChecklist(offer);
          const requiresPrescription = details?.items.some(
            (item) => item.requiresPrescription,
          );
          const timeState = getTimeState(offer);
          const tone = getOfferTone(offer, timeState);
          const checklistDone = getChecklistProgress(checklist);
          const canAct = !timeState.isExpired && !isSaving;

          return (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerTop}>
                <View
                  style={[
                    styles.offerIcon,
                    { backgroundColor: tone.background },
                  ]}
                >
                  <PackageCheck
                    color={tone.color}
                    size={27}
                    strokeWidth={2.4}
                  />
                </View>
                <View style={styles.offerCopy}>
                  <Text style={styles.offerTitle}>
                    Order {shortId(offer.orderId)}
                  </Text>
                  <Text style={styles.offerMeta}>
                    {details
                      ? `${titleCase(details.order.orderType)} - ${formatMoney(details.order.totalAmount)}`
                      : 'Order details loading'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.timerPill,
                    { backgroundColor: tone.background },
                  ]}
                >
                  <Clock color={tone.color} size={14} strokeWidth={2.5} />
                  <Text style={[styles.timerText, { color: tone.color }]}>
                    {timeState.label}
                  </Text>
                </View>
              </View>

              <View style={styles.slaTrack}>
                <View
                  style={[
                    styles.slaFill,
                    {
                      backgroundColor: tone.color,
                      width: `${Math.max(4, timeState.progress * 100)}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.opsGrid}>
                <InfoPill
                  label="Status"
                  value={titleCase(offer.status)}
                  tone={tone}
                />
                <InfoPill
                  label="Checklist"
                  value={`${checklistDone}/4 done`}
                  tone={getChecklistTone(checklistDone)}
                />
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Delivery</Text>
                <Text style={styles.detailValue}>
                  {formatAddress(details?.order.deliveryAddress)}
                </Text>
              </View>

              <View style={styles.medicineList}>
                {(details?.items || []).map((item) => (
                  <View key={item.id} style={styles.medicineRow}>
                    <View style={styles.medicineIcon}>
                      <Pill
                        color={
                          item.requiresPrescription ? '#9A6500' : colors.primary
                        }
                        size={21}
                        strokeWidth={2.4}
                      />
                    </View>
                    <View style={styles.medicineCopy}>
                      <Text style={styles.medicineName}>
                        {item.requestedName}
                      </Text>
                      <Text style={styles.medicineMeta}>
                        Qty {item.quantity} - {formatMoney(item.unitPrice)} each
                      </Text>
                    </View>
                    {item.requiresPrescription ? (
                      <View style={styles.rxPill}>
                        <Text style={styles.rxText}>Rx</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>

              {requiresPrescription ? (
                <View style={styles.warningCard}>
                  <FileText color="#9A6500" size={21} strokeWidth={2.4} />
                  <Text style={styles.warningText}>
                    Prescription medicine present. Pharmacist verification is
                    mandatory before acceptance.
                  </Text>
                </View>
              ) : null}

              <View style={styles.checklist}>
                <ChecklistRow
                  label="Stock and correct strength available"
                  value={checklist.stockConfirmed}
                  onToggle={(value) =>
                    updateChecklist(offer, { stockConfirmed: value })
                  }
                />
                <ChecklistRow
                  label="Expiry valid for dispensing"
                  value={checklist.expiryConfirmed}
                  onToggle={(value) =>
                    updateChecklist(offer, { expiryConfirmed: value })
                  }
                />
                <ChecklistRow
                  label="Registered pharmacist verified order"
                  value={checklist.pharmacistVerified}
                  onToggle={(value) =>
                    updateChecklist(offer, { pharmacistVerified: value })
                  }
                />
                <ChecklistRow
                  label="Invoice can be generated"
                  value={checklist.invoiceReady}
                  onToggle={(value) =>
                    updateChecklist(offer, { invoiceReady: value })
                  }
                />
              </View>

              <View style={styles.twoColumnRow}>
                <View style={styles.column}>
                  <Text style={styles.inputLabel}>Packing time</Text>
                  <AppTextInput
                    value={checklist.packingTimeMinutes}
                    onChangeText={(value) =>
                      updateChecklist(offer, {
                        packingTimeMinutes: value
                          .replace(/\D/g, '')
                          .slice(0, 3),
                      })
                    }
                    placeholder="Minutes"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.column}>
                  <Text style={styles.inputLabel}>Reject reason</Text>
                  <AppTextInput
                    value={checklist.rejectReason}
                    onChangeText={(value) =>
                      updateChecklist(offer, { rejectReason: value })
                    }
                    placeholder="If rejecting"
                  />
                </View>
              </View>

              <View style={styles.reasonRow}>
                {rejectReasons.map((reason) => (
                  <Pressable
                    key={reason}
                    accessibilityRole="button"
                    onPress={() =>
                      updateChecklist(offer, { rejectReason: reason })
                    }
                    style={[
                      styles.reasonChip,
                      checklist.rejectReason === reason
                        ? styles.reasonChipActive
                        : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonText,
                        checklist.rejectReason === reason
                          ? styles.reasonTextActive
                          : null,
                      ]}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <AppButton
                  label={offer.status === 'OFFER_VIEWED' ? 'Viewed' : 'View'}
                  variant="secondary"
                  onPress={() => onViewOffer(offer)}
                  disabled={
                    offer.status === 'OFFER_VIEWED' || timeState.isExpired
                  }
                />
                <AppButton
                  label="Reject"
                  variant="danger"
                  loading={isSaving}
                  disabled={!canAct}
                  onPress={() => reject(offer)}
                  icon={<X color="#FFFFFF" size={20} strokeWidth={2.6} />}
                />
                <AppButton
                  label="Accept safely"
                  loading={isSaving}
                  disabled={!canAct}
                  onPress={() => accept(offer)}
                  icon={<Check color="#FFFFFF" size={20} strokeWidth={2.6} />}
                />
              </View>

              <View style={styles.penaltyNotice}>
                <AlertTriangle
                  color={colors.danger}
                  size={18}
                  strokeWidth={2.4}
                />
                <Text style={styles.penaltyText}>
                  Wrongful acceptance can trigger penalties and trust score
                  reduction.
                </Text>
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
  const toneStyle =
    tone === 'teal'
      ? { color: colors.teal, background: colors.tealSoft }
      : tone === 'warning'
        ? { color: '#9A6500', background: colors.warningSoft }
        : { color: colors.primary, background: colors.primarySoft };

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
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: { color: string; background: string };
}) {
  return (
    <View style={[styles.infoPill, { backgroundColor: tone.background }]}>
      <Text style={[styles.infoLabel, { color: tone.color }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: tone.color }]}>{value}</Text>
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

function ClipboardEmpty() {
  return (
    <View style={styles.emptyIcon}>
      <ShieldCheck color={colors.primary} size={34} strokeWidth={2.4} />
    </View>
  );
}

function getTimeState(offer: VendorOffer) {
  const sentAt = new Date(offer.sentAt).getTime();
  const expiresAt = new Date(offer.expiresAt).getTime();
  const now = Date.now();
  const totalMs = expiresAt - sentAt;
  const remainingMs = expiresAt - now;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

  if (Number.isNaN(expiresAt) || remainingMs <= 0) {
    return {
      label: 'Expired',
      progress: 1,
      isExpired: true,
      isUrgent: true,
    };
  }

  return {
    label:
      seconds > 59 ? `${Math.ceil(seconds / 60)}m left` : `${seconds}s left`,
    progress:
      totalMs > 0 ? Math.min(1, Math.max(0, (now - sentAt) / totalMs)) : 0,
    isExpired: false,
    isUrgent: seconds <= 15,
  };
}

function getOfferTone(
  offer: VendorOffer,
  timeState: ReturnType<typeof getTimeState>,
) {
  if (timeState.isExpired) {
    return { color: colors.danger, background: colors.dangerSoft };
  }

  if (timeState.isUrgent) {
    return { color: '#9A6500', background: colors.warningSoft };
  }

  if (offer.status === 'OFFER_VIEWED') {
    return { color: colors.teal, background: colors.tealSoft };
  }

  return { color: colors.primary, background: colors.primarySoft };
}

function getChecklistProgress(checklist: Checklist) {
  return [
    checklist.stockConfirmed,
    checklist.expiryConfirmed,
    checklist.pharmacistVerified,
    checklist.invoiceReady,
  ].filter(Boolean).length;
}

function getChecklistTone(done: number) {
  if (done === 4) {
    return { color: colors.teal, background: colors.tealSoft };
  }

  if (done >= 2) {
    return { color: '#9A6500', background: colors.warningSoft };
  }

  return { color: colors.primary, background: colors.primarySoft };
}

function getRealtimeTone(status: 'connected' | 'disconnected' | 'fallback') {
  if (status === 'connected') {
    return { color: colors.teal, background: colors.tealSoft, label: 'Live' };
  }

  if (status === 'disconnected') {
    return {
      color: '#9A6500',
      background: colors.warningSoft,
      label: 'Reconnecting',
    };
  }

  return {
    color: colors.primary,
    background: colors.primarySoft,
    label: 'Feed sync',
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
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
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveRow: {
    marginTop: 13,
    gap: 7,
  },
  livePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '900',
  },
  liveMeta: {
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 16,
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
  filterRow: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  filterChipActive: {
    borderColor: '#C9DDFF',
    backgroundColor: colors.primarySoft,
  },
  filterText: {
    color: colors.mutedDark,
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: colors.primary,
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
  offerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  offerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerCopy: {
    flex: 1,
    gap: 3,
  },
  offerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  offerMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  timerPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '900',
  },
  slaTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#EEF0F4',
    overflow: 'hidden',
  },
  slaFill: {
    height: 7,
    borderRadius: 999,
  },
  opsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoPill: {
    flex: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '900',
  },
  infoValue: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '900',
  },
  detailCard: {
    borderRadius: 16,
    backgroundColor: '#FAFAFB',
    borderWidth: 1,
    borderColor: '#EEF0F4',
    padding: 12,
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
  warningCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2D6A8',
    backgroundColor: colors.warningSoft,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  warningText: {
    flex: 1,
    color: '#8A5B00',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  checklist: {
    gap: 10,
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
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
  buttonRow: {
    gap: 10,
  },
  penaltyNotice: {
    borderRadius: 16,
    backgroundColor: colors.dangerSoft,
    padding: 11,
    flexDirection: 'row',
    gap: 9,
  },
  penaltyText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
});
