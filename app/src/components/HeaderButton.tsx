import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

type HeaderButtonProps = {
  children: ReactNode;
  onPress: () => void;
};

export function HeaderButton({ children, onPress }: HeaderButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F6',
  },
  pressed: {
    backgroundColor: colors.border,
  },
});
