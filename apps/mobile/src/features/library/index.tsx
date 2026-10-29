import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export default function LibraryFeature() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          CASE ARCHIVE
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Active and declassified dossiers from the central precinct
        </Text>
      </View>

      <View style={styles.filterRow}>
        <View style={[styles.filterChip, styles.filterChipActive]}>
          <Text style={[styles.filterText, styles.filterTextActive]} allowFontScaling>
            ALL
          </Text>
        </View>
        <View style={styles.filterChip}>
          <Text style={styles.filterText} allowFontScaling>
            TUTORIAL
          </Text>
        </View>
        <View style={styles.filterChip}>
          <Text style={styles.filterText} allowFontScaling>
            STANDARD
          </Text>
        </View>
        <View style={styles.filterChip}>
          <Text style={styles.filterText} allowFontScaling>
            CONSPIRACY
          </Text>
        </View>
      </View>

      <View style={styles.caseCard}>
        <View style={styles.badgeRow}>
          <Text style={styles.difficultyBadge} allowFontScaling>
            TUTORIAL
          </Text>
          <Text style={styles.caseCode} allowFontScaling>
            CASE-0001
          </Text>
        </View>
        <Text style={styles.caseTitle} allowFontScaling>
          The Missing Message
        </Text>
        <Text style={styles.caseDesc} allowFontScaling>
          A classified flash drive disappeared during an 8-minute window. Discover who lied about
          their movements.
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} allowFontScaling>
            Est: 10 mins
          </Text>
          <Text style={styles.metaText} allowFontScaling>
            3 Hypotheses
          </Text>
          <Text style={styles.metaText} allowFontScaling>
            7 Clues
          </Text>
        </View>
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
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.xs,
  },
  filterChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.muted,
  },
  filterTextActive: {
    color: '#0b0c0e',
    fontWeight: '700',
  },
  caseCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
  },
  caseCode: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.muted,
  },
  caseTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  caseDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
});
