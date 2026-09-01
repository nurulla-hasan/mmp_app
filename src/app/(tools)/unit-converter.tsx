import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../components/ui/card';
import { Fonts } from '../../constants/typography';
import { convertToSqFeet, convertFromSqFeet } from '../../lib/calculations';

const UNITS = [
  { key: 'shotok', label: 'শতক / শতাংশ' },
  { key: 'katha', label: 'কাঠা' },
  { key: 'bigha', label: 'বিঘা' },
  { key: 'acre', label: 'একর' },
  { key: 'sqFeet', label: 'বর্গফুট' },
] as const;

export default function UnitConverterScreen() {
  const [value, setValue] = useState('1');
  const [activeUnit, setActiveUnit] = useState<'shotok' | 'katha' | 'bigha' | 'acre' | 'sqFeet'>('shotok');

  const numVal = parseFloat(value) || 0;
  const sqFeet = convertToSqFeet(numVal, activeUnit);
  const result = convertFromSqFeet(sqFeet);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Unit Selector Pills */}
      <View style={styles.pillContainer}>
        {UNITS.map((u) => (
          <TouchableOpacity
            key={u.key}
            activeOpacity={0.7}
            style={[styles.pill, activeUnit === u.key && styles.pillActive]}
            onPress={() => setActiveUnit(u.key)}
          >
            <Text style={[styles.pillText, activeUnit === u.key && styles.pillTextActive]}>
              {u.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Box */}
      <Card style={styles.inputCard}>
        <Text style={styles.inputLabel}>জমির পরিমাণ ইনপুট দিন:</Text>
        <TextInput
          style={styles.input}
          keyboardType='numeric'
          value={value}
          onChangeText={setValue}
          placeholder='0'
          placeholderTextColor='#94a3b8'
        />
      </Card>

      {/* Conversion Table */}
      <Text style={styles.resultHeading}>সব এককে তাৎক্ষণিক রূপান্তর ফলাফল:</Text>

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
          <Text style={styles.unitValue}>{result.sqFeet} স্কয়ার ফিট</Text>
        </View>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.unitName}>বর্গমিটার (Sq. Meter)</Text>
          <Text style={styles.unitValue}>{result.sqMeter} মি²</Text>
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
    padding: 12,
    gap: 10,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  pillText: {
    fontSize: 11,
    fontFamily: Fonts.headingSemiBold,
    color: '#64748b',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  inputCard: {
    gap: 4,
    padding: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 16,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  resultHeading: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
    marginTop: 2,
  },
  resultCard: {
    padding: 10,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  unitName: {
    fontSize: 11.5,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
  },
  unitValue: {
    fontSize: 12.5,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
});
