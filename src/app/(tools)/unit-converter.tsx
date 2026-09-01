import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Card } from '../../components/ui/card';
import { convertToSqFeet, convertFromSqFeet } from '../../lib/calculations';

export default function UnitConverterScreen() {
  const [value, setValue] = useState('1');
  const [unit, setUnit] = useState<'shotok' | 'katha' | 'bigha' | 'acre'>('shotok');

  const numVal = parseFloat(value) || 0;
  const sqFeet = convertToSqFeet(numVal, unit);
  const result = convertFromSqFeet(sqFeet);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.inputCard}>
        <Text style={styles.label}>জমির পরিমাণ লিখুন ({unit === 'shotok' ? 'শতক' : unit}):</Text>
        <TextInput
          style={styles.input}
          keyboardType='numeric'
          value={value}
          onChangeText={setValue}
          placeholder='0'
        />
      </Card>

      <Text style={styles.resultHeading}>অন্যান্য এককে রূপান্তর ফলাফল:</Text>

      <Card style={styles.resultCard}>
        <View style={styles.row}>
          <Text style={styles.unitName}>শতক / শতাংশ</Text>
          <Text style={styles.unitValue}>{result.shotok} শতক</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.unitName}>কাঠা</Text>
          <Text style={styles.unitValue}>{result.katha} কাঠা</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.unitName}>বিঘা</Text>
          <Text style={styles.unitValue}>{result.bigha} বিঘা</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.unitName}>একর</Text>
          <Text style={styles.unitValue}>{result.acre} একর</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.unitName}>বর্গফুট (Sq. Feet)</Text>
          <Text style={styles.unitValue}>{result.sqFeet} বর্গফুট</Text>
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
    gap: 16,
  },
  inputCard: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#16a34a',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: '#ffffff',
  },
  resultHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  resultCard: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  unitName: {
    fontSize: 14,
    color: '#64748b',
  },
  unitValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
});
