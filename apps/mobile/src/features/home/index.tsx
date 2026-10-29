import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';

export default function HomeFeature() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="home.placeholder"
    >
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          THE LAST LIE
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          VESPER CITY // ARCHIVE DIVISION
        </Text>
      </View>

      <Pressable
        style={styles.ctaButton}
        accessibilityRole="button"
        accessibilityLabel="Solve a case"
      >
        <Text style={styles.ctaText} allowFontScaling>
          SOLVE A CASE
        </Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCategory} allowFontScaling>
            DAILY INVESTIGATION
          </Text>
          <Text style={styles.badge} allowFontScaling>
            ACTIVE
          </Text>
        </View>
        <Text style={styles.cardTitle} allowFontScaling>
          The Missing Message
        </Text>
        <Text style={styles.cardDesc} allowFontScaling>
          Encrypted drive breached in Maya Lin’s office. Uncover the contradiction before the trace
          expires.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          TERMINAL LOG // RECENT DISPATCH
        </Text>
        <View style={styles.logContainer}>
          <Text style={styles.monospaceLog} allowFontScaling>
            [14:25:01] SYS: TURNSTILE_4 ACCESS GRANTED [ARJUN_MEHTA]
          </Text>
          <Text style={styles.monospaceLog} allowFontScaling>
            [14:28:40] NET: ENCRYPTION SUB-KEY SIGNATURE EXPIRED
          </Text>
          <Text style={styles.monospaceLog} allowFontScaling>
            [14:30:12] INT: CONSPIRACY HOOK REGISTERED &gt; SECTOR 7
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          CONSPIRACY LEAD
        </Text>
        <Text style={styles.cardTitle} allowFontScaling>
          Project Deep Echo
        </Text>
        <Text style={styles.cardDesc} allowFontScaling>
          3 connected cases remain locked. Solve author case 0001 to decrypt lead dossiers.
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
    marginBottom: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    letterSpacing: 2,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    marginTop: SPACING.xs,
    letterSpacing: 1,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#0b0c0e',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCategory: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  badge: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    color: COLORS.success,
    backgroundColor: '#13281c',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  cardTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 20,
    color: COLORS.text,
  },
  cardDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
  },
  logContainer: {
    backgroundColor: '#090b0e',
    padding: SPACING.sm,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  monospaceLog: {
    ...TYPOGRAPHY.monospace,
    fontSize: 12,
  },
});
