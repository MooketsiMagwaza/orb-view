import { concepts, ROOT_ID } from "../concepts/concepts";
import type { ConceptNode } from "../concepts/types";

export type Edge = {
  id: string;
  from: string;
  to: string;
  /** `tree` links follow parentIds; `related` links are cross-branch connections. */
  kind: "tree" | "related";
  /** Stable pseudo-random value used to vary how each line bows. */
  seed: number;
};

export type Graph = {
  nodes: ConceptNode[];
  byId: Map<string, ConceptNode>;
  /** Children in data order, split by the layer they belong to. */
  layer1: Map<string, string[]>;
  layer2: Map<string, string[]>;
  edges: Edge[];
  /** Every edge touching a node, so drawing only visits what is on screen. */
  edgesOf: Map<string, Edge[]>;
};

function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export function buildGraph(nodes: ConceptNode[]): Graph {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const layer1 = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  const layer2 = new Map<string, string[]>(nodes.map((node) => [node.id, []]));
  const edgesOf = new Map<string, Edge[]>(nodes.map((node) => [node.id, []]));
  const edges: Edge[] = [];

  const addEdge = (edge: Edge) => {
    edges.push(edge);
    edgesOf.get(edge.from)?.push(edge);
    edgesOf.get(edge.to)?.push(edge);
  };

  for (const node of nodes) {
    for (const parentId of node.parentIds) {
      (node.layer === 2 ? layer2 : layer1).get(parentId)?.push(node.id);
      const id = `${parentId}>${node.id}`;
      addEdge({ id, from: parentId, to: node.id, kind: "tree", seed: seedOf(id) });
    }
    for (const relatedId of node.relatedIds) {
      if (node.id < relatedId) {
        const id = `${node.id}~${relatedId}`;
        addEdge({ id, from: node.id, to: relatedId, kind: "related", seed: seedOf(id) });
      }
    }
  }
  return { nodes, byId, layer1, layer2, edges, edgesOf };
}

export const graph = buildGraph(concepts);
export { ROOT_ID };

export function getNode(id: string): ConceptNode {
  const node = graph.byId.get(id);
  if (!node) throw new Error(`Unknown concept: ${id}`);
  return node;
}
