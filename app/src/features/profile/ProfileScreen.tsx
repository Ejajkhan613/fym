import { useEffect, useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import {
  ActivityIndicator,
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
  Bell,
  Calendar,
  Check,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  HeartPulse,
  Home,
  IdCard,
  LockKeyhole,
  LogOut,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerProfile,
  listCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
  upsertCustomerProfile,
} from '../../api/customers';
import { logout } from '../../api/auth';
import { updateUser } from '../../api/users';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  AuthSession,
  CustomerAddress,
  CustomerGender,
  UpsertCustomerProfilePayload,
} from '../../types/domain';

type ProfileScreenProps = {
  session: AuthSession;
  onSessionChange: (session: AuthSession) => void;
  onLogout: () => void;
};

type ProfilePanel = 'overview' | 'personal' | 'addresses' | 'addressForm';

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type ProfileAction = {
  title: string;
  subtitle: string;
  Icon: ComponentType<IconProps>;
  tone?: 'blue' | 'teal' | 'warning';
  panel?: ProfilePanel;
};

type ProfileDraft = {
  name: string;
  dateOfBirth: string;
  gender: CustomerGender | '';
  emergencyContactName: string;
  emergencyContactPhone: string;
  abhaIdOptional: string;
  bloodGroup: string;
  allergies: string;
  chronicMedicines: string;
  doctorName: string;
  doctorPhone: string;
};

type AddressDraft = {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  isDefault: boolean;
};

const profileActions: ProfileAction[] = [
  {
    title: 'Personal details',
    subtitle: 'Name, DOB, gender, ABHA, and emergency contact',
    Icon: UserRound,
    panel: 'personal',
  },
  {
    title: 'Delivery addresses',
    subtitle: 'Home, work, and saved recipients',
    Icon: MapPin,
    panel: 'addresses',
  },
  {
    title: 'Family profiles',
    subtitle: 'Manage prescriptions for family members',
    Icon: Users,
    tone: 'teal',
  },
  {
    title: 'Prescription vault',
    subtitle: 'Uploaded and approved prescriptions',
    Icon: FileText,
  },
  {
    title: 'Medicine reminders',
    subtitle: 'Refill and dose reminders',
    Icon: Calendar,
    tone: 'warning',
  },
  {
    title: 'Payments and refunds',
    subtitle: 'Wallet, cards, invoices, and refunds',
    Icon: WalletCards,
  },
  {
    title: 'Support tickets',
    subtitle: 'Order help and pharmacist queries',
    Icon: ClipboardList,
  },
  {
    title: 'Notifications',
    subtitle: 'Order, offer, and reminder alerts',
    Icon: Bell,
  },
  {
    title: 'Privacy and security',
    subtitle: 'Data access, consent, and session safety',
    Icon: LockKeyhole,
  },
];

