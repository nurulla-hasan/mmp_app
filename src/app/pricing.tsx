import React, { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Check, CheckCircle2, Clock, Crown, Lock, Sparkles, Star, Zap } from 'lucide-react-native';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ManualCheckoutModal } from '../components/subscription/manual-checkout-modal';
import { LoadingSkeleton, useSkeletonPulse } from '../components/ui/loading-skeleton';
import { Colors } from '../constants/colors';
import { Fonts } from '../constants/typography';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';
import { useMySubscription, usePaymentNumbers, usePlans } from '../hooks/queries/use-subscriptions';
import { toBengaliDigits } from '../lib/utils';
import type { TPlan } from '../types/plan';

const FREE_FEATURES = [
  'জমির একক রূপান্তর ও বেসিক ক্যালকুলেটর',
  'সার্ভেয়ার লিস্টিং ও পাবলিক প্রোফাইল',
  'WhatsApp ও কল যোগাযোগ',
  'বেসিক অ্যাকাউন্ট অ্যাক্সেস',
];

const PRO_FEATURES = [
  'সব ফ্রি সুবিধা + advanced tools',
  'ম্যাপ আপলোড করে প্লট আঁকা ও ক্ষেত্রফল',
  'প্যান্টাগ্রাফ ও ডিজিটাল ট্রেসিং',
  'প্রজেক্ট সেভ ও professional export workflow',
];

type PricingColors = (typeof Colors)['light'];

function formatDate(value?: string | null) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function periodText(plan: TPlan) {
  if (plan.billingCycle === 'MONTHLY') return '/মাস';
  if (plan.billingCycle === 'SIX_MONTHS') return '/৬ মাস';
  if (plan.billingCycle === 'YEARLY') return '/বছর';
  if (plan.billingCycle === 'LIFETIME') return 'আজীবন';
  return `/${toBengaliDigits(plan.durationDays)} দিন`;
}

function PricingPlansSkeleton({ colors }: { colors: PricingColors }) {
  const opacity = useSkeletonPulse(true);

  return (
    <View style={styles.planList}>
      {[0, 1].map((item) => (
        <View
          key={`plan-skeleton-${item}`}
          style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={styles.planTopRow}>
            <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonPlanIcon} />
            <View style={styles.skeletonPlanHeading}>
              <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonPlanName} />
              <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={styles.skeletonPlanDescShort} />
            </View>
          </View>
          <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={styles.skeletonDescription} />
          <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonPrice} />
          <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={styles.skeletonDuration} />
          <View style={styles.features}>
            {[0, 1, 2, 3].map((feature) => (
              <View key={`feature-skeleton-${item}-${feature}`} style={styles.featureRow}>
                <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonCheck} />
                <LoadingSkeleton opacity={opacity} color={colors.skeletonSoft} style={[styles.skeletonFeature, feature % 2 ? styles.skeletonFeatureShort : null]} />
              </View>
            ))}
          </View>
          <LoadingSkeleton opacity={opacity} color={colors.skeleton} style={styles.skeletonCta} />
        </View>
      ))}
    </View>
  );
}

