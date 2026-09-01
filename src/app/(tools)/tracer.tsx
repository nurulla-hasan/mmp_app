import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components/ui/card';
import { PenLine } from 'lucide-react-native';

export default function TracerScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <PenLine size={48} color='#16a34a' />
        <Text style={styles.title}>ডিজিটাল ম্যাপ ট্রেসার</Text>
        <Text style={styles.desc}>মৌজা ম্যাপের দাগের সীমানা ও ভেক্টর ট্রেসিং টুল।</Text>
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
