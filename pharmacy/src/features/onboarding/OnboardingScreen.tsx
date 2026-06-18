import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Check,
  FileText,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  AddPharmacistPayload,
  AuthSession,
  CreatePharmacyDraftPayload,
  PharmacyDocumentType,
  PharmacyProfile,
  UploadDocumentPayload,
} from '../../types/domain';
import { formatDate, getMissingDocuments, titleCase } from '../../utils/format';

type OnboardingScreenProps = {
  session: AuthSession;
  profile: PharmacyProfile | null;
  isSaving: boolean;
  onCreatePharmacy: (payload: CreatePharmacyDraftPayload) => void;
  onUploadDocument: (payload: UploadDocumentPayload) => void;
  onAddPharmacist: (payload: AddPharmacistPayload) => void;
  onSubmitForReview: () => void;
  onLogout?: () => void;
};

type Draft = {
  name: string;
  legalName: string;
  licenseNumber: string;
  licenseValidFrom: string;
  licenseValidTo: string;
  gstNumber: string;
  shopRegistrationNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  serviceRadiusKm: string;
  openingTime: string;
  closingTime: string;
  is24x7: boolean;
  hasOwnDelivery: boolean;
  supportsPlatformDelivery: boolean;
  coldChainCapable: boolean;
};

const documentTypes: PharmacyDocumentType[] = [
  'DRUG_LICENSE',
  'GST_CERTIFICATE',
  'SHOP_REGISTRATION',
  'OWNER_KYC',
  'PHARMACIST_REGISTRATION_CERTIFICATE',
  'BANK_ACCOUNT',
  'STORE_ADDRESS_PROOF',
  'INVOICE_FORMAT',
  'RETURN_POLICY_AGREEMENT',
  'PLATFORM_SERVICE_AGREEMENT',
  'PENALTY_AGREEMENT',
  'PRESCRIPTION_COMPLIANCE_DECLARATION',
];

export function OnboardingScreen({
  session,
  profile,
  isSaving,
  onCreatePharmacy,
  onUploadDocument,
  onAddPharmacist,
  onSubmitForReview,
  onLogout,
}: OnboardingScreenProps) {
  const missingDocuments = useMemo(
    () => getMissingDocuments(profile?.documents.map((document) => document.documentType) || []),
    [profile],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Store color="#FFFFFF" size={31} strokeWidth={2.4} />
          </View>
          {onLogout ? (
            <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logoutIcon}>
              <LogOut color="#FFFFFF" size={21} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.eyebrow}>PHARMACY ONBOARDING</Text>
        <Text style={styles.title}>{profile ? profile.pharmacy.name : 'Create pharmacy profile'}</Text>
        <Text style={styles.heroText}>
          {profile
            ? `${titleCase(profile.pharmacy.status)} - ${missingDocuments.length} required document${missingDocuments.length === 1 ? '' : 's'} pending`
            : 'Set up license, store address, operating capability, documents, and pharmacist verification.'}
        </Text>
      </View>

      <View style={styles.body}>
        {profile ? (
          <CompliancePanel
            profile={profile}
            missingDocuments={missingDocuments}
            isSaving={isSaving}
            onUploadDocument={onUploadDocument}
            onAddPharmacist={onAddPharmacist}
            onSubmitForReview={onSubmitForReview}
          />
        ) : (
          <CreateDraftForm
            session={session}
            isSaving={isSaving}
            onCreatePharmacy={onCreatePharmacy}
          />
        )}
      </View>
    </ScrollView>
  );
}

