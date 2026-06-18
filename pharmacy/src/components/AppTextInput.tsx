import type { ComponentType } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type AppTextInputProps = {
  Icon?: ComponentType<IconProps>;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'decimal-pad' | 'url';
  multiline?: boolean;
};

export function AppTextInput({
  Icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: AppTextInputProps) {
  return (
    <View style={[styles.wrap, multiline ? styles.wrapMultiline : null]}>
      {Icon ? <Icon color={colors.muted} size={21} strokeWidth={2.3} /> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8D8F97"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wrapMultiline: {
    minHeight: 94,
    alignItems: 'flex-start',
    paddingTop: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 74,
    lineHeight: 22,
  },
});
