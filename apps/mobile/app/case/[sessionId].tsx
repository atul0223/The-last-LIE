import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../src/theme/tokens';
import BriefingSlot from '../../src/features/case/briefing';
import EvidenceSlot from '../../src/features/case/evidence';
import BoardSlot from '../../src/features/case/board';
import TheorySlot from '../../src/features/case/theory';
import RevealSlot from '../../src/features/case/reveal';
import { DevLocalBadge } from '../../src/services';
import { useCaseSession } from '../../src/features/case/slots';

type CaseSubView = 'briefing' | 'evidence' | 'board' | 'theory' | 'reveal';

const SUB_VIEWS: { id: CaseSubView; label: string }[] = [
  { id: 'briefing', label: 'Briefing' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'board', label: 'Board' },
  { id: 'theory', label: 'Theory' },
  { id: 'reveal', label: 'Reveal' },
];

export default function CaseScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const safeSessionId = Array.isArray(sessionId) ? (sessionId[0] ?? '') : (sessionId ?? '');

  const { casePublic, status } = useCaseSession(safeSessionId);
  const [activeTab, setActiveTab] = useState<CaseSubView>('briefing');

  useEffect(() => {
    if (status === 'submitted') {
      setActiveTab('reveal');
    }
  }, [status]);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} allowFontScaling>
            {casePublic ? casePublic.title.toUpperCase() : 'CASE INVESTIGATION'}
          </Text>
          <Text style={styles.sessionIdText} allowFontScaling>
            {safeSessionId} • {status.toUpperCase()}
          </Text>
        </View>
        <DevLocalBadge />
      </View>

      {/* Subview Segment Selector */}
      <View style={styles.segmentBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentScroll}
        >
          {SUB_VIEWS.map((sub) => {
            const isActive = activeTab === sub.id;
            return (
              <Pressable
                key={sub.id}
                style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                onPress={() => setActiveTab(sub.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[styles.segmentLabel, isActive && styles.segmentLabelActive]}
                  allowFontScaling
                >
                  {sub.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Slot Content */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {activeTab === 'briefing' && <BriefingSlot sessionId={safeSessionId} />}
        {activeTab === 'evidence' && <EvidenceSlot sessionId={safeSessionId} />}
        {activeTab === 'board' && <BoardSlot sessionId={safeSessionId} />}
        {activeTab === 'theory' && <TheorySlot sessionId={safeSessionId} />}
        {activeTab === 'reveal' && <RevealSlot sessionId={safeSessionId} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontSize: 16,
  },
  sessionIdText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 11,
    color: COLORS.muted,
  },
  segmentBar: {
    backgroundColor: COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  segmentScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  segmentTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  segmentTabActive: {
    backgroundColor: COLORS.surfaceBorder,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  segmentLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: SPACING.md,
  },
});
