import { useRef, useState } from 'react';
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
import { ArrowLeft, Check, MessageSquare, Phone, ShieldCheck, Square, User } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { BrandMark } from '../../components/BrandMark';
import { HeaderButton } from '../../components/HeaderButton';
import { requestOtp, verifyOtp } from '../../api/auth';
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
      <SignupScreen
        onLogin={() => setStep({ name: 'login' })}
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
    <LoginScreen
      onSignup={() => setStep({ name: 'signup' })}
      onOtpRequested={(payload) => setStep(payload)}
    />
  );
}

function LoginScreen({
  onSignup,
  onOtpRequested,
}: {
  onSignup: () => void;
  onOtpRequested: (payload: Extract<AuthStep, { name: 'verify' }>) => void;
}) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const canSubmit = phone.replace(/\D/g, '').length >= 8;

  async function handleSendOtp() {
    const normalizedPhone = toE164Phone('+91', phone);
    setLoading(true);

    try {
      const response = await requestOtp({ phone: normalizedPhone, purpose: 'login' });
      onOtpRequested({
        name: 'verify',
        phone: response.data.phone,
        purpose: 'login',
        devOtp: response.data.devOtp,
      });
    } catch (error) {
      Alert.alert('Could not send OTP', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame footer={<AuthFooter text="Don't have an account?" action="Sign Up" onPress={onSignup} />}>
      <View style={styles.centeredHeader}>
        <BrandMark />
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to continue ordering medicines</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Mobile Number</Text>
        <AppTextInput
          Icon={Phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="Enter your mobile number"
          returnKeyType="done"
          onSubmitEditing={canSubmit ? handleSendOtp : undefined}
        />
      </View>

      <AppButton
        label="Send OTP"
        onPress={handleSendOtp}
        disabled={!canSubmit}
        loading={loading}
      />
    </AuthFrame>
  );
}

function SignupScreen({
  onLogin,
  onOtpRequested,
}: {
  onLogin: () => void;
  onOtpRequested: (payload: Extract<AuthStep, { name: 'verify' }>) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const canSubmit = fullName.trim().length > 1 && phone.replace(/\D/g, '').length >= 8 && acceptedTerms;

  async function handleSignup() {
    const normalizedPhone = toE164Phone('+91', phone);
    setLoading(true);

    try {
      const response = await requestOtp({ phone: normalizedPhone, purpose: 'register' });
      onOtpRequested({
        name: 'verify',
        phone: response.data.phone,
        purpose: 'register',
        fullName: fullName.trim(),
        devOtp: response.data.devOtp,
      });
    } catch (error) {
      Alert.alert('Could not start signup', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame footer={<AuthFooter text="Already have an account?" action="Log In" onPress={onLogin} />}>
      <View style={styles.centeredHeader}>
        <BrandMark />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to order medicines and upload prescriptions</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Name</Text>
        <AppTextInput
          Icon={User}
          value={fullName}
          onChangeText={setFullName}
          textContentType="name"
          placeholder="Enter your full name"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Mobile Number</Text>
        <View style={styles.phoneRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+91</Text>
          </View>
          <View style={styles.phoneInputWrap}>
            <AppTextInput
              Icon={Phone}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Mobile number"
            />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acceptedTerms }}
        onPress={() => setAcceptedTerms((current) => !current)}
        style={styles.termsRow}
      >
        <View style={[styles.checkbox, acceptedTerms ? styles.checkboxChecked : null]}>
          {acceptedTerms ? <Check color="#FFFFFF" size={18} strokeWidth={3} /> : null}
        </View>
        <Text style={styles.termsText}>
          I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </Pressable>

      <AppButton
        label="Sign Up"
        onPress={handleSignup}
        disabled={!canSubmit}
        loading={loading}
      />
    </AuthFrame>
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
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState(payload.devOtp || '');
  const [loading, setLoading] = useState(false);
  const canSubmit = code.length >= 4;

  async function handleVerify() {
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.verifyScroll}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderButton onPress={onBack}>
          <ArrowLeft color="#000000" size={30} strokeWidth={2.5} />
        </HeaderButton>

        <View style={styles.verifyHero}>
          <View style={styles.verifyHaloOuter}>
            <View style={styles.verifyHaloInner}>
              <Phone color={colors.primary} size={44} strokeWidth={2.6} />
            </View>
            <View style={styles.messageBadge}>
              <MessageSquare color="#FFFFFF" size={26} strokeWidth={2.4} />
            </View>
          </View>

          <Text style={styles.title}>Verify Your Number</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent to</Text>
          <View style={styles.verifyPhoneRow}>
            <Text style={styles.verifyPhone}>{formatDisplayPhone(payload.phone)}</Text>
            <Pressable onPress={onBack}>
              <Text style={styles.editNumber}>Edit number</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={styles.otpRow}
        >
          {Array.from({ length: 6 }).map((_, index) => {
            const digit = code[index] || '';
            const filled = digit.length > 0;
            return (
              <View
                key={index}
                style={[styles.otpBox, filled ? styles.otpBoxFilled : null]}
              >
                <Text style={styles.otpDigit}>{digit}</Text>
              </View>
            );
          })}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            style={styles.hiddenOtpInput}
          />
        </Pressable>

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>Resend code in</Text>
          <Text style={styles.resendCountdown}>00:30</Text>
        </View>

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}>
            <ShieldCheck color={colors.primary} size={28} strokeWidth={2.2} />
          </View>
          <View style={styles.securityCopy}>
            <Text style={styles.securityTitle}>Secure Verification</Text>
            <Text style={styles.securityBody}>
              This code expires in 10 minutes. Never share your OTP with anyone, including pharmacy staff.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.verifyFooter}>
        <AppButton
          label="Verify"
          onPress={handleVerify}
          disabled={!canSubmit}
          loading={loading}
          icon={<Check color="#FFFFFF" size={28} strokeWidth={2.6} />}
        />
        <Text style={styles.footerTerms}>
          By verifying, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function AuthFrame({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.authScroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authContent}>{children}</View>
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthFooter({
  text,
  action,
  onPress,
}: {
  text: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.authFooter}>
      <Text style={styles.authFooterText}>{text}</Text>
      <Pressable onPress={onPress}>
        <Text style={styles.authFooterAction}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  authScroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: 78,
    paddingBottom: 46,
    justifyContent: 'space-between',
  },
  authContent: {
    gap: 28,
  },
  centeredHeader: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '500',
    textAlign: 'center',
  },
  formGroup: {
    gap: 12,
  },
  label: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryCode: {
    width: 96,
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F7F7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryCodeText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  phoneInputWrap: {
    flex: 1,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  termsText: {
    flex: 1,
    color: colors.muted,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '500',
  },
  linkText: {
    color: colors.primary,
    fontWeight: '700',
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 48,
  },
  authFooterText: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: '500',
  },
  authFooterAction: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  verifyScroll: {
    paddingHorizontal: spacing.screen,
    paddingTop: 58,
    paddingBottom: 24,
  },
  verifyHero: {
    alignItems: 'center',
    marginTop: 76,
    gap: 12,
  },
  verifyHaloOuter: {
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: '#DCE9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },
  verifyHaloInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#C3DAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  verifyPhone: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  editNumber: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  otpRow: {
    marginTop: 58,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpBox: {
    width: 55,
    height: 70,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySofter,
  },
  otpDigit: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 48,
  },
  resendText: {
    color: colors.muted,
    fontSize: 19,
    fontWeight: '500',
  },
  resendCountdown: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  securityCard: {
    marginTop: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C9DDFF',
    backgroundColor: colors.primarySofter,
    padding: 20,
    flexDirection: 'row',
    gap: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  securityIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D8E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityCopy: {
    flex: 1,
    gap: 8,
  },
  securityTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  securityBody: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  verifyFooter: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 30,
    gap: 20,
  },
  footerTerms: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
});