function CreateDraftForm({
  session,
  isSaving,
  onCreatePharmacy,
}: {
  session: AuthSession;
  isSaving: boolean;
  onCreatePharmacy: (payload: CreatePharmacyDraftPayload) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    name: '',
    legalName: '',
    licenseNumber: '',
    licenseValidFrom: '',
    licenseValidTo: '',
    gstNumber: '',
    shopRegistrationNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    serviceRadiusKm: '5',
    openingTime: '09:00',
    closingTime: '21:00',
    is24x7: false,
    hasOwnDelivery: true,
    supportsPlatformDelivery: true,
    coldChainCapable: false,
  });

  function update(key: keyof Draft, value: string | boolean) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    const validationMessage = validateDraft(draft);

    if (validationMessage) {
      Alert.alert('Check pharmacy details', validationMessage);
      return;
    }

    onCreatePharmacy({
      ownerUserId: session.user.id,
      name: draft.name.trim(),
      ...(draft.legalName.trim() ? { legalName: draft.legalName.trim() } : {}),
      licenseNumber: draft.licenseNumber.trim(),
      ...(draft.licenseValidFrom.trim() ? { licenseValidFrom: draft.licenseValidFrom.trim() } : {}),
      ...(draft.licenseValidTo.trim() ? { licenseValidTo: draft.licenseValidTo.trim() } : {}),
      ...(draft.gstNumber.trim() ? { gstNumber: draft.gstNumber.trim() } : {}),
      ...(draft.shopRegistrationNumber.trim()
        ? { shopRegistrationNumber: draft.shopRegistrationNumber.trim() }
        : {}),
      addressLine1: draft.addressLine1.trim(),
      ...(draft.addressLine2.trim() ? { addressLine2: draft.addressLine2.trim() } : {}),
      city: draft.city.trim(),
      state: draft.state.trim(),
      pincode: draft.pincode.trim(),
      serviceRadiusKm: Number(draft.serviceRadiusKm),
      openingTime: draft.is24x7 ? undefined : draft.openingTime.trim(),
      closingTime: draft.is24x7 ? undefined : draft.closingTime.trim(),
      is24x7: draft.is24x7,
      hasOwnDelivery: draft.hasOwnDelivery,
      supportsPlatformDelivery: draft.supportsPlatformDelivery,
      coldChainCapable: draft.coldChainCapable,
    });
  }

  return (
    <View style={styles.formCard}>
      <SectionTitle icon={<Store color={colors.primary} size={22} strokeWidth={2.4} />} title="Store identity" />
      <Field label="Pharmacy name">
        <AppTextInput value={draft.name} onChangeText={(value) => update('name', value)} placeholder="FYM Medical Store" />
      </Field>
      <Field label="Legal name">
        <AppTextInput value={draft.legalName} onChangeText={(value) => update('legalName', value)} placeholder="Legal entity name" />
      </Field>
      <Field label="Drug license number">
        <AppTextInput value={draft.licenseNumber} onChangeText={(value) => update('licenseNumber', value)} placeholder="License number" />
      </Field>
      <View style={styles.twoColumnRow}>
        <View style={styles.column}>
          <Field label="Valid from">
            <AppTextInput value={draft.licenseValidFrom} onChangeText={(value) => update('licenseValidFrom', value)} placeholder="YYYY-MM-DD" />
          </Field>
        </View>
        <View style={styles.column}>
          <Field label="Valid to">
            <AppTextInput value={draft.licenseValidTo} onChangeText={(value) => update('licenseValidTo', value)} placeholder="YYYY-MM-DD" />
          </Field>
        </View>
      </View>
      <Field label="GST number">
        <AppTextInput value={draft.gstNumber} onChangeText={(value) => update('gstNumber', value)} placeholder="GSTIN" />
      </Field>

      <SectionTitle icon={<MapPin color={colors.primary} size={22} strokeWidth={2.4} />} title="Store address and operations" />
      <Field label="Address line 1">
        <AppTextInput value={draft.addressLine1} onChangeText={(value) => update('addressLine1', value)} placeholder="Shop number, street" />
      </Field>
      <Field label="Address line 2">
        <AppTextInput value={draft.addressLine2} onChangeText={(value) => update('addressLine2', value)} placeholder="Landmark or area" />
      </Field>
      <View style={styles.twoColumnRow}>
        <View style={styles.column}>
          <Field label="City">
            <AppTextInput value={draft.city} onChangeText={(value) => update('city', value)} placeholder="City" />
          </Field>
        </View>
        <View style={styles.column}>
          <Field label="Pincode">
            <AppTextInput value={draft.pincode} onChangeText={(value) => update('pincode', value)} placeholder="560001" keyboardType="number-pad" />
          </Field>
        </View>
      </View>
      <Field label="State">
        <AppTextInput value={draft.state} onChangeText={(value) => update('state', value)} placeholder="State" />
      </Field>
      <View style={styles.twoColumnRow}>
        <View style={styles.column}>
          <Field label="Radius km">
            <AppTextInput value={draft.serviceRadiusKm} onChangeText={(value) => update('serviceRadiusKm', value)} placeholder="5" keyboardType="decimal-pad" />
          </Field>
        </View>
        <View style={styles.column}>
          <Field label="Opens">
            <AppTextInput value={draft.openingTime} onChangeText={(value) => update('openingTime', value)} placeholder="09:00" />
          </Field>
        </View>
      </View>
      <Field label="Closes">
        <AppTextInput value={draft.closingTime} onChangeText={(value) => update('closingTime', value)} placeholder="21:00" />
      </Field>

      <ToggleRow label="24x7 store" value={draft.is24x7} onToggle={(value) => update('is24x7', value)} />
      <ToggleRow label="Own delivery available" value={draft.hasOwnDelivery} onToggle={(value) => update('hasOwnDelivery', value)} />
      <ToggleRow label="Supports platform delivery" value={draft.supportsPlatformDelivery} onToggle={(value) => update('supportsPlatformDelivery', value)} />
      <ToggleRow label="Cold-chain capable" value={draft.coldChainCapable} onToggle={(value) => update('coldChainCapable', value)} />

      <AppButton
        label="Create Pharmacy Draft"
        loading={isSaving}
        onPress={submit}
        icon={<Plus color="#FFFFFF" size={22} strokeWidth={2.5} />}
      />
    </View>
  );
}

