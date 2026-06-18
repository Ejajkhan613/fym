import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import {
  MapPin,
  Minus,
  Pill,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Trash2,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { CartEntry, CustomerAddress } from '../../types/domain';
import { formatAddress } from '../../utils/addresses';

type CartScreenProps = {
  items: CartEntry[];
  deliveryAddress?: CustomerAddress;
  onChangeAddress: () => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
};

export function CartScreen({
  items,
  deliveryAddress,
  onChangeAddress,
  onQuantityChange,
  onRemove,
  onCheckout,
  isCheckingOut,
}: CartScreenProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = items.length > 0 ? 25 : 0;
  const platformFee = items.length > 0 ? 5 : 0;
  const total = subtotal + deliveryFee + platformFee;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.subtitle}>
            {items.length > 0
              ? `${totalQuantity} item${totalQuantity === 1 ? '' : 's'} ready for checkout`
              : 'Review medicines before checkout'}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <ShoppingCart color={colors.primary} size={34} strokeWidth={2.3} />
            </View>
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>
              Search medicines, upload a prescription, or use quick reorder to start checkout.
            </Text>
          </View>
        ) : null}

        {items.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={onChangeAddress}
            style={styles.deliveryCard}
          >
            <View style={styles.deliveryIcon}>
              <MapPin color={colors.primary} size={23} strokeWidth={2.4} />
            </View>
            <View style={styles.deliveryCopy}>
              <Text style={styles.deliveryLabel}>Delivering to</Text>
              <Text style={styles.deliveryTitle}>{deliveryAddress?.label || 'Delivery address'}</Text>
              <Text numberOfLines={2} style={styles.deliveryText}>
                {deliveryAddress ? formatAddress(deliveryAddress) : 'Add a delivery address'}
              </Text>
            </View>
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        ) : null}

        {items.map((item) => (
          <View key={item.id} style={styles.cartCard}>
            <View style={styles.itemTop}>
              <View style={styles.itemIcon}>
                <Pill color={colors.primary} size={27} strokeWidth={2.4} />
              </View>
              <View style={styles.itemCopy}>
                <Text numberOfLines={2} style={styles.itemName}>
                  {item.name}
                </Text>
                <Text style={styles.itemMeta}>{item.pack}</Text>
                <View style={styles.itemBadges}>
                  <Text style={styles.itemPrice}>Rs {item.price} each</Text>
                  {item.requiresPrescription ? (
                    <View style={styles.rxBadge}>
                      <ShieldCheck color="#9A6500" size={13} strokeWidth={2.5} />
                      <Text style={styles.rxText}>Rx required</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => onRemove(item.id)}
                style={styles.removeButton}
              >
                <Trash2 color={colors.danger} size={18} strokeWidth={2.3} />
              </Pressable>
            </View>

            <View style={styles.itemFooter}>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onQuantityChange(item.id, item.quantity - 1)}
                  style={styles.stepperButton}
                >
                  <Minus color={colors.primary} size={18} strokeWidth={2.5} />
                </Pressable>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onQuantityChange(item.id, item.quantity + 1)}
                  style={styles.stepperButton}
                >
                  <Plus color={colors.primary} size={18} strokeWidth={2.5} />
                </Pressable>
              </View>
              <View style={styles.lineTotalWrap}>
                <Text style={styles.lineTotalLabel}>Item total</Text>
                <Text style={styles.lineTotal}>Rs {item.price * item.quantity}</Text>
              </View>
            </View>
          </View>
        ))}

        {items.length > 0 ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIcon}>
                <ReceiptText color={colors.primary} size={22} strokeWidth={2.4} />
              </View>
              <Text style={styles.summaryTitle}>Bill details</Text>
            </View>
            <SummaryRow label="Medicine subtotal" value={subtotal} />
            <SummaryRow label="Delivery fee" value={deliveryFee} />
            <SummaryRow label="Platform fee" value={platformFee} />
            <View style={styles.summaryDivider} />
            <SummaryRow label="Amount payable" value={total} strong />
          </View>
        ) : null}
      </ScrollView>

      {items.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerAmount}>Rs {total}</Text>
          </View>
          <View style={styles.footerButton}>
            <AppButton
              label="Place Order"
              onPress={onCheckout}
              loading={isCheckingOut}
            />
          </View>
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
      <Text style={[styles.summaryLabel, strong ? styles.summaryStrongLabel : null]}>{label}</Text>
      <Text style={[styles.summaryValue, strong ? styles.summaryStrongValue : null]}>Rs {value}</Text>
    </View>
  );
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
    marginTop: 3,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 132,
    gap: 14,
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
  deliveryCard: {
    borderWidth: 1,
    borderColor: '#C9DDFF',
    borderRadius: 20,
    backgroundColor: colors.primarySofter,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryCopy: {
    flex: 1,
    gap: 2,
  },
  deliveryLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  deliveryTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  deliveryText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  changeText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  cartCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  itemIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCopy: {
    flex: 1,
    gap: 5,
  },
  itemName: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  itemMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  itemBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  itemPrice: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  rxBadge: {
    borderRadius: 999,
    backgroundColor: '#FFF3DA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rxText: {
    color: '#9A6500',
    fontSize: 11,
    fontWeight: '900',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F1F4',
    paddingTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    minWidth: 20,
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  lineTotalWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  lineTotalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  lineTotal: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  summaryCard: {
    marginTop: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  summaryStrongLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryStrongValue: {
    color: colors.text,
    fontSize: 19,
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
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerTotal: {
    minWidth: 92,
    gap: 2,
  },
  footerLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  footerAmount: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  footerButton: {
    flex: 1,
  },
});
