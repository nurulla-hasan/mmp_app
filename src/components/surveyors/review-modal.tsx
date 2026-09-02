import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CheckCircle2,
  Circle,
  LogIn,
  MessageCircle,
  ShieldAlert,
  Star,
  UserCheck,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Button } from '../ui/button';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/typography';
import { useThemeStore } from '../../stores/theme-store';
import { useAuthStore } from '../../stores/auth-store';
import { useCreateSurveyorReview } from '../../hooks/mutations/use-surveyor-mutations';
import { ErrorToast } from '../../lib/utils';
import type { TSurveyorServiceWithPrice } from '../../types/surveyor';

type Props = {
  surveyorProfileId: string;
  surveyorSlug: string;
  services: TSurveyorServiceWithPrice[];
};

const OTHER_SERVICE = 'অন্যান্য সেবা';

export function ReviewModal({ surveyorProfileId, surveyorSlug, services }: Props) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { isAuthenticated, user } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [serviceName, setServiceName] = useState('');
  const [comment, setComment] = useState('');
  const mutation = useCreateSurveyorReview(surveyorSlug);

  const serviceOptions = useMemo(() => {
    const names = services
      .map((item) => item.service?.name?.trim())
      .filter((name): name is string => Boolean(name));
    return [...Array.from(new Set(names)), OTHER_SERVICE];
  }, [services]);

  const trimmedComment = comment.trim();
  const formValid = rating >= 1 && Boolean(serviceName) && trimmedComment.length >= 5;

  useEffect(() => {
    if (!visible) {
      setRating(0);
      setServiceName('');
      setComment('');
    }
  }, [visible]);

  const close = () => setVisible(false);

  const goToLogin = () => {
    close();
    router.push({
      pathname: '/(auth)/login',
      params: { callbackUrl: `/surveyors/${surveyorSlug}` },
    });
  };

  const submit = () => {
    if (!serviceName) {
      ErrorToast('সার্ভিস নির্বাচন করুন।');
      return;
    }
    if (rating < 1) {
      ErrorToast('রেটিং নির্বাচন করুন।');
      return;
    }
    if (trimmedComment.length < 5) {
      ErrorToast('আপনার মন্তব্য অন্তত ৫ অক্ষরে লিখুন।');
      return;
    }

    mutation.mutate(
      {
        surveyorProfileId,
        serviceName,
        rating,
        comment: trimmedComment,
      },
      {
        onSuccess: (result) => {
          if (result.success) close();
        },
      },
    );
  };

  return (
    <>
      <Button
        title='রিভিউ লিখুন'
        size='sm'
        onPress={() => setVisible(true)}
        icon={<MessageCircle size={13} color='#fff' />}
      />

      <Modal visible={visible} transparent animationType='fade' onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {isAuthenticated ? 'রিভিউ লিখুন' : 'রিভিউ দিতে লগইন করুন'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {isAuthenticated
                    ? 'আপনার কাজের অভিজ্ঞতা শেয়ার করুন। রিভিউটি অ্যাডমিন যাচাইয়ের পর প্রকাশ হবে।'
                    : 'স্প্যামমুক্ত ও নির্ভরযোগ্য রিভিউ রাখতে শুধুমাত্র রেজিস্টার্ড ব্যবহারকারীরা রিভিউ দিতে পারবেন।'}
                </Text>
              </View>
              <TouchableOpacity onPress={close} style={styles.close}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {!isAuthenticated ? (
              <View style={styles.authBody}>
                <View
                  style={[
                    styles.authNotice,
                    {
                      backgroundColor: theme === 'dark' ? 'rgba(245,158,11,.10)' : '#fffbeb',
                      borderColor: theme === 'dark' ? 'rgba(245,158,11,.24)' : '#fde68a',
                    },
                  ]}
                >
                  <ShieldAlert size={20} color='#d97706' />
                  <Text style={[styles.authNoticeText, { color: theme === 'dark' ? '#fbbf24' : '#92400e' }]}>
                    আপনি বর্তমানে লগআউট অবস্থায় আছেন। রিভিউ লিখতে এবং আপনার অভিজ্ঞতা শেয়ার করতে প্রথমে লগইন করুন।
                  </Text>
                </View>
                <View style={[styles.authActions, { borderTopColor: colors.border }]}>
                  <Button title='বাতিল' variant='outline' onPress={close} />
                  <Button
                    title='লগইন করতে এগিয়ে যান'
                    onPress={goToLogin}
                    icon={<LogIn size={14} color='#fff' />}
                  />
                </View>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps='handled'
              >
                <View
                  style={[
                    styles.userPreview,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  {user?.imageUrl ? (
                    <Image source={{ uri: user.imageUrl }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarFallback, { backgroundColor: `${colors.primary}18` }]}>
                      <Text style={[styles.userInitial, { color: colors.primary }]}>
                        {(user?.name || 'U').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                        {user?.name || 'User'}
                      </Text>
                      <UserCheck size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.userHint, { color: colors.textMuted }]}>
                      পাবলিক প্রোফাইলে এই নামে রিভিউ দেখানো হবে
                    </Text>
                  </View>
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: colors.text }]}>যে সার্ভিসের জন্য রিভিউ দিচ্ছেন</Text>
                  <View style={styles.serviceList}>
                    {serviceOptions.map((name) => {
                      const active = serviceName === name;
                      return (
                        <TouchableOpacity
                          key={name}
                          activeOpacity={0.75}
                          onPress={() => setServiceName(name)}
                          style={[
                            styles.serviceOption,
                            {
                              borderColor: active ? colors.primary : colors.border,
                              backgroundColor: active ? `${colors.primary}12` : colors.background,
                            },
                          ]}
                        >
                          {active ? (
                            <CheckCircle2 size={17} color={colors.primary} />
                          ) : (
                            <Circle size={17} color={colors.textMuted} />
                          )}
                          <Text style={[styles.serviceText, { color: active ? colors.primary : colors.text }]}>
                            {name === OTHER_SERVICE ? 'অন্যান্য সেবা / General Survey' : name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!serviceName ? (
                    <Text style={styles.errorText}>সার্ভিস নির্বাচন করুন</Text>
                  ) : null}
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: colors.text }]}>রেটিং</Text>
                  <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setRating(value)}
                        style={styles.starButton}
                        accessibilityRole='button'
                        accessibilityLabel={`${value} star rating`}
                      >
                        <Star
                          size={27}
                          color='#f59e0b'
                          fill={value <= rating ? '#f59e0b' : 'transparent'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {rating < 1 ? <Text style={styles.errorText}>রেটিং নির্বাচন করুন</Text> : null}
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={[styles.label, { color: colors.text }]}>আপনার মন্তব্য</Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    maxLength={800}
                    textAlignVertical='top'
                    placeholder='সার্ভেয়ারের কাজ ও সেবা নিয়ে আপনার বাস্তব অভিজ্ঞতা লিখুন...'
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.commentInput,
                      {
                        color: colors.text,
                        backgroundColor: colors.background,
                        borderColor:
                          comment.length > 0 && trimmedComment.length < 5 ? '#ef4444' : colors.border,
                      },
                    ]}
                  />
                  {comment.length > 0 && trimmedComment.length < 5 ? (
                    <Text style={styles.errorText}>আপনার মন্তব্য অন্তত ৫ অক্ষরে লিখুন</Text>
                  ) : null}
                </View>

                <Button
                  title='রিভিউ জমা দিন'
                  loading={mutation.isPending}
                  disabled={!formValid}
                  onPress={submit}
                  style={styles.submitButton}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.62)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    maxHeight: '86%',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 15, fontFamily: Fonts.headingBold },
  subtitle: { marginTop: 2, fontSize: 10, fontFamily: Fonts.sansRegular, lineHeight: 15 },
  close: { padding: 4 },
  body: { paddingHorizontal: 14, paddingBottom: 15, gap: 13 },
  authBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 14 },
  authNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  authNoticeText: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sansRegular, lineHeight: 16 },
  authActions: {
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  userPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderRadius: 10,
  },
  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  userAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  userInitial: { fontSize: 15, fontFamily: Fonts.headingBold },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userName: { maxWidth: '88%', fontSize: 12, fontFamily: Fonts.headingSemiBold },
  userHint: { marginTop: 1, fontSize: 9.5, fontFamily: Fonts.sansRegular },
  fieldBlock: { gap: 7 },
  label: { fontSize: 11.5, fontFamily: Fonts.sansMedium },
  serviceList: { gap: 6 },
  serviceOption: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  serviceText: { flex: 1, fontSize: 10.5, fontFamily: Fonts.sansMedium },
  stars: { flexDirection: 'row', gap: 7 },
  starButton: { padding: 1 },
  commentInput: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    fontFamily: Fonts.sansRegular,
    lineHeight: 18,
  },
  errorText: { color: '#ef4444', fontSize: 9.5, fontFamily: Fonts.sansRegular },
  submitButton: { marginTop: 2 },
});