export function CompliancePanel({
  profile,
  missingDocuments,
  isSaving,
  onUploadDocument,
  onAddPharmacist,
  onSubmitForReview,
}: {
  profile: PharmacyProfile;
  missingDocuments: PharmacyDocumentType[];
  isSaving: boolean;
  onUploadDocument: (payload: UploadDocumentPayload) => void;
  onAddPharmacist: (payload: AddPharmacistPayload) => void;
  onSubmitForReview: () => void;
}) {
  const uploadedTypes = profile.documents.map((document) => document.documentType);
  const canSubmit = missingDocuments.length === 0 && profile.pharmacists.length > 0;

  return (
    <View style={styles.stack}>
      <View style={styles.statusCard}>
        <View style={styles.statusIcon}>
          <ShieldCheck color={colors.primary} size={26} strokeWidth={2.4} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.cardTitle}>Compliance status</Text>
          <Text style={styles.cardText}>
            {titleCase(profile.pharmacy.status)} - {uploadedTypes.length}/{documentTypes.length} documents uploaded - {profile.pharmacists.length} pharmacist record{profile.pharmacists.length === 1 ? '' : 's'}
          </Text>
          {profile.pharmacy.rejectionReason ? (
            <Text style={styles.warningText}>{profile.pharmacy.rejectionReason}</Text>
          ) : null}
        </View>
      </View>

      <DocumentForm
        missingDocuments={missingDocuments}
        isSaving={isSaving}
        onUploadDocument={onUploadDocument}
      />
      <PharmacistForm isSaving={isSaving} onAddPharmacist={onAddPharmacist} />

      <View style={styles.listCard}>
        <SectionTitle icon={<FileText color={colors.primary} size={22} strokeWidth={2.4} />} title="Uploaded documents" />
        {profile.documents.length === 0 ? (
          <Text style={styles.emptyText}>No documents uploaded yet.</Text>
        ) : (
          profile.documents.map((document) => (
            <View key={document.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{titleCase(document.documentType)}</Text>
                <Text style={styles.cardText}>
                  {titleCase(document.status)} - expires {formatDate(document.expiresAt)}
                </Text>
              </View>
              <Check color={colors.teal} size={20} strokeWidth={2.6} />
            </View>
          ))
        )}
      </View>

      <View style={styles.listCard}>
        <SectionTitle icon={<UserRound color={colors.primary} size={22} strokeWidth={2.4} />} title="Registered pharmacists" />
        {profile.pharmacists.length === 0 ? (
          <Text style={styles.emptyText}>Add at least one registered pharmacist before review.</Text>
        ) : (
          profile.pharmacists.map((pharmacist) => (
            <View key={pharmacist.id} style={styles.listRow}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>{pharmacist.name}</Text>
                <Text style={styles.cardText}>
                  {pharmacist.registrationNumber} - {titleCase(pharmacist.status)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <AppButton
        label="Submit for Admin Review"
        disabled={!canSubmit || !['DRAFT', 'REJECTED'].includes(profile.pharmacy.status)}
        loading={isSaving}
        onPress={onSubmitForReview}
        icon={<ShieldCheck color="#FFFFFF" size={22} strokeWidth={2.5} />}
      />
      {!canSubmit ? (
        <Text style={styles.helpText}>Upload all required documents and add a pharmacist before submitting.</Text>
      ) : null}
    </View>
  );
}

function DocumentForm({
  missingDocuments,
  isSaving,
  onUploadDocument,
}: {
  missingDocuments: PharmacyDocumentType[];
  isSaving: boolean;
  onUploadDocument: (payload: UploadDocumentPayload) => void;
}) {
  const [documentType, setDocumentType] = useState<PharmacyDocumentType>(missingDocuments[0] || documentTypes[0]);
  const [fileUrl, setFileUrl] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  function submit() {
    if (!fileUrl.trim().startsWith('http')) {
      Alert.alert('Check document', 'Enter a valid document URL for the current backend contract.');
      return;
    }

    onUploadDocument({
      documentType,
      fileUrl: fileUrl.trim(),
      ...(documentNumber.trim() ? { documentNumber: documentNumber.trim() } : {}),
      ...(expiresAt.trim() ? { expiresAt: expiresAt.trim() } : {}),
    });
    setFileUrl('');
    setDocumentNumber('');
    setExpiresAt('');
  }

  return (
    <View style={styles.formCard}>
      <SectionTitle icon={<FileText color={colors.primary} size={22} strokeWidth={2.4} />} title="Upload compliance document" />
      <Text style={styles.helpText}>
        Backend expects a stored file URL. Upload storage can be connected later; paste S3 or secure document URL here.
      </Text>
      <View style={styles.segmentRow}>
        {(missingDocuments.length > 0 ? missingDocuments : documentTypes).slice(0, 6).map((type) => (
          <Pressable
            key={type}
            onPress={() => setDocumentType(type)}
            style={[styles.segment, documentType === type ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, documentType === type ? styles.segmentTextActive : null]}>
              {titleCase(type)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Field label="File URL">
        <AppTextInput value={fileUrl} onChangeText={setFileUrl} placeholder="https://..." keyboardType="url" />
      </Field>
      <Field label="Document number">
        <AppTextInput value={documentNumber} onChangeText={setDocumentNumber} placeholder="License, GST, account, or agreement number" />
      </Field>
      <Field label="Expires at">
        <AppTextInput value={expiresAt} onChangeText={setExpiresAt} placeholder="YYYY-MM-DD" />
      </Field>
      <AppButton label="Upload Document" loading={isSaving} onPress={submit} />
    </View>
  );
}

function PharmacistForm({
  isSaving,
  onAddPharmacist,
}: {
  isSaving: boolean;
  onAddPharmacist: (payload: AddPharmacistPayload) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  function submit() {
    if (!name.trim() || phone.replace(/\D/g, '').length < 8 || registrationNumber.trim().length < 3) {
      Alert.alert('Check pharmacist', 'Name, phone, and registration number are required.');
      return;
    }

    onAddPharmacist({
      name: name.trim(),
      phone: phone.trim().startsWith('+') ? phone.trim() : `+91${phone.replace(/\D/g, '')}`,
      registrationNumber: registrationNumber.trim(),
    });
    setName('');
    setPhone('');
    setRegistrationNumber('');
  }

  return (
    <View style={styles.formCard}>
      <SectionTitle icon={<UserRound color={colors.primary} size={22} strokeWidth={2.4} />} title="Add registered pharmacist" />
      <Field label="Pharmacist name">
        <AppTextInput value={name} onChangeText={setName} placeholder="Full name" />
      </Field>
      <Field label="Phone">
        <AppTextInput value={phone} onChangeText={setPhone} placeholder="+91..." keyboardType="phone-pad" />
      </Field>
      <Field label="Registration number">
        <AppTextInput value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="State council registration" />
      </Field>
      <AppButton label="Add Pharmacist" loading={isSaving} onPress={submit} />
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>{icon}</View>
      <Text style={styles.sectionTitle}>{title}</Text>
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
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onToggle(!value)}
      style={styles.toggleRow}
    >
      <View style={[styles.checkbox, value ? styles.checkboxChecked : null]}>
        {value ? <Check color="#FFFFFF" size={16} strokeWidth={3} /> : null}
      </View>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

function validateDraft(draft: Draft) {
  if (draft.name.trim().length < 2) return 'Pharmacy name is required.';
  if (draft.licenseNumber.trim().length < 3) return 'Drug license number is required.';
  if (draft.addressLine1.trim().length < 5) return 'Store address is required.';
  if (!draft.city.trim()) return 'City is required.';
  if (!draft.state.trim()) return 'State is required.';
  if (!/^[1-9][0-9]{5}$/.test(draft.pincode.trim())) return 'Enter a valid 6-digit pincode.';
  if (Number.isNaN(Number(draft.serviceRadiusKm)) || Number(draft.serviceRadiusKm) <= 0) return 'Service radius must be positive.';
  if (!draft.is24x7 && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.openingTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.closingTime))) {
    return 'Opening and closing time must use HH:mm format.';
  }
  return null;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 34,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screen,
    paddingTop: 38,
    paddingBottom: 30,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#C9DEFF',
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  heroText: {
    marginTop: 8,
    color: '#D9E8FF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: spacing.screen,
    paddingTop: 20,
  },
  stack: {
    gap: 14,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  statusCard: {
    borderWidth: 1,
    borderColor: '#C9DDFF',
    borderRadius: 20,
    padding: 16,
    backgroundColor: colors.primarySofter,
    flexDirection: 'row',
    gap: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  warningText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  field: {
    gap: 8,
  },
  label: {
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
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
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
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  toggleText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  helpText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  listCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  listRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F1F4',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listCopy: {
    flex: 1,
    gap: 3,
  },
  listTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
});
