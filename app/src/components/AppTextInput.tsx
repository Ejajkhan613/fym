import type { ComponentType } from 'react';
import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../theme/colors';

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type AppTextInputProps = TextInputProps & {
  Icon?: ComponentType<IconProps>;
};

export function AppTextInput({ Icon, style, ...props }: AppTextInputProps) {
  return (
    <View style={styles.wrapper}>
      {Icon ? <Icon color={colors.muted} size={26} strokeWidth={2.2} /> : null}
      <TextInput
        {...props}
        placeholderTextColor="#8D8F97"
        style={[styles.input, style]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 62,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.input,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 19,
    fontWeight: '500',
    paddingVertical: 0,
  },
});
