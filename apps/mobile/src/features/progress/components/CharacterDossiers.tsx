import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';
import type { DossierCharacterItem } from '../types';

interface CharacterDossiersProps {
  dossiers: DossierCharacterItem[];
}

export function CharacterDossiers({ dossiers }: CharacterDossiersProps) {
  return (
    <View style={styles.container} testID="progress.dossier.section">
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          SUSPECT DOSSIERS
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Suspect dossiers (e.g. CHAR_MAYA) unlock upon completing case investigations.
        </Text>
      </View>

      {dossiers.length === 0 ? (
        <View style={styles.emptyContainer} testID="progress.dossier.empty">
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyTitle} allowFontScaling>
            NO DOSSIERS UNLOCKED
          </Text>
          <Text style={styles.emptySubtitle} allowFontScaling>
            Solve active cases to gather intelligence and unlock detailed suspect dossiers across
            Vesper City.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {dossiers.map((char) => {
            const initials = char.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <View
                key={char.id}
                style={styles.card}
                testID={`progress.dossier.character.${char.id}`}
                accessible={true}
                accessibilityRole="summary"
                accessibilityLabel={`Dossier for ${char.name}, ${char.role}. Cases: ${char.cases
                  .map((c) => c.title)
                  .join(', ')}`}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText} allowFontScaling>
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.infoColumn}>
                    <Text style={styles.charIdCode} allowFontScaling>
                      {char.id.toUpperCase()}
                    </Text>
                    <Text style={styles.charName} allowFontScaling>
                      {char.name}
                    </Text>
                    <Text style={styles.charRole} allowFontScaling>
                      {char.role}
                    </Text>
                  </View>
                </View>

                <Text style={styles.description} allowFontScaling>
                  {char.publicDescription}
                </Text>

                <View style={styles.casesSection}>
                  <Text style={styles.casesHeader} allowFontScaling>
                    APPEARED IN INVESTIGATIONS:
                  </Text>
                  <View style={styles.casesRow}>
                    {char.cases.map((c) => (
                      <View key={c.id} style={styles.caseBadge}>
                        <Text style={styles.caseBadgeText} allowFontScaling>
                          {c.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  header: {
    gap: 2,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
  },
  emptyContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(230, 201, 142, 0.15)',
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.accent,
  },
  infoColumn: {
    flex: 1,
  },
  charIdCode: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1,
  },
  charName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  charRole: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
  },
  description: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    lineHeight: 20,
  },
  casesSection: {
    gap: 4,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: SPACING.xs,
  },
  casesHeader: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 1,
  },
  casesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  caseBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caseBadgeText: {
    fontSize: 10,
    color: COLORS.text,
  },
});
