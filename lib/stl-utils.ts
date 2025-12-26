
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { MeshSettings } from '../types';

const WORLD_SIZE = 100;

export async function processImageData(imageUrl: string, resolution: number): Promise<Uint8ClampedArray | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, resolution, resolution);
      const imageData = ctx.getImageData(0, 0, resolution, resolution);
      resolve(imageData.data);
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

function simplifyPath(points: THREE.Vector2[], tolerance: number): THREE.Vector2[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = distToSegment(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, index + 1), tolerance);
    const right = simplifyPath(points.slice(index), tolerance);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

function distToSegment(p: THREE.Vector2, v: THREE.Vector2, w: THREE.Vector2): number {
  const l2 = v.distanceToSquared(w);
  if (l2 === 0) return p.distanceTo(v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return p.distanceTo(new THREE.Vector2(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y)));
}

function isPointInPolygon(point: THREE.Vector2, polygon: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

interface ContourInfo {
  shape: THREE.Shape | null;
  points: THREE.Vector2[];
  area: number;
  depth: number;
  parent: ContourInfo | null;
  isHole: boolean;
}

export function traceContours(pixelData: Uint8ClampedArray, res: number, settings: MeshSettings): THREE.Shape[] {
  const { maskThreshold, contrast, invert, simplification } = settings;
  const grid = new Float32Array(res * res);

  // Pre-process image data
  for (let i = 0; i < res * res; i++) {
    const idx = i * 4;
    let val = (0.299 * pixelData[idx] + 0.587 * pixelData[idx + 1] + 0.114 * pixelData[idx + 2]) / 255;
    const alpha = pixelData[idx + 3] / 255;
    val *= alpha;
    if (invert) val = 1 - val;
    if (contrast > 1) val = Math.max(0, Math.min(1, (val - 0.5) * contrast + 0.5));
    grid[i] = val;
  }

  // Marching Squares Edge Detection
  const edges: [number, number, number, number][] = [];
  for (let y = 0; y < res - 1; y++) {
    for (let x = 0; x < res - 1; x++) {
      const v0 = grid[y * res + x] > maskThreshold ? 1 : 0;
      const v1 = grid[y * res + (x + 1)] > maskThreshold ? 1 : 0;
      const v2 = grid[(y + 1) * res + (x + 1)] > maskThreshold ? 1 : 0;
      const v3 = grid[(y + 1) * res + x] > maskThreshold ? 1 : 0;

      const caseIdx = (v0 << 3) | (v1 << 2) | (v2 << 1) | v3;
      switch (caseIdx) {
        case 1: case 14: edges.push([x, y + 0.5, x + 0.5, y + 1]); break;
        case 2: case 13: edges.push([x + 0.5, y + 1, x + 1, y + 0.5]); break;
        case 3: case 12: edges.push([x, y + 0.5, x + 1, y + 0.5]); break;
        case 4: case 11: edges.push([x + 0.5, y, x + 1, y + 0.5]); break;
        case 5: 
          edges.push([x, y + 0.5, x + 0.5, y]);
          edges.push([x + 0.5, y + 1, x + 1, y + 0.5]);
          break;
        case 6: case 9: edges.push([x + 0.5, y, x + 0.5, y + 1]); break;
        case 7: case 8: edges.push([x, y + 0.5, x + 0.5, y]); break;
        case 10:
          edges.push([x + 0.5, y, x + 1, y + 0.5]);
          edges.push([x, y + 0.5, x + 0.5, y + 1]);
          break;
      }
    }
  }

  // O(N) Loop Stitching
  const loops: THREE.Vector2[][] = [];
  const pointMap = new Map<string, number[]>();
  const getCoordKey = (x: number, y: number) => `${x.toFixed(2)},${y.toFixed(2)}`;

  edges.forEach((edge, index) => {
    const k1 = getCoordKey(edge[0], edge[1]);
    const k2 = getCoordKey(edge[2], edge[3]);
    if (!pointMap.has(k1)) pointMap.set(k1, []);
    if (!pointMap.has(k2)) pointMap.set(k2, []);
    pointMap.get(k1)!.push(index);
    pointMap.get(k2)!.push(index);
  });

  const usedEdges = new Uint8Array(edges.length);
  for (let i = 0; i < edges.length; i++) {
    if (usedEdges[i]) continue;

    const currentLoop: THREE.Vector2[] = [];
    usedEdges[i] = 1;
    
    const edge = edges[i];
    currentLoop.push(new THREE.Vector2(edge[0], edge[1]));
    let nextX = edge[2];
    let nextY = edge[3];

    let found = true;
    while (found) {
      found = false;
      const key = getCoordKey(nextX, nextY);
      const candidates = pointMap.get(key) || [];
      for (const idx of candidates) {
        if (!usedEdges[idx]) {
          usedEdges[idx] = 1;
          const e = edges[idx];
          if (Math.abs(e[0] - nextX) < 0.01 && Math.abs(e[1] - nextY) < 0.01) {
            currentLoop.push(new THREE.Vector2(e[0], e[1]));
            nextX = e[2]; nextY = e[3];
          } else {
            currentLoop.push(new THREE.Vector2(e[2], e[3]));
            nextX = e[0]; nextY = e[1];
          }
          found = true;
          break;
        }
      }
    }
    if (currentLoop.length > 2) loops.push(currentLoop);
  }

  // Normalize Coordinates to World Scale (100x100) and Simplify
  const scale = WORLD_SIZE / res;
  
  const contourInfos: ContourInfo[] = loops.map(l => {
    const simplified = simplifyPath(l, simplification || 0.1);
    // Center at (0,0) and scale
    const points = simplified.map(p => new THREE.Vector2(
      (p.x - res/2) * scale, 
      (res/2 - p.y) * scale
    ));
    
    // Calculate area
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i], p2 = points[(i+1)%points.length];
      area += (p1.x * p2.y - p2.x * p1.y);
    }
    
    return { 
      shape: null,
      points, 
      area: Math.abs(area),
      depth: 0,
      parent: null,
      isHole: false
    };
  });

  // Sort by area (descending) to detect nesting
  contourInfos.sort((a, b) => b.area - a.area);

  // Build Hierarchy (Even-Odd Rule)
  // We iterate through the sorted list. Since it's sorted by area, any parent must appear before its child.
  for (let i = 0; i < contourInfos.length; i++) {
    const obj = contourInfos[i];
    let parent: ContourInfo | null = null;
    let minParentArea = Infinity;

    // Check all potential parents (items before this one)
    for (let j = 0; j < i; j++) {
      const p = contourInfos[j];
      if (p.area < minParentArea && isPointInPolygon(obj.points[0], p.points)) {
        parent = p;
        minParentArea = p.area;
      }
    }

    const depth = parent ? parent.depth + 1 : 0;
    // Even depth = Solid (0, 2, 4...), Odd depth = Hole (1, 3, 5...)
    const isHole = depth % 2 !== 0;
    
    obj.parent = parent;
    obj.depth = depth;
    obj.isHole = isHole;
  }

  const finalShapes: THREE.Shape[] = [];

  // Enforce Winding Order and Create Shapes
  // Solids must be CCW. Holes must be CW.
  for (const obj of contourInfos) {
    const isCW = THREE.ShapeUtils.isClockWise(obj.points);

    if (obj.isHole) {
      if (!isCW) obj.points.reverse();
      // Add to parent's holes
      if (obj.parent && obj.parent.shape) {
        obj.parent.shape.holes.push(new THREE.Path(obj.points));
      }
    } else {
      if (isCW) obj.points.reverse();
      // Create new shape
      obj.shape = new THREE.Shape(obj.points);
      finalShapes.push(obj.shape);
    }
  }

  return finalShapes;
}

