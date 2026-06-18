import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ClipboardList,
  Home,
  PackageCheck,
  Pill,
  RefreshCcw,
  Store,
  UserRound,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { logout } from '../api/auth';
import {
  adjustInventoryQuantity,
  bulkUploadInventory,
  createInventoryItem,
  listInventory,
  reportStockMismatch,
} from '../api/inventory';
import {
  acceptOffer,
  cancelPharmacyOrder,
  getPharmacyOrder,
  listPharmacyOrders,
  listVendorOffers,
  markOrderPacked,
  markOrderPacking,
  rejectOffer,
  viewOffer,
} from '../api/orders';
import {
  addPharmacist,
  createPharmacyDraft,
  getPharmacyProfile,
  listPharmacies,
  submitPharmacyForReview,
  uploadPharmacyDocument,
} from '../api/pharmacies';
import { appealPenalty, listPenalties } from '../api/penalties';
import {
  connectOrderRealtime,
  listRealtimeEvents,
  type OrderRealtimeEvent,
} from '../api/realtime';
import { initialInventory } from '../data/demo';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { InventoryScreen } from '../features/inventory/InventoryScreen';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { OffersScreen } from '../features/offers/OffersScreen';
import { OrdersScreen } from '../features/orders/OrdersScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { colors } from '../theme/colors';
import type {
  AddPharmacistPayload,
  AuthSession,
  CreateInventoryItemPayload,
  CreatePharmacyDraftPayload,
  InventoryItem,
  Order,
  Penalty,
  Pharmacy,
  PharmacyOrderDetails,
  PharmacyProfile,
  StockMismatchReason,
  UploadDocumentPayload,
  VendorOffer,
} from '../types/domain';

type TabKey = 'dashboard' | 'offers' | 'orders' | 'inventory' | 'profile';

type MainShellProps = {
  session: AuthSession;
  onLogout: () => void;
};

const tabs: Array<{
  key: TabKey;
  label: string;
  Icon: typeof Home;
}> = [
  { key: 'dashboard', label: 'Home', Icon: Home },
  { key: 'offers', label: 'Offers', Icon: ClipboardList },
  { key: 'orders', label: 'Orders', Icon: PackageCheck },
  { key: 'inventory', label: 'Stock', Icon: Pill },
  { key: 'profile', label: 'Profile', Icon: UserRound },
];

