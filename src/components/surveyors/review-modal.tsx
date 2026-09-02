import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MessageSquarePlus, Star, X } from 'lucide-react-native';
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

export function ReviewModal({ surveyorProfileId, surveyorSlug, services }: Props) {
  const router = useRouter();
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const { isAuthenticated } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(5);
  const [serviceName, setServiceName] = useState<string | undefined>();
  const [comment, setComment] = useState('');
  const mutation = useCreateSurveyorReview(surveyorSlug);

  useEffect(() => {
    if (!visible) {
      setRating(5);
      setServiceName(undefined);
      setComment('');
    }
  }, [visible]);

  const open = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    setVisible(true);
  };

  const submit = () => {
    if (comment.trim().length < 3) {
      ErrorToast('রিভিউ কমপক্ষে ৩ অক্ষরের হতে হবে।');
      return;
    }
    mutation.mutate(
      {
        surveyorProfileId,
        serviceName: serviceName || null,
        rating,
        comment: comment.trim(),
      },
      {
        onSuccess: (result) => {
          if (result.success) setVisible(false);
        },
      }
    );
  };

  return (
    <>
      <Button
        title='রিভিউ দিন'
        variant='outline'
        size='sm'
        onPress={open}
        icon={<MessageSquarePlus size={13} color={colors.primary} />}
      />
      <Modal visible={visible} transparent animationType='fade' onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>ক্লায়েন্ট রিভিউ</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>রিভিউ যাচাইয়ের পর রেটিংয়ে যুক্ত হবে</Text>
              </View>
              <TouchableOpacity onPress={() => setVisible(false)} style={styles.close}><X size={19} color={colors.textMuted} /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body} keyboardShouldPersistTaps='handled'>
              <Text style={[styles.label, { color: colors.text }]}>রেটিং</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <TouchableOpacity key={value} onPress={() => setRating(value)} style={styles.starButton}>
                    <Star size={27} color='#f59e0b' fill={value <= rating ? '#f59e0b' : 'transparent'} />
                  </TouchableOpacity>
                ))}
              </View>

              {services.length > 0 ? (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>কোন সেবার জন্য?</Text>
                  <View style={styles.wrap}>
                    {services.map((item) => {
                      const active = serviceName === item.service.name;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setServiceName(active ? undefined : item.service.name)}
                          style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}16` : colors.background }]}
                        >
                          <Text style={[styles.chipText, { color: active ? colors.primary : colors.textMuted }]}>{item.service.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={[styles.label, { color: colors.text }]}>আপনার অভিজ্ঞতা</Text>
              <TextInput
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={800}
                textAlignVertical='top'
                placeholder='কাজের মান, যোগাযোগ ও অভিজ্ঞতা সম্পর্কে লিখুন...'
                placeholderTextColor={colors.textMuted}
                style={[styles.commentInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              />

              <Button title='রিভিউ জমা দিন' loading={mutation.isPending} onPress={submit} style={{ marginTop: 3 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.62)', justifyContent: 'center', padding: 16 },
  modal: { maxHeight: '84%', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  title: { fontSize: 15, fontFamily: Fonts.headingBold },
  subtitle: { marginTop: 2, fontSize: 10, fontFamily: Fonts.sansRegular },
  close: { padding: 4 },
  body: { paddingHorizontal: 14, paddingBottom: 15, gap: 9 },
  label: { fontSize: 11.5, fontFamily: Fonts.sansMedium, marginTop: 4 },
  stars: { flexDirection: 'row', gap: 7 },
  starButton: { padding: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  chipText: { fontSize: 10, fontFamily: Fonts.sansMedium },
  commentInput: { minHeight: 100, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 12, fontFamily: Fonts.sansRegular, lineHeight: 18 },
});
