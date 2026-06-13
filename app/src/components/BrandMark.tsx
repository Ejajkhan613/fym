import { Pill } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export function BrandMark() {
  return (
    <View style={styles.mark}>
      <Pill color="#FFFFFF" size={58} strokeWidth={2.8} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 104,
    height: 104,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
});
