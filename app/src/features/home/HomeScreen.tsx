import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  Clock,
  FileUp,
  LocateFixed,
  Pill,
  RefreshCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/metrics';
import type { AuthSession, CartEntry, CustomerAddress } from '../../types/domain';
import { quickReorders } from '../../data/demo';
import { formatAddress, formatShortAddress } from '../../utils/addresses';

type HomeScreenProps = {
  session: AuthSession;
  deliveryAddress?: CustomerAddress;
  onChangeAddress: () => void;
  onOpenPrescription: () => void;
  onOpenSearch: () => void;
  onAddToCart: (item: CartEntry) => void;
};

export function HomeScreen({
  session,
  deliveryAddress,
  onChangeAddress,
  onOpenPrescription,
  onOpenSearch,
  onAddToCart,
}: HomeScreenProps) {
  const firstName = session.user.name?.split(' ')[0] || 'Customer';
  const greeting = getGreeting();
  const addressTitle = deliveryAddress ? formatShortAddress(deliveryAddress) : 'Choose delivery address';
  const addressText = deliveryAddress
    ? formatAddress(deliveryAddress)
    : 'Add an address for pharmacy matching';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{greeting.label.toUpperCase()}</Text>
            <Text style={styles.greeting}>Hi, {firstName}</Text>
            <Text style={styles.heroSubtext}>{greeting.message}</Text>
          </View>
          <View style={styles.bellWrap}>
            <Bell color="#FFFFFF" size={28} strokeWidth={2.2} />
            <View style={styles.notificationDot} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onChangeAddress}
          style={styles.locationCard}
        >
          <View style={styles.locationIcon}>
            <LocateFixed color="#FFFFFF" size={21} strokeWidth={2.4} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>Deliver to</Text>
            <Text numberOfLines={1} style={styles.locationTitle}>
              {addressTitle}
            </Text>
            <Text numberOfLines={1} style={styles.locationText}>
              {addressText}
            </Text>
          </View>
          <ChevronDown color="#D7E7FF" size={20} strokeWidth={2.3} />
        </Pressable>

        <Pressable accessibilityRole="search" onPress={onOpenSearch} style={styles.searchBox}>
          <Search color={colors.primary} size={25} strokeWidth={2.4} />
          <View style={styles.searchCopy}>
            <Text style={styles.searchPlaceholder}>Search medicines, brands, salts</Text>
            <Text style={styles.searchHint}>Find availability near your selected address</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.actionGrid}>
          <ActionCard
            title="Upload prescription"
            body="Share a prescription and let pharmacies quote the exact medicines."
            cta="Upload now"
            tone="primary"
            Icon={FileUp}
            onPress={onOpenPrescription}
          />
          <ActionCard
            title="Search medicines"
            body="Search OTC and prescribed items by brand, salt, or strength."
            cta="Browse catalog"
            tone="light"
            Icon={Pill}
            onPress={onOpenSearch}
          />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Quick reorder</Text>
            <Text style={styles.sectionSubtitle}>Repeat common medicines in one tap</Text>
          </View>
        </View>

        <View style={styles.reorderList}>
          {quickReorders.map((item, index) => (
            <View key={item.id} style={styles.reorderCard}>
              <View style={[styles.reorderIcon, index === 1 ? styles.reorderIconTeal : null]}>
                <Pill
                  color={index === 1 ? colors.teal : colors.primary}
                  size={30}
                  strokeWidth={2.4}
                />
              </View>
              <View style={styles.reorderCopy}>
                <Text numberOfLines={1} style={styles.reorderName}>
                  {item.name}
                </Text>
                <Text style={styles.reorderPack}>{item.pack}</Text>
                <View style={styles.reorderMeta}>
                  <Clock color={colors.muted} size={15} strokeWidth={2.2} />
                  <Text style={styles.reorderTime}>
                    Last ordered {index === 0 ? '3 days ago' : '1 week ago'}
                  </Text>
                </View>
              </View>
              <View style={styles.reorderRight}>
                <Text style={styles.reorderPrice}>Rs {item.price}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onAddToCart(item)}
                  style={styles.reorderButton}
                >
                  <RefreshCcw color={colors.primary} size={16} strokeWidth={2.4} />
                  <Text style={styles.reorderButtonText}>Reorder</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ActionCard({
  title,
  body,
  cta,
  tone,
  Icon,
  onPress,
}: {
  title: string;
  body: string;
  cta: string;
  tone: 'primary' | 'light';
  Icon: typeof FileUp;
  onPress: () => void;
}) {
  const isPrimary = tone === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.actionCard, isPrimary ? styles.primaryActionCard : styles.lightActionCard]}
    >
      <View style={[styles.actionIcon, isPrimary ? styles.actionIconPrimary : styles.actionIconLight]}>
        <Icon color={isPrimary ? '#FFFFFF' : colors.primary} size={27} strokeWidth={2.4} />
      </View>
      <Text style={[styles.actionTitle, isPrimary ? styles.actionTitlePrimary : null]}>{title}</Text>
      <Text style={[styles.actionBody, isPrimary ? styles.actionBodyPrimary : null]}>{body}</Text>
      <View style={styles.actionCtaRow}>
        <Text style={[styles.actionCta, isPrimary ? styles.actionCtaPrimary : null]}>{cta}</Text>
        <ArrowRight
          color={isPrimary ? '#FFFFFF' : colors.primary}
          size={17}
          strokeWidth={2.5}
        />
      </View>
    </Pressable>
  );
}

function getGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return {
      label: 'Good morning',
      message: 'Start your day with on-time refills.',
    };
  }

  if (hour < 17) {
    return {
      label: 'Good afternoon',
      message: 'Find medicines from pharmacies near you.',
    };
  }

  if (hour < 21) {
    return {
      label: 'Good evening',
      message: 'Order essentials before the day wraps up.',
    };
  }

  return {
    label: 'Good night',
    message: 'Late orders can still be matched where available.',
  };
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
    paddingTop: 38,
    paddingBottom: 26,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: '#C9DEFF',
    fontSize: 13,
    letterSpacing: 0,
    fontWeight: '900',
  },
  greeting: {
    marginTop: 7,
    color: '#FFFFFF',
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '900',
  },
  heroSubtext: {
    marginTop: 6,
    color: '#D9E8FF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  bellWrap: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.17)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    right: 10,
    top: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3D18',
  },
  locationCard: {
    marginTop: 22,
    minHeight: 78,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    color: '#BFD8FF',
    fontSize: 12,
    fontWeight: '900',
  },
  locationTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  locationText: {
    color: '#D7E7FF',
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    minHeight: 68,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  searchCopy: {
    flex: 1,
    gap: 2,
  },
  searchPlaceholder: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  searchHint: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: spacing.screen,
    paddingTop: 24,
    gap: 22,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  actionCard: {
    flex: 1,
    minHeight: 206,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryActionCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  lightActionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.border,
  },
  actionIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  actionIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.17)',
  },
  actionIconLight: {
    backgroundColor: colors.primarySoft,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  actionTitlePrimary: {
    color: '#FFFFFF',
  },
  actionBody: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  actionBodyPrimary: {
    color: '#D9E8FF',
  },
  actionCtaRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCta: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  actionCtaPrimary: {
    color: '#FFFFFF',
  },
  promiseRow: {
    flexDirection: 'row',
    gap: 12,
  },
  promiseItem: {
    flex: 1,
    minHeight: 70,
    borderRadius: 18,
    backgroundColor: colors.primarySofter,
    borderWidth: 1,
    borderColor: '#D7E6FF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promiseIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseIconTeal: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  reorderList: {
    gap: 12,
  },
  reorderCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  reorderIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
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
    fontSize: 17,
    fontWeight: '900',
  },
  reorderPack: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  reorderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reorderTime: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  reorderRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  reorderPrice: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  reorderButton: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reorderButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
});
