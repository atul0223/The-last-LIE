import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { useSessionStore } from '../../store';
import { getGameService } from '../../services';
import { COLORS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { RankCard } from './components/RankCard';
import { ArchiveList } from './components/ArchiveList';
import { CharacterDossiers } from './components/CharacterDossiers';
import {
  computePlayerProgress,
  extractArchiveItems,
  extractDossiers,
  getRankInfo,
} from './helpers';
import { navigateToCase } from './navigation';

type TabView = 'all' | 'rank' | 'archive' | 'dossiers';

export default function ProgressFeature() {
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [isReplaying, setIsReplaying] = useState<boolean>(false);

  const sessions = useSessionStore((state) => state.sessions);
  const cases = useSessionStore((state) => state.cases);
  const results = useSessionStore((state) => state.results);

  // Authoritatively compute progression strictly through @lastlie/case-engine
  const playerProgress = useMemo(
    () => computePlayerProgress(sessions, cases, results),
    [sessions, cases, results],
  );

  const rankInfo = useMemo(() => getRankInfo(playerProgress), [playerProgress]);

  // Extract archive cases with previous vs replay theory comparison
  const archiveItems = useMemo(
    () => extractArchiveItems(sessions, cases, results),
    [sessions, cases, results],
  );

  // Extract dossiers strictly for characters met in solved cases
  const dossiers = useMemo(
    () => extractDossiers(sessions, cases, results),
    [sessions, cases, results],
  );

  // Replay handler
  const handleReplay = useCallback(
    async (caseId: string) => {
      if (isReplaying) return;
      setIsReplaying(true);
      try {
        const service = getGameService();
        const outcome = await service.startSession({ caseId, mode: 'replay' });
        if (outcome && outcome.session) {
          navigateToCase(outcome.session.id);
        }
      } catch {
        // Handle error gracefully
      } finally {
        setIsReplaying(false);
      }
    },
    [isReplaying],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="progress.placeholder"
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title} allowFontScaling>
          CAREER &amp; DOSSIERS
        </Text>
        <Text style={styles.subtitle} allowFontScaling>
          Investigative standing and unlocked personnel intelligence
        </Text>
      </View>

      {/* Segmented Filter Bar */}
      <View style={styles.tabBar} testID="progress.tabBar">
        <Pressable
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
          accessibilityRole="tab"
          accessibilityLabel="Show all progress sections"
          testID="progress.tab.all"
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}
            allowFontScaling
          >
            Overview
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'rank' && styles.tabButtonActive]}
          onPress={() => setActiveTab('rank')}
          accessibilityRole="tab"
          accessibilityLabel="Show rank and mastery standing"
          testID="progress.tab.rank"
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'rank' && styles.tabButtonTextActive]}
            allowFontScaling
          >
            Rank ({rankInfo.currentRank})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'archive' && styles.tabButtonActive]}
          onPress={() => setActiveTab('archive')}
          accessibilityRole="tab"
          accessibilityLabel={`Show archive of ${archiveItems.length} solved cases`}
          testID="progress.tab.archive"
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'archive' && styles.tabButtonTextActive]}
            allowFontScaling
          >
            Archive ({archiveItems.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'dossiers' && styles.tabButtonActive]}
          onPress={() => setActiveTab('dossiers')}
          accessibilityRole="tab"
          accessibilityLabel={`Show dossiers of ${dossiers.length} characters`}
          testID="progress.tab.dossiers"
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'dossiers' && styles.tabButtonTextActive]}
            allowFontScaling
          >
            Dossiers ({dossiers.length})
          </Text>
        </Pressable>
      </View>

      {/* Rank Card */}
      {(activeTab === 'all' || activeTab === 'rank') && (
        <View style={styles.sectionContainer}>
          <RankCard rankInfo={rankInfo} />
        </View>
      )}

      {/* Case Archive */}
      {(activeTab === 'all' || activeTab === 'archive') && (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle} allowFontScaling>
              CASE ARCHIVE &amp; REPLAYS
            </Text>
            <Text style={styles.sectionCount} allowFontScaling>
              {archiveItems.length} Cases Closed
            </Text>
          </View>
          <ArchiveList
            items={archiveItems}
            onReplay={handleReplay}
            isReplaying={isReplaying}
          />
        </View>
      )}

      {/* Character Dossiers */}
      {(activeTab === 'all' || activeTab === 'dossiers') && (
        <View style={styles.sectionContainer}>
          <CharacterDossiers dossiers={dossiers} />
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
    marginBottom: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.muted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.xs + 2,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(230, 201, 142, 0.3)',
  },
  tabButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: COLORS.accent,
  },
  sectionContainer: {
    gap: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    letterSpacing: 1.2,
  },
  sectionCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
  },
});
