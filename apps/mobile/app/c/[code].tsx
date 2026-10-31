import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { GetChallengeResponse, ChallengeCompareResponse } from '@lastlie/api-contract';
import {
  validateChallengeCode,
  ChallengeCompareView,
  ResultCard,
  useChallenge,
} from '../../src/features/challenges';
import { getGameService } from '../../src/services';
import { RemoteGameService } from '../../src/services/remote';
import { useSessionStore } from '../../src/store';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme/tokens';

export default function ChallengeRouteScreen() {
  const router = useRouter();
  const { code: rawCode } = useLocalSearchParams<{ code: string }>();
  const validation = validateChallengeCode(rawCode);

  const { getChallenge, getGuestToken, getCompare, isLoading: challengeLoading, error } = useChallenge();

  const [challengeData, setChallengeData] = useState<GetChallengeResponse | null>(null);
  const [compareData, setCompareData] = useState<ChallengeCompareResponse | null>(null);
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  // Check if player has an existing completed session for this challenge in store
  const sessions = useSessionStore((state) => state.sessions);
  const results = useSessionStore((state) => state.results);

  // Initialize and load challenge
  useEffect(() => {
    if (!validation.valid || !validation.normalized) return;

    let isMounted = true;
    const normCode = validation.normalized;

    async function loadChallenge() {
      try {
        const service = getGameService() as RemoteGameService;
        if (typeof service.getApiClient !== 'function') return;
        const apiClient = service.getApiClient();

        // 1. Fetch Challenge Details
        const chal = await getChallenge(apiClient, normCode);
        if (!isMounted || !chal) return;
        setChallengeData(chal);

        // 2. Fetch or acquire guest token if playing in web / unauthenticated
        const token = await getGuestToken(apiClient, normCode);
        if (isMounted) setGuestToken(token);

        // 3. Check submission status in local session store
        const existingSession = Object.values(sessions).find(
          (s) => s.caseId === chal.caseId && s.status === 'submitted',
        );

        if (existingSession) {
          setHasSubmitted(true);
          // Load compare stats
          const comp = await getCompare(apiClient, normCode);
          if (isMounted && comp) setCompareData(comp);
        }
      } catch {
        // Handled via useChallenge error state
      }
    }

    loadChallenge();

    return () => {
      isMounted = false;
    };
  }, [validation.valid, validation.normalized, getChallenge, getGuestToken, getCompare, sessions]);

  const handleStartInvestigation = useCallback(async () => {
    if (!challengeData || isStartingSession) return;
    setIsStartingSession(true);

    try {
      const service = getGameService();
      const next = await service.startSession({
        caseId: challengeData.caseId,
        mode: 'challenge',
        challengeId: validation.normalized,
      });
      router.push(`/case/${next.session.id}`);
    } catch {
      // Error handling
    } finally {
      setIsStartingSession(false);
    }
  }, [challengeData, isStartingSession, router]);

  // 1. Invalid Code Format Screen
  if (!validation.valid) {
    return (
      <View style={styles.container} testID="challenge.invalid_code">
        <View style={styles.errorCard}>
          <Text style={styles.errorTag} allowFontScaling>
            LINK RESOLUTION ERROR
          </Text>
          <Text style={styles.errorTitle} allowFontScaling>
            Invalid Challenge Link
          </Text>
          <Text style={styles.errorText} allowFontScaling>
            {validation.error || 'The challenge code in this link is corrupted or malformed.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/')}
            accessibilityRole="button"
            accessibilityLabel="Return to home headquarters"
            testID="challenge.button.return_home"
          >
            <Text style={styles.primaryButtonText} allowFontScaling>
              RETURN TO HEADQUARTERS
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. Loading State
  if (challengeLoading && !challengeData) {
    return (
      <View style={styles.container} testID="challenge.loading">
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText} allowFontScaling>
          Resolving challenge dispatch #{validation.normalized}...
        </Text>
      </View>
    );
  }

  // 3. API Error Screen (e.g. 404 Not Found or 410 Expired)
  if (error && !challengeData) {
    return (
      <View style={styles.container} testID="challenge.error">
        <View style={styles.errorCard}>
          <Text style={styles.errorTag} allowFontScaling>
            DISPATCH UNAVAILABLE
          </Text>
          <Text style={styles.errorTitle} allowFontScaling>
            Challenge Unavailable
          </Text>
          <Text style={styles.errorText} allowFontScaling>
            {error}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/')}
            accessibilityRole="button"
            accessibilityLabel="Return to home headquarters"
            testID="challenge.button.return_home"
          >
            <Text style={styles.primaryButtonText} allowFontScaling>
              RETURN TO HEADQUARTERS
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const existingSubmitted = Object.values(sessions).find(
    (s) => s.caseId === challengeData?.caseId && s.status === 'submitted',
  );
  const existingResult = existingSubmitted ? results[existingSubmitted.id] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.header}>
        <Text style={styles.dispatchBadge} allowFontScaling>
          CHALLENGE DISPATCH #{validation.normalized}
        </Text>
        <Text style={styles.headerTitle} allowFontScaling>
          {challengeData?.case.title ?? 'Case Investigation'}
        </Text>
        <Text style={styles.headerSubtitle} allowFontScaling>
          Issued by {challengeData?.creatorDisplayName ?? 'Peer Investigator'} • Expires{' '}
          {challengeData ? new Date(challengeData.expiresAt).toLocaleDateString() : 'soon'}
        </Text>
      </View>

      {/* If already submitted: show ResultCard and Compare */}
      {hasSubmitted && existingResult ? (
        <View style={styles.submittedSection} testID="challenge.already_submitted">
          <Text style={styles.sectionHeader} allowFontScaling>
            YOUR DEDUCTION EVALUATION
          </Text>
          <ResultCard
            caseTitle={challengeData?.case.title ?? 'Case Investigation'}
            score={existingResult.result.score}
            xpEarned={existingResult.result.xp}
            challengeCode={validation.normalized}
          />

          <ChallengeCompareView
            hasSubmitted={true}
            compareData={compareData}
            isLoading={challengeLoading}
          />

          {/* Web App Install Banner */}
          {Platform.OS === 'web' && (
            <View style={styles.webInstallBanner} testID="challenge.web_install_banner">
              <Text style={styles.webInstallTitle} allowFontScaling>
                SAFEGUARD YOUR RECORD
              </Text>
              <Text style={styles.webInstallDesc} allowFontScaling>
                Install THE LAST LIE on your mobile device to attach this challenge result to your
                permanent detective dossier and unlock daily city mysteries.
              </Text>
              {guestToken && (
                <Text style={styles.guestTokenRef} allowFontScaling>
                  Guest Token: {guestToken.slice(0, 16)}...
                </Text>
              )}
            </View>
          )}
        </View>
      ) : (
        /* Not yet submitted: Show Briefing Preview + Start CTA + Locked Compare */
        <View style={styles.unsubmittedSection} testID="challenge.unsubmitted">
          <View style={styles.briefingCard}>
            <Text style={styles.briefingTag} allowFontScaling>
              INVESTIGATION BRIEFING
            </Text>
            <Text style={styles.briefingText} allowFontScaling>
              {challengeData?.case.briefing ?? 'Review all evidence, uncover contradictions, and identify the culprit.'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaBadge} allowFontScaling>
                DIFFICULTY: {challengeData?.case.difficulty ?? 1}/4
              </Text>
              <Text style={styles.metaBadge} allowFontScaling>
                CLUES: {challengeData?.case.clues.length ?? 0}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.startChallengeButton, isStartingSession && styles.buttonDisabled]}
            onPress={handleStartInvestigation}
            disabled={isStartingSession}
            accessibilityRole="button"
            accessibilityLabel="Accept challenge and start investigation"
            testID="challenge.button.start"
          >
            <Text style={styles.startChallengeButtonText} allowFontScaling>
              {isStartingSession ? 'LAUNCHING CASE...' : 'ACCEPT CHALLENGE & INVESTIGATE'}
            </Text>
          </TouchableOpacity>

          {/* Locked Compare View */}
          <ChallengeCompareView
            hasSubmitted={false}
            compareData={null}
          />
        </View>
      )}
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
    gap: SPACING.lg,
  },
  header: {
    gap: 4,
  },
  dispatchBadge: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
    fontSize: 24,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 12,
  },
  errorCard: {
    margin: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.xl,
    gap: SPACING.md,
    alignItems: 'center',
  },
  errorTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontWeight: '700',
    letterSpacing: 1,
  },
  errorTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    textAlign: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.bg,
    fontWeight: '700',
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  briefingCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  briefingTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  briefingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  metaBadge: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.muted,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  startChallengeButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  startChallengeButtonText: {
    ...TYPOGRAPHY.h2,
    fontSize: 15,
    color: COLORS.bg,
    fontWeight: '700',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  unsubmittedSection: {
    gap: SPACING.lg,
  },
  submittedSection: {
    gap: SPACING.lg,
  },
  sectionHeader: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  webInstallBanner: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  webInstallTitle: {
    ...TYPOGRAPHY.h2,
    fontSize: 14,
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  webInstallDesc: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  guestTokenRef: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 4,
  },
});
