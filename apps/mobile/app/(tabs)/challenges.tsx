import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme/tokens';
import { validateChallengeCode } from '../../src/features/challenges/codeFormat';
import { navigateTo } from '../../src/features/home/navigation';

export default function ChallengesScreen() {
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleJoinCode = () => {
    const check = validateChallengeCode(codeInput);
    if (!check.valid || !check.normalized) {
      setCodeError(check.error || 'Invalid code');
      return;
    }
    setCodeError(null);
    navigateTo(`/c/${check.normalized}`);
  };

  const handleCreateNew = () => {
    // Navigate to library so player can pick and solve a case to challenge from
    navigateTo('/(tabs)/library');
  };

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

      <Pressable
        style={styles.ctaButton}
        onPress={handleCreateNew}
        accessibilityRole="button"
        accessibilityLabel="Create a new challenge"
        testID="challenges.cta.create"
      >
        <Text style={styles.ctaText} allowFontScaling>
          + CREATE NEW CHALLENGE
        </Text>
      </Pressable>

      {/* Code Input Card */}
      <View style={styles.card}>
        <Text style={styles.cardCategory} allowFontScaling>
          ENTER DISPATCH CODE
        </Text>
        <Text style={styles.inputHelp} allowFontScaling>
          Received an 8-character duel code from a peer investigator? Enter it below:
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={codeInput}
            onChangeText={(t) => {
              setCodeInput(t);
              if (codeError) setCodeError(null);
            }}
            placeholder="e.g. 8X99K2LP"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="characters"
            maxLength={12}
            accessibilityLabel="Challenge dispatch code input"
            testID="challenges.input.code"
          />
          <TouchableOpacity
            style={styles.joinButton}
            onPress={handleJoinCode}
            accessibilityRole="button"
            accessibilityLabel="Join challenge by code"
            testID="challenges.button.join"
          >
            <Text style={styles.joinButtonText} allowFontScaling>
              JOIN
            </Text>
          </TouchableOpacity>
        </View>
        {codeError && (
          <Text style={styles.errorText} allowFontScaling testID="challenges.error.code">
            {codeError}
          </Text>
        )}
      </View>

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
  inputHelp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.monospace.fontFamily,
    fontSize: 14,
  },
  joinButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontSize: 11,
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
