import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ClipboardList,
  Home,
  Search,
  ShoppingCart,
  User,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addCartItem, removeCartItem, updateCartItem } from '../api/cart';
import {
  createCustomerAddress,
  listCustomerAddresses,
  setDefaultCustomerAddress,
} from '../api/customers';
import { createOrder, listCustomerOrders } from '../api/orders';
import {
  connectOrderRealtime,
  listRealtimeEvents,
  type OrderRealtimeEvent,
} from '../api/realtime';
import { demoOrders } from '../data/demo';
import { CartScreen } from '../features/cart/CartScreen';
import { HomeAddressScreen } from '../features/home/HomeAddressScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { OrdersScreen } from '../features/orders/OrdersScreen';
import { PrescriptionUploadScreen } from '../features/prescriptions/PrescriptionUploadScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { SearchScreen } from '../features/search/SearchScreen';
import { colors } from '../theme/colors';
import type {
  AuthSession,
  CartEntry,
  CreateCustomerAddressPayload,
  CustomerAddress,
  LocalOrder,
  Medicine,
} from '../types/domain';
import {
  createFallbackAddress,
  createLocalAddressFromPayload,
  formatAddress,
  isLocalAddressId,
  normalizeDefaultAddress,
} from '../utils/addresses';

type TabKey = 'home' | 'search' | 'cart' | 'orders' | 'profile';
type ProfileStartPanel = 'notifications';

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

