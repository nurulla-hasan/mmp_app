import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Crown } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.userCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <Text style={styles.userName}>Mouza User</Text>
        <Text style={styles.userEmail}>user@example.com</Text>
        <Badge label='ফ্রি মেম্বারশিপ' variant='free' style={{ marginTop: 6 }} />
      </Card>

      {/* Upgrade Banner */}
      <Card style={styles.upgradeCard}>
        <View style={styles.upgradeHeader}>
          <Crown size={24} color='#fbbf24' />
          <Text style={styles.upgradeTitle}>প্রো মেম্বারশিপে আপগ্রেড করুন</Text>
        </View>
        <Text style={styles.upgradeDesc}>
          আনলিমিটেড মৌজা ম্যাপ জমি পরিমাপ, প্যান্টাগ্রাফ ও ডিজিটাল ট্রেসিং টুলসের সম্পূর্ণ অ্যাক্সেস পান।
        </Text>
        <Button
          title='প্ল্যান ও অফার দেখুন'
          onPress={() => router.push('/pricing')}
          style={{ backgroundColor: '#16a34a' }}
        />
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
    gap: 16,
  },
  userCard: {
    alignItems: 'center',
    padding: 24,
    gap: 6,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  upgradeCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    padding: 20,
    gap: 10,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  upgradeDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
  },
});
