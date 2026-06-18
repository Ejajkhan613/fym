import { useMemo, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
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
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  ClipboardList,
  FileText,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards,
} from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  AuthSession,
  CustomerFamilyProfile,
  CustomerGender,
  CustomerNotification,
  CustomerPaymentSummary,
  CustomerPrivacySettings,
  MedicineReminder,
  PrescriptionRecord,
  SupportTicket,
  UpsertCustomerFamilyProfilePayload,
  UpsertMedicineReminderPayload,
  UpdatePrivacySettingsPayload,
} from '../../types/domain';

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type ToggleKey = keyof UpdatePrivacySettingsPayload;

type FamilyDraft = {
  fullName: string;
  relationship: string;
  dateOfBirth: string;
  gender: CustomerGender | '';
};

type ReminderDraft = {
  familyProfileId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  scheduleTime: string;
  startDate: string;
  endDate: string;
  notes: string;
  isActive: boolean;
};

type TicketDraft = {
  category: string;
  subject: string;
  description: string;
  attachments: SupportAttachment[];
};

type SupportAttachment = {
  id: string;
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
};

const genderOptions: Array<{ label: string; value: CustomerGender }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not', value: 'prefer_not_to_say' },
];

const frequencyOptions: Array<{ label: string; value: string }> = [
  { label: 'Once daily', value: 'Once daily' },
  { label: 'Twice daily', value: 'Twice daily' },
  { label: 'Thrice daily', value: 'Thrice daily' },
  { label: 'Every 6 hours', value: 'Every 6 hours' },
  { label: 'Weekly', value: 'Weekly' },
];

export function FamilyProfilesScreen({
  profiles,
  onBack,
  onSave,
  onDelete,
  isSaving,
}: {
  profiles: CustomerFamilyProfile[];
  onBack: () => void;
  onSave: (
    familyProfileId: string | null,
    payload: UpsertCustomerFamilyProfilePayload,
  ) => Promise<void>;
  onDelete: (profile: CustomerFamilyProfile) => Promise<void>;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState<CustomerFamilyProfile | null>(null);
  const [draft, setDraft] = useState<FamilyDraft>(() => createFamilyDraft());

  function resetForm() {
    setEditing(null);
    setDraft(createFamilyDraft());
  }

  async function submit() {
    if (!draft.fullName.trim() || !draft.relationship.trim()) {
      Alert.alert('Check family profile', 'Name and relationship are required.');
      return;
    }

    if (draft.dateOfBirth.trim()) {
      const dateOfBirth = parseDateInput(draft.dateOfBirth);

      if (!dateOfBirth) {
        Alert.alert('Check family profile', 'Date of birth must be a valid date in YYYY-MM-DD format.');
        return;
      }

      if (dateOfBirth.getTime() > startOfDay(new Date()).getTime()) {
        Alert.alert('Check family profile', 'Date of birth cannot be in the future.');
        return;
      }
    }

    try {
      await onSave(editing?.id || null, {
        fullName: draft.fullName.trim(),
        relationship: draft.relationship.trim(),
        ...(draft.dateOfBirth.trim() ? { dateOfBirth: draft.dateOfBirth.trim() } : {}),
        ...(draft.gender ? { gender: draft.gender } : {}),
      });
      resetForm();
    } catch {
      // Parent handler already displays the API error.
    }
  }

  return (
    <FeatureShell
      title="Family Profiles"
      subtitle="Manage prescriptions and reminders for family members."
      onBack={onBack}
    >
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>{editing ? 'Edit family member' : 'Add family member'}</Text>
        <FormField
          label="Full name"
          value={draft.fullName}
          onChangeText={(fullName) => setDraft((current) => ({ ...current, fullName }))}
          placeholder="Family member name"
        />
        <FormField
          label="Relationship"
          value={draft.relationship}
          onChangeText={(relationship) => setDraft((current) => ({ ...current, relationship }))}
          placeholder="Parent, spouse, child"
        />
        <DateField
          label="Date of birth"
          value={draft.dateOfBirth}
          onChange={(dateOfBirth) => setDraft((current) => ({ ...current, dateOfBirth }))}
          placeholder="YYYY-MM-DD"
          maximumDate={startOfDay(new Date())}
          optional
        />
        <SegmentGroup
          label="Gender"
          options={genderOptions}
          value={draft.gender}
          onChange={(gender) => setDraft((current) => ({ ...current, gender }))}
        />
        <View style={styles.buttonRow}>
          {editing ? (
            <AppButton label="Cancel" variant="secondary" onPress={resetForm} />
          ) : null}
          <AppButton
            label={editing ? 'Update' : 'Add'}
            loading={isSaving}
            onPress={submit}
            icon={<Plus color="#FFFFFF" size={22} strokeWidth={2.4} />}
          />
        </View>
      </View>

      {profiles.length === 0 ? (
        <EmptyState icon={Users} title="No family profiles" body="Add a family member to reuse profile details in reminders and prescriptions." />
      ) : (
        profiles.map((profile) => (
          <FeatureCard key={profile.id} icon={Users} title={profile.fullName}>
            <Text style={styles.cardText}>{profile.relationship}</Text>
            {profile.dateOfBirth ? <Text style={styles.cardText}>DOB {formatDate(profile.dateOfBirth)}</Text> : null}
            <View style={styles.inlineActions}>
              <SmallButton
                label="Edit"
                onPress={() => {
                  setEditing(profile);
                  setDraft(createFamilyDraft(profile));
                }}
              />
              <SmallButton
                label="Delete"
                danger
                onPress={() =>
                  Alert.alert('Delete family profile?', profile.fullName, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(profile) },
                  ])
                }
              />
            </View>
          </FeatureCard>
        ))
      )}
    </FeatureShell>
  );
}

