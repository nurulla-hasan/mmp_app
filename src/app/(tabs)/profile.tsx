import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Fonts } from '../../constants/typography';
import { Crown, Sparkles, ChevronRight } from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Card style={styles.userCard}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <View style={styles.userInfoCol}>
          <Text style={styles.userName}>Mouza User</Text>
          <Text style={styles.userEmail}>user@example.com</Text>
          <Badge label='ফ্রি মেম্বার' variant='free' style={{ marginTop: 2 }} />
        </View>
      </Card>

      {/* Upgrade Banner */}
      <View style={styles.upgradeCard}>
        <View style={styles.upgradeHeader}>
          <Crown size={18} color='#fbbf24' />
          <Text style={styles.upgradeTitle}>প্রো মেম্বারশিপে আপগ্রেড করুন</Text>
        </View>
        <Text style={styles.upgradeDesc}>
          আনলিমিটেড জমি পরিমাপ, প্যান্টাগ্রাফ ও ডিজিটাল ট্রেসিং টুলসের সম্পূর্ণ অ্যাক্সেস পান।
        </Text>
        <Button
          title='প্ল্যান ও বিকাশ অফার দেখুন'
          size='sm'
          onPress={() => router.push('/pricing')}
          style={{ backgroundColor: '#16a34a', marginTop: 4 }}
          icon={<Sparkles size={13} color='#fff' />}
        />
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
    padding: 12,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  userInfoCol: {
    flex: 1,
    gap: 1,
  },
  userName: {
    fontSize: 14,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
  },
  upgradeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upgradeTitle: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#ffffff',
  },
  upgradeDesc: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#94a3b8',
    lineHeight: 15,
  },
});
