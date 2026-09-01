import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Map, MoveDiagonal } from 'lucide-react-native';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Colors } from '../../constants/colors';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Banner */}
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Badge label='PRO VERSION' variant='pro' />
          <Sparkles size={20} color={Colors.light.primary} />
        </View>
        <Text style={styles.heroTitle}>মৌজা ম্যাপ প্রো</Text>
        <Text style={styles.heroSubtitle}>
          ডিজিটাল ভূমি জরিপ, নিখুঁত দাগ পরিমাপ ও সাবেক-হাল ম্যাপ তুলনার আধুনিক প্ল্যাটফর্ম।
        </Text>
        <Button
          title='মৌজা ম্যাপ শুরু করুন'
          onPress={() => router.push('/(tools)/land-measurement')}
          style={styles.heroButton}
        />
      </Card>

      {/* Quick Launch Tools */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>জনপ্রিয় টুলস</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tools')}>
          <Text style={styles.seeAllText}>সব দেখুন →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.toolCard}
          onPress={() => router.push('/(tools)/land-measurement')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
            <Map size={24} color='#16a34a' />
          </View>
          <Text style={styles.toolTitle}>জমি পরিমাপ</Text>
          <Text style={styles.toolDesc}>ম্যাপে দাগ এঁকে ক্ষেত্রফল বের করুন</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.toolCard}
          onPress={() => router.push('/(tools)/unit-converter')}
        >
          <View style={[styles.iconBox, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
            <MoveDiagonal size={24} color='#2563eb' />
          </View>
          <Text style={styles.toolTitle}>একক রূপান্তর</Text>
          <Text style={styles.toolDesc}>শতক, কাঠা, বিঘা, একর কনভার্টার</Text>
        </TouchableOpacity>
      </View>
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
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    padding: 20,
    gap: 10,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  heroButton: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  seeAllText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  toolCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  toolDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
});
