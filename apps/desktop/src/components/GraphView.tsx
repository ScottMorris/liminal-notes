import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import { useLinkIndex } from './LinkIndexContext';
import { useSearchIndex } from './SearchIndexContext';
import { useTheme } from '../theme';

interface GraphNode extends NodeObject {
  id: string;
  title: string;
  val: number; // degree
}

interface GraphEdge {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

interface GraphViewProps {
  selectedFile: string | null;
  onSelect: (path: string) => void;
}

export const GraphView = ({ selectedFile, onSelect }: GraphViewProps) => {
  const { linkIndex } = useLinkIndex();
  const { getEntry } = useSearchIndex();
  const { themeId } = useTheme();

  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Manage dynamic dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Theme colours
  const [colours, setColours] = useState({
    bg: '#ffffff',
    fg: '#333333',
    accent: '#007bff',
    border: '#cccccc',
    highlight: '#ffcc00'
  });

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setColours({
      bg: style.getPropertyValue('--ln-bg').trim() || '#ffffff',
      fg: style.getPropertyValue('--ln-fg').trim() || '#333333',
      accent: style.getPropertyValue('--ln-accent').trim() || '#007bff',
      border: style.getPropertyValue('--ln-border').trim() || '#cccccc',
      highlight: style.getPropertyValue('--ln-accent').trim() || '#007bff' // Use accent for highlight
    });
  }, [themeId]);

  // Construct Graph Data
  const graphData = useMemo<GraphData>(() => {
    const nodes: GraphNode[] = [];
    const links: GraphEdge[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // 1. Create nodes from LinkIndex outbound keys (all indexed files)
    for (const path of linkIndex.outbound.keys()) {
      const entry = getEntry(path);
      const title = entry ? entry.title : path.split('/').pop()?.replace('.md', '') || path;
      const node: GraphNode = {
        id: path,
        title: title,
        val: 1 // base size
      };
      nodes.push(node);
      nodeMap.set(path, node);
    }

    // 2. Create edges
    for (const [source, wikilinks] of linkIndex.outbound.entries()) {
      for (const link of wikilinks) {
        if (link.targetPath && nodeMap.has(link.targetPath)) {
          // Avoid self-loops if desirable, though wikilinks allow them.
          if (source === link.targetPath) continue;

          links.push({
            source: source,
            target: link.targetPath
          });

          // Increment degree for visualization sizing
          const sourceNode = nodeMap.get(source);
          const targetNode = nodeMap.get(link.targetPath);
          if (sourceNode) sourceNode.val += 1;
          if (targetNode) targetNode.val += 1;
        }
      }
    }

    return { nodes, links };
  }, [linkIndex, getEntry]);

  // Focus on selected node
  const focusNode = useCallback((nodeId: string) => {
    if (!graphRef.current) return;

    // We need to find the node object in the current graph data
    // The force-graph engine mutates the objects to add x, y
    // We can't rely on our local 'nodes' array having x/y immediately unless simulation ran
    // But graphRef.current.graphData() returns the internal data? No, it takes props.

    // Actually, graphData passed to ForceGraph2D is mutated.
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node && typeof node.x === 'number' && typeof node.y === 'number') {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(4, 1000);
    }
  }, [graphData]);

  // Focus when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
        // Slight delay to allow simulation to settle or data to be ready
        const timer = setTimeout(() => {
            focusNode(selectedFile);
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [selectedFile, focusNode]);

  // Also focus on mount/graph load if simulation settles?
  const handleEngineStop = () => {
      if (selectedFile) {
          focusNode(selectedFile);
      } else {
          graphRef.current?.zoomToFit(400);
      }
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden', background: colours.bg }}>
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          // @ts-ignore
          backgroundColor={colours.bg}
          nodeLabel="title"
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isSelected = node.id === selectedFile;
            const color = isSelected ? colours.accent : colours.fg;
            const label = node.title;
            const fontSize = 12 / globalScale;

            // Draw Node
            const radius = 4; // Base radius, could be dynamic based on node.val
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();

            // Draw Label
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = colours.fg; // Always use foreground color for text
            ctx.fillText(label, node.x, node.y + radius + fontSize);
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const radius = 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={() => colours.border}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          onNodeClick={(node) => {
             onSelect(node.id as string);
             // Focus is handled by useEffect on selectedFile change
          }}
          onEngineStop={handleEngineStop}
          cooldownTicks={100}
        />
      )}
    </div>
  );
};
