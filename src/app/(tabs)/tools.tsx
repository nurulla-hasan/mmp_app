import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { TOOLS_LIST } from '../../constants/tools';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Map, Scaling, PenLine, MoveDiagonal, Calculator, Ruler, ArrowRight } from 'lucide-react-native';

const iconMap: Record<string, any> = {
  Map,
  Scaling,
  PenLine,
  MoveDiagonal,
  Calculator,
  Ruler,
};

export default function ToolsHubScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerSubtitle}>
        বিশেষায়িত ডিজিটাল ম্যাপ, ট্রেসিং ও ভূমি পরিমাপের টুলসমূহ।
      </Text>

      {TOOLS_LIST.map((tool) => {
        const IconComponent = iconMap[tool.iconName] || Map;
        return (
          <TouchableOpacity
            key={tool.id}
            activeOpacity={0.8}
            onPress={() => router.push(tool.route as any)}
          >
            <Card style={styles.toolCard}>
              <View style={styles.cardTop}>
                <View style={styles.iconContainer}>
                  <IconComponent size={22} color='#16a34a' />
                </View>
                <Badge label={tool.isPro ? 'PRO' : 'ফ্রি'} variant={tool.isPro ? 'pro' : 'free'} />
              </View>

              <Text style={styles.title}>{tool.title}</Text>
              <Text style={styles.description}>{tool.description}</Text>

              <View style={styles.footer}>
                <Text style={styles.actionText}>টুল খুলুন</Text>
                <ArrowRight size={14} color='#16a34a' />
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}
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
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  toolCard: {
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
});
