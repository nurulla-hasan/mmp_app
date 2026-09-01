import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export default function PricingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>পেশাদার সার্ভেয়ার ও ল্যান্ড প্ল্যানার্সদের জন্য</Text>
      <Text style={styles.subheading}>আপনার প্রয়োজন অনুযায়ী সেরা প্ল্যানটি বেছে নিন।</Text>

      {/* 1 Month Plan */}
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planName}>মাসিক প্ল্যান (Monthly Pro)</Text>
          <Text style={styles.planPrice}>৳২৯৯ <Text style={styles.planDuration}>/ ৩০ দিন</Text></Text>
        </View>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✓ আনলিমিটেড জমি পরিমাপ</Text>
          <Text style={styles.featureItem}>✓ প্যান্টাগ্রাফ ও ডিজিটাল ট্রেসিং</Text>
          <Text style={styles.featureItem}>✓ আনলিমিটেড ক্লাউড সেভ</Text>
        </View>
        <Button title='বিকাশ / নগদে কিনুন' onPress={() => {}} />
      </Card>

      {/* 1 Year Plan (Recommended) */}
      <Card style={[styles.planCard, styles.recommendedCard]}>
        <Badge label='🔥 সেরা অফার' variant='pro' style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
        <View style={styles.planHeader}>
          <Text style={styles.planName}>১ বছর প্রো (Yearly Pro)</Text>
          <Text style={styles.planPrice}>৳১,৫৯৯ <Text style={styles.planDuration}>/ ৩৬৫ দিন</Text></Text>
        </View>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>✓ সমস্ত প্রো ফিচার আনলক</Text>
          <Text style={styles.featureItem}>✓ হাই-রেজোলিউশন PDF রিপোর্ট</Text>
          <Text style={styles.featureItem}>✓ সর্বোচ্চ প্রায়োরিটি সাপোর্ট</Text>
        </View>
        <Button title='বিকাশ / নগদে কিনুন' onPress={() => {}} style={{ backgroundColor: '#16a34a' }} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 14 },
  heading: { fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  subheading: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 6 },
  planCard: { gap: 12 },
  recommendedCard: { borderWidth: 2, borderColor: '#16a34a' },
  planHeader: { gap: 2 },
  planName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  planPrice: { fontSize: 22, fontWeight: '800', color: '#16a34a' },
  planDuration: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  featureList: { gap: 6, marginVertical: 4 },
  featureItem: { fontSize: 13, color: '#334155' },
});
