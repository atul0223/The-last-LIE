import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import type { CaseSlotProps } from '../slots';
import { useCaseSession } from '../slots';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export default function BriefingSlot({ sessionId }: CaseSlotProps) {
  const { casePublic, status } = useCaseSession(sessionId);

  if (status === 'loading' || !casePublic) {
    return (
      <View style={styles.container} testID="case.briefing.loading">
        <Text style={styles.loadingText} allowFontScaling>
          Loading case briefing...
        </Text>
      </View>
    );
  }

  const { title, difficulty, estimatedMinutes, setting, briefing, characters } = casePublic;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="case.briefing.container"
    >
      {/* Case Header Meta */}
      <View style={styles.section}>
        <Text style={styles.metaBadge} allowFontScaling>
          VESPER POLICE DEPARTMENT // DOSSIER
        </Text>
        <Text style={styles.caseTitle} allowFontScaling>
          {title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} allowFontScaling>
            Difficulty: {'★'.repeat(difficulty)}{'☆'.repeat(5 - difficulty)}
          </Text>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.metaText} allowFontScaling>
            Est. {estimatedMinutes} mins
          </Text>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.metaText} allowFontScaling>
            Date: {setting.date}
          </Text>
        </View>
      </View>

      {/* Briefing Question */}
      <View style={styles.card} testID="case.briefing.question">
        <Text style={styles.sectionHeader} allowFontScaling>
          PRIMARY OBJECTIVE
        </Text>
        <Text style={styles.briefingPrompt} allowFontScaling>
          {briefing}
        </Text>
      </View>

      {/* Setting Summary */}
      <View style={styles.card} testID="case.briefing.setting">
        <Text style={styles.sectionHeader} allowFontScaling>
          SETTING & CONTEXT
        </Text>
        <Text style={styles.settingSummary} allowFontScaling>
          {setting.summary}
        </Text>
      </View>

      {/* Person of Interest / Character List */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader} allowFontScaling>
          PERSONS OF INTEREST ({characters.length})
        </Text>
        <View style={styles.characterList}>
          {characters.map((character) => (
            <View
              key={character.id}
              style={styles.characterCard}
              testID={`case.briefing.character.${character.id}`}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`${character.name}, Role: ${character.role}. ${character.publicDescription}`}
            >
              <View style={styles.characterHeader}>
                <Text style={styles.characterName} allowFontScaling>
                  {character.name}
                </Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText} allowFontScaling>
                    {character.role.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.characterDesc} allowFontScaling>
                {character.publicDescription}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.xs,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
    padding: SPACING.xl,
  },
  metaBadge: {
    ...TYPOGRAPHY.monospace,
    color: COLORS.accent,
    fontSize: 11,
    letterSpacing: 1,
  },
  caseTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
  },
  metaDivider: {
    ...TYPOGRAPHY.caption,
    color: COLORS.surfaceBorder,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  briefingPrompt: {
    ...TYPOGRAPHY.body,
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.text,
    fontWeight: '500',
  },
  settingSummary: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  characterList: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  characterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  characterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  characterName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  roleBadge: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  roleBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.muted,
  },
  characterDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
