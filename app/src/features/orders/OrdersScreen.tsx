import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ClipboardList, PackageCheck } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { LocalOrder } from '../../types/domain';

type OrdersScreenProps = {
  orders: LocalOrder[];
};

export function OrdersScreen({ orders }: OrdersScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Orders</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {orders.map((order) => (
          <View
            key={`${order.id}-${order.createdAt}`}
            style={styles.orderCard}
          >
            <View style={styles.iconTile}>
              <PackageCheck color={colors.primary} size={32} strokeWidth={2.2} />
            </View>
            <View style={styles.orderCopy}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderMeta}>
                {order.itemsCount} item{order.itemsCount === 1 ? '' : 's'} · Rs {order.total}
              </Text>
              <Text style={styles.orderDate}>{order.createdAt}</Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
        ))}

        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList color={colors.primary} size={48} strokeWidth={2.2} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>Your matching, packing, and delivery timeline will show here.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 24,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    paddingHorizontal: spacing.screen,
    marginBottom: 18,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 28,
    gap: 14,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconTile: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderCopy: {
    flex: 1,
    gap: 4,
  },
  orderId: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  orderMeta: {
    color: colors.mutedDark,
    fontSize: 15,
    fontWeight: '700',
  },
  orderDate: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 112,
  },
  statusText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyState: {
    minHeight: 260,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
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
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
