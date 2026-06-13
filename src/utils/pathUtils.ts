import * as THREE from 'three';
import { ParkingSpot, NavigationSegment, FLOOR_NAMES } from '@/types/parking';
import { ENTRANCE_POSITION, getRampPosition, FLOOR_HEIGHT, PARKING_LENGTH, PARKING_WIDTH } from './parkingData';

export function generateNavigationPath(targetSpot: ParkingSpot): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const targetPos = new THREE.Vector3(
    targetSpot.position.x,
    targetSpot.position.y,
    targetSpot.position.z
  );
  
  points.push(ENTRANCE_POSITION.clone());
  
  const entranceToParking = new THREE.Vector3(
    PARKING_WIDTH / 2 - 2,
    0,
    PARKING_LENGTH / 2 - 2
  );
  points.push(entranceToParking);
  
  if (targetSpot.floor > 0) {
    for (let f = 0; f < targetSpot.floor; f++) {
      const rampBottom = getRampPosition(f);
      points.push(rampBottom.clone());
      
      const rampTop = getRampPosition(f + 1);
      const rampMid = new THREE.Vector3(
        PARKING_WIDTH / 2 + 3,
        (f + 0.5) * FLOOR_HEIGHT,
        -PARKING_LENGTH / 2 + 3
      );
      points.push(rampMid);
      points.push(rampTop.clone());
      
      const floorAisle = new THREE.Vector3(
        PARKING_WIDTH / 2 - 2,
        (f + 1) * FLOOR_HEIGHT,
        PARKING_LENGTH / 2 - 2
      );
      points.push(floorAisle);
    }
  }
  
  const targetAisle = new THREE.Vector3(
    targetSpot.position.x,
    targetSpot.position.y,
    PARKING_LENGTH / 2 - 2
  );
  points.push(targetAisle);
  
  const spotApproach = new THREE.Vector3(
    targetSpot.position.x,
    targetSpot.position.y,
    targetSpot.position.z + 1.5
  );
  points.push(spotApproach);
  
  points.push(targetPos);
  
  return points;
}

export function generateNavigationSegments(
  targetSpot: ParkingSpot,
  pathPoints: THREE.Vector3[],
  totalLength: number
): NavigationSegment[] {
  const segments: NavigationSegment[] = [];
  
  const pointToObj = (p: THREE.Vector3) => ({ x: p.x, y: p.y, z: p.z });
  
  const points = generateNavigationPath(targetSpot);
  
  const getProgressForPointIndex = (index: number): number => {
    if (index <= 0) return 0;
    if (index >= pathPoints.length - 1) return 1;
    
    const t = index / (points.length - 1);
    const smoothIndex = Math.floor(t * (pathPoints.length - 1));
    return smoothIndex / (pathPoints.length - 1);
  };
  
  segments.push({
    type: 'floor',
    name: `前往 ${FLOOR_NAMES[targetSpot.floor]} 层`,
    description: targetSpot.floor === 0 ? '沿通道前往B1层停车区域' : `沿坡道前往 ${FLOOR_NAMES[targetSpot.floor]}`,
    startProgress: 0,
    endProgress: getProgressForPointIndex(targetSpot.floor === 0 ? 2 : 2 + targetSpot.floor * 4),
    startPoint: pointToObj(points[0]),
    endPoint: pointToObj(points[targetSpot.floor === 0 ? 2 : 2 + targetSpot.floor * 4]),
  });
  
  const aisleStartIndex = targetSpot.floor === 0 ? 2 : 2 + targetSpot.floor * 4;
  const aisleEndIndex = aisleStartIndex + 1;
  
  segments.push({
    type: 'aisle',
    name: '前往通道口',
    description: `前往 ${targetSpot.row} 号通道`,
    startProgress: getProgressForPointIndex(aisleStartIndex),
    endProgress: getProgressForPointIndex(aisleEndIndex + 1),
    startPoint: pointToObj(points[aisleStartIndex]),
    endPoint: pointToObj(points[aisleEndIndex + 1]),
  });
  
  const spotStartIndex = aisleEndIndex + 1;
  segments.push({
    type: 'spot',
    name: '前往目标车位',
    description: `${targetSpot.row}-${targetSpot.col} 号车位`,
    startProgress: getProgressForPointIndex(spotStartIndex),
    endProgress: 1,
    startPoint: pointToObj(points[spotStartIndex]),
    endPoint: pointToObj(points[points.length - 1]),
  });
  
  return segments;
}

export function getCurrentSegment(
  progress: number,
  segments: NavigationSegment[]
): NavigationSegment | null {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (progress >= segments[i].startProgress - 0.001) {
      return segments[i];
    }
  }
  return segments[0] || null;
}

export function getCurrentSegmentIndex(
  progress: number,
  segments: NavigationSegment[]
): number {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (progress >= segments[i].startProgress - 0.001) {
      return i;
    }
  }
  return 0;
}

export function createSmoothPath(points: THREE.Vector3[], segments: number = 200): {
  curve: THREE.CatmullRomCurve3;
  points: THREE.Vector3[];
  totalLength: number;
} {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const smoothPoints = curve.getPoints(segments);
  const totalLength = curve.getLength();
  
  return { curve, points: smoothPoints, totalLength };
}

export function getPositionOnPath(
  curve: THREE.CatmullRomCurve3,
  progress: number
): THREE.Vector3 {
  return curve.getPoint(progress);
}

export function getCurrentFloor(position: THREE.Vector3): number {
  return Math.round(position.y / FLOOR_HEIGHT);
}

export function calculateDistanceAlongPath(
  curve: THREE.CatmullRomCurve3,
  progress: number
): number {
  return curve.getLength() * (1 - progress);
}
