import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LogOut, Scale, ShieldCheck, Store, WalletCards } from 'lucide-react-native';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type {
  AddPharmacistPayload,
  AuthSession,
  CreatePharmacyDraftPayload,
  Penalty,
  Pharmacy,
  PharmacyDocumentType,
  PharmacyProfile,
  UploadDocumentPayload,
} from '../../types/domain';
import { formatDateTime, formatMoney, getMissingDocuments, shortId, titleCase } from '../../utils/format';
import { CompliancePanel } from '../onboarding/OnboardingScreen';

type ProfileScreenProps = {
  session: AuthSession;
  pharmacies: Pharmacy[];
  selectedPharmacyId: string;
  profile: PharmacyProfile | null;
  penalties: Penalty[];
  isSaving: boolean;
  onSelectPharmacy: (pharmacyId: string) => void;
  onCreatePharmacy: (payload: CreatePharmacyDraftPayload) => void;
  onUploadDocument: (payload: UploadDocumentPayload) => void;
  onAddPharmacist: (payload: AddPharmacistPayload) => void;
  onSubmitForReview: () => void;
  onAppealPenalty: (penalty: Penalty, reason: string) => void;
  onLogout: () => void;
};

export function ProfileScreen({
  session,
  pharmacies,
  selectedPharmacyId,
  profile,
  penalties,
  isSaving,
  onSelectPharmacy,
  onUploadDocument,
  onAddPharmacist,
  onSubmitForReview,
  onAppealPenalty,
  onLogout,
}: ProfileScreenProps) {
  const [appealReasons, setAppealReasons] = useState<Record<string, string>>({});
  const missingDocuments = useMemo(
    () => getMissingDocuments(profile?.documents.map((document) => document.documentType) || []) as PharmacyDocumentType[],
    [profile],
  );
  const activePenalties = penalties.filter((penalty) => penalty.status === 'applied' || penalty.status === 'disputed');
  const totalPenaltyHold = activePenalties.reduce((total, penalty) => total + penalty.amount, 0);

  function submitAppeal(penalty: Penalty) {
    const reason = appealReasons[penalty.id]?.trim();

    if (!reason) {
      Alert.alert('Appeal reason required', 'Explain why this penalty should be reviewed.');
      return;
    }

    onAppealPenalty(penalty, reason);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>{session.user.name} - {session.user.phone}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logoutButton}>
            <LogOut color={colors.danger} size={20} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.selectorCard}>
          <View style={styles.selectorHeader}>
            <View style={styles.selectorIcon}>
              <Store color={colors.primary} size={23} strokeWidth={2.4} />
            </View>
            <View style={styles.selectorCopy}>
              <Text style={styles.cardTitle}>Pharmacy workspace</Text>
              <Text style={styles.cardText}>Switch between owner-linked pharmacy profiles.</Text>
            </View>
          </View>
          <View style={styles.segmentRow}>
            {pharmacies.map((pharmacy) => (
              <Pressable
                key={pharmacy.id}
                onPress={() => onSelectPharmacy(pharmacy.id)}
                style={[styles.segment, pharmacy.id === selectedPharmacyId ? styles.segmentActive : null]}
              >
                <Text style={[styles.segmentText, pharmacy.id === selectedPharmacyId ? styles.segmentTextActive : null]}>
                  {pharmacy.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {profile ? (
          <>
            <View style={styles.summaryGrid}>
              <SummaryTile
                label="Status"
                value={titleCase(profile.pharmacy.status)}
                Icon={ShieldCheck}
              />
              <SummaryTile
                label="Docs pending"
                value={String(missingDocuments.length)}
                Icon={Scale}
              />
              <SummaryTile
                label="Penalty hold"
                value={formatMoney(totalPenaltyHold)}
                Icon={WalletCards}
              />
            </View>

            <CompliancePanel
              profile={profile}
              missingDocuments={missingDocuments}
              isSaving={isSaving}
              onUploadDocument={onUploadDocument}
              onAddPharmacist={onAddPharmacist}
              onSubmitForReview={onSubmitForReview}
            />
          </>
        ) : null}

        <View style={styles.penaltyCard}>
          <View style={styles.selectorHeader}>
            <View style={styles.penaltyIcon}>
              <Scale color={colors.danger} size={23} strokeWidth={2.4} />
            </View>
            <View style={styles.selectorCopy}>
              <Text style={styles.cardTitle}>Penalties and appeals</Text>
              <Text style={styles.cardText}>Appeal valid operational issues with evidence notes.</Text>
            </View>
          </View>

          {penalties.length === 0 ? (
            <Text style={styles.emptyText}>No penalties are currently linked to this pharmacy.</Text>
          ) : (
            penalties.map((penalty) => (
              <View key={penalty.id} style={styles.penaltyRow}>
                <View style={styles.penaltyTop}>
                  <View style={styles.penaltyCopy}>
                    <Text style={styles.penaltyTitle}>
                      Level {penalty.level} - {titleCase(penalty.penaltyType)}
                    </Text>
                    <Text style={styles.cardText}>
                      {formatMoney(penalty.amount)} - {titleCase(penalty.status)} - {formatDateTime(penalty.createdAt)}
                    </Text>
                    <Text style={styles.reasonText}>{penalty.reason}</Text>
                  </View>
                  {penalty.orderId ? (
                    <Text style={styles.orderRef}>#{shortId(penalty.orderId)}</Text>
                  ) : null}
                </View>
                {penalty.status === 'applied' ? (
                  <View style={styles.appealBox}>
                    <AppTextInput
                      value={appealReasons[penalty.id] || ''}
                      onChangeText={(value) =>
                        setAppealReasons((current) => ({ ...current, [penalty.id]: value }))
                      }
                      placeholder="Appeal reason, evidence URL note, or operational explanation"
                      multiline
                    />
                    <AppButton
                      label="Submit Appeal"
                      variant="secondary"
                      loading={isSaving}
                      onPress={() => submitAppeal(penalty)}
                    />
                  </View>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryTile({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof ShieldCheck;
}) {
  return (
    <View style={styles.summaryTile}>
      <Icon color={colors.primary} size={20} strokeWidth={2.4} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  title: {
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
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 14,
  },
  selectorCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  selectorHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  selectorIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  penaltyIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorCopy: {
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
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryTile: {
    flex: 1,
    minHeight: 88,
    borderRadius: 18,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  summaryValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  penaltyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  penaltyRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F1F4',
    paddingTop: 13,
    gap: 12,
  },
  penaltyTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  penaltyCopy: {
    flex: 1,
    gap: 4,
  },
  penaltyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  reasonText: {
    color: colors.mutedDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  orderRef: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  appealBox: {
    gap: 10,
  },
});