export function PrescriptionVaultScreen({
  prescriptions,
  onBack,
  onUploadPrescription,
}: {
  prescriptions: PrescriptionRecord[];
  onBack: () => void;
  onUploadPrescription?: () => void;
}) {
  return (
    <FeatureShell
      title="Prescription Vault"
      subtitle="Uploaded prescriptions, verification status, and reusable records."
      onBack={onBack}
    >
      {onUploadPrescription ? (
        <AppButton
          label="Upload Prescription"
          onPress={onUploadPrescription}
          icon={<FileText color="#FFFFFF" size={22} strokeWidth={2.4} />}
        />
      ) : null}

      {prescriptions.length === 0 ? (
        <EmptyState icon={FileText} title="No prescriptions yet" body="Uploaded prescriptions will appear here with OCR and review status." />
      ) : (
        prescriptions.map((prescription) => (
          <FeatureCard
            key={prescription.id}
            icon={FileText}
            title={`${prescription.fileType.toUpperCase()} prescription`}
            badge={prescription.verificationStatus.replaceAll('_', ' ')}
          >
            <Text style={styles.cardText}>Uploaded {formatDate(prescription.createdAt || prescription.uploadedAt)}</Text>
            {prescription.rejectionReason ? (
              <Text style={styles.cardText}>Reason: {prescription.rejectionReason}</Text>
            ) : null}
          </FeatureCard>
        ))
      )}
    </FeatureShell>
  );
}