export default function PricingScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const plansQuery = usePlans();
  const paymentQuery = usePaymentNumbers();
  const subscriptionQuery = useMySubscription();
  const [selectedPlan, setSelectedPlan] = useState<TPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const plans = plansQuery.data ?? [];
  const activeSub = subscriptionQuery.data?.activeSubscription ?? null;
  const pendingSub = subscriptionQuery.data?.pendingSubscription ?? null;

  const activePlan = useMemo(
    () => (activeSub ? plans.find((plan) => plan.id === activeSub.planId) || activeSub.plan : null),
    [activeSub, plans]
  );

  const refreshing =
    plansQuery.isRefetching ||
    paymentQuery.isRefetching ||
    subscriptionQuery.isRefetching;

  const refresh = () => {
    void plansQuery.refetch();
    void paymentQuery.refetch();
    if (isAuthenticated) void subscriptionQuery.refetch();
  };

  const openPlan = (plan: TPlan) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}14` }]}><Sparkles size={22} color={colors.primary} /></View>
        <Text style={[styles.heading, { color: colors.text }]}>প্রাইসিং ও সাবস্ক্রিপশন</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>আপনার কাজের জন্য সঠিক Pro plan বেছে নিন। পেমেন্ট যাচাই শেষে access স্বয়ংক্রিয়ভাবে সক্রিয় হবে।</Text>
      </View>

      {activeSub ? (
        <View style={[styles.statusBanner, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}35` }]}>
          <View style={[styles.statusIcon, { backgroundColor: colors.primary }]}><CheckCircle2 size={20} color='#fff' /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.statusTitleRow}><Text style={[styles.statusTitle, { color: colors.text }]}>বর্তমান প্ল্যান: {activeSub.plan?.name || 'Pro Plan'}</Text><Badge label='Active' variant='success' /></View>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>শুরু {formatDate(activeSub.startDate)} • শেষ {formatDate(activeSub.endDate)}</Text>
          </View>
        </View>
      ) : null}

      {pendingSub ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => openPlan(pendingSub.plan)}
          style={[styles.statusBanner, { backgroundColor: 'rgba(217,119,6,.08)', borderColor: 'rgba(217,119,6,.28)' }]}
        >
          <View style={[styles.statusIcon, { backgroundColor: '#d97706' }]}><Clock size={20} color='#fff' /></View>
          <View style={{ flex: 1 }}>
            <View style={styles.statusTitleRow}><Text style={[styles.statusTitle, { color: colors.text }]}>পেমেন্ট যাচাইাধীন: {pendingSub.plan?.name || 'Pro Plan'}</Text><Badge label='Pending' variant='warning' /></View>
            <Text style={[styles.statusText, { color: colors.textMuted }]}>মেথড {pendingSub.paymentMethod} • TrxID {pendingSub.transactionId}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {plansQuery.isLoading ? (
        <PricingPlansSkeleton colors={colors} />
      ) : plansQuery.isError ? (
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.errorTitle, { color: colors.text }]}>প্ল্যান লোড করা যায়নি</Text><Text style={[styles.stateText, { color: colors.textMuted }]}>ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।</Text><Button title='আবার চেষ্টা করুন' size='sm' onPress={() => plansQuery.refetch()} /></View>
      ) : plans.length === 0 ? (
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.errorTitle, { color: colors.text }]}>এখন কোনো Pro plan পাওয়া যাচ্ছে না</Text><Text style={[styles.stateText, { color: colors.textMuted }]}>Active plan প্রকাশ হলে এখানে দেখা যাবে।</Text></View>
      ) : (
        <View style={styles.planList}>
          {plans.map((plan, index) => {
            const isActivePlan = activeSub?.planId === plan.id;
            const isPendingPlan = pendingSub?.planId === plan.id;
            const isDowngrade = Boolean(activeSub && !isActivePlan && activePlan && plan.durationDays < activePlan.durationDays);
            const isUpgrade = Boolean(activeSub && !isActivePlan && activePlan && plan.durationDays > activePlan.durationDays);
            const isRecommended = plan.isPopular && !isActivePlan && !isDowngrade;
            const Icon = index === 0 ? Zap : index === 1 ? Sparkles : Crown;

            const cta = isPendingPlan
              ? 'পেমেন্ট যাচাই চলছে'
              : isActivePlan
                ? 'মেয়াদ বাড়ান (Renew)'
                : isUpgrade
                  ? 'আপগ্রেড করুন (Upgrade)'
                  : isRecommended
                    ? 'এখনই সাবস্ক্রাইব করুন'
                    : 'প্ল্যান নির্বাচন করুন';

            return (
              <View
                key={plan.id}
                style={[
                  styles.planCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isActivePlan ? '#16a34a' : isRecommended ? colors.primary : colors.cardBorder,
                    opacity: isDowngrade ? 0.62 : 1,
                  },
                ]}
              >
                <View style={styles.planTopRow}>
                  <View style={[styles.planIcon, { backgroundColor: isActivePlan ? 'rgba(22,163,74,.12)' : `${colors.primary}10` }]}><Icon size={21} color={isActivePlan ? '#16a34a' : colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.planNameRow}><Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>{isActivePlan ? <Badge label='বর্তমান' variant='success' /> : isPendingPlan ? <Badge label='Pending' variant='warning' /> : isRecommended ? <Badge label={plan.discountBadge || 'সেরা পছন্দ'} variant='pro' /> : null}</View>
                    {plan.discountBadge && !isRecommended && !isActivePlan ? <Text style={[styles.discountText, { color: colors.primary }]}>{plan.discountBadge}</Text> : null}
                  </View>
                </View>

                {plan.description ? <Text style={[styles.planDescription, { color: colors.textMuted }]}>{plan.description}</Text> : null}

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: colors.text }]}>৳{toBengaliDigits(plan.price)}</Text>
                  {plan.originalPrice && plan.originalPrice > plan.price ? <Text style={[styles.originalPrice, { color: colors.textMuted }]}>৳{toBengaliDigits(plan.originalPrice)}</Text> : null}
                  <Text style={[styles.period, { color: colors.textMuted }]}>{periodText(plan)}</Text>
                </View>
                <Text style={[styles.duration, { color: colors.textMuted }]}>{toBengaliDigits(plan.durationDays)} দিন মেয়াদের প্যাকেজ</Text>

                {isActivePlan && activeSub?.endDate ? <Text style={[styles.expiry, { color: '#15803d' }]}>📅 মেয়াদ শেষ: {formatDate(activeSub.endDate)}</Text> : null}

                <View style={styles.features}>
                  {(plan.features || []).map((feature) => (
                    <View key={feature} style={styles.featureRow}><View style={[styles.checkCircle, { backgroundColor: `${colors.primary}12` }]}><Check size={11} color={colors.primary} /></View><Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text></View>
                  ))}
                </View>

                {isDowngrade ? (
                  <View style={styles.downgradeBox}><Button title='ডাউনগ্রেড অনুপলব্ধ' variant='outline' disabled onPress={() => {}} /><Text style={[styles.downgradeText, { color: colors.textMuted }]}>বর্তমান প্ল্যানের মেয়াদ শেষ হলে নিতে পারবেন</Text></View>
                ) : (
                  <Button
                    title={cta}
                    variant={isActivePlan || isPendingPlan ? 'outline' : 'primary'}
                    onPress={() => openPlan(plan)}
                    disabled={paymentQuery.isLoading && !isPendingPlan}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.accessSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Free বনাম Pro Access</Text>
        <View style={[styles.accessCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.accessHeader}><Lock size={18} color={colors.textMuted} /><Text style={[styles.accessTitle, { color: colors.text }]}>Free Access</Text><Badge label='৳০' variant='free' /></View>
          {FREE_FEATURES.map((item) => <View key={item} style={styles.accessFeature}><Check size={12} color={colors.textMuted} /><Text style={[styles.accessFeatureText, { color: colors.textMuted }]}>{item}</Text></View>)}
        </View>
        <View style={[styles.accessCard, { backgroundColor: colors.card, borderColor: `${colors.primary}55` }]}>
          <View style={styles.accessHeader}><Star size={18} color={colors.primary} /><Text style={[styles.accessTitle, { color: colors.text }]}>Pro Access</Text><Badge label='PRO' variant='pro' /></View>
          {PRO_FEATURES.map((item) => <View key={item} style={styles.accessFeature}><Check size={12} color={colors.primary} /><Text style={[styles.accessFeatureText, { color: colors.text }]}>{item}</Text></View>)}
        </View>
      </View>

      <ManualCheckoutModal
        visible={checkoutOpen}
        plan={selectedPlan}
        paymentNumbers={paymentQuery.data}
        pendingSubscription={pendingSub}
        onClose={() => setCheckoutOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 40, gap: 13 },
  hero: { alignItems: 'center', paddingVertical: 10, gap: 5 },
  heroIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  heading: { fontSize: 20, fontFamily: Fonts.headingBold, textAlign: 'center' },
  subheading: { maxWidth: 520, fontSize: 11, lineHeight: 17, fontFamily: Fonts.sansRegular, textAlign: 'center' },
  statusBanner: { borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statusTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  statusTitle: { fontSize: 11.5, fontFamily: Fonts.headingBold },
  statusText: { marginTop: 2, fontSize: 9.5, fontFamily: Fonts.sansRegular },
  stateText: { fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular, textAlign: 'center' },
  errorCard: { borderWidth: 1, borderRadius: 14, padding: 24, alignItems: 'center', gap: 8 },
  errorTitle: { fontSize: 14, fontFamily: Fonts.headingBold, textAlign: 'center' },
  planList: { gap: 12 },
  planCard: { borderWidth: 1.2, borderRadius: 16, padding: 15, gap: 10 },
  planTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  planNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  planName: { fontSize: 16, fontFamily: Fonts.headingBold },
  discountText: { marginTop: 1, fontSize: 9.5, fontFamily: Fonts.sansMedium },
  planDescription: { fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 5 },
  price: { fontSize: 27, fontFamily: Fonts.headingBold },
  originalPrice: { fontSize: 13, fontFamily: Fonts.sansRegular, textDecorationLine: 'line-through' },
  period: { fontSize: 10.5, fontFamily: Fonts.sansRegular },
  duration: { marginTop: -6, fontSize: 9.5, fontFamily: Fonts.sansRegular },
  expiry: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(22,163,74,.08)', fontSize: 10, fontFamily: Fonts.sansMedium },
  features: { gap: 7, marginVertical: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  checkCircle: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  featureText: { flex: 1, fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular },
  downgradeBox: { gap: 4 },
  downgradeText: { textAlign: 'center', fontSize: 9, fontFamily: Fonts.sansRegular },
  accessSection: { gap: 9, marginTop: 3 },
  sectionTitle: { fontSize: 14.5, fontFamily: Fonts.headingBold },
  accessCard: { borderWidth: 1, borderRadius: 13, padding: 12, gap: 7 },
  accessHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  accessTitle: { flex: 1, fontSize: 13, fontFamily: Fonts.headingBold },
  accessFeature: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  accessFeatureText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: Fonts.sansRegular },
  skeletonPlanIcon: { width: 42, height: 42, borderRadius: 11 },
  skeletonPlanHeading: { flex: 1, gap: 7 },
  skeletonPlanName: { width: '48%', height: 15 },
  skeletonPlanDescShort: { width: '34%', height: 9 },
  skeletonDescription: { width: '78%', height: 10 },
  skeletonPrice: { width: 112, height: 30 },
  skeletonDuration: { width: 126, height: 9 },
  skeletonCheck: { width: 18, height: 18, borderRadius: 9 },
  skeletonFeature: { width: '72%', height: 10, marginTop: 4 },
  skeletonFeatureShort: { width: '58%' },
  skeletonCta: { width: '100%', height: 42, borderRadius: 9, marginTop: 2 },
});
