import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { CartEntry } from '../../types/domain';

type CartScreenProps = {
  items: CartEntry[];
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
};

export function CartScreen({
  items,
  onQuantityChange,
  onRemove,
  onCheckout,
  isCheckingOut,
}: CartScreenProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = items.length > 0 ? 25 : 0;
  const platformFee = items.length > 0 ? 5 : 0;
  const total = subtotal + deliveryFee + platformFee;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Cart</Text>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingCart color={colors.primary} size={48} strokeWidth={2.2} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Search medicines or reorder from home to start checkout.</Text>
          </View>
        ) : null}

        {items.map((item) => (
          <View
            key={item.id}
            style={styles.cartCard}
          >
            <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.pack}</Text>
              <Text style={styles.itemPrice}>Rs {item.price} each</Text>
              {item.requiresPrescription ? <Text style={styles.rxText}>Prescription required</Text> : null}
            </View>
            <View style={styles.itemActions}>
              <Pressable
                onPress={() => onRemove(item.id)}
                style={styles.removeButton}
              >
                <Trash2 color={colors.danger} size={20} strokeWidth={2.2} />
              </Pressable>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => onQuantityChange(item.id, item.quantity - 1)}
                  style={styles.stepperButton}
                >
                  <Minus color={colors.primary} size={18} strokeWidth={2.4} />
                </Pressable>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <Pressable
                  onPress={() => onQuantityChange(item.id, item.quantity + 1)}
                  style={styles.stepperButton}
                >
                  <Plus color={colors.primary} size={18} strokeWidth={2.4} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {items.length > 0 ? (
          <View style={styles.summaryCard}>
            <SummaryRow
              label="Subtotal"
              value={subtotal}
            />
            <SummaryRow
              label="Delivery fee"
              value={deliveryFee}
            />
            <SummaryRow
              label="Platform fee"
              value={platformFee}
            />
            <View style={styles.summaryDivider} />
            <SummaryRow
              label="Total"
              value={total}
              strong
            />
          </View>
        ) : null}
      </ScrollView>

      {items.length > 0 ? (
        <View style={styles.footer}>
          <AppButton
            label="Place Order"
            onPress={onCheckout}
            loading={isCheckingOut}
          />
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, strong ? styles.summaryStrong : null]}>{label}</Text>
      <Text style={[styles.summaryValue, strong ? styles.summaryStrong : null]}>Rs {value}</Text>
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
    paddingBottom: 120,
    gap: 14,
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
  cartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  itemCopy: {
    flex: 1,
    gap: 5,
  },
  itemName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  itemPrice: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  rxText: {
    color: '#9A6500',
    fontSize: 13,
    fontWeight: '900',
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    padding: 4,
    gap: 8,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 18,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryCard: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  summaryStrong: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
