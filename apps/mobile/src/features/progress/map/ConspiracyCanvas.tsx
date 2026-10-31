import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Canvas, Line, vec } from '@shopify/react-native-skia';
import type { MapNode, MapEdge } from './types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './useConspiracyMap';
import { COLORS, SPACING, TYPOGRAPHY } from '../../../theme/tokens';

export interface ConspiracyCanvasProps {
  nodes: MapNode[];
  edges: MapEdge[];
  selectedNode: MapNode | null;
  onSelectNode: (node: MapNode) => void;
  zoom: number;
  pan: { x: number; y: number };
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

const KIND_COLORS: Record<string, string> = {
  character: '#38bdf8', // Light blue
  organization: '#a78bfa', // Purple
  location: '#34d399', // Emerald
  symbol: '#fbbf24', // Amber
  transaction: '#f87171', // Red
  case: '#f472b6', // Pink
  unknown: '#ef4444', // Dark Red for leads
};

const NODE_RADIUS = 24;

export function ConspiracyCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  zoom,
  zoomIn,
  zoomOut,
  resetView,
}: ConspiracyCanvasProps) {
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Is Skia canvas available?
  const canUseSkia = typeof Canvas !== 'undefined' && Platform.OS !== 'web';

  return (
    <View style={styles.container} testID="conspiracy.canvas.container">
      {/* Floating Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={zoomIn}
          accessibilityRole="button"
          accessibilityLabel="Zoom in conspiracy canvas"
          testID="conspiracy.zoom.in"
        >
          <Text style={styles.zoomButtonText} allowFontScaling>
            +
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.zoomButton}
          onPress={zoomOut}
          accessibilityRole="button"
          accessibilityLabel="Zoom out conspiracy canvas"
          testID="conspiracy.zoom.out"
        >
          <Text style={styles.zoomButtonText} allowFontScaling>
            −
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.zoomButton}
          onPress={resetView}
          accessibilityRole="button"
          accessibilityLabel="Reset conspiracy canvas zoom"
          testID="conspiracy.zoom.reset"
        >
          <Text style={styles.resetButtonText} allowFontScaling>
            ⌂
          </Text>
        </TouchableOpacity>

        <View style={styles.zoomLabelBox}>
          <Text style={styles.zoomLabel} allowFontScaling testID="conspiracy.zoom.label">
            {`${Math.round(zoom * 100)}%`}
          </Text>
        </View>
      </View>

      {/* Canvas Viewport with Scroll/Pan support */}
      <ScrollView
        horizontal
        style={styles.viewport}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={2.5}
        minimumZoomScale={0.5}
      >
        <ScrollView style={styles.viewport} contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.canvasArea,
              {
                width: CANVAS_WIDTH * zoom,
                height: CANVAS_HEIGHT * zoom,
                transform: [{ scale: zoom }],
                transformOrigin: 'top left',
              },
            ]}
          >
            {/* 1. Edge Layer (Skia Canvas) */}
            {canUseSkia ? (
              <Canvas style={StyleSheet.absoluteFill}>
                {edges.map((edge) => {
                  const n1 = nodeMap.get(edge.from);
                  const n2 = nodeMap.get(edge.to);
                  if (!n1 || !n2) return null;

                  const p1 = vec(n1.x, n1.y);
                  const p2 = vec(n2.x, n2.y);
                  const isSelected =
                    selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);

                  return (
                    <Line
                      key={edge.id}
                      p1={p1}
                      p2={p2}
                      color={
                        isSelected
                          ? COLORS.accent
                          : edge.isRevealed
                            ? 'rgba(167, 139, 250, 0.7)'
                            : 'rgba(239, 68, 68, 0.35)'
                      }
                      strokeWidth={isSelected ? 3 : edge.isRevealed ? 2 : 1.5}
                    />
                  );
                })}
              </Canvas>
            ) : (
              /* Non-Skia Fallback Layer */
              <View style={StyleSheet.absoluteFill} testID="mock-skia-canvas">
                {edges.map((edge) => (
                  <View
                    key={edge.id}
                    testID="mock-skia-line"
                    style={styles.fallbackEdgeItem}
                  />
                ))}
              </View>
            )}

            {/* 2. Interactive Nodes Layer */}
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const color = KIND_COLORS[node.kind] || COLORS.accent;

              return (
                <TouchableOpacity
                  key={node.id}
                  style={[
                    styles.nodeAnchor,
                    {
                      left: node.x - NODE_RADIUS,
                      top: node.y - NODE_RADIUS,
                    },
                  ]}
                  onPress={() => onSelectNode(node)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    node.isRevealed
                      ? `Inspect dossier for ${node.name}, ${node.kind}`
                      : 'Inspect unrevealed syndicate lead'
                  }
                  testID={
                    node.isRevealed
                      ? `conspiracy.node.${node.id}`
                      : `conspiracy.node.lead.${node.id}`
                  }
                >
                  <View
                    style={[
                      styles.nodeCircle,
                      {
                        borderColor: isSelected ? COLORS.accent : color,
                        backgroundColor: node.isRevealed ? '#14171f' : '#261214',
                      },
                      isSelected && styles.nodeCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.nodeIconText,
                        { color: isSelected ? COLORS.accent : color },
                      ]}
                      allowFontScaling
                    >
                      {node.isRevealed
                        ? node.kind.slice(0, 3).toUpperCase()
                        : '?'}
                    </Text>
                  </View>

                  {/* Label below node */}
                  <View style={styles.nodeLabelWrapper}>
                    <Text
                      style={[
                        styles.nodeLabelText,
                        !node.isRevealed && styles.nodeLabelUnrevealed,
                        isSelected && styles.nodeLabelSelected,
                      ]}
                      allowFontScaling
                      numberOfLines={1}
                    >
                      {node.isRevealed ? node.name : '? Unknown'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090e',
    overflow: 'hidden',
    position: 'relative',
  },
  zoomControls: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(11, 12, 14, 0.85)',
    padding: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  zoomButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  zoomButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  resetButtonText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  zoomLabelBox: {
    paddingHorizontal: 6,
  },
  zoomLabel: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    color: COLORS.accent,
  },
  viewport: {
    flex: 1,
  },
  scrollContent: {
    minWidth: '100%',
    minHeight: '100%',
  },
  canvasArea: {
    position: 'relative',
    backgroundColor: '#07090e',
  },
  fallbackEdgeItem: {
    position: 'absolute',
    width: 1,
    height: 1,
  },
  nodeAnchor: {
    position: 'absolute',
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  nodeCircle: {
    width: NODE_RADIUS * 2,
    height: NODE_RADIUS * 2,
    borderRadius: NODE_RADIUS,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircleSelected: {
    borderWidth: 3,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  nodeIconText: {
    ...TYPOGRAPHY.monospace,
    fontSize: 10,
    fontWeight: '700',
  },
  nodeLabelWrapper: {
    position: 'absolute',
    top: NODE_RADIUS * 2 + 2,
    width: 100,
    alignItems: 'center',
  },
  nodeLabelText: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
  },
  nodeLabelUnrevealed: {
    color: COLORS.danger,
    fontStyle: 'italic',
  },
  nodeLabelSelected: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});
