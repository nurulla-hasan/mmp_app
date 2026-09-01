import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components/ui/card';
import { Scaling } from 'lucide-react-native';

export default function PantagraphScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Scaling size={48} color='#16a34a' />
        <Text style={styles.title}>সাবেক ও হাল ম্যাপ প্যান্টাগ্রাফ</Text>
        <Text style={styles.desc}>C.S ও B.S ম্যাপ সুপারইম্পোজ এবং এলাইনমেন্ট টুল।</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16, justifyContent: 'center' },
  card: { alignItems: 'center', padding: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  desc: { fontSize: 13, color: '#64748b', textAlign: 'center' },
});
