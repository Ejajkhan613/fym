import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  Home,
  MapPin,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  AuthSession,
  CreateCustomerAddressPayload,
  CustomerAddress,
} from '../../types/domain';
import { formatAddress } from '../../utils/addresses';

type AddressDraft = {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
};

type HomeAddressScreenProps = {
  session: AuthSession;
  addresses: CustomerAddress[];
  onBack: () => void;
  onSelectDefault: (address: CustomerAddress) => Promise<void> | void;
  onCreateAddress: (payload: CreateCustomerAddressPayload) => Promise<void> | void;
  isSaving: boolean;
};

export function HomeAddressScreen({
  session,
  addresses,
  onBack,
  onSelectDefault,
  onCreateAddress,
  isSaving,
}: HomeAddressScreenProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [draft, setDraft] = useState<AddressDraft>(() => createDraft(session));

  function updateDraft(key: keyof AddressDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitAddress() {
    const validationMessage = validateDraft(draft);

    if (validationMessage) {
      Alert.alert('Check address', validationMessage);
      return;
    }

    await onCreateAddress({
      label: draft.label.trim() || 'Home',
      recipientName: draft.recipientName.trim(),
      phone: draft.phone.trim(),
      addressLine1: draft.addressLine1.trim(),
      ...(draft.addressLine2.trim() ? { addressLine2: draft.addressLine2.trim() } : {}),
      city: draft.city.trim(),
      state: draft.state.trim(),
      pincode: draft.pincode.trim(),
      isDefault: true,
      metadata: { source: 'home_header' },
    });
    setDraft(createDraft(session));
    setMode('list');
    onBack();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: 22 + insets.top }]}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={26} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Delivery Location</Text>
          <Text style={styles.headerSubtitle}>Select where medicines should be delivered.</Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {mode === 'list' ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode('form')}
              style={styles.addButton}
            >
              <Plus color={colors.primary} size={22} strokeWidth={2.5} />
              <Text style={styles.addButtonText}>Add a new delivery address</Text>
            </Pressable>

            <View style={styles.addressList}>
              {addresses.map((address) => (
                <Pressable
                  key={address.id}
                  accessibilityRole="button"
                  onPress={async () => {
                    await onSelectDefault(address);
                    onBack();
                  }}
                  style={[styles.addressCard, address.isDefault ? styles.addressCardActive : null]}
                >
                  <View style={[styles.addressIcon, address.isDefault ? styles.addressIconActive : null]}>
                    <Home
                      color={address.isDefault ? '#FFFFFF' : colors.primary}
                      size={23}
                      strokeWidth={2.4}
                    />
                  </View>
                  <View style={styles.addressCopy}>
                    <View style={styles.addressTitleRow}>
                      <Text style={styles.addressTitle}>{address.label || 'Saved address'}</Text>
                      {address.isDefault ? (
                        <View style={styles.defaultPill}>
                          <Check color={colors.primary} size={13} strokeWidth={3} />
                          <Text style={styles.defaultPillText}>Selected</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.addressRecipient}>
                      {address.recipientName || session.user.name}
                    </Text>
                    <Text numberOfLines={2} style={styles.addressText}>
                      {formatAddress(address)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <MapPin color={colors.primary} size={22} strokeWidth={2.4} />
              </View>
              <View style={styles.formHeaderCopy}>
                <Text style={styles.formTitle}>Add address</Text>
                <Text style={styles.formSubtitle}>This becomes your selected delivery address.</Text>
              </View>
            </View>

            <FormField
              label="Label"
              value={draft.label}
              onChangeText={(value) => updateDraft('label', value)}
              placeholder="Home, Work, Parents"
            />
            <FormField
              label="Recipient"
              value={draft.recipientName}
              onChangeText={(value) => updateDraft('recipientName', value)}
              placeholder="Recipient name"
            />
            <FormField
              label="Phone"
              value={draft.phone}
              onChangeText={(value) => updateDraft('phone', value)}
              placeholder="Mobile number"
              keyboardType="phone-pad"
            />
            <FormField
              label="Address line 1"
              value={draft.addressLine1}
              onChangeText={(value) => updateDraft('addressLine1', value)}
              placeholder="House, building, street"
            />
            <FormField
              label="Address line 2"
              value={draft.addressLine2}
              onChangeText={(value) => updateDraft('addressLine2', value)}
              placeholder="Landmark or area"
            />
            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <FormField
                  label="City"
                  value={draft.city}
                  onChangeText={(value) => updateDraft('city', value)}
                  placeholder="City"
                />
              </View>
              <View style={styles.column}>
                <FormField
                  label="Pincode"
                  value={draft.pincode}
                  onChangeText={(value) => updateDraft('pincode', value)}
                  placeholder="560001"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <FormField
              label="State"
              value={draft.state}
              onChangeText={(value) => updateDraft('state', value)}
              placeholder="State"
            />

            <View style={styles.formButtons}>
              <AppButton label="Cancel" variant="secondary" onPress={() => setMode('list')} />
              <AppButton
                label="Save Address"
                loading={isSaving}
                onPress={submitAddress}
                icon={<Check color="#FFFFFF" size={21} strokeWidth={2.5} />}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8D8F97"
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function createDraft(session: AuthSession): AddressDraft {
  return {
    label: 'Home',
    recipientName: session.user.name || '',
    phone: session.user.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  };
}

function validateDraft(draft: AddressDraft) {
  if (draft.recipientName.trim().length < 2) {
    return 'Recipient name is required.';
  }

  if (draft.phone.trim().length < 7) {
    return 'Recipient phone is required.';
  }

  if (draft.addressLine1.trim().length < 5) {
    return 'Address line 1 is required.';
  }

  if (!draft.city.trim()) {
    return 'City is required.';
  }

  if (!draft.state.trim()) {
    return 'State is required.';
  }

  if (!/^[1-9][0-9]{5}$/.test(draft.pincode.trim())) {
    return 'Enter a valid 6-digit pincode.';
  }

  return null;
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
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F6',
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 16,
  },
  noticeCard: {
    borderRadius: 20,
    backgroundColor: colors.tealSoft,
    borderWidth: 1,
    borderColor: '#CDECE8',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  noticeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeCopy: {
    flex: 1,
    gap: 4,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  noticeText: {
    color: colors.mutedDark,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  addButton: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C9DDFF',
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  addressList: {
    gap: 12,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },
  addressCardActive: {
    borderColor: '#A9CBFF',
    backgroundColor: colors.primarySofter,
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressIconActive: {
    backgroundColor: colors.primary,
  },
  addressCopy: {
    flex: 1,
    gap: 4,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  addressTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  defaultPill: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  defaultPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  addressRecipient: {
    color: colors.mutedDark,
    fontSize: 14,
    fontWeight: '800',
  },
  addressText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  formSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  fieldGroup: {
    gap: 8,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  input: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  formButtons: {
    gap: 10,
  },
});
