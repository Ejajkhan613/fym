import { useMemo, useState, type ReactNode } from 'react';
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
  PackagePlus,
  Pill,
  RefreshCcw,
  Snowflake,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  CreateInventoryItemPayload,
  InventoryItem,
  StockMismatchReason,
} from '../../types/domain';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

type InventoryScreenProps = {
  inventory: InventoryItem[];
  isSaving?: boolean;
  syncStatus?: 'synced' | 'local' | 'syncing';
  onChangeInventory: (inventory: InventoryItem[]) => void;
  onRefresh?: () => void;
  onCreateItem?: (payload: CreateInventoryItemPayload) => Promise<void> | void;
  onAdjustQuantity?: (
    item: InventoryItem,
    quantityDelta: number,
  ) => Promise<void> | void;
  onBulkUpload?: (
    items: CreateInventoryItemPayload[],
  ) => Promise<void> | void;
  onReportMismatch?: (
    item: InventoryItem,
    reason: StockMismatchReason,
    notes?: string,
  ) => Promise<void> | void;
};

type Draft = {
  medicineName: string;
  genericName: string;
  strength: string;
  quantity: string;
  batchNumber: string;
  expiryDate: string;
  price: string;
  coldChainRequired: boolean;
  fastMoving: boolean;
};

type FilterKey = 'all' | 'low' | 'expiring' | 'cold' | 'fast';

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'low', label: 'Low stock' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'cold', label: 'Cold-chain' },
  { key: 'fast', label: 'Fast moving' },
];

const emptyDraft: Draft = {
  medicineName: '',
  genericName: '',
  strength: '',
  quantity: '',
  batchNumber: '',
  expiryDate: '',
  price: '',
  coldChainRequired: false,
  fastMoving: false,
};

