import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Plus, Search } from 'lucide-react-native';
import { AppTextInput } from '../../components/AppTextInput';
import { searchMedicines } from '../../api/catalog';
import { demoMedicines } from '../../data/demo';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { Medicine } from '../../types/domain';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SearchScreenProps = {
  onAddToCart: (medicine: Medicine) => void;
  onBack: () => void;
};

export function SearchScreen({ onAddToCart, onBack }: SearchScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>(demoMedicines);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults(demoMedicines);
      return;
    }

    setLoading(true);

    try {
      const response = await searchMedicines(trimmedQuery);
      setResults(response.data.length > 0 ? response.data : []);
    } catch {
      Alert.alert('Showing demo results', 'Medicine search API could not be reached.');
      setResults(demoMedicines.filter((medicine) => medicine.brandName.toLowerCase().includes(trimmedQuery.toLowerCase())));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: 24 + insets.top }]}>
        <View style={styles.titleRow}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={27} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.title}>Search Medicines</Text>
        </View>
        <AppTextInput
          Icon={Search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search brand, salt, or symptom"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.results}
      >
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {!loading && results.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No medicines found</Text>
            <Text style={styles.emptyText}>Try brand, salt, strength, or a shorter spelling.</Text>
          </View>
        ) : null}
        {results.map((medicine) => (
          <View
            key={medicine.id}
            style={styles.resultCard}
          >
            <View style={styles.iconTile}>
              <Search color={colors.primary} size={28} strokeWidth={2.2} />
            </View>
            <View style={styles.resultCopy}>
              <Text style={styles.resultName}>{medicine.brandName}</Text>
              <Text style={styles.resultMeta}>
                {medicine.genericName || 'Medicine'} {medicine.strength ? `· ${medicine.strength}` : ''}
              </Text>
              <Text style={styles.resultPack}>
                {medicine.packSize || medicine.dosageForm || 'Pack'} · Rs {medicine.mrp || 0}
              </Text>
              {medicine.requiresPrescription ? (
                <View style={styles.rxPill}>
                  <Text style={styles.rxPillText}>Prescription required</Text>
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => onAddToCart(medicine)}
              style={styles.addButton}
            >
              <Plus color="#FFFFFF" size={22} strokeWidth={2.4} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: spacing.screen,
    gap: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  results: {
    paddingHorizontal: spacing.screen,
    paddingBottom: 28,
    gap: 14,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconTile: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCopy: {
    flex: 1,
    gap: 4,
  },
  resultName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  resultMeta: {
    color: colors.mutedDark,
    fontSize: 15,
    fontWeight: '700',
  },
  resultPack: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  rxPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#FFF3DA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 5,
  },
  rxPillText: {
    color: '#9A6500',
    fontSize: 12,
    fontWeight: '900',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
