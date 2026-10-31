import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import type { MapNode, MapEdge } from './types';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export interface NodeDossierSheetProps {
  node: MapNode;
  allEdges: MapEdge[];
  allNodes: MapNode[];
  onClose: () => void;
}

const KIND_COLORS: Record<string, string> = {
  character: '#38bdf8', // Light blue
  organization: '#a78bfa', // Purple
  location: '#34d399', // Emerald
  symbol: '#fbbf24', // Amber
  transaction: '#f87171', // Red
  case: '#f472b6', // Pink
  unknown: '#94a3b8', // Muted slate
};

export function NodeDossierSheet({
  node,
  allEdges,
  allNodes,
  onClose,
}: NodeDossierSheetProps) {
  const isRevealed = node.isRevealed;
  const themeColor = KIND_COLORS[node.kind] || COLORS.accent;

  // Find direct connections
  const connectedEdges = allEdges.filter(
    (e) => e.from === node.id || e.to === node.id,
  );

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  return (
    <View style={styles.backdrop} testID="conspiracy.dossier.sheet">
      <View style={[styles.container, { borderTopColor: themeColor }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <View style={[styles.kindBadge, { borderColor: themeColor }]}>
              <Text style={[styles.kindBadgeText, { color: themeColor }]} allowFontScaling>
                {isRevealed
                  ? node.kind.toUpperCase()
                  : 'CLASSIFIED LEAD'}
              </Text>
            </View>

            {!isRevealed && (
              <View
                style={styles.classifiedTag}
                testID="conspiracy.dossier.classified"
              >
                <Text style={styles.classifiedTagText} allowFontScaling>
                  ENCRYPTED 🔒
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close dossier"
            testID="conspiracy.dossier.close"
          >
            <Text style={styles.closeBtnText} allowFontScaling>
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text
          style={[styles.nodeTitle, !isRevealed && styles.nodeTitleClassified]}
          allowFontScaling
          testID="conspiracy.dossier.name"
        >
          {isRevealed ? node.name : 'UNIDENTIFIED NETWORK LEAD'}
        </Text>

        <Text style={styles.nodeIdText} allowFontScaling>
          ID: #{node.id}
        </Text>

        {/* Body Summary */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel} allowFontScaling>
              INTELLIGENCE BRIEFING
            </Text>
            <Text
              style={styles.summaryText}
              allowFontScaling
              testID="conspiracy.dossier.summary"
            >
              {node.publicSummary}
            </Text>
          </View>

          {/* Connections Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel} allowFontScaling>
              CONFIRMED SYNDICATE CORRIDORS ({connectedEdges.length})
            </Text>

            {connectedEdges.length === 0 ? (
              <Text style={styles.emptyConnectionsText} allowFontScaling>
                No active syndicate corridors confirmed yet.
              </Text>
            ) : (
              connectedEdges.map((edge) => {
                const otherNodeId = edge.from === node.id ? edge.to : edge.from;
                const otherNode = nodeMap.get(otherNodeId);
                const otherName = otherNode?.isRevealed ? otherNode.name : '? Unknown Node';

                return (
                  <View key={edge.id} style={styles.edgeItem}>
                    <View style={styles.edgeHeader}>
                      <Text style={styles.edgeRelation} allowFontScaling>
                        {edge.isRevealed
                          ? `↔ ${edge.rel.replace(/_/g, ' ').toUpperCase()}`
                          : '⇢ UNIDENTIFIED LEAD'}
                      </Text>
                      <Text style={styles.otherNodeName} allowFontScaling numberOfLines={1}>
                        Target: {otherName}
                      </Text>
                    </View>
                    {edge.teaser && (
                      <Text style={styles.edgeTeaser} allowFontScaling>
                        &ldquo;{edge.teaser}&rdquo;
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 3,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '65%',
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  kindBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceElevated,
  },
  kindBadgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  classifiedTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#3b1d1d',
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  classifiedTagText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.danger,
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  closeBtnText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  nodeTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  nodeTitleClassified: {
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  nodeIdText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  scrollArea: {
    marginTop: SPACING.xs,
  },
  scrollContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  summaryText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyConnectionsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  edgeItem: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.surfaceBorder,
    borderWidth: 1,
    borderRadius: 6,
    padding: SPACING.sm,
    gap: 2,
  },
  edgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  edgeRelation: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent,
  },
  otherNodeName: {
    ...TYPOGRAPHY.body,
    fontSize: 12,
    color: COLORS.text,
    maxWidth: '50%',
  },
  edgeTeaser: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontStyle: 'italic',
    fontSize: 11,
  },
});
