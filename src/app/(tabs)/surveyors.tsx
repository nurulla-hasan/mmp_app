import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MapPin, Phone } from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function SurveyorsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>দেশের সেরা দক্ষ ও ভেরিফাইড সার্ভেয়ারদের খুঁজুন</Text>

      {/* Surveyor Demo Card */}
      <Card style={styles.surveyorCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.name}>মো. হাবিবুর রহমান</Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color='#64748b' />
              <Text style={styles.location}>দিনাজপুর সদর, দিনাজপুর</Text>
            </View>
          </View>
          <Badge label='ভেরিফাইড' variant='pro' />
        </View>

        <Text style={styles.bio}>
          ১৫+ বছরের অভিজ্ঞতা সম্পন্ন পেশাদার ডিজিটাল আমিন ও সার্ভেয়ার।
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.price}>৳৫০০ থেকে শুরু</Text>
          <Button
            title='যোগাযোগ'
            size='sm'
            onPress={() => {}}
            icon={<Phone size={14} color='#fff' />}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    gap: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  surveyorCard: {
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: '#64748b',
  },
  bio: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16a34a',
  },
});
