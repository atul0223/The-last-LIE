import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme/tokens';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          INVESTIGATOR DOSSIER
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Agent credentials and bureau system preferences
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText} allowFontScaling>
            VL
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.agentName} allowFontScaling>
            Agent Victor Vance
          </Text>
          <Text style={styles.agentBadge} allowFontScaling>
            BADGE #4409-NEON
          </Text>
          <Text style={styles.agentStation} allowFontScaling>
            Vesper City 7th District Precinct
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          SETTINGS &amp; HARDENING
        </Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel} allowFontScaling>
            Theme
          </Text>
          <Text style={styles.settingValue} allowFontScaling>
            Dark Noir (OLED)
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel} allowFontScaling>
            Font Scaling
          </Text>
          <Text style={styles.settingValue} allowFontScaling>
            System Default
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel} allowFontScaling>
            Haptics
          </Text>
          <Text style={styles.settingValue} allowFontScaling>
            Tactile Clicks
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel} allowFontScaling>
            Engine Version
          </Text>
          <Text style={styles.settingValue} allowFontScaling>
            v0.1.0-alpha
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...TYPOGRAPHY.h2,
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  agentName: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
    color: COLORS.text,
  },
  agentBadge: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
    color: COLORS.accent,
  },
  agentStation: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    ...TYPOGRAPHY.body,
    fontSize: 14,
    color: COLORS.text,
  },
  settingValue: {
    ...TYPOGRAPHY.caption,
    fontSize: 14,
    color: COLORS.muted,
  },
});
