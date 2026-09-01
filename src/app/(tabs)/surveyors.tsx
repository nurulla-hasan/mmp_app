import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MapPin, Phone, Award } from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Fonts } from '../../constants/typography';

const DEMO_SURVEYORS = [
  {
    id: '1',
    name: 'মো. হাবিবুর রহমান',
    location: 'দিনাজপুর সদর, দিনাজপুর',
    exp: '১৫+ বছরের অভিজ্ঞতা',
    fee: '৳৫০০ / দাগ',
    verified: true,
  },
  {
    id: '2',
    name: 'আব্দুল করিম পাটোয়ারী',
    location: 'মিরপুর, ঢাকা',
    exp: '১০+ বছরের অভিজ্ঞতা',
    fee: '৳৮০০ / দাগ',
    verified: true,
  },
  {
    id: '3',
    name: 'তানভীর আহমেদ',
    location: 'কোতোয়ালী, চট্টগ্রাম',
    exp: '৮+ বছরের অভিজ্ঞতা',
    fee: '৳৬০০ / দাগ',
    verified: false,
  },
];

export default function SurveyorsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.subtitle}>দেশের সেরা দক্ষ ও ভেরিফাইড ডিজিটাল সার্ভেয়ারদের খুঁজুন</Text>

      {DEMO_SURVEYORS.map((s) => (
        <Card key={s.id} style={styles.surveyorCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{s.name}</Text>
                {s.verified && <Badge label='ভেরিফাইড' variant='pro' />}
              </View>
              <View style={styles.locationRow}>
                <MapPin size={11} color='#64748b' />
                <Text style={styles.location}>{s.location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.expRow}>
              <Award size={12} color='#16a34a' />
              <Text style={styles.expText}>{s.exp}</Text>
            </View>
            <Button
              title='কল করুন'
              size='sm'
              onPress={() => {}}
              icon={<Phone size={12} color='#fff' />}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 12,
    gap: 8,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  surveyorCard: {
    gap: 8,
    padding: 11,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  location: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expText: {
    fontSize: 11,
    fontFamily: Fonts.headingSemiBold,
    color: '#334155',
  },
});
