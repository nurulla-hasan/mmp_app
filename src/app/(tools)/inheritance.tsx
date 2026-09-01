import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/ui/card';
import { Calculator } from 'lucide-react-native';

export default function InheritanceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Calculator size={40} color='#e11d48' />
        <Text style={styles.title}>জমি বণ্টন ক্যালকুলেটর (ফারায়েজ)</Text>
        <Text style={styles.desc}>মোট জমি ও অংশীদারদের প্রাপ্য হিস্যা অনুযায়ী জমি ভাগ করুন।</Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 12 },
  card: { alignItems: 'center', padding: 20, gap: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  desc: { fontSize: 12, color: '#64748b', textAlign: 'center' },
});
