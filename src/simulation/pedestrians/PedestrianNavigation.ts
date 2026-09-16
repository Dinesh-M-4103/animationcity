import * as THREE from 'three';
import type { SidewalkEdge, SidewalkNode } from '../../types/Pedestrian';

export class PedestrianNavigation {
  private readonly nodes = new Map<string, SidewalkNode>();
  private readonly adjacency = new Map<string, SidewalkEdge[]>();

  constructor() {
    this.buildGraph();
  }

  getNode(id: string): SidewalkNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`SidewalkNode ${id} not found`);
    return node;
  }

  getAllNodes(): SidewalkNode[] {
    return [...this.nodes.values()];
  }

  getAllEdges(): SidewalkEdge[] {
    const edges: SidewalkEdge[] = [];
    for (const list of this.adjacency.values()) {
      edges.push(...list);
    }
    return edges;
  }

  getNodesByType(type: SidewalkNode['type']): SidewalkNode[] {
    return this.getAllNodes().filter((n) => n.type === type);
  }

  getRandomDestination(excludeNodeId?: string): SidewalkNode {
    const candidates = this.getAllNodes().filter((n) => n.id !== excludeNodeId);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  getRandomSpawnNode(): SidewalkNode {
    // Prefer sidewalk nodes or building entrances for natural spawning
    const spawns = this.getAllNodes().filter(
      (n) => n.type === 'SIDEWALK' || n.type === 'BUILDING_ENTRANCE' || n.type === 'PLAZA_BENCH',
    );
    return spawns[Math.floor(Math.random() * spawns.length)];
  }

  findPath(startNodeId: string, endNodeId: string): string[] {
    if (startNodeId === endNodeId) return [startNodeId];

    const queue: string[] = [startNodeId];
    const visited = new Set<string>([startNodeId]);
    const parent = new Map<string, string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === endNodeId) {
        // Reconstruct path
        const path: string[] = [];
        let curr: string | undefined = endNodeId;
        while (curr) {
          path.unshift(curr);
          curr = parent.get(curr);
        }
        return path;
      }

      const neighbors = this.adjacency.get(current) ?? [];
      for (const edge of neighbors) {
        if (!visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          parent.set(edge.toNodeId, current);
          queue.push(edge.toNodeId);
        }
      }
    }

    return [startNodeId];
  }

  getPathWaypoints(nodeIds: string[]): THREE.Vector3[] {
    const y = 0.16; // sidewalk walking surface height
    return nodeIds.map((id) => {
      const node = this.getNode(id);
      return new THREE.Vector3(node.x, y, node.z);
    });
  }

  private addNode(node: SidewalkNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  private addBidirectionalEdge(fromId: string, toId: string, isCrosswalk = false, crosswalkId?: string): void {
    const from = this.getNode(fromId);
    const to = this.getNode(toId);
    const dist = Math.hypot(to.x - from.x, to.z - from.z);

    this.adjacency.get(fromId)?.push({
      fromNodeId: fromId,
      toNodeId: toId,
      distance: dist,
      isCrosswalk,
      crosswalkId,
    });

    this.adjacency.get(toId)?.push({
      fromNodeId: toId,
      toNodeId: fromId,
      distance: dist,
      isCrosswalk,
      crosswalkId,
    });
  }

  private buildGraph(): void {
    // ============================================================
    // 1. NORTH-WEST BLOCK (NW)
    // ============================================================
    this.addNode({ id: 'nw-wait-north', x: -9.5, z: -9.2, type: 'CORNER_WAITING', block: 'NW', crosswalkId: 'crosswalk-north' });
    this.addNode({ id: 'nw-wait-west', x: -9.2, z: -9.5, type: 'CORNER_WAITING', block: 'NW', crosswalkId: 'crosswalk-west' });
    this.addNode({ id: 'nw-corner', x: -11.5, z: -11.5, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-curb-s1', x: -22.0, z: -11.5, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-curb-s2', x: -35.0, z: -11.5, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-curb-s3', x: -55.0, z: -11.5, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-curb-e1', x: -11.5, z: -22.0, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-curb-e2', x: -11.5, z: -35.0, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-curb-e3', x: -11.5, z: -55.0, type: 'SIDEWALK', block: 'NW' });
    this.addNode({ id: 'nw-bench', x: -16.0, z: -15.0, type: 'PLAZA_BENCH', block: 'NW' });
    this.addNode({ id: 'nw-bldg-01', x: -35.0, z: -20.5, type: 'BUILDING_ENTRANCE', block: 'NW', buildingId: 'building-nw-01' });
    this.addNode({ id: 'nw-bldg-02', x: -55.0, z: -24.5, type: 'BUILDING_ENTRANCE', block: 'NW', buildingId: 'building-nw-02' });

    // NW Connections
    this.addBidirectionalEdge('nw-wait-north', 'nw-corner');
    this.addBidirectionalEdge('nw-wait-west', 'nw-corner');
    this.addBidirectionalEdge('nw-corner', 'nw-bench');
    this.addBidirectionalEdge('nw-corner', 'nw-curb-s1');
    this.addBidirectionalEdge('nw-curb-s1', 'nw-curb-s2');
    this.addBidirectionalEdge('nw-curb-s2', 'nw-curb-s3');
    this.addBidirectionalEdge('nw-curb-s2', 'nw-bldg-01');
    this.addBidirectionalEdge('nw-curb-s3', 'nw-bldg-02');
    this.addBidirectionalEdge('nw-corner', 'nw-curb-e1');
    this.addBidirectionalEdge('nw-curb-e1', 'nw-curb-e2');
    this.addBidirectionalEdge('nw-curb-e2', 'nw-curb-e3');
    this.addBidirectionalEdge('nw-bench', 'nw-curb-s1');
    this.addBidirectionalEdge('nw-bench', 'nw-curb-e1');

    // ============================================================
    // 2. NORTH-EAST BLOCK (NE)
    // ============================================================
    this.addNode({ id: 'ne-wait-north', x: 9.5, z: -9.2, type: 'CORNER_WAITING', block: 'NE', crosswalkId: 'crosswalk-north' });
    this.addNode({ id: 'ne-wait-east', x: 9.2, z: -9.5, type: 'CORNER_WAITING', block: 'NE', crosswalkId: 'crosswalk-east' });
    this.addNode({ id: 'ne-corner', x: 11.5, z: -11.5, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-curb-s1', x: 22.0, z: -11.5, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-curb-s2', x: 33.0, z: -11.5, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-curb-s3', x: 56.0, z: -11.5, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-curb-w1', x: 11.5, z: -22.0, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-curb-w2', x: 11.5, z: -35.0, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-curb-w3', x: 11.5, z: -55.0, type: 'SIDEWALK', block: 'NE' });
    this.addNode({ id: 'ne-bench', x: 15.0, z: -16.0, type: 'PLAZA_BENCH', block: 'NE' });
    this.addNode({ id: 'ne-bldg-01', x: 33.0, z: -23.5, type: 'BUILDING_ENTRANCE', block: 'NE', buildingId: 'building-ne-01' });
    this.addNode({ id: 'ne-bldg-02', x: 56.0, z: -16.5, type: 'BUILDING_ENTRANCE', block: 'NE', buildingId: 'building-ne-02' });

    // NE Connections
    this.addBidirectionalEdge('ne-wait-north', 'ne-corner');
    this.addBidirectionalEdge('ne-wait-east', 'ne-corner');
    this.addBidirectionalEdge('ne-corner', 'ne-bench');
    this.addBidirectionalEdge('ne-corner', 'ne-curb-s1');
    this.addBidirectionalEdge('ne-curb-s1', 'ne-curb-s2');
    this.addBidirectionalEdge('ne-curb-s2', 'ne-curb-s3');
    this.addBidirectionalEdge('ne-curb-s2', 'ne-bldg-01');
    this.addBidirectionalEdge('ne-curb-s3', 'ne-bldg-02');
    this.addBidirectionalEdge('ne-corner', 'ne-curb-w1');
    this.addBidirectionalEdge('ne-curb-w1', 'ne-curb-w2');
    this.addBidirectionalEdge('ne-curb-w2', 'ne-curb-w3');
    this.addBidirectionalEdge('ne-bench', 'ne-curb-s1');
    this.addBidirectionalEdge('ne-bench', 'ne-curb-w1');

    // ============================================================
    // 3. SOUTH-WEST BLOCK (SW)
    // ============================================================
    this.addNode({ id: 'sw-wait-south', x: -9.5, z: 9.2, type: 'CORNER_WAITING', block: 'SW', crosswalkId: 'crosswalk-south' });
    this.addNode({ id: 'sw-wait-west', x: -9.2, z: 9.5, type: 'CORNER_WAITING', block: 'SW', crosswalkId: 'crosswalk-west' });
    this.addNode({ id: 'sw-corner', x: -11.5, z: 11.5, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-curb-n1', x: -22.0, z: 11.5, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-curb-n2', x: -32.0, z: 11.5, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-curb-n3', x: -56.0, z: 11.5, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-curb-e1', x: -11.5, z: 22.0, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-curb-e2', x: -11.5, z: 35.0, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-curb-e3', x: -11.5, z: 55.0, type: 'SIDEWALK', block: 'SW' });
    this.addNode({ id: 'sw-bench', x: -15.0, z: 16.0, type: 'PLAZA_BENCH', block: 'SW' });
    this.addNode({ id: 'sw-bldg-01', x: -32.0, z: 24.5, type: 'BUILDING_ENTRANCE', block: 'SW', buildingId: 'building-sw-01' });
    this.addNode({ id: 'sw-bldg-02', x: -56.0, z: 24.5, type: 'BUILDING_ENTRANCE', block: 'SW', buildingId: 'building-sw-02' });

    // SW Connections
    this.addBidirectionalEdge('sw-wait-south', 'sw-corner');
    this.addBidirectionalEdge('sw-wait-west', 'sw-corner');
    this.addBidirectionalEdge('sw-corner', 'sw-bench');
    this.addBidirectionalEdge('sw-corner', 'sw-curb-n1');
    this.addBidirectionalEdge('sw-curb-n1', 'sw-curb-n2');
    this.addBidirectionalEdge('sw-curb-n2', 'sw-curb-n3');
    this.addBidirectionalEdge('sw-curb-n2', 'sw-bldg-01');
    this.addBidirectionalEdge('sw-curb-n3', 'sw-bldg-02');
    this.addBidirectionalEdge('sw-corner', 'sw-curb-e1');
    this.addBidirectionalEdge('sw-curb-e1', 'sw-curb-e2');
    this.addBidirectionalEdge('sw-curb-e2', 'sw-curb-e3');
    this.addBidirectionalEdge('sw-bench', 'sw-curb-n1');
    this.addBidirectionalEdge('sw-bench', 'sw-curb-e1');

    // ============================================================
    // 4. SOUTH-EAST BLOCK (SE)
    // ============================================================
    this.addNode({ id: 'se-wait-south', x: 9.5, z: 9.2, type: 'CORNER_WAITING', block: 'SE', crosswalkId: 'crosswalk-south' });
    this.addNode({ id: 'se-wait-east', x: 9.2, z: 9.5, type: 'CORNER_WAITING', block: 'SE', crosswalkId: 'crosswalk-east' });
    this.addNode({ id: 'se-corner', x: 11.5, z: 11.5, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-curb-n1', x: 22.0, z: 11.5, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-curb-n2', x: 32.0, z: 11.5, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-curb-n3', x: 55.0, z: 11.5, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-curb-w1', x: 11.5, z: 22.0, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-curb-w2', x: 11.5, z: 35.0, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-curb-w3', x: 11.5, z: 55.0, type: 'SIDEWALK', block: 'SE' });
    this.addNode({ id: 'se-bench', x: 16.0, z: 15.0, type: 'PLAZA_BENCH', block: 'SE' });
    this.addNode({ id: 'se-bldg-01', x: 32.0, z: 20.5, type: 'BUILDING_ENTRANCE', block: 'SE', buildingId: 'building-se-01' });
    this.addNode({ id: 'se-bldg-02', x: 55.0, z: 28.5, type: 'BUILDING_ENTRANCE', block: 'SE', buildingId: 'building-se-02' });

    // SE Connections
    this.addBidirectionalEdge('se-wait-south', 'se-corner');
    this.addBidirectionalEdge('se-wait-east', 'se-corner');
    this.addBidirectionalEdge('se-corner', 'se-bench');
    this.addBidirectionalEdge('se-corner', 'se-curb-n1');
    this.addBidirectionalEdge('se-curb-n1', 'se-curb-n2');
    this.addBidirectionalEdge('se-curb-n2', 'se-curb-n3');
    this.addBidirectionalEdge('se-curb-n2', 'se-bldg-01');
    this.addBidirectionalEdge('se-curb-n3', 'se-bldg-02');
    this.addBidirectionalEdge('se-corner', 'se-curb-w1');
    this.addBidirectionalEdge('se-curb-w1', 'se-curb-w2');
    this.addBidirectionalEdge('se-curb-w2', 'se-curb-w3');
    this.addBidirectionalEdge('se-bench', 'se-curb-n1');
    this.addBidirectionalEdge('se-bench', 'se-curb-w1');

    // ============================================================
    // 5. CROSSWALK EDGES ACROSS ROADS
    // ============================================================
    // North Crosswalk across Harbor St (between NW and NE)
    this.addNode({ id: 'crosswalk-north-mid', x: 0, z: -8.96, type: 'CROSSWALK', block: 'ROAD', crosswalkId: 'crosswalk-north' });
    this.addBidirectionalEdge('nw-wait-north', 'crosswalk-north-mid', true, 'crosswalk-north');
    this.addBidirectionalEdge('crosswalk-north-mid', 'ne-wait-north', true, 'crosswalk-north');

    // South Crosswalk across Harbor St (between SW and SE)
    this.addNode({ id: 'crosswalk-south-mid', x: 0, z: 8.96, type: 'CROSSWALK', block: 'ROAD', crosswalkId: 'crosswalk-south' });
    this.addBidirectionalEdge('sw-wait-south', 'crosswalk-south-mid', true, 'crosswalk-south');
    this.addBidirectionalEdge('crosswalk-south-mid', 'se-wait-south', true, 'crosswalk-south');

    // West Crosswalk across Market Ave (between NW and SW)
    this.addNode({ id: 'crosswalk-west-mid', x: -8.96, z: 0, type: 'CROSSWALK', block: 'ROAD', crosswalkId: 'crosswalk-west' });
    this.addBidirectionalEdge('nw-wait-west', 'crosswalk-west-mid', true, 'crosswalk-west');
    this.addBidirectionalEdge('crosswalk-west-mid', 'sw-wait-west', true, 'crosswalk-west');

    // East Crosswalk across Market Ave (between NE and SE)
    this.addNode({ id: 'crosswalk-east-mid', x: 8.96, z: 0, type: 'CROSSWALK', block: 'ROAD', crosswalkId: 'crosswalk-east' });
    this.addBidirectionalEdge('ne-wait-east', 'crosswalk-east-mid', true, 'crosswalk-east');
    this.addBidirectionalEdge('crosswalk-east-mid', 'se-wait-east', true, 'crosswalk-east');
  }
}