export function MainShell({
  session,
  onSessionChange,
  onLogout,
}: MainShellProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [profileStartPanel, setProfileStartPanel] = useState<ProfileStartPanel>();
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const [cartItems, setCartItems] = useState<CartEntry[]>([]);
  const [orders, setOrders] = useState<LocalOrder[]>(demoOrders);
  const [addresses, setAddresses] = useState<CustomerAddress[]>(() => [
    createFallbackAddress(session),
  ]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [orderLiveStatus, setOrderLiveStatus] = useState<
    'connected' | 'disconnected' | 'fallback'
  >('fallback');

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.isDefault) || addresses[0],
    [addresses],
  );

  useEffect(() => {
    let mounted = true;

    async function loadDeliveryState() {
      const [addressesResult, ordersResult] = await Promise.allSettled([
        listCustomerAddresses(session.user.id, session.tokens.accessToken),
        listCustomerOrders(session.user.id, session.tokens.accessToken),
      ]);

      if (!mounted) {
        return;
      }

      if (
        addressesResult.status === 'fulfilled' &&
        addressesResult.value.data.length > 0
      ) {
        setAddresses(addressesResult.value.data);
      } else {
        setAddresses([createFallbackAddress(session)]);
      }

      if (ordersResult.status === 'fulfilled') {
        setOrders(
          ordersResult.value.data.map((order) =>
            mapApiOrderToLocalOrder(order),
          ),
        );
      }
    }

    loadDeliveryState();

    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    let mounted = true;
    let refreshInFlight = false;
    let lastEventId: string | undefined;
    const channel = `customer:${session.user.id}`;

    async function refreshOrders(event?: OrderRealtimeEvent) {
      if (refreshInFlight) {
        return false;
      }

      refreshInFlight = true;

      try {
        const response = await listCustomerOrders(
          session.user.id,
          session.tokens.accessToken,
        );

        if (!mounted) {
          return false;
        }

        setOrders(response.data.map((order) => mapApiOrderToLocalOrder(order)));

        return true;
      } catch {
        // Realtime recovery should stay quiet; manual refresh still happens through normal screens.
        return false;
      } finally {
        refreshInFlight = false;
      }
    }

    async function seedCursor() {
      try {
        const response = await listRealtimeEvents(
          {
            channel,
            direction: 'desc',
            limit: 1,
          },
          session.tokens.accessToken,
        );

        if (mounted && response.data[0]?.id) {
          lastEventId = response.data[0].id;
        }
      } catch {
        // Socket pushes still work when the feed is temporarily unavailable.
      }
    }

    async function pollFeed() {
      try {
        const response = await listRealtimeEvents(
          {
            channel,
            afterId: lastEventId,
            limit: 50,
          },
          session.tokens.accessToken,
        );

        if (!mounted || response.data.length === 0) {
          return;
        }

        const newestEvent = response.data[response.data.length - 1];
        const refreshed = await refreshOrders(newestEvent);

        if (refreshed) {
          lastEventId = newestEvent.id || lastEventId;
        }
      } catch {
        // Polling is only a fallback path for missed socket messages.
      }
    }

    const disconnect = connectOrderRealtime({
      customerId: session.user.id,
      accessToken: session.tokens.accessToken,
      onConnectionChange: (status) => {
        if (mounted) {
          setOrderLiveStatus(status);
        }
      },
      onEvent: (event) => {
        if (event.channel !== channel) {
          return;
        }

        void refreshOrders(event).then((refreshed) => {
          if (refreshed) {
            lastEventId = event.id || lastEventId;
          }
        });
      },
    });
    const interval = setInterval(() => void pollFeed(), 5000);

    void seedCursor().then(() => pollFeed());

    return () => {
      mounted = false;
      disconnect();
      clearInterval(interval);
    };
  }, [session.user.id, session.tokens.accessToken]);

  async function handleAddToCart(medicine: Medicine | CartEntry) {
    const cartEntry = toCartEntry(medicine);
    const existingItem = cartItems.find((item) => item.name === cartEntry.name);

    if (existingItem) {
      const nextQuantity = existingItem.quantity + cartEntry.quantity;
      setCartItems((current) =>
        current.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: nextQuantity }
            : item,
        ),
      );

      try {
        if (isUuid(existingItem.id)) {
          await updateCartItem(
            existingItem.id,
            { quantity: nextQuantity },
            session.tokens.accessToken,
          );
        } else {
          const response = await addCartItem({
            customerId: session.user.id,
            medicineId: existingItem.medicineId,
            requestedName: existingItem.name,
            quantity: nextQuantity,
            unitPrice: existingItem.price,
            requiresPrescription: existingItem.requiresPrescription,
            accessToken: session.tokens.accessToken,
          });
          setCartItems((current) =>
            current.map((item) =>
              item.id === existingItem.id
                ? { ...item, id: response.data.id }
                : item,
            ),
          );
        }
      } catch {
        Alert.alert(
          'Added locally',
          'Cart sync will retry after the API gateway is reachable.',
        );
      }

      setActiveTab('cart');
      return;
    }

    setCartItems((current) => [cartEntry, ...current]);

    try {
      const response = await addCartItem({
        customerId: session.user.id,
        medicineId: cartEntry.medicineId,
        requestedName: cartEntry.name,
        quantity: cartEntry.quantity,
        unitPrice: cartEntry.price,
        requiresPrescription: cartEntry.requiresPrescription,
        accessToken: session.tokens.accessToken,
      });
      setCartItems((current) =>
        current.map((item) =>
          item.id === cartEntry.id ? { ...item, id: response.data.id } : item,
        ),
      );
    } catch {
      Alert.alert(
        'Added locally',
        'Cart sync will retry after the API gateway is reachable.',
      );
    }

    setActiveTab('cart');
  }

  async function handleQuantityChange(itemId: string, quantity: number) {
    if (quantity <= 0) {
      await handleRemoveFromCart(itemId);
      return;
    }

    setCartItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, quantity } : item,
      ),
    );

    if (!isUuid(itemId)) {
      return;
    }

    try {
      await updateCartItem(itemId, { quantity }, session.tokens.accessToken);
    } catch {
      Alert.alert(
        'Updated locally',
        'Cart quantity will sync after the API is reachable.',
      );
    }
  }

  async function handleRemoveFromCart(itemId: string) {
    setCartItems((current) => current.filter((item) => item.id !== itemId));

    if (!isUuid(itemId)) {
      return;
    }

    try {
      await removeCartItem(itemId, session.tokens.accessToken);
    } catch {
      Alert.alert(
        'Removed locally',
        'Cart removal will sync after the API is reachable.',
      );
    }
  }

  async function handleCheckout() {
    if (cartItems.length === 0) {
      return;
    }

    setIsCheckingOut(true);
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const deliveryFee = 25;
    const platformFee = 5;
    let localOrder: LocalOrder = {
      id: `FYM-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'Vendor matching',
      total: subtotal + deliveryFee + platformFee,
      createdAt: 'Just now',
      itemsCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      itemsSummary: cartItems
        .slice(0, 2)
        .map((item) => item.name)
        .join(', '),
      deliveryLabel: defaultAddress?.label || 'Delivery',
      deliveryAddress: defaultAddress
        ? formatAddress(defaultAddress)
        : undefined,
      paymentStatus: 'Payment pending',
      orderType: cartItems.some((item) => item.requiresPrescription)
        ? 'Prescription'
        : 'OTC',
    };

    try {
      if (!defaultAddress) {
        throw new Error('Add a delivery address before checkout.');
      }

      const response = await createOrder({
        customerId: session.user.id,
        items: cartItems,
        deliveryAddress: defaultAddress,
        accessToken: session.tokens.accessToken,
      });
      localOrder = mapApiOrderToLocalOrder(response.data.order, cartItems);
      Alert.alert(
        'Order placed',
        'Nearby pharmacies are being matched within your service radius.',
      );
    } catch {
      Alert.alert(
        'Saved locally',
        'The order is ready, but backend checkout could not be reached.',
      );
    } finally {
      setOrders((current) => [localOrder, ...current]);
      setCartItems([]);
      setActiveTab('orders');
      setIsCheckingOut(false);
    }
  }

  async function handleSelectDefaultAddress(address: CustomerAddress) {
    setAddresses((current) =>
      current.map((item) => ({
        ...item,
        isDefault: item.id === address.id,
      })),
    );

    if (isLocalAddressId(address.id)) {
      return;
    }

    try {
      await setDefaultCustomerAddress(
        session.user.id,
        address.id,
        session.tokens.accessToken,
      );
    } catch {
      Alert.alert(
        'Saved locally',
        'Default address will sync after the customer API is reachable.',
      );
    }
  }

  async function handleCreateAddress(payload: CreateCustomerAddressPayload) {
    setIsSavingAddress(true);
    const localAddress = createLocalAddressFromPayload(
      session.user.id,
      payload,
    );

    setAddresses((current) => [
      localAddress,
      ...current.map((address) =>
        normalizeDefaultAddress(address, localAddress.isDefault),
      ),
    ]);

    try {
      const response = await createCustomerAddress(
        session.user.id,
        payload,
        session.tokens.accessToken,
      );
      setAddresses((current) =>
        current.map((address) =>
          address.id === localAddress.id
            ? response.data
            : normalizeDefaultAddress(address, response.data.isDefault),
        ),
      );
    } catch {
      Alert.alert(
        'Saved locally',
        'This address will sync after the customer API is reachable.',
      );
    } finally {
      setIsSavingAddress(false);
    }
  }

  function handleOpenNotifications() {
    setShowPrescriptionUpload(false);
    setShowAddressSelector(false);
    setProfileStartPanel('notifications');
    setActiveTab('profile');
  }

  if (showPrescriptionUpload) {
    return (
      <PrescriptionUploadScreen
        session={session}
        deliveryAddress={defaultAddress}
        onBack={() => setShowPrescriptionUpload(false)}
        onOrderCreated={(orderResponse, fallbackItems) => {
          setOrders((current) => [
            mapApiOrderToLocalOrder(orderResponse.order, fallbackItems),
            ...current,
          ]);
          setShowPrescriptionUpload(false);
          setActiveTab('orders');
        }}
      />
    );
  }

  if (showAddressSelector) {
    return (
      <HomeAddressScreen
        session={session}
        addresses={addresses}
        onBack={() => setShowAddressSelector(false)}
        onSelectDefault={handleSelectDefaultAddress}
        onCreateAddress={handleCreateAddress}
        isSaving={isSavingAddress}
      />
    );
  }

  return (
    <View style={styles.shell}>
      <StatusBar style={activeTab === 'home' ? 'light' : 'dark'} />
      <View style={styles.content}>
        {activeTab === 'home' ? (
          <HomeScreen
            session={session}
            deliveryAddress={defaultAddress}
            onChangeAddress={() => setShowAddressSelector(true)}
            onOpenPrescription={() => setShowPrescriptionUpload(true)}
            onOpenSearch={() => setActiveTab('search')}
            onOpenNotifications={handleOpenNotifications}
            onAddToCart={handleAddToCart}
          />
        ) : null}
        {activeTab === 'search' ? (
          <SearchScreen
            onAddToCart={handleAddToCart}
            onBack={() => setActiveTab('home')}
          />
        ) : null}
        {activeTab === 'cart' ? (
          <CartScreen
            items={cartItems}
            deliveryAddress={defaultAddress}
            onChangeAddress={() => setShowAddressSelector(true)}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemoveFromCart}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
            onBack={() => setActiveTab('home')}
          />
        ) : null}
        {activeTab === 'orders' ? (
          <OrdersScreen
            orders={orders}
            realtimeStatus={orderLiveStatus}
            onBack={() => setActiveTab('home')}
          />
        ) : null}
        {activeTab === 'profile' ? (
          <ProfileScreen
            session={session}
            onSessionChange={onSessionChange}
            onLogout={onLogout}
            onOpenPrescriptionUpload={() => setShowPrescriptionUpload(true)}
            initialPanel={profileStartPanel}
            onInitialPanelHandled={() => setProfileStartPanel(undefined)}
            addresses={addresses}
            onAddressesChange={setAddresses}
          />
        ) : null}
      </View>
      <View
        style={[
          styles.tabBar,
          {
            minHeight: 72 + Math.max(insets.bottom, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
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
              <View
                style={[
                  styles.tabIconWrap,
                  active ? styles.tabIconWrapActive : null,
                ]}
              >
                <Icon
                  color={active ? colors.primary : colors.muted}
                  size={25}
                  strokeWidth={2.3}
                />
              </View>
              <Text
                style={[styles.tabLabel, active ? styles.tabLabelActive : null]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function mapApiOrderToLocalOrder(
  order: {
    id: string;
    status: string;
    totalAmount?: number | null;
    total?: number | null;
    createdAt?: string;
    deliveryAddress?: Record<string, unknown>;
    paymentStatus?: string | null;
    orderType?: string | null;
  },
  fallbackItems: CartEntry[] = [],
): LocalOrder {
  const deliveryAddress = normalizeApiDeliveryAddress(order.deliveryAddress);

  return {
    id: order.id.startsWith('FYM-')
      ? order.id
      : `FYM-${order.id.slice(0, 8).toUpperCase()}`,
    status: titleCase(order.status),
    total: Number(order.totalAmount ?? order.total ?? 0),
    createdAt: order.createdAt ? formatOrderDate(order.createdAt) : 'Just now',
    itemsCount:
      fallbackItems.reduce((sum, item) => sum + item.quantity, 0) || 1,
    itemsSummary:
      fallbackItems.length > 0
        ? fallbackItems
            .slice(0, 2)
            .map((item) => item.name)
            .join(', ')
        : 'Medicines and healthcare products',
    deliveryLabel:
      typeof deliveryAddress?.label === 'string'
        ? deliveryAddress.label
        : 'Delivery',
    deliveryAddress: deliveryAddress
      ? formatApiAddress(deliveryAddress)
      : undefined,
    paymentStatus: order.paymentStatus
      ? titleCase(order.paymentStatus)
      : undefined,
    orderType: order.orderType ? titleCase(order.orderType) : undefined,
  };
}

function normalizeApiDeliveryAddress(value?: Record<string, unknown>) {
  if (!value) {
    return undefined;
  }

  return value as {
    label?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

function formatApiAddress(address: {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}) {
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

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`)
    .join(' ');
}

function formatOrderDate(value: string) {
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
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
