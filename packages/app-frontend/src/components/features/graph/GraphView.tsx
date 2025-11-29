/**
 * GraphView
 * React Flow wrapper for graph visualization
 *
 * @example
 * ```typescript
 * // Basic usage
 * <GraphView
 *   nodes={[{ id: '1', data: { label: 'Node 1' } }]}
 *   edges={[{ id: 'e1', source: '1', target: '2' }]}
 *   onNodeClick={(node) => console.log(node)}
 * />
 *
 * // With layout
 * <GraphView
 *   nodes={nodes}
 *   edges={edges}
 *   layout="hierarchical"
 *   className="h-96"
 * />
 *
 * // With custom node types
 * <GraphView
 *   nodes={nodes}
 *   edges={edges}
 *   nodeTypes={{ custom: CustomNode }}
 *   onConnect={(connection) => handleConnect(connection)}
 * />
 * ```
 */

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeTypes,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

/**
 * Props for GraphView component
 */
export interface GraphViewProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Array of nodes to display
   */
  nodes: Node<T>[]

  /**
   * Array of edges connecting nodes
   */
  edges: Edge[]

  /**
   * Callback when node is clicked
   */
  onNodeClick?: (node: Node<T>) => void

  /**
   * Callback when node is double-clicked
   */
  onNodeDoubleClick?: (node: Node<T>) => void

  /**
   * Callback when nodes/edges change
   */
  onNodesChange?: (nodes: Node<T>[]) => void
  onEdgesChange?: (edges: Edge[]) => void

  /**
   * Callback when connection is created
   */
  onConnect?: (connection: Connection) => void

  /**
   * Custom node types
   */
  nodeTypes?: NodeTypes

  /**
   * Layout algorithm
   * @default 'manual'
   */
  layout?: 'hierarchical' | 'force' | 'manual'

  /**
   * Show minimap
   * @default true
   */
  showMiniMap?: boolean

  /**
   * Show controls
   * @default true
   */
  showControls?: boolean

  /**
   * Show background
   * @default true
   */
  showBackground?: boolean

  /**
   * Enable node dragging
   * @default true
   */
  nodesDraggable?: boolean

  /**
   * Enable connection
   * @default false
   */
  connectionsEnabled?: boolean

  /**
   * Fit view on mount
   * @default true
   */
  fitView?: boolean

  /**
   * Additional CSS classes
   */
  className?: string

  /**
   * Custom panel content (top-left corner)
   */
  panelContent?: React.ReactNode
}

/**
 * Apply layout algorithm to nodes
 */
function applyLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
  layout: 'hierarchical' | 'force' | 'manual'
): Node<T>[] {
  if (layout === 'manual') {
    return nodes
  }

  // Simple hierarchical layout
  if (layout === 'hierarchical') {
    const levels = new Map<string, number>()
    const visited = new Set<string>()

    // Calculate levels (BFS)
    const queue: Array<{ id: string; level: number }> = []
    nodes.forEach((node) => {
      const hasIncoming = edges.some((e) => e.target === node.id)
      if (!hasIncoming) {
        queue.push({ id: node.id, level: 0 })
      }
    })

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      if (visited.has(id)) continue
      visited.add(id)
      levels.set(id, level)

      edges
        .filter((e) => e.source === id)
        .forEach((e) => {
          queue.push({ id: e.target, level: level + 1 })
        })
    }

    // Position nodes
    const levelGroups = new Map<number, string[]>()
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(id)
    })

    return nodes.map((node) => {
      const level = levels.get(node.id) || 0
      const nodesInLevel = levelGroups.get(level) || []
      const indexInLevel = nodesInLevel.indexOf(node.id)

      return {
        ...node,
        position: {
          x: level * 250,
          y: indexInLevel * 100 + 50,
        },
      }
    })
  }

  // Force layout (simplified - in real app, use d3-force)
  if (layout === 'force') {
    return nodes.map((node, i) => ({
      ...node,
      position: {
        x: (i % 5) * 200,
        y: Math.floor(i / 5) * 150,
      },
    }))
  }

  return nodes
}

/**
 * GraphView component (inner)
 */
function GraphViewInner<T extends Record<string, unknown> = Record<string, unknown>>({
  nodes: initialNodes,
  edges: initialEdges,
  onNodeClick,
  onNodeDoubleClick,
  onNodesChange: onNodesChangeProp,
  onEdgesChange: onEdgesChangeProp,
  onConnect: onConnectProp,
  nodeTypes,
  layout = 'manual',
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  nodesDraggable = true,
  connectionsEnabled = false,
  fitView = true,
  className = '',
  panelContent,
}: GraphViewProps<T>) {
  // Apply layout
  const layoutedNodes = useMemo(
    () => applyLayout(initialNodes, initialEdges, layout),
    [initialNodes, initialEdges, layout]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync with external changes
  useMemo(() => {
    setNodes(layoutedNodes)
  }, [layoutedNodes, setNodes])

  useMemo(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  // Handle connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (connectionsEnabled) {
        setEdges((eds) => addEdge(connection, eds))
        onConnectProp?.(connection)
      }
    },
    [connectionsEnabled, onConnectProp, setEdges]
  )

  // Combine internal and external handlers
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)
      if (onNodesChangeProp) {
        // Get updated nodes after change
        setTimeout(() => {
          onNodesChangeProp(nodes)
        }, 0)
      }
    },
    [onNodesChange, onNodesChangeProp, nodes]
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes)
      if (onEdgesChangeProp) {
        setTimeout(() => {
          onEdgesChangeProp(edges)
        }, 0)
      }
    },
    [onEdgesChange, onEdgesChangeProp, edges]
  )

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_: React.MouseEvent, node: Node) => onNodeClick?.(node as Node<T>)}
        onNodeDoubleClick={(_: React.MouseEvent, node: Node) => onNodeDoubleClick?.(node as Node<T>)}
        nodeTypes={nodeTypes}
        nodesDraggable={nodesDraggable}
        fitView={fitView}
        attributionPosition="bottom-left"
      >
        {showBackground && <Background />}
        {showControls && <Controls />}
        {showMiniMap && (
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            className="bg-gray-50"
          />
        )}
        {panelContent && <Panel position="top-left">{panelContent}</Panel>}
      </ReactFlow>
    </div>
  )
}

/**
 * GraphView component with provider
 *
 * Lightweight wrapper around React Flow with sensible defaults
 *
 * Features:
 * - Auto layout (hierarchical, force)
 * - MiniMap, Controls, Background
 * - Draggable nodes
 * - Custom node types
 * - Click/DoubleClick handlers
 */
export function GraphView<T extends Record<string, unknown> = Record<string, unknown>>(props: GraphViewProps<T>) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  )
}
