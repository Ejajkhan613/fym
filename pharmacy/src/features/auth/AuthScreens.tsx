import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Check, Phone, ShieldCheck, Store, User } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { requestOtp, verifyOtp } from '../../api/auth';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { AuthPurpose, AuthSession } from '../../types/domain';
import { formatDisplayPhone, toE164Phone } from '../../utils/phone';

type AuthScreensProps = {
  onAuthenticated: (session: AuthSession) => void;
};

type AuthStep =
  | { name: 'login' }
  | { name: 'signup' }
  | {
      name: 'verify';
      phone: string;
      purpose: AuthPurpose;
      fullName?: string;
      devOtp?: string;
    };

export function AuthScreens({ onAuthenticated }: AuthScreensProps) {
  const [step, setStep] = useState<AuthStep>({ name: 'login' });

  if (step.name === 'signup') {
    return (
      <AuthForm
        mode="signup"
        onSwitchMode={() => setStep({ name: 'login' })}
        onOtpRequested={(payload) => setStep(payload)}
      />
    );
  }

  if (step.name === 'verify') {
    return (
      <VerifyOtpScreen
        payload={step}
        onBack={() => setStep(step.purpose === 'register' ? { name: 'signup' } : { name: 'login' })}
        onAuthenticated={onAuthenticated}
      />
    );
  }

  return (
    <AuthForm
      mode="login"
      onSwitchMode={() => setStep({ name: 'signup' })}
      onOtpRequested={(payload) => setStep(payload)}
    />
  );
}

function AuthForm({
  mode,
  onSwitchMode,
  onOtpRequested,
}: {
  mode: 'login' | 'signup';
  onSwitchMode: () => void;
  onOtpRequested: (payload: Extract<AuthStep, { name: 'verify' }>) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';
  const canSubmit = phone.replace(/\D/g, '').length >= 8 && (!isSignup || fullName.trim().length > 1);

  async function submit() {
    const normalizedPhone = toE164Phone('+91', phone);
    setLoading(true);

    try {
      const response = await requestOtp({
        phone: normalizedPhone,
        purpose: isSignup ? 'register' : 'login',
      });
      onOtpRequested({
        name: 'verify',
        phone: response.data.phone,
        purpose: isSignup ? 'register' : 'login',
        fullName: isSignup ? fullName.trim() : undefined,
        devOtp: response.data.devOtp,
      });
    } catch (error) {
      Alert.alert('Could not send OTP', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.brandMark}>
          <Store color="#FFFFFF" size={36} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>{isSignup ? 'Register Pharmacy Owner' : 'Pharmacy Console'}</Text>
        <Text style={styles.subtitle}>
          Manage vendor offers, pharmacist checks, packing, penalties, and onboarding compliance.
        </Text>

        <View style={styles.formCard}>
          {isSignup ? (
            <Field label="Owner name">
              <AppTextInput
                Icon={User}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Registered owner name"
              />
            </Field>
          ) : null}

          <Field label="Mobile number">
            <AppTextInput
              Icon={Phone}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
            />
          </Field>

          <View style={styles.complianceCard}>
            <ShieldCheck color={colors.teal} size={23} strokeWidth={2.4} />
            <Text style={styles.complianceText}>
              Access is for licensed pharmacy teams. Onboarding documents are verified before order offers are operational.
            </Text>
          </View>

          <AppButton
            label={isSignup ? 'Create owner login' : 'Send OTP'}
            onPress={submit}
            disabled={!canSubmit}
            loading={loading}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{isSignup ? 'Already registered?' : 'New pharmacy owner?'}</Text>
          <Pressable onPress={onSwitchMode}>
            <Text style={styles.switchAction}>{isSignup ? 'Log in' : 'Register'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function VerifyOtpScreen({
  payload,
  onBack,
  onAuthenticated,
}: {
  payload: Extract<AuthStep, { name: 'verify' }>;
  onBack: () => void;
  onAuthenticated: (session: AuthSession) => void;
}) {
  const [code, setCode] = useState(payload.devOtp || '');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    try {
      const response = await verifyOtp({
        phone: payload.phone,
        otp: code,
        purpose: payload.purpose,
        name: payload.fullName,
      });
      onAuthenticated(response.data);
    } catch (error) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.brandMark}>
          <Phone color="#FFFFFF" size={34} strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>Enter the code sent to {formatDisplayPhone(payload.phone)}.</Text>

        <View style={styles.formCard}>
          <Field label="One-time password">
            <AppTextInput
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit OTP"
              keyboardType="number-pad"
            />
          </Field>
          <AppButton
            label="Verify and continue"
            onPress={submit}
            disabled={code.length < 4}
            loading={loading}
            icon={<Check color="#FFFFFF" size={22} strokeWidth={2.5} />}
          />
        </View>

        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.switchAction}>Use another number</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: 72,
    paddingBottom: 34,
    justifyContent: 'center',
  },
  brandMark: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  title: {
    color: colors.text,
    fontSize: 33,
    lineHeight: 39,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
    textAlign: 'center',
  },
  formCard: {
    marginTop: 32,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  complianceCard: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#CDECE8',
    backgroundColor: colors.tealSoft,
    padding: 13,
    flexDirection: 'row',
    gap: 10,
  },
  complianceText: {
    flex: 1,
    color: colors.mutedDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  switchRow: {
    marginTop: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  switchText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  switchAction: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  backLink: {
    marginTop: 24,
    alignSelf: 'center',
  },
});
