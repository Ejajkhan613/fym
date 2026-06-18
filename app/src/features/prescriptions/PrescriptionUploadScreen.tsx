import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Camera,
  Check,
  FileImage,
  FileText,
  Image,
  Plus,
  Send,
  X,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../../components/AppButton';
import { HeaderButton } from '../../components/HeaderButton';
import { createOrder, type CreateOrderResponse } from '../../api/orders';
import {
  linkPrescriptionToOrder,
  listPrescriptions,
  uploadPrescription,
  uploadPrescriptionFile,
} from '../../api/prescriptions';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { AuthSession, CartEntry, CustomerAddress, PrescriptionRecord } from '../../types/domain';

type PrescriptionUploadScreenProps = {
  session: AuthSession;
  onBack: () => void;
  deliveryAddress?: CustomerAddress;
  onOrderCreated?: (order: CreateOrderResponse, fallbackItems: CartEntry[]) => void;
};

type SelectedPrescriptionFile = {
  id: string;
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
};

export function PrescriptionUploadScreen({
  session,
  onBack,
  deliveryAddress,
  onOrderCreated,
}: PrescriptionUploadScreenProps) {
  const insets = useSafeAreaInsets();
  const [files, setFiles] = useState<SelectedPrescriptionFile[]>([]);
  const [vaultPrescriptions, setVaultPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [selectedVaultPrescriptions, setSelectedVaultPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const [loadingVault, setLoadingVault] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const selectedVaultIds = useMemo(
    () => new Set(selectedVaultPrescriptions.map((prescription) => prescription.id)),
    [selectedVaultPrescriptions],
  );
  const selectedCount = files.length + selectedVaultPrescriptions.length;

  useEffect(() => {
    let mounted = true;

    async function loadVault() {
      setLoadingVault(true);

      try {
        const response = await listPrescriptions(session.user.id, session.tokens.accessToken);

        if (mounted) {
          setVaultPrescriptions(response.data);
        }
      } catch {
        if (mounted) {
          setVaultPrescriptions([]);
        }
      } finally {
        if (mounted) {
          setLoadingVault(false);
        }
      }
    }

    loadVault();

    return () => {
      mounted = false;
    };
  }, [session.tokens.accessToken, session.user.id]);

  async function handleTakePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access to take a prescription photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      addImageAsset(result.assets[0], 'prescription_photo');
    }
  }

  async function handleChooseDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (!result.canceled) {
      const pickedFiles = result.assets.map((asset) => ({
        id: `${asset.uri}-${Date.now()}-${Math.random()}`,
        name: asset.name,
        uri: asset.uri,
        size: asset.size,
        mimeType: asset.mimeType,
      }));

      setFiles((current) => [...pickedFiles, ...current]);
    }
  }

  function handleToggleVaultPrescription(prescription: PrescriptionRecord) {
    setSelectedVaultPrescriptions((current) =>
      current.some((item) => item.id === prescription.id)
        ? current.filter((item) => item.id !== prescription.id)
        : [prescription, ...current],
    );
  }

  async function handleSubmit() {
    if (selectedCount === 0) {
      Alert.alert('Add a prescription', 'Take a photo or choose an existing prescription first.');
      return;
    }

    if (!deliveryAddress) {
      Alert.alert('Add delivery address', 'Choose a delivery address before ordering.');
      return;
    }

    setSubmitting(true);

    try {
      const uploadedPrescriptions: PrescriptionRecord[] = [];

      for (const file of files) {
        const response = /^https?:\/\//.test(file.uri)
          ? await uploadPrescription({
              customerId: session.user.id,
              fileUrl: file.uri,
              fileType: getPrescriptionFileType(file),
              accessToken: session.tokens.accessToken,
            })
          : await uploadPrescriptionFile({
              customerId: session.user.id,
              file,
              accessToken: session.tokens.accessToken,
            });

        uploadedPrescriptions.push(response.data);
      }

      const orderPrescriptions = [...uploadedPrescriptions, ...selectedVaultPrescriptions];
      const primaryPrescription = orderPrescriptions[0];
      const orderItem = createPrescriptionOrderItem(selectedCount);
      const orderResponse = await createOrder({
        customerId: session.user.id,
        items: [orderItem],
        deliveryAddress,
        prescriptionId: primaryPrescription.id,
        accessToken: session.tokens.accessToken,
      });

      await Promise.allSettled(
        orderPrescriptions.map((prescription) =>
          linkPrescriptionToOrder({
            prescriptionId: prescription.id,
            orderId: orderResponse.data.order.id,
            accessToken: session.tokens.accessToken,
          }),
        ),
      );

      setVaultPrescriptions((current) => [
        ...uploadedPrescriptions,
        ...current.filter(
          (prescription) =>
            !uploadedPrescriptions.some((uploaded) => uploaded.id === prescription.id),
        ),
      ]);
      setFiles([]);
      setSelectedVaultPrescriptions([]);
      setShowVaultPicker(false);
      setNote('');
      onOrderCreated?.(orderResponse.data, [orderItem]);
      Alert.alert('Order placed', 'Your prescription was sent to pharmacies for review.');
    } catch (error) {
      Alert.alert('Order failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function addImageAsset(asset: ImagePicker.ImagePickerAsset, prefix: string) {
    setFiles((current) => [
      {
        id: `${asset.uri}-${Date.now()}`,
        name: asset.fileName || `${prefix}_${Date.now()}.jpg`,
        uri: asset.uri,
        size: asset.fileSize,
        mimeType: asset.mimeType || 'image/jpeg',
      },
      ...current,
    ]);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <HeaderButton onPress={onBack}>
          <ArrowLeft color="#000000" size={30} strokeWidth={2.5} />
        </HeaderButton>
        <Text style={styles.headerTitle}>Upload Prescription</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.uploadCard}>
          <View style={styles.fileHalo}>
            <FileImage color={colors.primary} size={54} strokeWidth={2.4} />
          </View>
          <Text style={styles.uploadTitle}>Tap to upload or take a photo of your prescription</Text>
          <Text style={styles.uploadSubtitle}>Supported formats: JPG, PNG, PDF</Text>
          <View style={styles.uploadActions}>
            <AppButton
              label="Take Photo"
              onPress={handleTakePhoto}
              icon={<Camera color="#FFFFFF" size={22} strokeWidth={2.3} />}
            />
            <View style={styles.secondaryUploadAction}>
              <AppButton
                label="Choose from Gallery"
                onPress={handleChooseDocument}
                variant="secondary"
                icon={<Image color={colors.text} size={22} strokeWidth={2.3} />}
              />
            </View>
            <View style={styles.secondaryUploadAction}>
              <AppButton
                label={loadingVault ? 'Loading Vault' : 'Select from Vault'}
                onPress={() => setShowVaultPicker((current) => !current)}
                disabled={loadingVault}
                variant="secondary"
                icon={<FileText color={colors.text} size={22} strokeWidth={2.3} />}
              />
            </View>
          </View>
        </View>

        {showVaultPicker ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription Vault</Text>
            {vaultPrescriptions.length === 0 ? (
              <View style={styles.emptyVault}>
                <Text style={styles.emptyVaultTitle}>No saved prescriptions</Text>
                <Text style={styles.emptyVaultText}>
                  Upload a prescription first, then you can reuse it here.
                </Text>
              </View>
            ) : (
              <View style={styles.fileList}>
                {vaultPrescriptions.map((prescription) => {
                  const selected = selectedVaultIds.has(prescription.id);

                  return (
                    <Pressable
                      key={prescription.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => handleToggleVaultPrescription(prescription)}
                      style={[styles.vaultRow, selected ? styles.vaultRowSelected : null]}
                    >
                      <View style={styles.fileIcon}>
                        <FileText color={colors.primary} size={34} strokeWidth={2.2} />
                      </View>
                      <View style={styles.fileCopy}>
                        <Text numberOfLines={1} style={styles.fileName}>
                          {formatPrescriptionName(prescription)}
                        </Text>
                        <Text style={styles.fileMeta}>
                          {formatPrescriptionMeta(prescription)}
                        </Text>
                      </View>
                      <View style={[styles.selectVaultButton, selected ? styles.selectVaultButtonActive : null]}>
                        {selected ? (
                          <Check color="#FFFFFF" size={20} strokeWidth={2.8} />
                        ) : (
                          <Plus color={colors.primary} size={20} strokeWidth={2.8} />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {selectedCount > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Prescriptions</Text>
            <View style={styles.fileList}>
              {selectedVaultPrescriptions.map((prescription) => (
                <View key={`vault-${prescription.id}`} style={styles.fileRow}>
                  <View style={styles.fileIcon}>
                    <FileText color={colors.primary} size={34} strokeWidth={2.2} />
                  </View>
                  <View style={styles.fileCopy}>
                    <Text numberOfLines={1} style={styles.fileName}>
                      {formatPrescriptionName(prescription)}
                    </Text>
                    <Text style={styles.fileMeta}>{formatPrescriptionMeta(prescription)}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setSelectedVaultPrescriptions((current) =>
                        current.filter((item) => item.id !== prescription.id),
                      )
                    }
                    style={styles.removeButton}
                  >
                    <X color={colors.danger} size={26} strokeWidth={2.2} />
                  </Pressable>
                </View>
              ))}
              {files.map((file) => (
                <View key={file.id} style={styles.fileRow}>
                  <View style={styles.fileIcon}>
                    <FileText color={colors.primary} size={34} strokeWidth={2.2} />
                  </View>
                  <View style={styles.fileCopy}>
                    <Text numberOfLines={1} style={styles.fileName}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      {formatFileSize(file.size)} - Ready to upload
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      setFiles((current) => current.filter((item) => item.id !== file.id))
                    }
                    style={styles.removeButton}
                  >
                    <X color={colors.danger} size={26} strokeWidth={2.2} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Note for Pharmacist<Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
            placeholder="E.g. Please check for generic alternatives or specific brand preferences..."
            placeholderTextColor="#8D8F97"
            style={styles.noteInput}
          />
        </View>

        <AppButton
          label="Order Now"
          onPress={handleSubmit}
          loading={submitting}
          icon={<Send color="#FFFFFF" size={27} strokeWidth={2.2} />}
        />
      </ScrollView>
    </View>
  );
}

function getPrescriptionFileType(file: SelectedPrescriptionFile) {
  return file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    ? 'pdf'
    : 'image';
}

function formatPrescriptionName(prescription: PrescriptionRecord) {
  return `${prescription.fileType.toUpperCase()} prescription`;
}

function formatPrescriptionMeta(prescription: PrescriptionRecord) {
  const uploadedAt = prescription.createdAt || prescription.uploadedAt;
  // return `Saved ${formatDate(uploadedAt)} - ${formatStatus(prescription.verificationStatus)}`;
  return `Saved ${formatDate(uploadedAt)}`;
}

function createPrescriptionOrderItem(fileCount: number): CartEntry {
  return {
    id: `prescription-order-${Date.now()}`,
    name: 'Prescription medicines',
    pack: `${fileCount} prescription record${fileCount === 1 ? '' : 's'}`,
    price: 0,
    quantity: 1,
    requiresPrescription: true,
  };
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
  if (!value) return 'not available';
  return value.slice(0, 10);
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    minHeight: 92,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: spacing.screen,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  content: {
    padding: spacing.screen,
    gap: 26,
    paddingBottom: 42,
  },
  uploadCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#9EC5FF',
    borderRadius: 22,
    backgroundColor: colors.primarySofter,
    paddingHorizontal: 24,
    paddingVertical: 44,
    alignItems: 'center',
  },
  fileHalo: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#DDEAFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    marginTop: 28,
    color: colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  uploadSubtitle: {
    marginTop: 18,
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  uploadActions: {
    marginTop: 30,
    flexDirection: 'column',
    gap: 14,
    width: '100%',
  },
  secondaryUploadAction: {
    width: '100%',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  optional: {
    color: colors.muted,
    fontWeight: '600',
  },
  fileList: {
    gap: 14,
  },
  fileRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#FAFAFB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vaultRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  vaultRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter,
  },
  fileIcon: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#DFECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCopy: {
    flex: 1,
  },
  fileName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  fileMeta: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 3,
  },
  removeButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectVaultButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#C9DDFF',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectVaultButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  emptyVault: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: '#FAFAFB',
    padding: 18,
    gap: 6,
  },
  emptyVaultTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyVaultText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  noteInput: {
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '500',
    padding: 18,
  },
});