export function MedicineRemindersScreen({
  reminders,
  familyProfiles,
  onBack,
  onSave,
  onDelete,
  isSaving,
}: {
  reminders: MedicineReminder[];
  familyProfiles: CustomerFamilyProfile[];
  onBack: () => void;
  onSave: (reminderId: string | null, payload: UpsertMedicineReminderPayload) => Promise<void>;
  onDelete: (reminder: MedicineReminder) => Promise<void>;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState<MedicineReminder | null>(null);
  const [draft, setDraft] = useState<ReminderDraft>(() => createReminderDraft());
  const profileNameById = useMemo(
    () => new Map(familyProfiles.map((profile) => [profile.id, profile.fullName])),
    [familyProfiles],
  );

  function resetForm() {
    setEditing(null);
    setDraft(createReminderDraft());
  }

  async function submit() {
    if (!draft.medicineName.trim() || !draft.frequency.trim()) {
      Alert.alert('Check reminder', 'Medicine name and frequency are required.');
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.scheduleTime.trim())) {
      Alert.alert('Check reminder', 'Reminder time must be in HH:mm format.');
      return;
    }

    const startDate = parseDateInput(draft.startDate);
    const endDate = draft.endDate.trim() ? parseDateInput(draft.endDate) : null;

    if (!startDate) {
      Alert.alert('Check reminder', 'Start date must be a valid date in YYYY-MM-DD format.');
      return;
    }

    if (draft.endDate.trim() && !endDate) {
      Alert.alert('Check reminder', 'End date must be a valid date in YYYY-MM-DD format.');
      return;
    }

    if (endDate && endDate.getTime() < startDate.getTime()) {
      Alert.alert('Check reminder', 'End date must be on or after start date.');
      return;
    }

    try {
      await onSave(editing?.id || null, {
        ...(draft.familyProfileId ? { familyProfileId: draft.familyProfileId } : {}),
        medicineName: draft.medicineName.trim(),
        ...(draft.dosage.trim() ? { dosage: draft.dosage.trim() } : {}),
        frequency: draft.frequency.trim(),
        scheduleTime: draft.scheduleTime.trim(),
        startDate: draft.startDate.trim(),
        ...(draft.endDate.trim() ? { endDate: draft.endDate.trim() } : {}),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
        isActive: draft.isActive,
      });
      resetForm();
    } catch {
      // Parent handler already displays the API error.
    }
  }

  return (
    <FeatureShell
      title="Medicine Reminders"
      subtitle="Dose and refill reminders for you and family profiles."
      onBack={onBack}
    >
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>{editing ? 'Edit reminder' : 'Add reminder'}</Text>
        <FormField
          label="Medicine"
          value={draft.medicineName}
          onChangeText={(medicineName) => setDraft((current) => ({ ...current, medicineName }))}
          placeholder="Medicine name"
        />
        <FormField
          label="Dosage"
          value={draft.dosage}
          onChangeText={(dosage) => setDraft((current) => ({ ...current, dosage }))}
          placeholder="E.g. 1 tablet"
        />
        <SegmentGroup
          label="Frequency"
          options={frequencyOptions}
          value={draft.frequency}
          onChange={(frequency) => setDraft((current) => ({ ...current, frequency }))}
        />
        <View style={styles.twoColumnRow}>
          <View style={styles.column}>
            <TimeField
              label="Time"
              value={draft.scheduleTime}
              onChange={(scheduleTime) => setDraft((current) => ({ ...current, scheduleTime }))}
            />
          </View>
          <View style={styles.column}>
            <DateField
              label="Start date"
              value={draft.startDate}
              onChange={(startDate) => setDraft((current) => ({ ...current, startDate }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>
        <DateField
          label="End date"
          value={draft.endDate}
          onChange={(endDate) => setDraft((current) => ({ ...current, endDate }))}
          placeholder="Optional"
          minimumDate={parseDateInput(draft.startDate) || undefined}
          optional
        />
        <FamilyPicker
          profiles={familyProfiles}
          value={draft.familyProfileId}
          onChange={(familyProfileId) => setDraft((current) => ({ ...current, familyProfileId }))}
        />
        <FormField
          label="Notes"
          value={draft.notes}
          onChangeText={(notes) => setDraft((current) => ({ ...current, notes }))}
          placeholder="Optional note"
          multiline
        />
        <ToggleRow
          label="Reminder active"
          description="Turn off without deleting the schedule."
          value={draft.isActive}
          onToggle={(isActive) => setDraft((current) => ({ ...current, isActive }))}
        />
        <View style={styles.buttonRow}>
          {editing ? <AppButton label="Cancel" variant="secondary" onPress={resetForm} /> : null}
          <AppButton label={editing ? 'Update' : 'Add'} loading={isSaving} onPress={submit} />
        </View>
      </View>

      {reminders.length === 0 ? (
        <EmptyState icon={Calendar} title="No medicine reminders" body="Add reminders for ongoing doses, refills, or family member schedules." />
      ) : (
        reminders.map((reminder) => (
          <FeatureCard
            key={reminder.id}
            icon={Calendar}
            title={reminder.medicineName}
            badge={reminder.isActive ? 'Active' : 'Paused'}
          >
            <Text style={styles.cardText}>
              {reminder.frequency} at {reminder.scheduleTime}
            </Text>
            <Text style={styles.cardText}>
              For {reminder.familyProfileId ? profileNameById.get(reminder.familyProfileId) || 'Family member' : 'Me'}
            </Text>
            <View style={styles.inlineActions}>
              <SmallButton
                label="Edit"
                onPress={() => {
                  setEditing(reminder);
                  setDraft(createReminderDraft(reminder));
                }}
              />
              <SmallButton
                label="Delete"
                danger
                onPress={() =>
                  Alert.alert('Delete reminder?', reminder.medicineName, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => onDelete(reminder) },
                  ])
                }
              />
            </View>
          </FeatureCard>
        ))
      )}
    </FeatureShell>
  );
}

export function PaymentsRefundsScreen({
  summary,
  onBack,
}: {
  summary: CustomerPaymentSummary;
  onBack: () => void;
}) {
  return (
    <FeatureShell
      title="Payments and Refunds"
      subtitle="Payment transactions, refund status, and provider references."
      onBack={onBack}
    >
      {summary.payments.length === 0 && summary.refunds.length === 0 ? (
        <EmptyState icon={WalletCards} title="No payments yet" body="Completed checkout payments and refunds will appear here." />
      ) : null}

      {summary.payments.map((payment) => (
        <FeatureCard
          key={payment.id}
          icon={WalletCards}
          title={`${payment.currency} ${payment.amount.toFixed(2)}`}
          badge={payment.status.replaceAll('_', ' ')}
        >
          <Text style={styles.cardText}>{payment.paymentMethod.toUpperCase()} via {payment.provider}</Text>
          <Text style={styles.cardText}>Order {shortId(payment.orderId)}</Text>
        </FeatureCard>
      ))}

      {summary.refunds.map((refund) => (
        <FeatureCard
          key={refund.id}
          icon={WalletCards}
          title={`Refund ${refund.amount.toFixed(2)}`}
          badge={refund.status.replaceAll('_', ' ')}
        >
          <Text style={styles.cardText}>{refund.reason || 'Refund request'}</Text>
          <Text style={styles.cardText}>Order {shortId(refund.orderId)}</Text>
        </FeatureCard>
      ))}
    </FeatureShell>
  );
}

export function SupportTicketsScreen({
  tickets,
  onBack,
  onCreate,
  isSaving,
}: {
  tickets: SupportTicket[];
  onBack: () => void;
  onCreate: (payload: TicketDraft) => Promise<void>;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<TicketDraft>({
    category: 'order',
    subject: '',
    description: '',
    attachments: [],
  });

  async function pickAttachment() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (result.canceled) {
      return;
    }

    const picked = result.assets.map((asset) => ({
      id: `${asset.uri}-${Date.now()}-${Math.random()}`,
      name: asset.name,
      uri: asset.uri,
      size: asset.size,
      mimeType: asset.mimeType,
    }));

    setDraft((current) => ({
      ...current,
      attachments: [...picked, ...current.attachments].slice(0, 5),
    }));
  }

  async function submit() {
    if (!draft.subject.trim() || !draft.description.trim()) {
      Alert.alert('Check ticket', 'Subject and description are required.');
      return;
    }

    try {
      await onCreate({
        ...draft,
        category: draft.category.trim(),
        subject: draft.subject.trim(),
        description: draft.description.trim(),
      });
      setDraft({ category: 'order', subject: '', description: '', attachments: [] });
    } catch {
      // Parent handler already displays the API error.
    }
  }

  return (
    <FeatureShell
      title="Support Tickets"
      subtitle="Create and track support requests for orders, refunds, and prescriptions."
      onBack={onBack}
    >
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>New ticket</Text>
        <FormField
          label="Category"
          value={draft.category}
          onChangeText={(category) => setDraft((current) => ({ ...current, category }))}
          placeholder="order, refund, prescription"
        />
        <FormField
          label="Subject"
          value={draft.subject}
          onChangeText={(subject) => setDraft((current) => ({ ...current, subject }))}
          placeholder="What do you need help with?"
        />
        <FormField
          label="Details"
          value={draft.description}
          onChangeText={(description) => setDraft((current) => ({ ...current, description }))}
          placeholder="Describe the issue"
          multiline
        />
        <Pressable
          accessibilityRole="button"
          onPress={pickAttachment}
          style={styles.attachmentButton}
        >
          <FileText color={colors.primary} size={21} strokeWidth={2.4} />
          <Text style={styles.attachmentButtonText}>Add image or PDF</Text>
        </Pressable>
        {draft.attachments.length > 0 ? (
          <View style={styles.attachmentList}>
            {draft.attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentRow}>
                <View style={styles.attachmentCopy}>
                  <Text numberOfLines={1} style={styles.attachmentName}>
                    {attachment.name}
                  </Text>
                  <Text style={styles.attachmentMeta}>
                    {attachment.mimeType || 'File'} - {formatFileSize(attachment.size)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setDraft((current) => ({
                      ...current,
                      attachments: current.attachments.filter((item) => item.id !== attachment.id),
                    }))
                  }
                  style={styles.removeAttachmentButton}
                >
                  <Trash2 color={colors.danger} size={17} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <AppButton label="Create Ticket" loading={isSaving} onPress={submit} />
      </View>

      {tickets.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No support tickets" body="Created tickets and support status will appear here." />
      ) : (
        tickets.map((ticket) => (
          <FeatureCard
            key={ticket.id}
            icon={ClipboardList}
            title={ticket.subject}
            badge={ticket.status.replaceAll('_', ' ')}
          >
            <Text style={styles.cardText}>{ticket.category}</Text>
            <Text style={styles.cardText}>{formatDate(ticket.createdAt)}</Text>
          </FeatureCard>
        ))
      )}
    </FeatureShell>
  );
}

export function NotificationsScreen({
  notifications,
  settings,
  onBack,
  onTogglePreference,
}: {
  notifications: CustomerNotification[];
  settings: CustomerPrivacySettings;
  onBack: () => void;
  onTogglePreference: (key: ToggleKey, value: boolean) => Promise<void>;
}) {
  return (
    <FeatureShell
      title="Notifications"
      subtitle="Order, prescription, support, and reminder alerts."
      onBack={onBack}
    >
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <ToggleRow
          label="Push notifications"
          description="App alerts for important account events."
          value={settings.pushNotificationsEnabled}
          onToggle={(value) => onTogglePreference('pushNotificationsEnabled', value)}
        />
        <ToggleRow
          label="SMS notifications"
          description="SMS fallback for orders and account safety."
          value={settings.smsNotificationsEnabled}
          onToggle={(value) => onTogglePreference('smsNotificationsEnabled', value)}
        />
        <ToggleRow
          label="Promotional offers"
          description="Discounts and campaign messages."
          value={settings.promotionalOffersEnabled}
          onToggle={(value) => onTogglePreference('promotionalOffersEnabled', value)}
        />
      </View>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" body="Queued and sent notifications will appear here." />
      ) : (
        notifications.map((notification) => (
          <FeatureCard
            key={notification.id}
            icon={Bell}
            title={notification.title || titleCase(notification.templateKey)}
            badge={notification.status}
          >
            <Text style={styles.cardText}>{notification.body}</Text>
            <Text style={styles.cardText}>
              {notification.channel.toUpperCase()} - {formatDate(notification.createdAt)}
            </Text>
          </FeatureCard>
        ))
      )}
    </FeatureShell>
  );
}