export function MainShell({ session, onLogout }: MainShellProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(
    null,
  );
  const [profile, setProfile] = useState<PharmacyProfile | null>(null);
  const [offers, setOffers] = useState<VendorOffer[]>([]);
  const [orderDetailsById, setOrderDetailsById] = useState<
    Record<string, PharmacyOrderDetails>
  >({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [inventorySyncStatus, setInventorySyncStatus] = useState<
    'synced' | 'local' | 'syncing'
  >('local');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orderLiveStatus, setOrderLiveStatus] = useState<
    'connected' | 'disconnected' | 'fallback'
  >('fallback');
  const [orderLiveUpdate, setOrderLiveUpdate] = useState<string | undefined>();

  const selectedPharmacy = useMemo(
    () =>
      profile?.pharmacy ||
      pharmacies.find((pharmacy) => pharmacy.id === selectedPharmacyId) ||
      null,
    [pharmacies, profile, selectedPharmacyId],
  );

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user.id]);

  useEffect(() => {
    if (!selectedPharmacyId) {
      return;
    }

    let mounted = true;
    let refreshInFlight = false;
    let lastEventId: string | undefined;
    const pharmacyId = selectedPharmacyId;
    const channel = `pharmacy:${pharmacyId}`;

    async function refreshWorkspace(event?: OrderRealtimeEvent) {
      if (refreshInFlight) {
        return false;
      }

      refreshInFlight = true;

      try {
        await loadPharmacyWorkspace(pharmacyId);

        if (mounted && event) {
          setOrderLiveUpdate(formatRealtimeEventLabel(event));
        }

        return true;
      } catch {
        // Background realtime refresh should not interrupt pharmacy actions.
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
        const refreshed = await refreshWorkspace(newestEvent);

        if (refreshed) {
          lastEventId = newestEvent.id || lastEventId;
        }
      } catch {
        // Polling is only a fallback path for missed socket messages.
      }
    }

    const disconnect = connectOrderRealtime({
      pharmacyId,
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

        void refreshWorkspace(event).then((refreshed) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPharmacyId, session.tokens.accessToken]);

  async function loadWorkspace(nextPharmacyId = selectedPharmacyId) {
    setIsLoading(true);

    try {
      const pharmacyResponse = await listPharmacies(
        {
          ownerUserId: session.user.id,
          limit: 25,
        },
        session.tokens.accessToken,
      );
      const nextPharmacies = pharmacyResponse.data;
      const nextSelectedId = nextPharmacyId || nextPharmacies[0]?.id || null;

      setPharmacies(nextPharmacies);
      setSelectedPharmacyId(nextSelectedId);

      if (!nextSelectedId) {
        setProfile(null);
        setOffers([]);
        setOrders([]);
        setPenalties([]);
        setOrderDetailsById({});
        setInventory(initialInventory);
        setInventorySyncStatus('local');
        return;
      }

      await loadPharmacyWorkspace(nextSelectedId);
    } catch (error) {
      Alert.alert('Could not load pharmacy workspace', getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPharmacyWorkspace(pharmacyId: string) {
    setInventorySyncStatus('syncing');

    const [
      profileResult,
      offersResult,
      ordersResult,
      penaltiesResult,
      inventoryResult,
    ] =
      await Promise.allSettled([
        getPharmacyProfile(pharmacyId, session.tokens.accessToken),
        listVendorOffers({ pharmacyId, limit: 25 }, session.tokens.accessToken),
        listPharmacyOrders(
          { pharmacyId, limit: 25 },
          session.tokens.accessToken,
        ),
        listPenalties(pharmacyId, session.tokens.accessToken),
        listInventory(pharmacyId, { limit: 100 }, session.tokens.accessToken),
      ]);

    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value.data);
    }

    const nextOffers =
      offersResult.status === 'fulfilled' ? offersResult.value.data : [];
    const nextOrders =
      ordersResult.status === 'fulfilled' ? ordersResult.value.data : [];
    setOffers(nextOffers);
    setOrders(nextOrders);
    setPenalties(
      penaltiesResult.status === 'fulfilled' ? penaltiesResult.value.data : [],
    );
    if (inventoryResult.status === 'fulfilled') {
      setInventory(inventoryResult.value.data);
      setInventorySyncStatus('synced');
    } else {
      setInventorySyncStatus('local');
    }

    const detailOrderIds = Array.from(
      new Set([
        ...nextOffers.map((offer) => offer.orderId),
        ...nextOrders.map((order) => order.id),
      ]),
    );

    const detailsResults = await Promise.allSettled(
      detailOrderIds
        .slice(0, 30)
        .map((orderId) =>
          getPharmacyOrder(orderId, pharmacyId, session.tokens.accessToken),
        ),
    );
    const nextDetails: Record<string, PharmacyOrderDetails> = {};

    detailsResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        nextDetails[result.value.data.order.id] = result.value.data;
      }
    });

    setOrderDetailsById(nextDetails);
  }

  async function refreshPharmacyWorkspaceSilently(pharmacyId: string) {
    try {
      await loadPharmacyWorkspace(pharmacyId);
    } catch {
      // Preserve the original action error; this refresh is only for state recovery.
    }
  }

  async function handleCreatePharmacy(payload: CreatePharmacyDraftPayload) {
    setIsSaving(true);

    try {
      const response = await createPharmacyDraft(
        payload,
        session.tokens.accessToken,
      );
      await loadWorkspace(response.data.id);
      setActiveTab('profile');
      Alert.alert(
        'Draft created',
        'Upload required documents and add pharmacist details next.',
      );
    } catch (error) {
      Alert.alert('Could not create pharmacy draft', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadDocument(payload: UploadDocumentPayload) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await uploadPharmacyDocument(
        selectedPharmacy.id,
        payload,
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      Alert.alert('Could not upload document', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddPharmacist(payload: AddPharmacistPayload) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await addPharmacist(
        selectedPharmacy.id,
        payload,
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      Alert.alert('Could not add pharmacist', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await submitPharmacyForReview(
        selectedPharmacy.id,
        session.user.id,
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
      Alert.alert(
        'Submitted',
        'The pharmacy profile is now awaiting admin review.',
      );
    } catch (error) {
      Alert.alert('Could not submit for review', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleViewOffer(offer: VendorOffer) {
    if (!selectedPharmacy) return;

    try {
      await viewOffer(
        offer.orderId,
        selectedPharmacy.id,
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      await refreshPharmacyWorkspaceSilently(selectedPharmacy.id);
      Alert.alert('Could not mark offer viewed', getErrorMessage(error));
    }
  }

  async function handleAcceptOffer(
    offer: VendorOffer,
    checklist: {
      stockConfirmed: boolean;
      expiryConfirmed: boolean;
      pharmacistVerified: boolean;
      packingTimeMinutes: number;
    },
  ) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await acceptOffer(
        offer.orderId,
        {
          pharmacyId: selectedPharmacy.id,
          ...checklist,
        },
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
      setActiveTab('orders');
      Alert.alert(
        'Order accepted',
        'Other vendor offers will close through the backend lock workflow.',
      );
    } catch (error) {
      await refreshPharmacyWorkspaceSilently(selectedPharmacy.id);
      Alert.alert('Could not accept offer', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRejectOffer(offer: VendorOffer, reason: string) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await rejectOffer(
        offer.orderId,
        {
          pharmacyId: selectedPharmacy.id,
          reason,
        },
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      await refreshPharmacyWorkspaceSilently(selectedPharmacy.id);
      Alert.alert('Could not reject offer', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkPacking(order: Order) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await markOrderPacking(
        order.id,
        {
          pharmacyId: selectedPharmacy.id,
          reason: 'Packing started by pharmacy team',
        },
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      await refreshPharmacyWorkspaceSilently(selectedPharmacy.id);
      Alert.alert('Could not mark packing', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMarkPacked(order: Order) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await markOrderPacked(
        order.id,
        {
          pharmacyId: selectedPharmacy.id,
          reason: 'Packed after stock, expiry, invoice, and pharmacist checks',
        },
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      await refreshPharmacyWorkspaceSilently(selectedPharmacy.id);
      Alert.alert('Could not mark packed', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancelOrder(order: Order, reason: string) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await cancelPharmacyOrder(
        order.id,
        {
          pharmacyId: selectedPharmacy.id,
          reason,
        },
        session.tokens.accessToken,
      );
      await loadWorkspace(selectedPharmacy.id);
    } catch (error) {
      await refreshPharmacyWorkspaceSilently(selectedPharmacy.id);
      Alert.alert('Could not cancel order', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAppealPenalty(penalty: Penalty, reason: string) {
    setIsSaving(true);

    try {
      await appealPenalty(penalty.id, { reason }, session.tokens.accessToken);
      if (selectedPharmacy) {
        await loadWorkspace(selectedPharmacy.id);
      }
      Alert.alert(
        'Appeal submitted',
        'Admin can review the pharmacy evidence and decision.',
      );
    } catch (error) {
      Alert.alert('Could not submit appeal', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateInventoryItem(payload: CreateInventoryItemPayload) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await createInventoryItem(
        selectedPharmacy.id,
        payload,
        session.tokens.accessToken,
      );
      await loadPharmacyWorkspace(selectedPharmacy.id);
      Alert.alert('Stock added', 'Inventory is updated for offer decisions.');
    } catch (error) {
      Alert.alert('Could not add stock', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkUploadInventory(
    items: CreateInventoryItemPayload[],
  ) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await bulkUploadInventory(
        selectedPharmacy.id,
        items,
        session.tokens.accessToken,
      );
      await loadPharmacyWorkspace(selectedPharmacy.id);
      Alert.alert(
        'Bulk stock uploaded',
        `${items.length} item${items.length === 1 ? '' : 's'} synced.`,
      );
    } catch (error) {
      Alert.alert('Could not upload stock', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdjustInventoryQuantity(
    item: InventoryItem,
    quantityDelta: number,
  ) {
    if (!selectedPharmacy) return;

    if (item.id.startsWith('local-stock-')) {
      setInventory((current) =>
        current.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                quantity: Math.max(0, candidate.quantity + quantityDelta),
              }
            : candidate,
        ),
      );
      return;
    }

    const previousInventory = inventory;
    setInventory((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              quantity: Math.max(0, candidate.quantity + quantityDelta),
            }
          : candidate,
      ),
    );

    try {
      await adjustInventoryQuantity(
        selectedPharmacy.id,
        item.id,
        quantityDelta,
        session.tokens.accessToken,
      );
      await loadPharmacyWorkspace(selectedPharmacy.id);
    } catch (error) {
      setInventory(previousInventory);
      Alert.alert('Could not adjust stock', getErrorMessage(error));
    }
  }

  async function handleReportStockMismatch(
    item: InventoryItem,
    reason: StockMismatchReason,
    notes?: string,
  ) {
    if (!selectedPharmacy) return;
    setIsSaving(true);

    try {
      await reportStockMismatch(
        selectedPharmacy.id,
        {
          inventoryId: item.id.startsWith('local-stock-') ? undefined : item.id,
          medicineName: item.medicineName,
          expectedQuantity: item.quantity,
          reason,
          notes,
          reportedByUserId: session.user.id,
        },
        session.tokens.accessToken,
      );
      await loadPharmacyWorkspace(selectedPharmacy.id);
      Alert.alert(
        'Mismatch reported',
        'The stock confidence score will be reviewed for this item.',
      );
    } catch (error) {
      Alert.alert('Could not report mismatch', getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout(session.tokens.refreshToken);
    } catch {
      // Device session should still clear if the API is unavailable.
    } finally {
      onLogout();
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Loading pharmacy workspace</Text>
      </SafeAreaView>
    );
  }

  if (!selectedPharmacy) {
    return (
      <OnboardingScreen
        session={session}
        profile={null}
        isSaving={isSaving}
        onCreatePharmacy={handleCreatePharmacy}
        onUploadDocument={handleUploadDocument}
        onAddPharmacist={handleAddPharmacist}
        onSubmitForReview={handleSubmitForReview}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style={activeTab === 'dashboard' ? 'light' : 'dark'} />
      <View style={styles.content}>
        {activeTab === 'dashboard' ? (
          <DashboardScreen
            session={session}
            profile={profile}
            offers={offers}
            orderDetailsById={orderDetailsById}
            orders={orders}
            penalties={penalties}
            inventory={inventory}
            realtimeStatus={orderLiveStatus}
            realtimeLabel={orderLiveUpdate}
            onRefresh={() => loadWorkspace(selectedPharmacy.id)}
            onOpenOffers={() => setActiveTab('offers')}
            onOpenOrders={() => setActiveTab('orders')}
            onOpenProfile={() => setActiveTab('profile')}
          />
        ) : null}
        {activeTab === 'offers' ? (
          <OffersScreen
            pharmacy={selectedPharmacy}
            offers={offers}
            orderDetailsById={orderDetailsById}
            isSaving={isSaving}
            realtimeStatus={orderLiveStatus}
            realtimeLabel={orderLiveUpdate}
            onRefresh={() => loadWorkspace(selectedPharmacy.id)}
            onViewOffer={handleViewOffer}
            onAcceptOffer={handleAcceptOffer}
            onRejectOffer={handleRejectOffer}
          />
        ) : null}
        {activeTab === 'orders' ? (
          <OrdersScreen
            orders={orders}
            orderDetailsById={orderDetailsById}
            isSaving={isSaving}
            onMarkPacking={handleMarkPacking}
            onMarkPacked={handleMarkPacked}
            onCancelOrder={handleCancelOrder}
          />
        ) : null}
        {activeTab === 'inventory' ? (
          <InventoryScreen
            inventory={inventory}
            isSaving={isSaving}
            syncStatus={inventorySyncStatus}
            onChangeInventory={setInventory}
            onRefresh={() => loadWorkspace(selectedPharmacy.id)}
            onCreateItem={handleCreateInventoryItem}
            onAdjustQuantity={handleAdjustInventoryQuantity}
            onBulkUpload={handleBulkUploadInventory}
            onReportMismatch={handleReportStockMismatch}
          />
        ) : null}
        {activeTab === 'profile' ? (
          <ProfileScreen
            session={session}
            pharmacies={pharmacies}
            selectedPharmacyId={selectedPharmacy.id}
            profile={profile}
            penalties={penalties}
            isSaving={isSaving}
            onSelectPharmacy={(pharmacyId) => loadWorkspace(pharmacyId)}
            onCreatePharmacy={handleCreatePharmacy}
            onUploadDocument={handleUploadDocument}
            onAddPharmacist={handleAddPharmacist}
            onSubmitForReview={handleSubmitForReview}
            onAppealPenalty={handleAppealPenalty}
            onLogout={handleLogout}
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
                  size={24}
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
    </SafeAreaView>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again.';
}

function formatRealtimeEventLabel(event: OrderRealtimeEvent) {
  const eventName = event.eventName.replace(/([a-z])([A-Z])/g, '$1 $2');
  const createdAt = event.createdAt
    ? formatDateTime(event.createdAt)
    : 'just now';

  return `${eventName} - ${createdAt}`;
}

function formatDateTime(value: string) {
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

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 12,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
