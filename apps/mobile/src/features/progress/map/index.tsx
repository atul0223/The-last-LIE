import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useConspiracyMap, type UseConspiracyMapOptions } from './useConspiracyMap';
import { ConspiracyCanvas } from './ConspiracyCanvas';
import { ConspiracyListView } from './ConspiracyListView';
import { NodeDossierSheet } from './NodeDossierSheet';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export * from './types';
export * from './layout';
export * from './useConspiracyMap';
export * from './ConspiracyCanvas';
export * from './ConspiracyListView';
export * from './NodeDossierSheet';

export interface ConspiracyMapFeatureProps {
  options?: UseConspiracyMapOptions;
}

export function ConspiracyMapFeature({ options }: ConspiracyMapFeatureProps) {
  const {
    graph,
    selectedNode,
    selectNode,
    clearSelectedNode,
    viewMode,
    toggleViewMode,
    zoom,
    pan,
    zoomIn,
    zoomOut,
    resetView,
  } = useConspiracyMap(options);

  return (
    <View style={styles.container} testID="conspiracy.map.feature">
      {/* Top Banner / Stats */}
      <View style={styles.header}>
        <View style={styles.titleColumn}>
          <Text style={styles.title} allowFontScaling>
            THE QUIET // SYNDICATE MAP
          </Text>
          <Text style={styles.subtitle} allowFontScaling>
            Decrypted operational corridors and suspected front networks
          </Text>
        </View>

        {/* View Toggle (Canvas vs List) */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleViewMode}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${viewMode === 'canvas' ? 'accessible list view' : 'canvas graph view'}`}
          testID="conspiracy.toggle.view"
        >
          <Text style={styles.toggleButtonText} allowFontScaling>
            {viewMode === 'canvas' ? '📑 LIST VIEW' : '🌐 GRAPH VIEW'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Syndicate Status Tracker */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text
            style={styles.statValue}
            allowFontScaling
            testID="conspiracy.stat.revealed"
          >
            {graph.revealedNodeCount}
          </Text>
          <Text style={styles.statLabel} allowFontScaling>
            REVEALED INTEL
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text
            style={[styles.statValue, { color: COLORS.danger }]}
            allowFontScaling
            testID="conspiracy.stat.leads"
          >
            {graph.unknownLeadCount}
          </Text>
          <Text style={styles.statLabel} allowFontScaling>
            UNKNOWN LEADS (?)
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text
            style={[styles.statValue, { color: COLORS.accent }]}
            allowFontScaling
            testID="conspiracy.stat.links"
          >
            {graph.revealedEdgeCount}
          </Text>
          <Text style={styles.statLabel} allowFontScaling>
            CONFIRMED LINKS
          </Text>
        </View>
      </View>

      {/* Main Content: Canvas or List */}
      <View style={styles.mainContent}>
        {viewMode === 'canvas' ? (
          <ConspiracyCanvas
            nodes={graph.nodes}
            edges={graph.edges}
            selectedNode={selectedNode}
            onSelectNode={selectNode}
            zoom={zoom}
            pan={pan}
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            resetView={resetView}
          />
        ) : (
          <ConspiracyListView
            nodes={graph.nodes}
            onSelectNode={selectNode}
          />
        )}
      </View>

      {/* Node Dossier Inspector Sheet */}
      {selectedNode && (
        <NodeDossierSheet
          node={selectedNode}
          allEdges={graph.edges}
          allNodes={graph.nodes}
          onClose={clearSelectedNode}
        />
      )}
    </View>
  );
}

export default ConspiracyMapFeature;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    minHeight: 520,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontSize: 16,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  toggleButton: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.accent,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 4,
  },
  toggleButtonText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.accent,
    fontWeight: '700',
    fontSize: 11,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.surfaceBorder,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: SPACING.xs,
    marginVertical: SPACING.xs,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  statValue: {
    ...TYPOGRAPHY.monospace,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.surfaceBorder,
  },
  mainContent: {
    flex: 1,
    minHeight: 440,
    position: 'relative',
  },
});