export function PrivacySecurityScreen({
  session,
  settings,
  onBack,
  onTogglePreference,
  onLogout,
}: {
  session: AuthSession;
  settings: CustomerPrivacySettings;
  onBack: () => void;
  onTogglePreference: (key: ToggleKey, value: boolean) => Promise<void>;
  onLogout: () => void;
}) {
  return (
    <FeatureShell
      title="Privacy and Security"
      subtitle="Control consent, account safety, and location use."
      onBack={onBack}
    >
      <FeatureCard icon={ShieldCheck} title="Verified session" badge={session.user.status}>
        <Text style={styles.cardText}>{session.user.phone}</Text>
        <Text style={styles.cardText}>Role: {session.user.role}</Text>
      </FeatureCard>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Privacy controls</Text>
        <ToggleRow
          label="Order updates"
          description="Allow updates for order and delivery state changes."
          value={settings.orderUpdatesEnabled}
          onToggle={(value) => onTogglePreference('orderUpdatesEnabled', value)}
        />
        <ToggleRow
          label="Prescription updates"
          description="Allow OCR and pharmacist review status alerts."
          value={settings.prescriptionUpdatesEnabled}
          onToggle={(value) => onTogglePreference('prescriptionUpdatesEnabled', value)}
        />
        <ToggleRow
          label="Support updates"
          description="Allow support ticket replies and status alerts."
          value={settings.supportUpdatesEnabled}
          onToggle={(value) => onTogglePreference('supportUpdatesEnabled', value)}
        />
        <ToggleRow
          label="Medicine reminders"
          description="Allow dose and refill reminders."
          value={settings.medicineRemindersEnabled}
          onToggle={(value) => onTogglePreference('medicineRemindersEnabled', value)}
        />
        <ToggleRow
          label="GPS for addresses"
          description="Use device location to attach delivery coordinates."
          value={settings.gpsForAddressesEnabled}
          onToggle={(value) => onTogglePreference('gpsForAddressesEnabled', value)}
        />
        <ToggleRow
          label="Data sharing consent"
          description="Allow FYM to use profile data for service improvement."
          value={settings.dataSharingConsent}
          onToggle={(value) => onTogglePreference('dataSharingConsent', value)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert('Log out?', 'This will remove the stored mobile session.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ])
        }
        style={styles.logoutButton}
      >
        <LockKeyhole color={colors.danger} size={21} strokeWidth={2.3} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </FeatureShell>
  );
}

function FeatureShell({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={27} strokeWidth={2.4} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DateField({
  label,
  value,
  onChange,
  placeholder,
  minimumDate,
  maximumDate,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
  optional?: boolean;
}) {
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const parsedDate = parseDateInput(value);
  const selectedDate = parsedDate || minimumDate || startOfDay(new Date());

  function handlePickerChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (Platform.OS !== 'ios') {
      setShowInlinePicker(false);
    }

    if (event.type === 'dismissed' || !nextDate) {
      return;
    }

    onChange(formatDateInput(nextDate));
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        display: 'calendar',
        minimumDate,
        maximumDate,
        onChange: handlePickerChange,
      });
      return;
    }

    setShowInlinePicker((current) => !current);
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.pickerInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#8D8F97"
          keyboardType="numbers-and-punctuation"
          style={styles.pickerTextInput}
        />
        {optional && value ? (
          <Pressable accessibilityRole="button" onPress={() => onChange('')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={openPicker} style={styles.pickerButton}>
          <Text style={styles.pickerButtonText}>Pick</Text>
        </Pressable>
      </View>
      {showInlinePicker ? (
        <DateTimePicker
          display="inline"
          mode="date"
          value={selectedDate}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handlePickerChange}
        />
      ) : null}
    </View>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showInlinePicker, setShowInlinePicker] = useState(false);
  const selectedTime = parseTimeInput(value) || new Date(2000, 0, 1, 9, 0);

  function handlePickerChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (Platform.OS !== 'ios') {
      setShowInlinePicker(false);
    }

    if (event.type === 'dismissed' || !nextDate) {
      return;
    }

    onChange(formatTimeInput(nextDate));
  }

  function openPicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedTime,
        mode: 'time',
        display: 'clock',
        is24Hour: true,
        onChange: handlePickerChange,
      });
      return;
    }

    setShowInlinePicker((current) => !current);
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.pickerInputWrap}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="09:00"
          placeholderTextColor="#8D8F97"
          keyboardType="numbers-and-punctuation"
          style={styles.pickerTextInput}
        />
        <Pressable accessibilityRole="button" onPress={openPicker} style={styles.pickerButton}>
          <Text style={styles.pickerButtonText}>Pick</Text>
        </Pressable>
      </View>
      {showInlinePicker ? (
        <DateTimePicker
          display="spinner"
          mode="time"
          value={selectedTime}
          is24Hour
          onChange={handlePickerChange}
        />
      ) : null}
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
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'numbers-and-punctuation';
  multiline?: boolean;
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
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline ? styles.multilineInput : null]}
      />
    </View>
  );
}

