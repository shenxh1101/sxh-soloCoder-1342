import * as THREE from 'three';
import { ParkingSpot } from '@/types/parking';
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
