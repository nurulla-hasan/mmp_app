import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/ui/card';
import { Scale } from 'lucide-react-native';

export default function ScaleGuideScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.introCard}>
        <Scale size={32} color='#16a34a' />
        <Text style={styles.introTitle}>স্কেল ঠিক করুন, হিসাব নির্ভুল করুন</Text>
        <Text style={styles.introDesc}>
          মৌজা ম্যাপে ১৬ ইঞ্চি = ১ মাইল স্কেলে সঠিক পরিমাপের নিয়মাবলী নিচে উল্লেখ করা হলো।
        </Text>
      </Card>

      <Card style={styles.stepCard}>
        <Text style={styles.stepNumber}>ধাপ ১</Text>
        <Text style={styles.stepTitle}>পরিচিত দূরত্ব নির্বাচন করুন</Text>
        <Text style={styles.stepDesc}>ম্যাপে এমন একটি লাইন নির্বাচন করুন যার বাস্তব দৈর্ঘ্য আপনি জানেন।</Text>
      </Card>

      <Card style={styles.stepCard}>
        <Text style={styles.stepNumber}>ধাপ ২</Text>
        <Text style={styles.stepTitle}>বাস্তব মাপ লিখুন</Text>
        <Text style={styles.stepDesc}>নির্বাচিত লাইনের আসল মাপ ফুট অনুযায়ী ক্যালকুলেটরে ইনপুট দিন।</Text>
      </Card>

      <Card style={styles.stepCard}>
        <Text style={styles.stepNumber}>ধাপ ৩</Text>
        <Text style={styles.stepTitle}>অটোমেটিক স্কেলিং</Text>
        <Text style={styles.stepDesc}>Mouza Map Pro স্বয়ংক্রিয়ভাবে পিক্সেল টু ফিট রেশিও সেট করে নেবে।</Text>
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
  introCard: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  introDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 17,
  },
  stepCard: {
    gap: 6,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16a34a',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepDesc: {
    fontSize: 12,
    color: '#64748b',
  },
});