function SegmentGroup<TValue extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ label: string; value: TValue }>;
  value: TValue | '';
  onChange: (value: TValue) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.segmentRow}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.segment, value === option.value ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, value === option.value ? styles.segmentTextActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FamilyPicker({
  profiles,
  value,
  onChange,
}: {
  profiles: CustomerFamilyProfile[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>For profile</Text>
      <View style={styles.segmentRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange('')}
          style={[styles.segment, value === '' ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, value === '' ? styles.segmentTextActive : null]}>Me</Text>
        </Pressable>
        {profiles.map((profile) => (
          <Pressable
            key={profile.id}
            accessibilityRole="button"
            onPress={() => onChange(profile.id)}
            style={[styles.segment, value === profile.id ? styles.segmentActive : null]}
          >
            <Text style={[styles.segmentText, value === profile.id ? styles.segmentTextActive : null]}>
              {profile.fullName}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void | Promise<void>;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onToggle(!value)}
      style={styles.toggleRow}
    >
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{label}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <View style={[styles.switchTrack, value ? styles.switchTrackOn : null]}>
        <View style={[styles.switchThumb, value ? styles.switchThumbOn : null]}>
          {value ? <Check color={colors.primary} size={15} strokeWidth={3} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Icon color={colors.primary} size={23} strokeWidth={2.3} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          {children}
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Icon color={colors.primary} size={28} strokeWidth={2.4} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function SmallButton({
  label,
  danger,
  onPress,
}: {
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.smallButton, danger ? styles.smallButtonDanger : null]}
    >
      {danger ? <Trash2 color={colors.danger} size={16} strokeWidth={2.5} /> : null}
      <Text style={[styles.smallButtonText, danger ? styles.smallButtonTextDanger : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

function createFamilyDraft(profile?: CustomerFamilyProfile | null): FamilyDraft {
  return {
    fullName: profile?.fullName || '',
    relationship: profile?.relationship || '',
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile?.gender || '',
  };
}

function createReminderDraft(reminder?: MedicineReminder | null): ReminderDraft {
  return {
    familyProfileId: reminder?.familyProfileId || '',
    medicineName: reminder?.medicineName || '',
    dosage: reminder?.dosage || '',
    frequency: reminder?.frequency || 'Daily',
    scheduleTime: reminder?.scheduleTime?.slice(0, 5) || '09:00',
    startDate: reminder?.startDate ? reminder.startDate.slice(0, 10) : formatDateInput(new Date()),
    endDate: reminder?.endDate ? reminder.endDate.slice(0, 10) : '',
    notes: reminder?.notes || '',
    isActive: reminder?.isActive ?? true,
  };
}

function parseDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTimeInput(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
  return date;
}

function formatTimeInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatFileSize(size?: number) {
  if (!size) {
    return 'Unknown size';
  }

  if (size >= 1000000) {
    return `${(size / 1000000).toFixed(1)} MB`;
  }

  return `${Math.round(size / 1000)} KB`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Not available';
  return value.slice(0, 10);
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`)
    .join(' ');
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
    fontSize: 23,
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
  formSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
  },
  sectionTitle: {
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
  input: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 96,
    paddingTop: 14,
    lineHeight: 22,
  },
  pickerInputWrap: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerTextInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  pickerButton: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  clearButton: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: colors.muted,
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
  buttonRow: {
    gap: 10,
  },
  attachmentButton: {
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#C9DDFF',
    backgroundColor: colors.primarySofter,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  attachmentButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  attachmentList: {
    gap: 8,
  },
  attachmentRow: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFB',
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentCopy: {
    flex: 1,
    gap: 3,
  },
  attachmentName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  attachmentMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  removeAttachmentButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  cardText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  smallButton: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallButtonDanger: {
    backgroundColor: colors.dangerSoft,
  },
  smallButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  smallButtonTextDanger: {
    color: colors.danger,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.primarySofter,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  toggleRow: {
    minHeight: 66,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  toggleDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  switchTrack: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D9DCE4',
    padding: 3,
    justifyContent: 'center',
  },
  switchTrackOn: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchThumbOn: {
    transform: [{ translateX: 20 }],
  },
  logoutButton: {
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
});
