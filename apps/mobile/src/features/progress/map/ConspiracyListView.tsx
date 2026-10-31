import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import type { MapNode, ConspiracyNodeKind } from './types';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export interface ConspiracyListViewProps {
  nodes: MapNode[];
  onSelectNode: (node: MapNode) => void;
}

const KIND_HEADERS: Record<ConspiracyNodeKind, string> = {
  organization: 'ORGANIZATIONS & SHELL ENTITIES',
  character: 'PERSONS OF INTEREST',
  location: 'VESPER CITY SECTORS & LOCATIONS',
  symbol: 'SYNDICATE SEALS & SYMBOLS',
  transaction: 'AUDITED FINANCIAL TRANSACTIONS',
  case: 'LINKED INCIDENTS',
  unknown: 'UNIDENTIFIED NETWORK LEADS (?)',
};

const KIND_COLORS: Record<string, string> = {
  character: '#38bdf8',
  organization: '#a78bfa',
  location: '#34d399',
  symbol: '#fbbf24',
  transaction: '#f87171',
  case: '#f472b6',
  unknown: '#94a3b8',
};

export function ConspiracyListView({ nodes, onSelectNode }: ConspiracyListViewProps) {
  const revealedNodes = nodes.filter((n) => n.isRevealed);
  const unknownNodes = nodes.filter((n) => !n.isRevealed);

  // Group revealed nodes by kind
  const groupedByKind = revealedNodes.reduce<Record<string, MapNode[]>>((acc, node) => {
    if (!acc[node.kind]) acc[node.kind] = [];
    acc[node.kind]!.push(node);
    return acc;
  }, {});

  const orderOfKinds: ConspiracyNodeKind[] = [
    'organization',
    'character',
    'location',
    'symbol',
    'transaction',
    'case',
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      testID="conspiracy.list.container"
    >
      {/* Revealed Sections */}
      {orderOfKinds.map((kind) => {
        const kindNodes = groupedByKind[kind];
        if (!kindNodes || kindNodes.length === 0) return null;

        const themeColor = KIND_COLORS[kind] || COLORS.accent;

        return (
          <View key={kind} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIndicator, { backgroundColor: themeColor }]} />
              <Text style={styles.sectionTitle} allowFontScaling>
                {KIND_HEADERS[kind]} ({kindNodes.length})
              </Text>
            </View>

            <View style={styles.nodeList}>
              {kindNodes.map((node) => (
                <TouchableOpacity
                  key={node.id}
                  style={[styles.nodeCard, { borderLeftColor: themeColor }]}
                  onPress={() => onSelectNode(node)}
                  accessibilityRole="button"
                  accessibilityLabel={`Inspect dossier for ${node.name}`}
                  testID={`conspiracy.list.node.${node.id}`}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.nodeName} allowFontScaling numberOfLines={1}>
                      {node.name}
                    </Text>
                    {node.directLeadsCount > 0 && (
                      <View style={styles.leadBadge}>
                        <Text style={styles.leadBadgeText} allowFontScaling>
                          +{node.directLeadsCount} LEADS
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.nodeSummary} allowFontScaling numberOfLines={2}>
                    {node.publicSummary}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      {/* Unknown Leads Section */}
      {unknownNodes.length > 0 && (
        <View style={styles.section} testID="conspiracy.list.unknown">
          <View style={styles.sectionHeaderRow}>
            <View style={[styles.sectionIndicator, { backgroundColor: COLORS.danger }]} />
            <Text style={styles.sectionTitle} allowFontScaling>
              UNKNOWN NETWORK LEADS ({unknownNodes.length})
            </Text>
          </View>

          <View style={styles.nodeList}>
            {unknownNodes.map((node, index) => (
              <TouchableOpacity
                key={node.id}
                style={[styles.nodeCard, styles.unknownCard]}
                onPress={() => onSelectNode(node)}
                accessibilityRole="button"
                accessibilityLabel={`Inspect encrypted lead ${index + 1}`}
                testID={`conspiracy.list.node.${node.id}`}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.unknownTitle} allowFontScaling>
                    🔒 [CLASSIFIED LEAD #{index + 1}]
                  </Text>
                  <Text style={styles.unknownId} allowFontScaling>
                    #{node.id}
                  </Text>
                </View>
                <Text style={styles.unknownSummary} allowFontScaling numberOfLines={2}>
                  {node.publicSummary}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
    padding: SPACING.md,
    gap: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  section: {
    gap: SPACING.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionIndicator: {
    width: 4,
    height: 14,
    borderRadius: 2,
  },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 11,
  },
  nodeList: {
    gap: SPACING.xs,
  },
  nodeCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeName: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.text,
    fontSize: 15,
    flex: 1,
  },
  leadBadge: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.accent,
    fontWeight: '700',
  },
  nodeSummary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  unknownCard: {
    borderLeftColor: COLORS.danger,
    backgroundColor: '#171212',
  },
  unknownTitle: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.danger,
    fontSize: 14,
  },
  unknownId: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    color: COLORS.muted,
  },
  unknownSummary: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontStyle: 'italic',
    fontSize: 12,
  },
});
