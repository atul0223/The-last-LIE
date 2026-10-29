import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme/tokens';

export default function ChallengesScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          CHALLENGES
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Competitive cases and peer-to-peer deduction battles
        </Text>
      </View>

      <Pressable style={styles.ctaButton}>
        <Text style={styles.ctaText} allowFontScaling>
          + CREATE NEW CHALLENGE
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          ACTIVE DUELS
        </Text>
        <View style={styles.duelItem}>
          <Text style={styles.duelTitle} allowFontScaling>
            Code: #CH-8821 (Case 0001)
          </Text>
          <Text style={styles.duelSubtitle} allowFontScaling>
            Opponent: Agent_Vesper • Status: Awaiting your deduction
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          HOW CHALLENGES WORK
        </Text>
        <Text style={styles.cardDesc} allowFontScaling>
          Generate a spoiler-free challenge link after completing a case. Your friend solves the
          same mystery and compares accuracy, speed, and evidence chain deductions.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  header: {
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  ctaButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardCategory: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  duelItem: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: SPACING.sm,
    gap: 2,
    marginTop: SPACING.xs,
  },
  duelTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.text,
  },
  duelSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
  },
  cardDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
  },
});
