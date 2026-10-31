import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { useGameService, useSessionStore } from '../../store';
import { CASE_CATALOG } from '../library/catalog';
import { selectNextCase } from './selectNextCase';
import { navigateTo } from './navigation';
import { computeDailyStreak } from './streak';

export default function HomeFeature() {
  const gameService = useGameService();
  const sessions = useSessionStore((state) => state.sessions);
  const results = useSessionStore((state) => state.results);
  const [starting, setStarting] = useState(false);

  // 1. Identify in-progress session if one exists
  const inProgressSession = useMemo(() => {
    return Object.values(sessions).find((s) => s.status === 'in_progress');
  }, [sessions]);

  // 2. Identify solved cases
  const solvedCaseIds = useMemo(() => {
    const solvedSet = new Set<string>();
    for (const session of Object.values(sessions)) {
      if (session.status === 'submitted' || results[session.id]) {
        solvedSet.add(session.caseId);
      }
    }
    return Array.from(solvedSet);
  }, [sessions, results]);

  // Player level derived from solved cases (1 to 5)
  const playerLevel = Math.min(5, Math.max(1, solvedCaseIds.length + 1));

  // 3. Dominant CTA recommendation via pure selection function
  const recommendation = useMemo(() => {
    return selectNextCase(
      CASE_CATALOG,
      solvedCaseIds,
      playerLevel,
      inProgressSession?.caseId,
    );
  }, [solvedCaseIds, playerLevel, inProgressSession]);

  const recommendedCase = recommendation.caseItem ?? CASE_CATALOG[0]!;

  const handleLaunchRecommendedCase = async () => {
    if (starting) return;
    setStarting(true);
    try {
      // If the recommended case is already in progress, resume it directly
      if (inProgressSession && inProgressSession.caseId === recommendedCase.id) {
        navigateTo(`/case/${inProgressSession.id}`);
        return;
      }

      const mode = recommendation.kind === 'archive_replay' ? 'replay' : 'normal';
      const { session } = await gameService.startSession({
        caseId: recommendedCase.id,
        mode,
      });
      navigateTo(`/case/${session.id}`);
    } catch {
      // Graceful error fallback
    } finally {
      setStarting(false);
    }
  };

  const handleResumeInProgress = () => {
    if (inProgressSession) {
      navigateTo(`/case/${inProgressSession.id}`);
    }
  };

  const [dailySummary, setDailySummary] = useState<{
    caseId: string;
    title: string;
    summary: string;
    difficulty: number;
    estimatedMinutes: number;
  }>({
    caseId: 'case_0001',
    title: 'The Missing Message',
    summary: 'Encrypted drive breached in Maya Lin’s office. Uncover the contradiction before the trace expires.',
    difficulty: 1,
    estimatedMinutes: 6,
  });

  useEffect(() => {
    let active = true;
    if (typeof gameService.getDaily === 'function') {
      gameService
        .getDaily()
        .then((summary) => {
          if (active && summary) {
            setDailySummary({
              caseId: summary.caseId,
              title: summary.title,
              summary: summary.summary,
              difficulty: summary.difficulty,
              estimatedMinutes: summary.estimatedMinutes,
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const dailyDates = useMemo(() => {
    return Object.values(sessions)
      .filter((s) => s.mode === 'daily' && s.status === 'submitted' && s.submittedAt)
      .map((s) => s.submittedAt!);
  }, [sessions]);

  const streakInfo = useMemo(() => computeDailyStreak(dailyDates), [dailyDates]);

  const handleLaunchDaily = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const { session } = await gameService.startSession({
        caseId: dailySummary.caseId,
        mode: 'daily',
      });
      navigateTo(`/case/${session.id}`);
    } catch {
      // Fallback
    } finally {
      setStarting(false);
    }
  };

  // Find in-progress case details if present
  const inProgressCase = useMemo(() => {
    if (!inProgressSession) return null;
    return CASE_CATALOG.find((c) => c.id === inProgressSession.caseId) ?? null;
  }, [inProgressSession]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="home.screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          THE LAST LIE
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          VESPER CITY // ARCHIVE DIVISION
        </Text>
      </View>

      {/* Dominant "Solve a case" Hero CTA */}
      <View style={styles.heroContainer}>
        <View style={styles.heroBadgeRow}>
          <Text style={styles.heroBadgeText} allowFontScaling>
            {recommendation.kind === 'archive_replay'
              ? 'ARCHIVE REPLAY'
              : `RECOMMENDED // LEVEL ${recommendedCase.difficulty}`}
          </Text>
          <Text style={styles.heroMetaText} allowFontScaling>
            ~{recommendedCase.estimatedMinutes} MINS
          </Text>
        </View>

        <Text style={styles.heroCaseTitle} allowFontScaling numberOfLines={2}>
          {recommendedCase.title}
        </Text>
        <Text style={styles.heroCaseDesc} allowFontScaling numberOfLines={2}>
          {recommendedCase.briefing}
        </Text>

        <Pressable
          style={[styles.ctaButton, starting && styles.ctaButtonDisabled]}
          onPress={handleLaunchRecommendedCase}
          accessibilityRole="button"
          accessibilityLabel={`Solve a case: ${recommendedCase.title}, difficulty level ${recommendedCase.difficulty}`}
          testID="home.cta.solve"
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator size="small" color="#0b0c0e" />
          ) : (
            <View style={styles.ctaContentRow}>
              <Text style={styles.ctaText} allowFontScaling>
                SOLVE A CASE
              </Text>
              <Text style={styles.ctaArrow} allowFontScaling>
                →
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* "Continue investigation" Card (shown if session is open) */}
      {inProgressSession && inProgressCase && (
        <Pressable
          style={styles.continueCard}
          onPress={handleResumeInProgress}
          accessibilityRole="button"
          accessibilityLabel={`Continue investigation: ${inProgressCase.title}`}
          testID="home.card.continue"
        >
          <View style={styles.cardHeader}>
            <View style={styles.statusIndicatorRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.continueCategory} allowFontScaling>
                CONTINUE INVESTIGATION
              </Text>
            </View>
            <Text style={styles.activeBadge} allowFontScaling>
              IN PROGRESS
            </Text>
          </View>

          <Text style={styles.cardTitle} allowFontScaling>
            {inProgressCase.title}
          </Text>
          <Text style={styles.cardDesc} allowFontScaling>
            Investigation active. {inProgressSession.unlockedClueIds.length} clues decrypted on board.
          </Text>

          <View style={styles.continueActionRow}>
            <Text style={styles.continueActionText} allowFontScaling>
              RESUME DOSSIER
            </Text>
            <Text style={styles.continueArrow} allowFontScaling>
              ›
            </Text>
          </View>
        </Pressable>
      )}

      {/* Daily Investigation Card */}
      <Pressable
        style={styles.card}
        onPress={handleLaunchDaily}
        accessibilityRole="button"
        accessibilityLabel={`Daily Investigation: ${dailySummary.title}`}
        testID="home.card.daily"
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardCategory} allowFontScaling>
            DAILY INVESTIGATION
          </Text>
          <View style={styles.badgeRow}>
            <Text style={styles.streakBadge} allowFontScaling testID="home.daily.streak">
              🔥 {streakInfo.currentStreak} {streakInfo.currentStreak === 1 ? 'DAY' : 'DAYS'}
            </Text>
            <Text
              style={[
                styles.badge,
                streakInfo.playedToday ? styles.badgeSolved : styles.badgeActive,
              ]}
              allowFontScaling
              testID="home.daily.status"
            >
              {streakInfo.playedToday ? 'SOLVED' : 'ACTIVE'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle} allowFontScaling>
          {dailySummary.title}
        </Text>
        <Text style={styles.cardDesc} allowFontScaling>
          {dailySummary.summary}
        </Text>
      </Pressable>

      {/* Cyberpunk Dispatch Log */}
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

      {/* Conspiracy Lead */}
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
    marginBottom: SPACING.xs,
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
  heroContainer: {
    backgroundColor: '#12171f',
    borderColor: COLORS.accent,
    borderWidth: 1.5,
    borderRadius: 8,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  heroMetaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  heroCaseTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontSize: 22,
    marginTop: 2,
  },
  heroCaseDesc: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  ctaText: {
    color: '#0b0c0e',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  ctaArrow: {
    color: '#0b0c0e',
    fontWeight: '900',
    fontSize: 16,
  },
  continueCard: {
    backgroundColor: '#0d1a15',
    borderColor: COLORS.success,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  continueCategory: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  activeBadge: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.success,
    backgroundColor: '#13281c',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
  },
  continueActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  continueActionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  continueArrow: {
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 16,
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  streakBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '700',
    fontSize: 10,
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
  badgeSolved: {
    color: COLORS.success,
    backgroundColor: '#13281c',
  },
  badgeActive: {
    color: COLORS.accent,
    backgroundColor: COLORS.surfaceElevated,
  },
  cardTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 18,
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
