import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { UploadCloud } from 'lucide-react-native';

export default function LandMeasurementScreen() {
  return (
    <View style={styles.container}>
      <Card style={styles.placeholderCard}>
        <UploadCloud size={48} color='#16a34a' />
        <Text style={styles.title}>মৌজা ম্যাপ আপলোড করুন</Text>
        <Text style={styles.desc}>
          আপনার গ্যালারি বা ফাইল থেকে মৌজা ম্যাপের ইমেজ অথবা PDF নির্বাচন করুন।
        </Text>
        <Button title='ম্যাপ নির্বাচন করুন' onPress={() => {}} style={{ width: '100%', marginTop: 8 }} />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    justifyContent: 'center',
  },
  placeholderCard: {
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  desc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