/**
 * Strips all attributes except position and normal, and converts to non-indexed.
 * This ensures compatibility for mergeGeometries.
 */
function normalizeGeometry(geom: THREE.BufferGeometry): THREE.BufferGeometry {
    let result = geom;
    if (result.index) {
        result = result.toNonIndexed();
    }
    const attributesToKeep = ['position', 'normal'];
    Object.keys(result.attributes).forEach(attr => {
        if (!attributesToKeep.includes(attr)) {
            result.deleteAttribute(attr);
        }
    });
    return result;
}

export function createSolidGeometry(
  pixelData: Uint8ClampedArray,
  res: number,
  settings: MeshSettings
): THREE.BufferGeometry {
  const { heightScale, baseThickness, flatTop, enableBase } = settings;
  
  if (flatTop) {
    const shapes = traceContours(pixelData, res, settings);
    if (shapes.length === 0) return new THREE.BufferGeometry();

    const extrudeSettings = { 
        depth: heightScale, 
        bevelEnabled: false,
        steps: 1 // Optimize for vertical walls
    };
    
    const geometries = shapes.map(s => {
        const g = new THREE.ExtrudeGeometry(s, extrudeSettings);
        return normalizeGeometry(g);
    });
    
    let merged = mergeGeometries(geometries);
    if (!merged) {
        console.error("Failed to merge extruded geometries");
        return new THREE.BufferGeometry();
    }
    
    // Only generate base if enabled
    if (enableBase) {
      merged.translate(0, 0, baseThickness);
      
      const baseGeom = new THREE.BoxGeometry(WORLD_SIZE, WORLD_SIZE, baseThickness);
      const normBase = normalizeGeometry(baseGeom);
      normBase.translate(0, 0, baseThickness / 2);
      
      const finalGeom = mergeGeometries([normBase, merged]);
      if (!finalGeom) return merged;
      
      return finalGeom;
    }
    
    // Return just the extrusion if base is disabled
    return merged;
  }

  const geometry = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, res - 1, res - 1);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = Math.floor(i % res);
    const y = Math.floor(i / res);
    const idx = (y * res + x) * 4;
    let val = (pixelData[idx] + pixelData[idx+1] + pixelData[idx+2]) / 3 / 255;
    if (settings.invert) val = 1 - val;
    // For lithophane, we might still want baseThickness as a minimum offset
    pos.setZ(i, val * heightScale + baseThickness);
  }
  geometry.computeVertexNormals();
  return normalizeGeometry(geometry);
}

export function exportSTL(mesh: THREE.Mesh, filename: string) {
  const exporter = new STLExporter();
  const result = exporter.parse(mesh, { binary: true });
  const blob = new Blob([result], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.href = URL.createObjectURL(blob);
  link.download = filename.endsWith('.stl') ? filename : `${filename}.stl`;
  link.click();
  document.body.removeChild(link);
}
