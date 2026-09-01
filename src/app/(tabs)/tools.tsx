import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { TOOLS_LIST } from '../../constants/tools';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Fonts } from '../../constants/typography';
import { Map, Scaling, PenLine, MoveDiagonal, Calculator, Ruler, ChevronRight } from 'lucide-react-native';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerSubtitle}>
        ডিজিটাল মৌজা ম্যাপ ও ভূমি পরিমাপের বিশেষায়িত টুলসমূহ
      </Text>

      {TOOLS_LIST.map((tool) => {
        const IconComponent = iconMap[tool.iconName] || Map;
        return (
          <TouchableOpacity
            key={tool.id}
            activeOpacity={0.75}
            onPress={() => router.push(tool.route as any)}
          >
            <Card style={styles.toolCard}>
              <View style={styles.iconContainer}>
                <IconComponent size={18} color='#16a34a' />
              </View>

              <View style={styles.middleCol}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{tool.title}</Text>
                  <Badge label={tool.isPro ? 'PRO' : 'ফ্রি'} variant={tool.isPro ? 'pro' : 'free'} />
                </View>
                <Text style={styles.description} numberOfLines={1}>{tool.description}</Text>
              </View>

              <ChevronRight size={16} color='#94a3b8' />
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
    padding: 12,
    gap: 8,
  },
  headerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleCol: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.headingBold,
    color: '#0f172a',
  },
  description: {
    fontSize: 10.5,
    fontFamily: Fonts.sansRegular,
    color: '#64748b',
  },
});