export function ProfileScreen({ session, onSessionChange, onLogout }: ProfileScreenProps) {
  const [panel, setPanel] = useState<ProfilePanel>('overview');
  const [profileDraft, setProfileDraft] = useState(() => createInitialProfileDraft(session));
  const [addresses, setAddresses] = useState<CustomerAddress[]>(() => [createFallbackAddress(session)]);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.isDefault) || addresses[0],
    [addresses],
  );
  const completion = useMemo(
    () => calculateProfileCompletion(profileDraft, addresses),
    [addresses, profileDraft],
  );

  useEffect(() => {
    let mounted = true;

    async function loadCustomerDetails() {
      setIsSyncing(true);

      const [profileResult, addressesResult] = await Promise.allSettled([
        getCustomerProfile(session.user.id, session.tokens.accessToken),
        listCustomerAddresses(session.user.id, session.tokens.accessToken),
      ]);

      if (!mounted) {
        return;
      }

      if (profileResult.status === 'fulfilled') {
        setProfileDraft(createProfileDraftFromApi(session, profileResult.value.data));
      }

      if (addressesResult.status === 'fulfilled' && addressesResult.value.data.length > 0) {
        setAddresses(addressesResult.value.data);
      }

      setIsSyncing(false);
    }

    loadCustomerDetails();

    return () => {
      mounted = false;
    };
  }, [session]);

  async function handleLogout() {
    try {
      await logout(session.tokens.refreshToken);
    } catch {
      // Local logout should still clear the device session if the API is unreachable.
    } finally {
      onLogout();
    }
  }

  async function handleSaveProfile() {
    const validationMessage = validateProfileDraft(profileDraft);

    if (validationMessage) {
      Alert.alert('Check personal details', validationMessage);
      return;
    }

    setIsSavingProfile(true);

    try {
      let nextSession = session;
      const trimmedName = profileDraft.name.trim();

      if (trimmedName !== session.user.name) {
        const userResponse = await updateUser(
          session.user.id,
          { name: trimmedName },
          session.tokens.accessToken,
        );
        nextSession = {
          ...session,
          user: userResponse.data,
        };
        onSessionChange(nextSession);
      }

      await upsertCustomerProfile(
        session.user.id,
        buildProfilePayload(profileDraft),
        nextSession.tokens.accessToken,
      );

      Alert.alert('Profile updated', 'Your personal and medical safety details were saved.');
      setPanel('overview');
    } catch (error) {
      Alert.alert(
        'Saved on this device',
        error instanceof Error
          ? `Backend sync failed: ${error.message}`
          : 'Backend sync failed. Your edits remain visible in the app.',
      );
      setPanel('overview');
    } finally {
      setIsSavingProfile(false);
    }
  }

  function openAddressForm(address?: CustomerAddress) {
    setEditingAddress(address || null);
    setPanel('addressForm');
  }

  async function handleSaveAddress(draft: AddressDraft) {
    const validationMessage = validateAddressDraft(draft);

    if (validationMessage) {
      Alert.alert('Check address', validationMessage);
      return;
    }

    setIsSavingAddress(true);
    const payload = buildAddressPayload(draft);

    try {
      if (editingAddress) {
        const optimisticAddress = mergeAddressDraft(editingAddress, draft);
        setAddresses((current) =>
          current.map((address) =>
            address.id === editingAddress.id ? optimisticAddress : normalizeDefault(address, draft.isDefault),
          ),
        );

        if (!isLocalId(editingAddress.id)) {
          const response = await updateCustomerAddress(
            session.user.id,
            editingAddress.id,
            payload,
            session.tokens.accessToken,
          );
          setAddresses((current) =>
            current.map((address) =>
              address.id === editingAddress.id ? response.data : normalizeDefault(address, response.data.isDefault),
            ),
          );
        }
      } else {
        const tempAddress = createAddressFromDraft(session.user.id, draft);
        setAddresses((current) => [
          tempAddress,
          ...current.map((address) => normalizeDefault(address, tempAddress.isDefault)),
        ]);

        try {
          const response = await createCustomerAddress(
            session.user.id,
            payload,
            session.tokens.accessToken,
          );
          setAddresses((current) =>
            current.map((address) =>
              address.id === tempAddress.id
                ? response.data
                : normalizeDefault(address, response.data.isDefault),
            ),
          );
        } catch {
          Alert.alert('Saved locally', 'This address will sync after the customer API is reachable.');
        }
      }

      setPanel('addresses');
      setEditingAddress(null);
    } catch (error) {
      Alert.alert('Could not save address', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleSetDefaultAddress(address: CustomerAddress) {
    setAddresses((current) =>
      current.map((item) => ({
        ...item,
        isDefault: item.id === address.id,
      })),
    );

    if (isLocalId(address.id)) {
      return;
    }

    try {
      await setDefaultCustomerAddress(session.user.id, address.id, session.tokens.accessToken);
    } catch {
      Alert.alert('Saved locally', 'Default address will sync after the customer API is reachable.');
    }
  }

  async function handleDeleteAddress(address: CustomerAddress) {
    setAddresses((current) => {
      const next = current.filter((item) => item.id !== address.id);
      if (next.length > 0 && !next.some((item) => item.isDefault)) {
        return [{ ...next[0], isDefault: true }, ...next.slice(1)];
      }
      return next;
    });

    if (isLocalId(address.id)) {
      return;
    }

    try {
      await deleteCustomerAddress(session.user.id, address.id, session.tokens.accessToken);
    } catch {
      Alert.alert('Deleted locally', 'Address deletion will sync after the customer API is reachable.');
    }
  }

  if (panel === 'personal') {
    return (
      <PersonalDetailsScreen
        session={session}
        draft={profileDraft}
        onChange={setProfileDraft}
        onBack={() => setPanel('overview')}
        onSave={handleSaveProfile}
        isSaving={isSavingProfile}
      />
    );
  }

  if (panel === 'addresses') {
    return (
      <AddressListScreen
        addresses={addresses}
        onBack={() => setPanel('overview')}
        onAdd={() => openAddressForm()}
        onEdit={openAddressForm}
        onSetDefault={handleSetDefaultAddress}
        onDelete={(address) =>
          Alert.alert('Delete address?', 'This address will be removed from your profile.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteAddress(address) },
          ])
        }
      />
    );
  }

  if (panel === 'addressForm') {
    return (
      <AddressFormScreen
        address={editingAddress}
        session={session}
        onBack={() => {
          setEditingAddress(null);
          setPanel('addresses');
        }}
        onSave={handleSaveAddress}
        isSaving={isSavingAddress}
      />
    );
  }

  const firstName = profileDraft.name.split(' ')[0] || 'Customer';
  const initials = getInitials(profileDraft.name);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>CUSTOMER PROFILE</Text>
              <Text
                numberOfLines={1}
                style={styles.name}
              >
                {profileDraft.name || firstName}
              </Text>
              <Text style={styles.phone}>{session.user.phone}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPanel('personal')}
              style={styles.editButton}
            >
              <Edit3 color="#FFFFFF" size={22} strokeWidth={2.3} />
            </Pressable>
          </View>

          <View style={styles.statusGrid}>
            <StatusChip
              Icon={ShieldCheck}
              label="OTP verified"
            />
            <StatusChip
              Icon={IdCard}
              label="Customer"
            />
            {isSyncing ? (
              <View style={styles.statusChip}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.statusChipText}>Syncing</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryTile
            value={`${completion}%`}
            label="Complete"
          />
          <SummaryTile
            value={String(addresses.length)}
            label="Addresses"
          />
          <SummaryTile
            value="2"
            label="Family"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setPanel('addresses')}
          style={styles.addressCard}
        >
          <View style={styles.addressIcon}>
            <MapPin color={colors.primary} size={30} strokeWidth={2.3} />
          </View>
          <View style={styles.addressCopy}>
            <Text style={styles.cardTitle}>Default delivery location</Text>
            <Text
              numberOfLines={2}
              style={styles.cardText}
            >
              {defaultAddress ? formatAddress(defaultAddress) : 'Add a delivery address'}
            </Text>
          </View>
          <ChevronRight color={colors.muted} size={23} strokeWidth={2.2} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setPanel('personal')}
          style={styles.safetyCard}
        >
          <View style={styles.safetyIcon}>
            <HeartPulse color={colors.teal} size={30} strokeWidth={2.3} />
          </View>
          <View style={styles.safetyCopy}>
            <Text style={styles.safetyTitle}>Health profile</Text>
            <Text style={styles.safetyText}>
              {profileDraft.allergies || profileDraft.chronicMedicines
                ? 'Allergy and chronic medicine notes are saved.'
                : 'Add allergies, chronic medicines, and emergency contact details.'}
            </Text>
          </View>
          <View style={styles.completionBadge}>
            <Text style={styles.completionText}>{completion}%</Text>
          </View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.sectionHint}>Manage</Text>
        </View>

        <View style={styles.actionList}>
          {profileActions.map((action) => (
            <ProfileActionRow
              key={action.title}
              action={action}
              onPress={() => {
                if (action.panel) {
                  setPanel(action.panel);
                  return;
                }

                Alert.alert(action.title, action.subtitle);
              }}
            />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert('Log out?', 'This will remove the stored mobile session.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Log Out', style: 'destructive', onPress: handleLogout },
            ])
          }
          style={styles.logoutButton}
        >
          <LogOut color={colors.danger} size={22} strokeWidth={2.2} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function PersonalDetailsScreen({
  session,
  draft,
  onChange,
  onBack,
  onSave,
  isSaving,
}: {
  session: AuthSession;
  draft: ProfileDraft;
  onChange: (draft: ProfileDraft) => void;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  function updateDraft(key: keyof ProfileDraft, value: string) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Personal Details"
        subtitle="Required for safe delivery, prescription checks, and support."
        onBack={onBack}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
      >
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Verified identity</Text>
          <FormField
            label="Full name"
            value={draft.name}
            onChangeText={(value) => updateDraft('name', value)}
            placeholder="Enter full name"
            icon={<UserRound color={colors.muted} size={22} strokeWidth={2.2} />}
          />
          <ReadonlyField
            label="Mobile number"
            value={session.user.phone}
            icon={<Phone color={colors.primary} size={22} strokeWidth={2.2} />}
            note="Phone changes should go through OTP verification."
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Basic details</Text>
          <FormField
            label="Date of birth"
            value={draft.dateOfBirth}
            onChangeText={(value) => updateDraft('dateOfBirth', value)}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.segmentRow}>
            {genderOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                onPress={() => updateDraft('gender', option.value)}
                style={[
                  styles.segment,
                  draft.gender === option.value ? styles.segmentActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    draft.gender === option.value ? styles.segmentTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <FormField
            label="ABHA ID"
            value={draft.abhaIdOptional}
            onChangeText={(value) => updateDraft('abhaIdOptional', value)}
            placeholder="Optional"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Emergency and medical safety</Text>
          <FormField
            label="Emergency contact name"
            value={draft.emergencyContactName}
            onChangeText={(value) => updateDraft('emergencyContactName', value)}
            placeholder="Name"
          />
          <FormField
            label="Emergency contact phone"
            value={draft.emergencyContactPhone}
            onChangeText={(value) => updateDraft('emergencyContactPhone', value)}
            placeholder="+91..."
            keyboardType="phone-pad"
          />
          <FormField
            label="Blood group"
            value={draft.bloodGroup}
            onChangeText={(value) => updateDraft('bloodGroup', value)}
            placeholder="E.g. B+"
          />
          <FormField
            label="Known allergies"
            value={draft.allergies}
            onChangeText={(value) => updateDraft('allergies', value)}
            placeholder="E.g. Penicillin, aspirin"
            multiline
          />
          <FormField
            label="Chronic medicines"
            value={draft.chronicMedicines}
            onChangeText={(value) => updateDraft('chronicMedicines', value)}
            placeholder="E.g. Metformin 500mg daily"
            multiline
          />
          <FormField
            label="Preferred doctor"
            value={draft.doctorName}
            onChangeText={(value) => updateDraft('doctorName', value)}
            placeholder="Doctor name"
          />
          <FormField
            label="Doctor phone"
            value={draft.doctorPhone}
            onChangeText={(value) => updateDraft('doctorPhone', value)}
            placeholder="Optional"
            keyboardType="phone-pad"
          />
        </View>
      </ScrollView>
      <View style={styles.stickyFooter}>
        <AppButton
          label="Save Details"
          onPress={onSave}
          loading={isSaving}
          icon={<Save color="#FFFFFF" size={22} strokeWidth={2.3} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function AddressListScreen({
  addresses,
  onBack,
  onAdd,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  addresses: CustomerAddress[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (address: CustomerAddress) => void;
  onSetDefault: (address: CustomerAddress) => void;
  onDelete: (address: CustomerAddress) => void;
}) {
  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Delivery Addresses"
        subtitle="Manage recipients and delivery locations for pharmacy matching."
        onBack={onBack}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
      >
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          style={styles.addAddressButton}
        >
          <Plus color={colors.primary} size={24} strokeWidth={2.4} />
          <Text style={styles.addAddressText}>Add new address</Text>
        </Pressable>

        {addresses.map((address) => (
          <View
            key={address.id}
            style={styles.managedAddressCard}
          >
            <View style={styles.managedAddressTop}>
              <View style={styles.addressIcon}>
                <Home color={colors.primary} size={26} strokeWidth={2.3} />
              </View>
              <View style={styles.addressCopy}>
                <View style={styles.addressTitleRow}>
                  <Text style={styles.cardTitle}>{address.label || 'Address'}</Text>
                  {address.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardText}>{address.recipientName || 'Recipient'}</Text>
                <Text style={styles.cardText}>{formatAddress(address)}</Text>
                {address.phone ? <Text style={styles.cardText}>{address.phone}</Text> : null}
              </View>
            </View>
            <View style={styles.addressActions}>
              {!address.isDefault ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSetDefault(address)}
                  style={styles.addressActionButton}
                >
                  <Check color={colors.primary} size={18} strokeWidth={2.4} />
                  <Text style={styles.addressActionText}>Set default</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => onEdit(address)}
                style={styles.addressActionButton}
              >
                <Edit3 color={colors.primary} size={18} strokeWidth={2.4} />
                <Text style={styles.addressActionText}>Edit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => onDelete(address)}
                style={[styles.addressActionButton, styles.deleteAddressAction]}
              >
                <Trash2 color={colors.danger} size={18} strokeWidth={2.4} />
                <Text style={styles.deleteAddressText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function AddressFormScreen({
  address,
  session,
  onBack,
  onSave,
  isSaving,
}: {
  address: CustomerAddress | null;
  session: AuthSession;
  onBack: () => void;
  onSave: (draft: AddressDraft) => void;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState(() => createAddressDraft(session, address));

  function updateDraft(key: keyof AddressDraft, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title={address ? 'Edit Address' : 'Add Address'}
        subtitle="Delivery partners and pharmacies use these details for fulfillment."
        onBack={onBack}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
      >
        <View style={styles.formSection}>
          <FormField
            label="Address label"
            value={draft.label}
            onChangeText={(value) => updateDraft('label', value)}
            placeholder="Home, Work, Parents"
          />
          <FormField
            label="Recipient name"
            value={draft.recipientName}
            onChangeText={(value) => updateDraft('recipientName', value)}
            placeholder="Who will receive the order?"
          />
          <FormField
            label="Recipient phone"
            value={draft.phone}
            onChangeText={(value) => updateDraft('phone', value)}
            placeholder="+91..."
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formSection}>
          <FormField
            label="Address line 1"
            value={draft.addressLine1}
            onChangeText={(value) => updateDraft('addressLine1', value)}
            placeholder="House, building, street"
            multiline
          />
          <FormField
            label="Address line 2"
            value={draft.addressLine2}
            onChangeText={(value) => updateDraft('addressLine2', value)}
            placeholder="Landmark, floor, area"
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
                label="State"
                value={draft.state}
                onChangeText={(value) => updateDraft('state', value)}
                placeholder="State"
              />
            </View>
          </View>
          <FormField
            label="Pincode"
            value={draft.pincode}
            onChangeText={(value) => updateDraft('pincode', value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit pincode"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Optional geo coordinates</Text>
          <View style={styles.twoColumnRow}>
            <View style={styles.column}>
              <FormField
                label="Latitude"
                value={draft.latitude}
                onChangeText={(value) => updateDraft('latitude', value)}
                placeholder="12.9352"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.column}>
              <FormField
                label="Longitude"
                value={draft.longitude}
                onChangeText={(value) => updateDraft('longitude', value)}
                placeholder="77.6245"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: draft.isDefault }}
            onPress={() => updateDraft('isDefault', !draft.isDefault)}
            style={styles.defaultToggle}
          >
            <View style={[styles.checkbox, draft.isDefault ? styles.checkboxChecked : null]}>
              {draft.isDefault ? <Check color="#FFFFFF" size={17} strokeWidth={2.8} /> : null}
            </View>
            <Text style={styles.defaultToggleText}>Set as default delivery address</Text>
          </Pressable>
        </View>
      </ScrollView>
      <View style={styles.stickyFooter}>
        <AppButton
          label={address ? 'Save Address' : 'Add Address'}
          onPress={() => onSave(draft)}
          loading={isSaving}
          icon={<Save color="#FFFFFF" size={22} strokeWidth={2.3} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.subHeader}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={styles.backButton}
      >
        <ArrowLeft color={colors.text} size={27} strokeWidth={2.4} />
      </Pressable>
      <View style={styles.subHeaderCopy}>
        <Text style={styles.subHeaderTitle}>{title}</Text>
        <Text style={styles.subHeaderSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'numbers-and-punctuation';
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrap, multiline ? styles.inputWrapMultiline : null]}>
        {icon}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8D8F97"
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.textInput, multiline ? styles.textInputMultiline : null]}
        />
      </View>
    </View>
  );
}

function ReadonlyField({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.readonlyWrap}>
        {icon}
        <View style={styles.readonlyCopy}>
          <Text style={styles.readonlyValue}>{value}</Text>
          <Text style={styles.readonlyNote}>{note}</Text>
        </View>
      </View>
    </View>
  );
}

function StatusChip({
  Icon,
  label,
}: {
  Icon: ComponentType<IconProps>;
  label: string;
}) {
  return (
    <View style={styles.statusChip}>
      <Icon color="#FFFFFF" size={17} strokeWidth={2.3} />
      <Text style={styles.statusChipText}>{label}</Text>
    </View>
  );
}

function SummaryTile({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ProfileActionRow({
  action,
  onPress,
}: {
  action: ProfileAction;
  onPress: () => void;
}) {
  const tint = getTone(action.tone);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed ? styles.actionRowPressed : null]}
    >
      <View style={[styles.actionIcon, { backgroundColor: tint.background }]}>
        <action.Icon color={tint.color} size={25} strokeWidth={2.25} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{action.title}</Text>
        <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
      </View>
      <ChevronRight color={colors.muted} size={22} strokeWidth={2.2} />
    </Pressable>
  );
}

const genderOptions: Array<{ label: string; value: CustomerGender }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not', value: 'prefer_not_to_say' },
];

function createInitialProfileDraft(session: AuthSession): ProfileDraft {
  return {
    name: session.user.name || '',
    dateOfBirth: '',
    gender: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    abhaIdOptional: '',
    bloodGroup: '',
    allergies: '',
    chronicMedicines: '',
    doctorName: '',
    doctorPhone: '',
  };
}

function createProfileDraftFromApi(
  session: AuthSession,
  profile: {
    dateOfBirth?: string | null;
    gender?: CustomerGender | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
    abhaIdOptional?: string | null;
    metadata?: Record<string, unknown>;
  },
): ProfileDraft {
  const metadata = profile.metadata || {};

  return {
    name: session.user.name || '',
    dateOfBirth: normalizeDate(profile.dateOfBirth),
    gender: profile.gender || '',
    emergencyContactName: profile.emergencyContactName || '',
    emergencyContactPhone: profile.emergencyContactPhone || '',
    abhaIdOptional: profile.abhaIdOptional || '',
    bloodGroup: readMetadataString(metadata, 'bloodGroup'),
    allergies: readMetadataString(metadata, 'allergies'),
    chronicMedicines: readMetadataString(metadata, 'chronicMedicines'),
    doctorName: readMetadataString(metadata, 'doctorName'),
    doctorPhone: readMetadataString(metadata, 'doctorPhone'),
  };
}

function createFallbackAddress(session: AuthSession): CustomerAddress {
  return {
    id: 'local-default-address',
    userId: session.user.id,
    label: 'Home',
    recipientName: session.user.name,
    phone: session.user.phone,
    addressLine1: 'Koramangala 5th Block',
    addressLine2: 'Near Forum Mall',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560095',
    latitude: 12.9352,
    longitude: 77.6245,
    isDefault: true,
    metadata: {},
  };
}

function createAddressDraft(session: AuthSession, address: CustomerAddress | null): AddressDraft {
  if (!address) {
    return {
      label: '',
      recipientName: session.user.name || '',
      phone: session.user.phone || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      latitude: '',
      longitude: '',
      isDefault: false,
    };
  }

  return {
    label: address.label || '',
    recipientName: address.recipientName || '',
    phone: address.phone || '',
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    latitude: address.latitude === null || address.latitude === undefined ? '' : String(address.latitude),
    longitude: address.longitude === null || address.longitude === undefined ? '' : String(address.longitude),
    isDefault: address.isDefault,
  };
}

function createAddressFromDraft(userId: string, draft: AddressDraft): CustomerAddress {
  return {
    id: `local-address-${Date.now()}`,
    userId,
    label: trimmedOrNull(draft.label),
    recipientName: trimmedOrNull(draft.recipientName),
    phone: trimmedOrNull(draft.phone),
    addressLine1: draft.addressLine1.trim(),
    addressLine2: trimmedOrNull(draft.addressLine2),
    city: draft.city.trim(),
    state: draft.state.trim(),
    pincode: draft.pincode.trim(),
    latitude: parseOptionalNumber(draft.latitude),
    longitude: parseOptionalNumber(draft.longitude),
    isDefault: draft.isDefault,
    metadata: {},
  };
}

function mergeAddressDraft(address: CustomerAddress, draft: AddressDraft): CustomerAddress {
  return {
    ...address,
    label: trimmedOrNull(draft.label),
    recipientName: trimmedOrNull(draft.recipientName),
    phone: trimmedOrNull(draft.phone),
    addressLine1: draft.addressLine1.trim(),
    addressLine2: trimmedOrNull(draft.addressLine2),
    city: draft.city.trim(),
    state: draft.state.trim(),
    pincode: draft.pincode.trim(),
    latitude: parseOptionalNumber(draft.latitude),
    longitude: parseOptionalNumber(draft.longitude),
    isDefault: draft.isDefault,
  };
}

function buildProfilePayload(draft: ProfileDraft): UpsertCustomerProfilePayload {
  return {
    ...(draft.dateOfBirth.trim() ? { dateOfBirth: draft.dateOfBirth.trim() } : {}),
    ...(draft.gender ? { gender: draft.gender } : {}),
    ...(draft.emergencyContactName.trim()
      ? { emergencyContactName: draft.emergencyContactName.trim() }
      : {}),
    ...(draft.emergencyContactPhone.trim()
      ? { emergencyContactPhone: draft.emergencyContactPhone.trim() }
      : {}),
    ...(draft.abhaIdOptional.trim() ? { abhaIdOptional: draft.abhaIdOptional.trim() } : {}),
    metadata: compactObject({
      bloodGroup: draft.bloodGroup,
      allergies: draft.allergies,
      chronicMedicines: draft.chronicMedicines,
      doctorName: draft.doctorName,
      doctorPhone: draft.doctorPhone,
    }),
  };
}

function buildAddressPayload(draft: AddressDraft) {
  return {
    ...(draft.label.trim() ? { label: draft.label.trim() } : {}),
    ...(draft.recipientName.trim() ? { recipientName: draft.recipientName.trim() } : {}),
    ...(draft.phone.trim() ? { phone: draft.phone.trim() } : {}),
    addressLine1: draft.addressLine1.trim(),
    ...(draft.addressLine2.trim() ? { addressLine2: draft.addressLine2.trim() } : {}),
    city: draft.city.trim(),
    state: draft.state.trim(),
    pincode: draft.pincode.trim(),
    ...(draft.latitude.trim() ? { latitude: Number(draft.latitude) } : {}),
    ...(draft.longitude.trim() ? { longitude: Number(draft.longitude) } : {}),
    isDefault: draft.isDefault,
    metadata: {},
  };
}

function validateProfileDraft(draft: ProfileDraft) {
  if (draft.name.trim().length < 2) {
    return 'Full name is required.';
  }

  if (draft.dateOfBirth.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(draft.dateOfBirth.trim())) {
    return 'Date of birth must use YYYY-MM-DD format.';
  }

  if (draft.emergencyContactPhone.trim() && draft.emergencyContactPhone.trim().length < 7) {
    return 'Emergency contact phone must be valid.';
  }

  if (draft.doctorPhone.trim() && draft.doctorPhone.trim().length < 7) {
    return 'Doctor phone must be valid.';
  }

  return null;
}

function validateAddressDraft(draft: AddressDraft) {
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

  if (draft.latitude.trim() && Number.isNaN(Number(draft.latitude))) {
    return 'Latitude must be a number.';
  }

  if (draft.longitude.trim() && Number.isNaN(Number(draft.longitude))) {
    return 'Longitude must be a number.';
  }

  return null;
}

function calculateProfileCompletion(draft: ProfileDraft, addresses: CustomerAddress[]) {
  const checks = [
    draft.name.trim(),
    draft.dateOfBirth.trim(),
    draft.gender,
    draft.emergencyContactName.trim(),
    draft.emergencyContactPhone.trim(),
    draft.allergies.trim() || draft.chronicMedicines.trim(),
    addresses.length > 0,
    addresses.some((address) => address.isDefault),
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}

function normalizeDefault(address: CustomerAddress, nextIsDefault: boolean) {
  return nextIsDefault ? { ...address, isDefault: false } : address;
}

function isLocalId(id: string) {
  return id.startsWith('local-');
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return 'FY';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function getTone(tone: ProfileAction['tone']) {
  if (tone === 'teal') {
    return {
      color: colors.teal,
      background: colors.tealSoft,
    };
  }

  if (tone === 'warning') {
    return {
      color: '#A06A00',
      background: '#FFF3DA',
    };
  }

  return {
    color: colors.primary,
    background: colors.primarySoft,
  };
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === 'string' ? value : '';
}

function compactObject(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => Boolean(value)),
  );
}

function normalizeDate(value?: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function trimmedOrNull(value: string) {
  return value.trim() || null;
}

function parseOptionalNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function formatAddress(address: CustomerAddress) {
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screen,
    paddingTop: 34,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '900',
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#C9DEFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 6,
  },
  phone: {
    color: '#D9E8FF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 5,
  },
  editButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  statusChip: {
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: spacing.screen,
    marginTop: -18,
  },
  summaryTile: {
    flex: 1,
    minHeight: 76,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  addressCard: {
    marginHorizontal: spacing.screen,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  addressIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  addressCopy: {
    flex: 1,
    gap: 4,
  },
  addressTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  safetyCard: {
    marginHorizontal: spacing.screen,
    marginTop: 14,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: '#C9DDFF',
  },
  safetyIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tealSoft,
  },
  safetyCopy: {
    flex: 1,
    gap: 4,
  },
  safetyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  safetyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  completionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionText: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    paddingHorizontal: spacing.screen,
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionHint: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  actionList: {
    marginHorizontal: spacing.screen,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  actionRow: {
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F4',
  },
  actionRowPressed: {
    backgroundColor: '#F8FAFF',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  actionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  logoutButton: {
    marginHorizontal: spacing.screen,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#F1C7CE',
    borderRadius: 18,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFF9FA',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '900',
  },
  subHeader: {
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
  subHeaderCopy: {
    flex: 1,
    gap: 3,
  },
  subHeaderTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
  },
  subHeaderSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  formContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 110,
    gap: 16,
  },
  formSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
  },
  formSectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  fieldGroup: {
    gap: 8,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  inputWrap: {
    minHeight: 58,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputWrapMultiline: {
    minHeight: 92,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  textInputMultiline: {
    minHeight: 70,
    lineHeight: 22,
  },
  readonlyWrap: {
    minHeight: 64,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#C9DDFF',
    backgroundColor: colors.primarySofter,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readonlyCopy: {
    flex: 1,
    gap: 3,
  },
  readonlyValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  readonlyNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  segment: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.screen,
    paddingTop: 14,
    paddingBottom: 20,
  },
  addAddressButton: {
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
  addAddressText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  managedAddressCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 16,
  },
  managedAddressTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  defaultBadge: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  defaultBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  addressActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addressActionButton: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  deleteAddressAction: {
    backgroundColor: colors.dangerSoft,
  },
  deleteAddressText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  defaultToggle: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  defaultToggleText: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
