import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  ChevronDown,
  Clock,
  FileUp,
  LocateFixed,
  Pill,
  RefreshCcw,
  Search,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { AuthSession, CartEntry } from '../../types/domain';
import { quickReorders } from '../../data/demo';

type HomeScreenProps = {
  session: AuthSession;
  onOpenPrescription: () => void;
  onOpenSearch: () => void;
  onAddToCart: (item: CartEntry) => void;
};

export function HomeScreen({
  session,
  onOpenPrescription,
  onOpenSearch,
  onAddToCart,
}: HomeScreenProps) {
  const firstName = session.user.name?.split(' ')[0] || 'Aarav';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.eyebrow}>GOOD MORNING</Text>
            <Text style={styles.greeting}>Hi, {firstName}</Text>
            <View style={styles.locationRow}>
              <LocateFixed color="#D7E7FF" size={19} strokeWidth={2.2} />
              <Text style={styles.location}>Koramangala, Bengaluru</Text>
              <ChevronDown color="#D7E7FF" size={18} strokeWidth={2.2} />
            </View>
          </View>
          <View style={styles.bellWrap}>
            <Bell color="#FFFFFF" size={30} strokeWidth={2.2} />
            <View style={styles.notificationDot} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenSearch}
          style={styles.searchBox}
        >
          <Search color={colors.muted} size={28} strokeWidth={2.2} />
          <Text style={styles.searchPlaceholder}>Search medicines & products...</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.actionGrid}>
          <Pressable
            onPress={onOpenPrescription}
            style={[styles.actionCard, styles.primaryActionCard]}
          >
            <View style={styles.actionIconPrimary}>
              <FileUp color="#FFFFFF" size={30} strokeWidth={2.2} />
            </View>
            <Text style={styles.primaryActionTitle}>Upload Prescription</Text>
            <Text style={styles.primaryActionBody}>Upload and get medicines delivered fast</Text>
            <Text style={styles.primaryActionLink}>{'Upload now ->'}</Text>
            <View style={[styles.bubble, styles.bubbleTop]} />
            <View style={[styles.bubble, styles.bubbleBottom]} />
          </Pressable>

          <Pressable
            onPress={onOpenSearch}
            style={[styles.actionCard, styles.secondaryActionCard]}
          >
            <View style={styles.actionIconSecondary}>
              <Pill color={colors.primary} size={31} strokeWidth={2.3} />
            </View>
            <Text style={styles.secondaryActionTitle}>Search Medicines</Text>
            <Text style={styles.secondaryActionBody}>Find OTC meds from nearby pharmacies</Text>
            <Text style={styles.secondaryActionLink}>{'Browse now ->'}</Text>
            <View style={[styles.secondaryBubble, styles.secondaryBubbleTop]} />
            <View style={[styles.secondaryBubble, styles.secondaryBubbleBottom]} />
          </Pressable>
        </View>

        <View style={styles.offerCard}>
          <Text style={styles.offerEyebrow}>LIMITED OFFER</Text>
          <Text style={styles.offerTitle}>20% off on all vitamins & supplements</Text>
          <Pressable style={styles.offerButton}>
            <Text style={styles.offerButtonText}>Shop Now</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Reorder</Text>
          <Pressable>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.reorderList}>
          {quickReorders.map((item, index) => (
            <View
              key={item.id}
              style={styles.reorderCard}
            >
              <View style={[styles.reorderIcon, index === 1 ? styles.reorderIconTeal : null]}>
                <Pill
                  color={index === 1 ? colors.teal : colors.primary}
                  size={38}
                  strokeWidth={2.4}
                />
              </View>
              <View style={styles.reorderCopy}>
                <Text style={styles.reorderName}>{item.name}</Text>
                <Text style={styles.reorderPack}>{item.pack} · Rs {item.price}</Text>
                <View style={styles.reorderMeta}>
                  <Clock color={colors.muted} size={17} strokeWidth={2.1} />
                  <Text style={styles.reorderTime}>
                    Last ordered {index === 0 ? '3 days ago' : '1 week ago'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => onAddToCart(item)}
                style={styles.reorderButton}
              >
                <RefreshCcw color={colors.primary} size={18} strokeWidth={2.2} />
                <Text style={styles.reorderButtonText}>Reorder</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screen,
    paddingTop: 42,
    paddingBottom: 32,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  eyebrow: {
    color: '#C9DEFF',
    fontSize: 16,
    letterSpacing: 0,
    fontWeight: '700',
  },
  greeting: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
  },
  locationRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  location: {
    color: '#D7E7FF',
    fontSize: 18,
    fontWeight: '700',
  },
  bellWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3D18',
  },
  searchBox: {
    minHeight: 68,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    marginTop: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  searchPlaceholder: {
    color: '#8B8D95',
    fontSize: 20,
    fontWeight: '500',
  },
  body: {
    paddingHorizontal: spacing.screen,
    paddingTop: 32,
    gap: 24,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 18,
  },
  actionCard: {
    flex: 1,
    minHeight: 218,
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 11,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryActionCard: {
    backgroundColor: colors.primary,
  },
  secondaryActionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconPrimary: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  actionIconSecondary: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  primaryActionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  primaryActionBody: {
    marginTop: 10,
    color: '#D9E8FF',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  primaryActionLink: {
    marginTop: 'auto',
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryActionTitle: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  secondaryActionBody: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  secondaryActionLink: {
    marginTop: 'auto',
    color: colors.primary,
    fontSize: 17,
    fontWeight: '900',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bubbleTop: {
    width: 95,
    height: 95,
    right: -24,
    top: -22,
  },
  bubbleBottom: {
    width: 128,
    height: 128,
    right: -40,
    bottom: -46,
  },
  secondaryBubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.primarySofter,
  },
  secondaryBubbleTop: {
    width: 88,
    height: 88,
    right: -26,
    top: -24,
  },
  secondaryBubbleBottom: {
    width: 132,
    height: 132,
    right: -46,
    bottom: -44,
  },
  offerCard: {
    borderRadius: 22,
    backgroundColor: colors.primaryDark,
    padding: 22,
    overflow: 'hidden',
  },
  offerEyebrow: {
    color: '#BFD8FF',
    fontSize: 16,
    fontWeight: '800',
  },
  offerTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
  },
  offerButton: {
    marginTop: 22,
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  seeAll: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  reorderList: {
    gap: 14,
  },
  reorderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  reorderIcon: {
    width: 66,
    height: 66,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderIconTeal: {
    backgroundColor: colors.tealSoft,
  },
  reorderCopy: {
    flex: 1,
    gap: 4,
  },
  reorderName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  reorderPack: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  reorderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reorderTime: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  reorderButton: {
    borderRadius: 15,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  reorderButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
});
