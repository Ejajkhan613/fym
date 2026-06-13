import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, FileImage, FileText, Image, Info, Send, X } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { AppButton } from '../../components/AppButton';
import { HeaderButton } from '../../components/HeaderButton';
import { uploadPrescription } from '../../api/prescriptions';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { AuthSession } from '../../types/domain';

type PrescriptionUploadScreenProps = {
  session: AuthSession;
  onBack: () => void;
};

type SelectedPrescriptionFile = {
  id: string;
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
};

export function PrescriptionUploadScreen({ session, onBack }: PrescriptionUploadScreenProps) {
  const [files, setFiles] = useState<SelectedPrescriptionFile[]>([
    {
      id: 'demo-prescription-1',
      name: 'prescription_doc_01.jpg',
      size: 1200000,
      uri: 'demo://prescription_doc_01.jpg',
      mimeType: 'image/jpeg',
    },
    {
      id: 'demo-prescription-2',
      name: 'prescription_scan_02.png',
      size: 890000,
      uri: 'demo://prescription_scan_02.png',
      mimeType: 'image/png',
    },
  ]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit() {
    if (files.length === 0) {
      Alert.alert('Add a prescription', 'Take a photo or choose an existing prescription first.');
      return;
    }

    const hostedFile = files.find((file) => /^https?:\/\//.test(file.uri));

    if (!hostedFile) {
      Alert.alert(
        'Prescription ready',
        'The backend upload route currently expects a hosted fileUrl. The selected files are kept in the app until object storage or signed upload URLs are added.',
      );
      return;
    }

    setSubmitting(true);

    try {
      await uploadPrescription({
        customerId: session.user.id,
        fileUrl: hostedFile.uri,
        fileType: hostedFile.mimeType === 'application/pdf' ? 'pdf' : 'image',
      });
      Alert.alert('Prescription submitted', 'Nearby pharmacies will review your prescription.');
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
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
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
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
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uploaded Prescriptions</Text>
          <View style={styles.fileList}>
            {files.map((file) => (
              <View
                key={file.id}
                style={styles.fileRow}
              >
                <View style={styles.fileIcon}>
                  <FileText color={colors.primary} size={34} strokeWidth={2.2} />
                </View>
                <View style={styles.fileCopy}>
                  <Text
                    numberOfLines={1}
                    style={styles.fileName}
                  >
                    {file.name}
                  </Text>
                  <Text style={styles.fileMeta}>{formatFileSize(file.size)} · Uploaded just now</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFiles((current) => current.filter((item) => item.id !== file.id))}
                  style={styles.removeButton}
                >
                  <X color={colors.danger} size={26} strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>

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

        <View style={styles.infoCard}>
          <Info color={colors.primary} size={28} strokeWidth={2.2} />
          <Text style={styles.infoText}>
            Pharmacies within a <Text style={styles.boldText}>5 km radius</Text> will review your
            prescription. The <Text style={styles.boldText}>first pharmacy to accept</Text> will
            fulfill your order and arrange delivery to your location.
          </Text>
        </View>

        <AppButton
          label="Submit Prescription"
          onPress={handleSubmit}
          loading={submitting}
          icon={<Send color="#FFFFFF" size={27} strokeWidth={2.2} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
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
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  secondaryUploadAction: {
    flex: 1,
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
  infoCard: {
    borderWidth: 1,
    borderColor: '#C5DCFF',
    backgroundColor: colors.primarySofter,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  infoText: {
    flex: 1,
    color: colors.muted,
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '600',
  },
  boldText: {
    color: colors.text,
    fontWeight: '900',
  },
});
