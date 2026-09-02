import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Check, Clock, Copy, Receipt, X } from 'lucide-react-native';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { useSubmitManualCheckout } from '../../hooks/mutations/use-subscription-mutations';
import { ErrorToast, SuccessToast, toBengaliDigits } from '../../lib/utils';
import type { TPlan } from '../../types/plan';
import type {
  PaymentMethod,
  PaymentNumbersResponse,
  TSubscription,
} from '../../types/subscription';

type Props = {
  visible: boolean;
  plan: TPlan | null;
  paymentNumbers?: PaymentNumbersResponse;
  pendingSubscription?: TSubscription | null;
  onClose: () => void;
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'ROCKET', label: 'Rocket' },
];

function paymentNumberFor(
  method: PaymentMethod,
  paymentNumbers?: PaymentNumbersResponse
) {
  if (!paymentNumbers) return '';
  if (method === 'BKASH') return paymentNumbers.bkashNumber || '';
  if (method === 'NAGAD') return paymentNumbers.nagadNumber || '';
  if (method === 'ROCKET') return paymentNumbers.rocketNumber || '';
  return '';
}

export function ManualCheckoutModal({
  visible,
  plan,
  paymentNumbers,
  pendingSubscription,
  onClose,
}: Props) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const mutation = useSubmitManualCheckout();

  const [method, setMethod] = useState<PaymentMethod>('BKASH');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittedTrxId, setSubmittedTrxId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const availableMethods = useMemo(
    () =>
      PAYMENT_METHODS.filter((item) =>
        Boolean(paymentNumberFor(item.value, paymentNumbers).trim())
      ),
    [paymentNumbers]
  );

  useEffect(() => {
    if (!visible) return;
    const firstAvailable = availableMethods[0]?.value;
    if (firstAvailable && !availableMethods.some((item) => item.value === method)) {
      setMethod(firstAvailable);
    }
  }, [visible, availableMethods, method]);

  useEffect(() => {
    if (!visible) {
      setSenderPhone('');
      setTransactionId('');
      setCopied(false);
      setSubmitted(false);
      setSubmittedTrxId('');
      mutation.reset();
    }
  }, [visible]);

  if (!plan) return null;

  const targetNumber = paymentNumberFor(method, paymentNumbers);
  const isPending = pendingSubscription?.planId === plan.id;
  const showStatus = submitted || isPending;
  const currentTrxId = submittedTrxId || pendingSubscription?.transactionId || '';

  const copyNumber = async () => {
    if (!targetNumber) return;
    const rawNumber = targetNumber.split(' ')[0].replace(/[^0-9+]/g, '');
    await Clipboard.setStringAsync(rawNumber || targetNumber);
    setCopied(true);
    SuccessToast('পেমেন্ট নম্বর কপি হয়েছে।');
    setTimeout(() => setCopied(false), 1800);
  };

  const submit = async () => {
    const cleanPhone = senderPhone.trim();
    const cleanTrxId = transactionId.trim().toUpperCase();

    if (!targetNumber) {
      ErrorToast('এই পেমেন্ট মেথডটি বর্তমানে উপলব্ধ নয়।');
      return;
    }
    if (cleanPhone.length < 6 || cleanPhone.length > 20) {
      ErrorToast('সঠিক sender phone number দিন।');
      return;
    }
    if (cleanTrxId.length < 4 || cleanTrxId.length > 50) {
      ErrorToast('সঠিক Transaction ID (TrxID) দিন।');
      return;
    }

    const result = await mutation.mutateAsync({
      planId: plan.id,
      paymentMethod: method,
      senderPhone: cleanPhone,
      transactionId: cleanTrxId,
    });

    if (result.success) {
      setSubmittedTrxId(cleanTrxId);
      setSubmitted(true);
    }
  };

  return (
    <Modal visible={visible} transparent animationType='slide' onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {showStatus ? 'পেমেন্ট ভেরিফিকেশন' : 'ম্যানুয়াল পেমেন্ট'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {showStatus
                  ? 'অ্যাডমিন যাচাই শেষে আপনার Pro access সক্রিয় হবে।'
                  : 'bKash, Nagad বা Rocket-এ Send Money করে তথ্য জমা দিন।'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { borderColor: colors.border }]}>
              <X size={17} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled'>
            {showStatus ? (
              <View style={styles.statusContent}>
                <View style={styles.pendingIcon}><Clock size={30} color='#d97706' /></View>
                <Text style={[styles.statusTitle, { color: colors.text }]}>পেমেন্ট যাচাইাধীন</Text>
                <Text style={[styles.statusText, { color: colors.textMuted }]}>
                  {plan.name} (৳{toBengaliDigits(plan.price)}) প্ল্যানের পেমেন্ট রিকোয়েস্ট জমা আছে।
                  অনুমোদনের পর স্বয়ংক্রিয়ভাবে Pro access দেখা যাবে।
                </Text>
                <View style={[styles.summaryCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <SummaryRow label='প্ল্যান' value={plan.name} colors={colors} />
                  <SummaryRow label='পরিমাণ' value={`৳${toBengaliDigits(plan.price)}`} colors={colors} />
                  {currentTrxId ? <SummaryRow label='TrxID' value={currentTrxId} colors={colors} accent /> : null}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <SummaryRow label='স্ট্যাটাস' value='⏳ Pending Review' colors={colors} warning />
                </View>
                <Button title='বন্ধ করুন' variant='outline' onPress={onClose} style={{ width: '100%' }} />
              </View>
            ) : (
              <View style={styles.formContent}>
                <View style={[styles.planSummary, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}35` }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                    <Text style={[styles.planDuration, { color: colors.textMuted }]}>
                      {toBengaliDigits(plan.durationDays)} দিনের প্যাকেজ
                    </Text>
                  </View>
                  <Text style={[styles.planPrice, { color: colors.primary }]}>৳{toBengaliDigits(plan.price)}</Text>
                </View>

                <Text style={[styles.sectionLabel, { color: colors.text }]}>১. পেমেন্ট মেথড নির্বাচন করুন</Text>
                {availableMethods.length > 0 ? (
                  <View style={styles.methodRow}>
                    {availableMethods.map((item) => {
                      const selected = item.value === method;
                      return (
                        <TouchableOpacity
                          key={item.value}
                          activeOpacity={0.8}
                          onPress={() => setMethod(item.value)}
                          style={[
                            styles.methodButton,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? `${colors.primary}12` : colors.background,
                            },
                          ]}
                        >
                          <Text style={[styles.methodText, { color: selected ? colors.primary : colors.textMuted }]}>
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.unavailableText, { color: colors.textMuted }]}>
                    কোনো পেমেন্ট নম্বর কনফিগার করা নেই। পরে আবার চেষ্টা করুন।
                  </Text>
                )}

                {targetNumber ? (
                  <View style={[styles.paymentBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.paymentHint, { color: colors.textMuted }]}>Send Money করুন:</Text>
                    <View style={styles.paymentNumberRow}>
                      <Text selectable style={[styles.paymentNumber, { color: colors.text }]}>{targetNumber}</Text>
                      <TouchableOpacity onPress={copyNumber} style={[styles.copyButton, { borderColor: colors.border }]}>
                        {copied ? <Check size={14} color={colors.primary} /> : <Copy size={14} color={colors.primary} />}
                        <Text style={[styles.copyText, { color: colors.primary }]}>{copied ? 'কপি হয়েছে' : 'কপি'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.amountHint, { color: colors.textMuted }]}>
                      উপরের নম্বরে ঠিক ৳{toBengaliDigits(plan.price)} Send Money করুন, তারপর নিচে sender number ও TrxID দিন।
                    </Text>
                    {paymentNumbers?.instructions ? (
                      <Text style={[styles.instructions, { color: colors.textMuted }]}>{paymentNumbers.instructions}</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>২. Sender Number</Text>
                  <TextInput
                    value={senderPhone}
                    onChangeText={setSenderPhone}
                    keyboardType='phone-pad'
                    placeholder='01712345678'
                    placeholderTextColor={colors.textMuted}
                    maxLength={20}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>৩. Transaction ID (TrxID)</Text>
                  <TextInput
                    value={transactionId}
                    onChangeText={setTransactionId}
                    autoCapitalize='characters'
                    placeholder='যেমন: BL92XK8291'
                    placeholderTextColor={colors.textMuted}
                    maxLength={50}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                </View>

                <Button
                  title='ভেরিফিকেশনের জন্য জমা দিন'
                  onPress={submit}
                  loading={mutation.isPending}
                  disabled={!targetNumber}
                  icon={<Receipt size={14} color='#fff' />}
                  style={{ marginTop: 4 }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  accent,
  warning,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)['light'];
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          { color: warning ? '#d97706' : accent ? colors.primary : colors.text },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,.58)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, padding: 16, paddingBottom: 24 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#94a3b8', opacity: 0.45, alignSelf: 'center', marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  title: { fontSize: 17, fontFamily: Fonts.headingBold },
  subtitle: { marginTop: 2, fontSize: 10.5, lineHeight: 15, fontFamily: Fonts.sansRegular },
  closeButton: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  formContent: { gap: 12, paddingBottom: 8 },
  planSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  planName: { fontSize: 13, fontFamily: Fonts.headingBold },
  planDuration: { marginTop: 1, fontSize: 9.5, fontFamily: Fonts.sansRegular },
  planPrice: { fontSize: 20, fontFamily: Fonts.headingBold },
  sectionLabel: { fontSize: 11.5, fontFamily: Fonts.sansSemiBold },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodButton: { flex: 1, height: 40, borderWidth: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  methodText: { fontSize: 11, fontFamily: Fonts.sansSemiBold },
  unavailableText: { fontSize: 10.5, lineHeight: 16, fontFamily: Fonts.sansRegular },
  paymentBox: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 7 },
  paymentHint: { fontSize: 9.5, fontFamily: Fonts.sansRegular },
  paymentNumberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentNumber: { flex: 1, fontSize: 13, fontFamily: Fonts.sansSemiBold },
  copyButton: { height: 30, paddingHorizontal: 9, borderWidth: 1, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontSize: 9.5, fontFamily: Fonts.sansMedium },
  amountHint: { fontSize: 9.5, lineHeight: 15, fontFamily: Fonts.sansRegular },
  instructions: { fontSize: 9, lineHeight: 14, fontFamily: Fonts.sansRegular, fontStyle: 'italic' },
  fieldGroup: { gap: 5 },
  fieldLabel: { fontSize: 10.5, fontFamily: Fonts.sansMedium },
  input: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, fontFamily: Fonts.sansRegular },
  statusContent: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  pendingIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(217,119,6,.12)', alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontSize: 15, fontFamily: Fonts.headingBold },
  statusText: { fontSize: 10.5, lineHeight: 17, textAlign: 'center', fontFamily: Fonts.sansRegular },
  summaryCard: { width: '100%', borderWidth: 1, borderRadius: 12, padding: 11, gap: 7 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  summaryLabel: { fontSize: 10, fontFamily: Fonts.sansRegular },
  summaryValue: { flexShrink: 1, textAlign: 'right', fontSize: 10.5, fontFamily: Fonts.sansSemiBold },
  divider: { height: StyleSheet.hairlineWidth },
});