export function InventoryScreen({
  inventory,
  isSaving,
  syncStatus = 'local',
  onChangeInventory,
  onRefresh,
  onCreateItem,
  onAdjustQuantity,
  onBulkUpload,
  onReportMismatch,
}: InventoryScreenProps) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = Boolean(isSaving || isSubmitting);

  const lowStock = useMemo(
    () => inventory.filter((item) => item.quantity <= 10),
    [inventory],
  );
  const expiringSoon = useMemo(
    () =>
      inventory.filter((item) => {
        const days = daysUntil(item.expiryDate);
        return days >= 0 && days <= 90;
      }),
    [inventory],
  );

  const filteredInventory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return inventory.filter((item) => {
      const matchesQuery =
        query.length === 0 ||
        [item.medicineName, item.genericName, item.strength, item.batchNumber]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));

      if (!matchesQuery) {
        return false;
      }

      if (activeFilter === 'low') {
        return item.quantity <= 10;
      }

      if (activeFilter === 'expiring') {
        const days = daysUntil(item.expiryDate);
        return days >= 0 && days <= 90;
      }

      if (activeFilter === 'cold') {
        return item.coldChainRequired;
      }

      if (activeFilter === 'fast') {
        return item.fastMoving;
      }

      return true;
    });
  }, [activeFilter, inventory, search]);

  function update(key: keyof Draft, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function addStock() {
    const payload = createPayloadFromDraft(draft);

    if (!payload) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (onCreateItem) {
        await onCreateItem(payload);
      } else {
        onChangeInventory([
          {
            id: `local-stock-${Date.now()}`,
            medicineName: payload.medicineName,
            genericName: payload.genericName || 'Generic not set',
            strength: payload.strength || 'Strength not set',
            quantity: payload.quantity,
            batchNumber: payload.batchNumber || 'Batch not set',
            expiryDate:
              payload.expiryDate || new Date().toISOString().slice(0, 10),
            price: payload.price,
            coldChainRequired: Boolean(payload.coldChainRequired),
            fastMoving: Boolean(payload.fastMoving),
            source: 'manual',
            stockConfidenceScore: 50,
          },
          ...inventory,
        ]);
      }

      setDraft(emptyDraft);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitBulkUpload() {
    const parsed = parseBulkRows(bulkText);

    if (!parsed.ok) {
      Alert.alert('Check bulk stock', parsed.message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (onBulkUpload) {
        await onBulkUpload(parsed.items);
      } else {
        onChangeInventory([
          ...parsed.items.map((item, index) => ({
            id: `local-stock-${Date.now()}-${index}`,
            medicineName: item.medicineName,
            genericName: item.genericName || 'Generic not set',
            strength: item.strength || 'Strength not set',
            quantity: item.quantity,
            batchNumber: item.batchNumber || 'Batch not set',
            expiryDate: item.expiryDate || null,
            price: item.price,
            coldChainRequired: Boolean(item.coldChainRequired),
            fastMoving: Boolean(item.fastMoving),
            source: 'bulk_upload' as const,
            stockConfidenceScore: 55,
          })),
          ...inventory,
        ]);
      }

      setBulkText('');
      setShowBulk(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeQuantity(item: InventoryItem, quantityDelta: number) {
    if (onAdjustQuantity) {
      await onAdjustQuantity(item, quantityDelta);
      return;
    }

    onChangeInventory(
      inventory.map((current) =>
        current.id === item.id
          ? { ...current, quantity: Math.max(0, current.quantity + quantityDelta) }
          : current,
      ),
    );
  }

  function confirmMismatchReport(item: InventoryItem) {
    if (!onReportMismatch) {
      return;
    }

    Alert.alert(
      'Report stock mismatch',
      `Flag ${item.medicineName} so operations can review stock confidence and ranking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () =>
            onReportMismatch(
              item,
              'shelf_count_mismatch',
              'Shelf count mismatch reported from pharmacy inventory screen.',
            ),
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Stock operations</Text>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>
            Keep shelf counts accurate before accepting live offers.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!onRefresh}
          onPress={onRefresh}
          style={styles.refreshButton}
        >
          <RefreshCcw color={colors.primary} size={20} strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.noticeCard}>
          <AlertTriangle color="#9A6500" size={22} strokeWidth={2.4} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>{getSyncLabel(syncStatus)}</Text>
            <Text style={styles.noticeText}>
              Manual confirmation remains mandatory. Wrong acceptance lowers
              stock confidence and can trigger penalties.
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatTile label="Items" value={String(inventory.length)} />
          <StatTile label="Low stock" value={String(lowStock.length)} tone="danger" />
          <StatTile
            label="Expiry alerts"
            value={String(expiringSoon.length)}
            tone="warning"
          />
        </View>

        <View style={styles.searchBlock}>
          <AppTextInput
            Icon={Pill}
            value={search}
            onChangeText={setSearch}
            placeholder="Search medicine, batch, strength"
          />
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
                  onPress={() => setActiveFilter(filter.key)}
                  style={[styles.filterChip, active ? styles.filterChipActive : null]}
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
        </View>

        <View style={styles.formCard}>
          <View style={styles.formTitleRow}>
            <View style={styles.formIcon}>
              <PackagePlus color={colors.primary} size={23} strokeWidth={2.4} />
            </View>
            <View style={styles.formTitleCopy}>
              <Text style={styles.formTitle}>Add stock item</Text>
              <Text style={styles.formSubtitle}>
                Add batch-level stock for manual or semi-digital vendors.
              </Text>
            </View>
          </View>
          <Field label="Medicine name">
            <AppTextInput
              value={draft.medicineName}
              onChangeText={(value) => update('medicineName', value)}
              placeholder="Dolo 650 Tablet"
            />
          </Field>
          <Field label="Generic / salt">
            <AppTextInput
              value={draft.genericName}
              onChangeText={(value) => update('genericName', value)}
              placeholder="Paracetamol"
            />
          </Field>
          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Field label="Strength">
                <AppTextInput
                  value={draft.strength}
                  onChangeText={(value) => update('strength', value)}
                  placeholder="650mg"
                />
              </Field>
            </View>
            <View style={styles.column}>
              <Field label="Quantity">
                <AppTextInput
                  value={draft.quantity}
                  onChangeText={(value) => update('quantity', value.replace(/\D/g, ''))}
                  placeholder="20"
                  keyboardType="number-pad"
                />
              </Field>
            </View>
          </View>
          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <Field label="Batch">
                <AppTextInput
                  value={draft.batchNumber}
                  onChangeText={(value) => update('batchNumber', value)}
                  placeholder="BATCH-01"
                />
              </Field>
            </View>
            <View style={styles.column}>
              <Field label="Price">
                <AppTextInput
                  value={draft.price}
                  onChangeText={(value) =>
                    update('price', value.replace(/[^\d.]/g, ''))
                  }
                  placeholder="34"
                  keyboardType="decimal-pad"
                />
              </Field>
            </View>
          </View>
          <Field label="Expiry date">
            <AppTextInput
              value={draft.expiryDate}
              onChangeText={(value) => update('expiryDate', value)}
              placeholder="YYYY-MM-DD"
            />
          </Field>
          <ToggleRow
            label="Cold-chain required"
            value={draft.coldChainRequired}
            onToggle={(value) => update('coldChainRequired', value)}
          />
          <ToggleRow
            label="Fast-moving medicine"
            value={draft.fastMoving}
            onToggle={(value) => update('fastMoving', value)}
          />
          <AppButton label="Add Stock" onPress={addStock} loading={isBusy} />
        </View>

        <View style={styles.bulkCard}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowBulk((current) => !current)}
            style={styles.bulkHeader}
          >
            <View>
              <Text style={styles.bulkTitle}>Bulk upload</Text>
              <Text style={styles.bulkSubtitle}>
                Paste rows as medicine, generic, strength, quantity, batch,
                expiry, price.
              </Text>
            </View>
            <Text style={styles.bulkToggle}>{showBulk ? 'Hide' : 'Open'}</Text>
          </Pressable>
          {showBulk ? (
            <View style={styles.bulkBody}>
              <AppTextInput
                value={bulkText}
                onChangeText={setBulkText}
                placeholder="Dolo 650, Paracetamol, 650mg, 25, DOL-24, 2027-01-31, 34"
                multiline
              />
              <AppButton
                label="Import Rows"
                onPress={submitBulkUpload}
                loading={isBusy}
                variant="secondary"
              />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Stock list</Text>
          <Text style={styles.sectionMeta}>
            {filteredInventory.length} shown
          </Text>
        </View>

        <View style={styles.stockList}>
          {filteredInventory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No stock matches this view</Text>
              <Text style={styles.emptyText}>
                Clear filters or add the medicine batch before accepting offers.
              </Text>
            </View>
          ) : null}

          {filteredInventory.map((item) => (
            <StockCard
              key={item.id}
              item={item}
              isBusy={isBusy}
              onAdjust={changeQuantity}
              onReportMismatch={
                onReportMismatch ? () => confirmMismatchReport(item) : undefined
              }
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <Pressable onPress={() => onToggle(!value)} style={styles.toggleRow}>
      <View style={[styles.checkbox, value ? styles.checkboxChecked : null]}>
        {value ? <Check color="#FFFFFF" size={16} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'warning' | 'danger';
}) {
  const color =
    tone === 'danger'
      ? colors.danger
      : tone === 'warning'
        ? '#9A6500'
        : colors.primary;
  const background =
    tone === 'danger'
      ? colors.dangerSoft
      : tone === 'warning'
        ? colors.warningSoft
        : colors.primarySoft;

  return (
    <View style={[styles.statTile, { backgroundColor: background }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StockCard({
  item,
  isBusy,
  onAdjust,
  onReportMismatch,
}: {
  item: InventoryItem;
  isBusy: boolean;
  onAdjust: (item: InventoryItem, quantityDelta: number) => Promise<void> | void;
  onReportMismatch?: () => void;
}) {
  const daysToExpiry = daysUntil(item.expiryDate);
  const isLowStock = item.quantity <= 10;
  const isExpiring = daysToExpiry >= 0 && daysToExpiry <= 90;
  const confidence = item.stockConfidenceScore ?? 50;

  return (
    <View style={styles.stockCard}>
      <View style={styles.stockTop}>
        <View style={[styles.stockIcon, item.coldChainRequired ? styles.coldIcon : null]}>
          {item.coldChainRequired ? (
            <Snowflake color={colors.teal} size={23} strokeWidth={2.4} />
          ) : (
            <Pill color={colors.primary} size={23} strokeWidth={2.4} />
          )}
        </View>
        <View style={styles.stockCopy}>
          <Text style={styles.stockName}>{item.medicineName}</Text>
          <Text style={styles.stockMeta}>
            {item.genericName} - {item.strength}
          </Text>
          <Text style={styles.stockMeta}>
            Batch {item.batchNumber} - expires {formatDate(item.expiryDate)}
          </Text>
        </View>
        <View style={[styles.qtyBadge, isLowStock ? styles.qtyBadgeDanger : null]}>
          <Text style={[styles.qtyText, isLowStock ? styles.qtyDanger : null]}>
            {item.quantity}
          </Text>
        </View>
      </View>

      <View style={styles.badgeRow}>
        <Badge
          label={`${Math.round(confidence)}% confidence`}
          tone={confidence < 60 ? 'danger' : confidence < 80 ? 'warning' : 'good'}
        />
        {isLowStock ? <Badge label="Low stock" tone="danger" /> : null}
        {isExpiring ? <Badge label={`${daysToExpiry}d expiry`} tone="warning" /> : null}
        {item.fastMoving ? <Badge label="Fast moving" tone="primary" /> : null}
      </View>

      <View style={styles.stockFooter}>
        <View>
          <Text style={styles.priceText}>{formatMoney(item.price)}</Text>
          <Text style={styles.updatedText}>
            {item.lastUpdatedAt
              ? `Updated ${formatDateTime(item.lastUpdatedAt)}`
              : sourceLabel(item.source)}
          </Text>
        </View>
        <View style={styles.qtyActions}>
          {onReportMismatch ? (
            <Pressable
              disabled={isBusy}
              onPress={onReportMismatch}
              style={styles.reportButton}
            >
              <Text style={styles.reportButtonText}>Flag</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => onAdjust(item, -1)}
            style={styles.qtyButton}
          >
            <Text style={styles.qtyButtonText}>-</Text>
          </Pressable>
          <Pressable
            disabled={isBusy}
            onPress={() => onAdjust(item, 1)}
            style={styles.qtyButton}
          >
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'primary' | 'good' | 'warning' | 'danger';
}) {
  const style =
    tone === 'danger'
      ? styles.badgeDanger
      : tone === 'warning'
        ? styles.badgeWarning
        : tone === 'good'
          ? styles.badgeGood
          : styles.badgePrimary;
  const textStyle =
    tone === 'danger'
      ? styles.badgeTextDanger
      : tone === 'warning'
        ? styles.badgeTextWarning
        : tone === 'good'
          ? styles.badgeTextGood
          : styles.badgeTextPrimary;

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>{label}</Text>
    </View>
  );
}

function createPayloadFromDraft(
  draft: Draft,
): CreateInventoryItemPayload | null {
  const quantity = Number(draft.quantity);
  const price = Number(draft.price);
  const expiryDate = draft.expiryDate.trim();

  if (
    !draft.medicineName.trim() ||
    Number.isNaN(quantity) ||
    quantity < 0 ||
    Number.isNaN(price) ||
    price < 0
  ) {
    Alert.alert(
      'Check stock item',
      'Medicine name, quantity, and price are required.',
    );
    return null;
  }

  if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    Alert.alert('Check expiry date', 'Use YYYY-MM-DD for expiry date.');
    return null;
  }

  return {
    medicineName: draft.medicineName.trim(),
    genericName: draft.genericName.trim() || undefined,
    strength: draft.strength.trim() || undefined,
    quantity,
    batchNumber: draft.batchNumber.trim() || undefined,
    expiryDate: expiryDate || undefined,
    price,
    coldChainRequired: draft.coldChainRequired,
    fastMoving: draft.fastMoving,
    source: 'manual',
    stockConfidenceScore: 60,
  };
}

function parseBulkRows(
  value: string,
):
  | { ok: true; items: CreateInventoryItemPayload[] }
  | { ok: false; message: string } {
  const rows = value
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) {
    return { ok: false, message: 'Paste at least one stock row.' };
  }

  const items: CreateInventoryItemPayload[] = [];
  const invalidRows: number[] = [];

  rows.forEach((row, index) => {
    const lower = row.toLowerCase();
    if (index === 0 && lower.includes('medicine') && lower.includes('quantity')) {
      return;
    }

    const [
      medicineName,
      genericName = '',
      strength = '',
      quantityRaw = '',
      batchNumber = '',
      expiryDate = '',
      priceRaw = '',
    ] = row.split(',').map((part) => part.trim());
    const quantity = Number(quantityRaw);
    const price = Number(priceRaw);

    if (
      !medicineName ||
      Number.isNaN(quantity) ||
      quantity < 0 ||
      Number.isNaN(price) ||
      price < 0
    ) {
      invalidRows.push(index + 1);
      return;
    }

    if (expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      invalidRows.push(index + 1);
      return;
    }

    items.push({
      medicineName,
      genericName: genericName || undefined,
      strength: strength || undefined,
      quantity,
      batchNumber: batchNumber || undefined,
      expiryDate: expiryDate || undefined,
      price,
      source: 'bulk_upload',
      stockConfidenceScore: 55,
    });
  });

  if (invalidRows.length > 0) {
    return {
      ok: false,
      message: `Rows ${invalidRows.slice(0, 5).join(', ')} need medicine, quantity, price, and valid expiry.`,
    };
  }

  if (items.length === 0) {
    return { ok: false, message: 'No valid stock rows found.' };
  }

  if (items.length > 100) {
    return { ok: false, message: 'Upload 100 rows or fewer at a time.' };
  }

  return { ok: true, items };
}

function daysUntil(value?: string | null) {
  if (!value) {
    return 999;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 999;
  return Math.ceil((parsed.getTime() - Date.now()) / 86_400_000);
}

function getSyncLabel(syncStatus: 'synced' | 'local' | 'syncing') {
  if (syncStatus === 'synced') {
    return 'Backend inventory synced';
  }

  if (syncStatus === 'syncing') {
    return 'Syncing inventory';
  }

  return 'Local fallback inventory';
}

function sourceLabel(source?: InventoryItem['source']) {
  if (!source) {
    return 'Manual stock';
  }

  return source.replaceAll('_', ' ');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 3,
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 14,
  },
  noticeCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F2D6A8',
    backgroundColor: colors.warningSoft,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
  },
  noticeCopy: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    color: '#7A5100',
    fontSize: 14,
    fontWeight: '900',
  },
  noticeText: {
    color: '#8A5B00',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 3,
    color: colors.mutedDark,
    fontSize: 12,
    fontWeight: '900',
  },
  searchBlock: {
    gap: 10,
  },
  filterRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    borderColor: colors.primary,
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
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  formTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formTitleCopy: {
    flex: 1,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  formSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  field: {
    gap: 8,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  toggleRow: {
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
  toggleText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  bulkCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 15,
    gap: 13,
  },
  bulkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  bulkTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  bulkSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
  bulkToggle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  bulkBody: {
    gap: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  stockList: {
    gap: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 18,
    backgroundColor: colors.primarySofter,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  stockCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 15,
    gap: 13,
  },
  stockTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stockIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coldIcon: {
    backgroundColor: colors.tealSoft,
  },
  stockCopy: {
    flex: 1,
    gap: 3,
  },
  stockName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  stockMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  qtyBadge: {
    minWidth: 42,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBadgeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  qtyText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  qtyDanger: {
    color: colors.danger,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgePrimary: {
    backgroundColor: colors.primarySoft,
  },
  badgeGood: {
    backgroundColor: colors.tealSoft,
  },
  badgeWarning: {
    backgroundColor: colors.warningSoft,
  },
  badgeDanger: {
    backgroundColor: colors.dangerSoft,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  badgeTextPrimary: {
    color: colors.primary,
  },
  badgeTextGood: {
    color: colors.teal,
  },
  badgeTextWarning: {
    color: '#8A5B00',
  },
  badgeTextDanger: {
    color: colors.danger,
  },
  stockFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F1F4',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  priceText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  updatedText: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  qtyActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  reportButton: {
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#F2D6A8',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButtonText: {
    color: '#8A5B00',
    fontSize: 12,
    fontWeight: '900',
  },
  qtyButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
});
