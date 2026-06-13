import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { ClipboardList, Home, Search, ShoppingCart, User } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { addCartItem } from '../api/cart';
import { createOrder } from '../api/orders';
import { demoOrders } from '../data/demo';
import { CartScreen } from '../features/cart/CartScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { OrdersScreen } from '../features/orders/OrdersScreen';
import { PrescriptionUploadScreen } from '../features/prescriptions/PrescriptionUploadScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { colors } from '../theme/colors';
import type { AuthSession, CartEntry, LocalOrder, Medicine } from '../types/domain';

type TabKey = 'home' | 'search' | 'cart' | 'orders' | 'profile';

type MainShellProps = {
  session: AuthSession;
  onSessionChange: (session: AuthSession) => void;
  onLogout: () => void;
};

const tabs: Array<{
  key: TabKey;
  label: string;
  Icon: typeof Home;
}> = [
  { key: 'home', label: 'Home', Icon: Home },
  { key: 'search', label: 'Search', Icon: Search },
  { key: 'cart', label: 'Cart', Icon: ShoppingCart },
  { key: 'orders', label: 'Orders', Icon: ClipboardList },
  { key: 'profile', label: 'Profile', Icon: User },
];

export function MainShell({ session, onSessionChange, onLogout }: MainShellProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [cartItems, setCartItems] = useState<CartEntry[]>([]);
  const [orders, setOrders] = useState<LocalOrder[]>(demoOrders);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  async function handleAddToCart(medicine: Medicine | CartEntry) {
    const cartEntry = toCartEntry(medicine);

    setCartItems((current) => {
      const existing = current.find((item) => item.name === cartEntry.name);
      if (existing) {
        return current.map((item) =>
          item.id === existing.id ? { ...item, quantity: item.quantity + cartEntry.quantity } : item,
        );
      }

      return [cartEntry, ...current];
    });

    try {
      await addCartItem({
        customerId: session.user.id,
        medicineId: cartEntry.medicineId,
        requestedName: cartEntry.name,
        quantity: cartEntry.quantity,
        unitPrice: cartEntry.price,
        requiresPrescription: cartEntry.requiresPrescription,
      });
    } catch {
      Alert.alert('Added locally', 'Cart sync will retry after the API gateway is reachable.');
    }

    setActiveTab('cart');
  }

  function handleQuantityChange(itemId: string, quantity: number) {
    if (quantity <= 0) {
      setCartItems((current) => current.filter((item) => item.id !== itemId));
      return;
    }

    setCartItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  }

  async function handleCheckout() {
    if (cartItems.length === 0) {
      return;
    }

    setIsCheckingOut(true);
    const localOrder: LocalOrder = {
      id: `FYM-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Vendor matching',
      total: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 30),
      createdAt: 'Just now',
      itemsCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };

    try {
      await createOrder({ customerId: session.user.id, items: cartItems });
      Alert.alert('Order placed', 'Nearby pharmacies are being matched within your service radius.');
    } catch {
      Alert.alert('Saved locally', 'The order is ready, but backend checkout could not be reached.');
    } finally {
      setOrders((current) => [localOrder, ...current]);
      setCartItems([]);
      setActiveTab('orders');
      setIsCheckingOut(false);
    }
  }

  if (showPrescriptionUpload) {
    return (
      <PrescriptionUploadScreen
        session={session}
        onBack={() => setShowPrescriptionUpload(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style={activeTab === 'home' ? 'light' : 'dark'} />
      <View style={styles.content}>
        {activeTab === 'home' ? (
          <HomeScreen
            session={session}
            onOpenPrescription={() => setShowPrescriptionUpload(true)}
            onOpenSearch={() => setActiveTab('search')}
            onAddToCart={handleAddToCart}
          />
        ) : null}
        {activeTab === 'search' ? <SearchScreen onAddToCart={handleAddToCart} /> : null}
        {activeTab === 'cart' ? (
          <CartScreen
            items={cartItems}
            onQuantityChange={handleQuantityChange}
            onRemove={(itemId) => setCartItems((current) => current.filter((item) => item.id !== itemId))}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        ) : null}
        {activeTab === 'orders' ? <OrdersScreen orders={orders} /> : null}
        {activeTab === 'profile' ? (
          <ProfileScreen
            session={session}
            onSessionChange={onSessionChange}
            onLogout={onLogout}
          />
        ) : null}
      </View>
      <View style={styles.tabBar}>
        {tabs.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setActiveTab(key)}
              style={styles.tabItem}
            >
              <View style={[styles.tabIconWrap, active ? styles.tabIconWrapActive : null]}>
                <Icon
                  color={active ? colors.primary : colors.muted}
                  size={25}
                  strokeWidth={2.3}
                />
              </View>
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function toCartEntry(item: Medicine | CartEntry): CartEntry {
  if ('name' in item) {
    return {
      ...item,
      id: `${item.id}-${Date.now()}`,
    };
  }

  const demoMedicineId = item.id.startsWith('demo-') ? undefined : item.id;
  return {
    id: `${item.id}-${Date.now()}`,
    medicineId: demoMedicineId,
    name: item.brandName,
    pack: item.packSize || item.dosageForm || 'Medicine pack',
    price: item.mrp || 0,
    quantity: 1,
    requiresPrescription: Boolean(item.requiresPrescription),
  };
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    minHeight: 82,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  tabIconWrap: {
    width: 44,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.primarySoft,
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
