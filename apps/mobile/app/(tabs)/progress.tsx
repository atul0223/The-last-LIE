import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme/tokens';

export default function ProgressScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          CAREER &amp; DOSSIERS
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Investigative standing and unlocked personnel intelligence
        </Text>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel} allowFontScaling>
            RANK
          </Text>
          <Text style={styles.statValue} allowFontScaling>
            Senior Detective
          </Text>
          <Text style={styles.statSub} allowFontScaling>
            Level 4
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel} allowFontScaling>
            MASTERY
          </Text>
          <Text style={styles.statValue} allowFontScaling>
            1,420
          </Text>
          <Text style={styles.statSub} allowFontScaling>
            PTS
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          RECENT DOSSIERS UNLOCKED
        </Text>
        <View style={styles.dossierRow}>
          <View style={styles.dossierBadge}>
            <Text style={styles.dossierCode} allowFontScaling>
              CHAR_MAYA
            </Text>
            <Text style={styles.dossierName} allowFontScaling>
              Maya Lin (Chief Cryptographer)
            </Text>
          </View>
          <View style={styles.dossierBadge}>
            <Text style={styles.dossierCode} allowFontScaling>
              CHAR_ARJUN
            </Text>
            <Text style={styles.dossierName} allowFontScaling>
              Arjun Mehta (Security Analyst)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          CASE METRICS
        </Text>
        <Text style={styles.metricText} allowFontScaling>
          Cases Solved: 12 / Accuracy: 94.2%
        </Text>
        <Text style={styles.metricText} allowFontScaling>
          Active Streak: 4 Days
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
  statGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.accent,
  },
  statSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
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
  dossierRow: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  dossierBadge: {
    backgroundColor: '#0a0d11',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
    borderRadius: 4,
  },
  dossierCode: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.accent,
  },
  dossierName: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.text,
    marginTop: 2,
  },
  metricText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
  },
});
