import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Store,
  Truck,
  WalletCards,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  AuthSession,
  InventoryItem,
  Order,
  Penalty,
  PharmacyOrderDetails,
  PharmacyProfile,
  VendorOffer,
} from '../../types/domain';
import {
  formatMoney,
  getMissingDocuments,
  titleCase,
} from '../../utils/format';

type DashboardScreenProps = {
  session: AuthSession;
  profile: PharmacyProfile | null;
  offers: VendorOffer[];
  orderDetailsById: Record<string, PharmacyOrderDetails>;
  orders: Order[];
  penalties: Penalty[];
  inventory: InventoryItem[];
  realtimeStatus?: 'connected' | 'disconnected' | 'fallback';
  realtimeLabel?: string;
  onRefresh: () => void;
  onOpenOffers: () => void;
  onOpenOrders: () => void;
  onOpenProfile: () => void;
};

export function DashboardScreen({
  session,
  profile,
  offers,
  orderDetailsById,
  orders,
  penalties,
  inventory,
  realtimeStatus = 'fallback',
  realtimeLabel,
  onRefresh,
  onOpenOffers,
  onOpenOrders,
  onOpenProfile,
}: DashboardScreenProps) {
  const pharmacy = profile?.pharmacy;
  const newOffers = offers.filter((offer) =>
    ['OFFER_SENT', 'OFFER_VIEWED'].includes(offer.status),
  );
  const acceptedOrders = orders.filter(
    (order) => order.status === 'VENDOR_ACCEPTED',
  );
  const packingOrders = orders.filter((order) => order.status === 'PACKING');
  const readyForPickup = orders.filter((order) => order.status === 'PACKED');
  const completedOrders = orders.filter(
    (order) => order.status === 'DELIVERED',
  );
  const activePenalties = penalties.filter(
    (penalty) => penalty.status === 'applied',
  );
  const earnings = completedOrders.reduce(
    (total, order) => total + order.totalAmount,
    0,
  );
  const lowStock = inventory.filter((item) => item.quantity <= 10);
  const missingDocs = getMissingDocuments(
    profile?.documents.map((document) => document.documentType) || [],
  );
  const firstName = session.user.name?.split(' ')[0] || 'Owner';
  const liveTone = getRealtimeTone(realtimeStatus);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Store color="#FFFFFF" size={31} strokeWidth={2.4} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onRefresh}
            style={styles.refreshButton}
          >
            <RefreshCcw color="#FFFFFF" size={20} strokeWidth={2.5} />
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>PHARMACY WORKSPACE</Text>
        <Text style={styles.greeting}>Hi, {firstName}</Text>
        <Text style={styles.heroText}>
          {pharmacy
            ? `${pharmacy.name} - ${titleCase(pharmacy.status)} - Trust score ${Math.round(pharmacy.trustScore)}`
            : 'Create a pharmacy profile to start receiving vendor offers.'}
        </Text>
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

      <View style={styles.body}>
        <View style={styles.kpiGrid}>
          <KpiCard
            label="New orders"
            value={String(newOffers.length)}
            tone="blue"
          />
          <KpiCard
            label="Accepted"
            value={String(acceptedOrders.length)}
            tone="teal"
          />
          <KpiCard
            label="Packing"
            value={String(packingOrders.length)}
            tone="warning"
          />
          <KpiCard
            label="Ready pickup"
            value={String(readyForPickup.length)}
            tone="blue"
          />
          <KpiCard
            label="Completed"
            value={String(completedOrders.length)}
            tone="teal"
          />
          <KpiCard
            label="Penalties"
            value={String(activePenalties.length)}
            tone="danger"
          />
        </View>

        <View style={styles.actionRow}>
          <ActionCard
            title="Review live offers"
            body={`${newOffers.length} active acceptance request${newOffers.length === 1 ? '' : 's'}`}
            Icon={ClipboardList}
            onPress={onOpenOffers}
          />
          <ActionCard
            title="Packing queue"
            body={`${packingOrders.length + acceptedOrders.length} order${packingOrders.length + acceptedOrders.length === 1 ? '' : 's'} need action`}
            Icon={PackageCheck}
            onPress={onOpenOrders}
          />
        </View>

        <View style={styles.financeCard}>
          <View style={styles.financeTop}>
            <View style={styles.financeIcon}>
              <WalletCards color={colors.primary} size={25} strokeWidth={2.4} />
            </View>
            <View style={styles.financeCopy}>
              <Text style={styles.cardTitle}>Payout snapshot</Text>
              <Text style={styles.cardText}>
                Gross completed sales {formatMoney(earnings)} before commission,
                penalties, and refunds.
              </Text>
            </View>
          </View>
          <View style={styles.financeStats}>
            <MiniStat label="Sales" value={formatMoney(earnings)} />
            <MiniStat
              label="Penalty hold"
              value={formatMoney(
                activePenalties.reduce(
                  (total, penalty) => total + penalty.amount,
                  0,
                ),
              )}
            />
          </View>
        </View>

        <View style={styles.alertList}>
          {missingDocs.length > 0 ? (
            <AlertCard
              title="Onboarding documents pending"
              body={`${missingDocs.length} required document${missingDocs.length === 1 ? '' : 's'} still missing before compliance approval.`}
              Icon={ShieldCheck}
              tone="warning"
              onPress={onOpenProfile}
            />
          ) : null}
          {lowStock.length > 0 ? (
            <AlertCard
              title="Inventory alerts"
              body={`${lowStock.length} item${lowStock.length === 1 ? '' : 's'} below safe stock. Update shelf count before accepting.`}
              Icon={AlertTriangle}
              tone="danger"
            />
          ) : null}
          <AlertCard
            title="Acceptance accountability"
            body="Only accept after confirming stock, strength, expiry, prescription checks, and invoice readiness."
            Icon={Truck}
            tone="blue"
          />
        </View>

        {newOffers.slice(0, 2).map((offer) => {
          const details = orderDetailsById[offer.orderId];
          return (
            <Pressable
              key={offer.id}
              onPress={onOpenOffers}
              style={styles.offerPreview}
            >
              <View style={styles.offerPreviewTop}>
                <Text style={styles.offerPreviewTitle}>
                  Offer {offer.orderId.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.offerTimer}>
                  {getTimeLeft(offer.expiresAt)}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.cardText}>
                {details?.items
                  .map((item) => `${item.requestedName} x${item.quantity}`)
                  .join(', ') || 'Open offer for medicine confirmation'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'teal' | 'warning' | 'danger';
}) {
  const toneStyles = getTone(tone);

  return (
    <View style={[styles.kpiCard, { backgroundColor: toneStyles.background }]}>
      <Text style={[styles.kpiValue, { color: toneStyles.color }]}>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function ActionCard({
  title,
  body,
  Icon,
  onPress,
}: {
  title: string;
  body: string;
  Icon: typeof ClipboardList;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.actionCard}
    >
      <View style={styles.actionIcon}>
        <Icon color={colors.primary} size={24} strokeWidth={2.4} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{body}</Text>
      <View style={styles.linkRow}>
        <Text style={styles.linkText}>Open</Text>
        <ArrowRight color={colors.primary} size={16} strokeWidth={2.6} />
      </View>
    </Pressable>
  );
}

function AlertCard({
  title,
  body,
  Icon,
  tone,
  onPress,
}: {
  title: string;
  body: string;
  Icon: typeof AlertTriangle;
  tone: 'blue' | 'warning' | 'danger';
  onPress?: () => void;
}) {
  const toneStyles = getTone(tone);
  const Container = onPress ? Pressable : View;

  return (
    <Container onPress={onPress} style={styles.alertCard}>
      <View
        style={[styles.alertIcon, { backgroundColor: toneStyles.background }]}
      >
        <Icon color={toneStyles.color} size={22} strokeWidth={2.4} />
      </View>
      <View style={styles.alertCopy}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{body}</Text>
      </View>
    </Container>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function getTone(tone: 'blue' | 'teal' | 'warning' | 'danger') {
  if (tone === 'teal')
    return { color: colors.teal, background: colors.tealSoft };
  if (tone === 'warning')
    return { color: '#9A6500', background: colors.warningSoft };
  if (tone === 'danger')
    return { color: colors.danger, background: colors.dangerSoft };
  return { color: colors.primary, background: colors.primarySoft };
}

function getRealtimeTone(status: 'connected' | 'disconnected' | 'fallback') {
  if (status === 'connected') {
    return {
      color: colors.teal,
      background: '#FFFFFF',
      label: 'Live orders',
    };
  }

  if (status === 'disconnected') {
    return {
      color: '#9A6500',
      background: '#FFF3DA',
      label: 'Reconnecting',
    };
  }

  return {
    color: colors.primary,
    background: '#FFFFFF',
    label: 'Feed sync',
  };
}

function getTimeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();

  if (Number.isNaN(ms) || ms <= 0) {
    return 'Expired';
  }

  const seconds = Math.ceil(ms / 1000);
  return `${seconds}s left`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 30,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screen,
    paddingTop: 38,
    paddingBottom: 30,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#C9DEFF',
    fontSize: 13,
    fontWeight: '900',
  },
  greeting: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 8,
    color: '#D9E8FF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  liveRow: {
    marginTop: 16,
    gap: 8,
  },
  livePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    color: '#D9E8FF',
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    paddingHorizontal: spacing.screen,
    paddingTop: 22,
    gap: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '31.7%',
    minHeight: 82,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  kpiLabel: {
    marginTop: 2,
    color: colors.mutedDark,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 15,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  linkRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  linkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  financeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  financeTop: {
    flexDirection: 'row',
    gap: 12,
  },
  financeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeCopy: {
    flex: 1,
    gap: 4,
  },
  financeStats: {
    flexDirection: 'row',
    gap: 10,
  },
  miniStat: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: colors.primarySofter,
    padding: 12,
  },
  miniStatValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  miniStatLabel: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  alertList: {
    gap: 10,
  },
  alertCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  alertIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCopy: {
    flex: 1,
    gap: 4,
  },
  offerPreview: {
    borderWidth: 1,
    borderColor: '#C9DDFF',
    borderRadius: 18,
    backgroundColor: colors.primarySofter,
    padding: 14,
    gap: 5,
  },
  offerPreviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  offerPreviewTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  offerTimer: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
});
