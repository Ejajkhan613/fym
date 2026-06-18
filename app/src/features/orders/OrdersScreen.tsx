import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ClipboardList,
  MapPin,
  PackageCheck,
  ReceiptText,
  Truck,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { LocalOrder } from '../../types/domain';

type OrdersScreenProps = {
  orders: LocalOrder[];
  realtimeStatus?: 'connected' | 'disconnected' | 'fallback';
  realtimeLabel?: string;
};

export function OrdersScreen({
  orders,
  realtimeStatus = 'fallback',
  realtimeLabel,
}: OrdersScreenProps) {
  const activeOrders = orders.filter(
    (order) => !isDelivered(order.status),
  ).length;
  const deliveredOrders = orders.length - activeOrders;
  const liveTone = getRealtimeTone(realtimeStatus);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Orders</Text>
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
        </View>
        <Text style={styles.subtitle}>
          Track matching, packing, delivery, and payments.
        </Text>
        {realtimeLabel ? (
          <Text style={styles.liveMeta}>Latest: {realtimeLabel}</Text>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {orders.length > 0 ? (
          <View style={styles.statsRow}>
            <StatTile label="Active" value={String(activeOrders)} />
            <StatTile label="Delivered" value={String(deliveredOrders)} />
          </View>
        ) : null}

        {orders.map((order) => {
          const statusTone = getStatusTone(order.status);

          return (
            <View
              key={`${order.id}-${order.createdAt}`}
              style={styles.orderCard}
            >
              <View style={styles.orderTop}>
                <View
                  style={[
                    styles.iconTile,
                    { backgroundColor: statusTone.background },
                  ]}
                >
                  {isDelivered(order.status) ? (
                    <PackageCheck
                      color={statusTone.color}
                      size={28}
                      strokeWidth={2.3}
                    />
                  ) : (
                    <Truck
                      color={statusTone.color}
                      size={28}
                      strokeWidth={2.3}
                    />
                  )}
                </View>
                <View style={styles.orderCopy}>
                  <View style={styles.orderTitleRow}>
                    <Text numberOfLines={1} style={styles.orderId}>
                      {order.id}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: statusTone.background },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusTone.color }]}
                      >
                        {order.status}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} style={styles.orderMeta}>
                    {order.itemsCount} item{order.itemsCount === 1 ? '' : 's'} -
                    Rs {order.total}
                  </Text>
                  <Text numberOfLines={1} style={styles.itemSummary}>
                    {order.itemsSummary || 'Medicines and healthcare products'}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineRow}>
                {['Matched', 'Packed', 'Delivery'].map((step, index) => (
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

              <View style={styles.detailGrid}>
                <DetailItem
                  Icon={MapPin}
                  label={order.deliveryLabel || 'Delivery'}
                  value={
                    order.deliveryAddress || 'Address selected at checkout'
                  }
                />
                <DetailItem
                  Icon={ReceiptText}
                  label={order.paymentStatus || 'Payment'}
                  value={`${order.orderType || 'Order'} - ${order.createdAt}`}
                />
              </View>
            </View>
          );
        })}

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <ClipboardList
                color={colors.primary}
                size={34}
                strokeWidth={2.3}
              />
            </View>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              Placed orders will show pharmacy matching, packing, and delivery
              progress here.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailItem({
  Icon,
  label,
  value,
}: {
  Icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIcon}>
        <Icon color={colors.primary} size={17} strokeWidth={2.5} />
      </View>
      <View style={styles.detailCopy}>
        <Text numberOfLines={1} style={styles.detailLabel}>
          {label}
        </Text>
        <Text numberOfLines={2} style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function isDelivered(status: string) {
  return status.toLowerCase().includes('delivered');
}

function getProgressIndex(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes('delivered') ||
    normalized.includes('out for delivery')
  ) {
    return 2;
  }

  if (normalized.includes('packed') || normalized.includes('packing')) {
    return 1;
  }

  return 0;
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes('delivered')) {
    return {
      color: colors.teal,
      background: colors.tealSoft,
    };
  }

  if (normalized.includes('cancel')) {
    return {
      color: colors.danger,
      background: colors.dangerSoft,
    };
  }

  return {
    color: colors.primary,
    background: colors.primarySoft,
  };
}

function getRealtimeTone(status: 'connected' | 'disconnected' | 'fallback') {
  if (status === 'connected') {
    return {
      color: colors.teal,
      background: colors.tealSoft,
      label: 'Live',
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
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  livePill: {
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
    marginTop: 8,
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTile: {
    flex: 1,
    minHeight: 78,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  orderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  orderTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  iconTile: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCopy: {
    flex: 1,
    gap: 5,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  orderMeta: {
    color: colors.mutedDark,
    fontSize: 14,
    fontWeight: '900',
  },
  itemSummary: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    maxWidth: 132,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
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
  detailGrid: {
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  detailValue: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
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
    fontWeight: '600',
  },
});
