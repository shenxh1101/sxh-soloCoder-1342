import * as THREE from 'three';
import { ParkingSpot, FLOOR_COUNT, ROWS_PER_FLOOR, COLS_PER_FLOOR, PRESET_PLATES } from '@/types/parking';

export const FLOOR_HEIGHT = 3.5;
export const SPOT_WIDTH = 2.8;
export const SPOT_LENGTH = 5.5;
export const AISLE_WIDTH = 4;
export const PARKING_WIDTH = COLS_PER_FLOOR * SPOT_WIDTH + AISLE_WIDTH;
export const PARKING_LENGTH = ROWS_PER_FLOOR * SPOT_LENGTH;

export const ENTRANCE_POSITION = new THREE.Vector3(
  PARKING_WIDTH / 2 + 5,
  0,
  PARKING_LENGTH + 8
);

export function generateParkingSpots(): ParkingSpot[] {
  const spots: ParkingSpot[] = [];
  const platesCopy = [...PRESET_PLATES];
  
  const allSpotIndices: { floor: number; row: number; col: number; x: number; y: number; z: number }[] = [];
  
  for (let floor = 0; floor < FLOOR_COUNT; floor++) {
    for (let row = 0; row < ROWS_PER_FLOOR; row++) {
      for (let col = 0; col < COLS_PER_FLOOR; col++) {
        const x = col * SPOT_WIDTH + SPOT_WIDTH / 2 - PARKING_WIDTH / 2 + SPOT_WIDTH / 2;
        const z = row * SPOT_LENGTH + SPOT_LENGTH / 2 - PARKING_LENGTH / 2;
        const y = floor * FLOOR_HEIGHT;
        allSpotIndices.push({ floor, row, col, x, y, z });
      }
    }
  }
  
  for (let i = allSpotIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allSpotIndices[i], allSpotIndices[j]] = [allSpotIndices[j], allSpotIndices[i]];
  }
  
  const occupiedCount = Math.floor(allSpotIndices.length * 0.5);
  const guaranteedPlateSpots = allSpotIndices.slice(0, PRESET_PLATES.length);
  const randomOccupiedSpots = allSpotIndices.slice(PRESET_PLATES.length, occupiedCount);
  
  const occupiedIndices = new Set([
    ...guaranteedPlateSpots.map((_, i) => i),
    ...randomOccupiedSpots.map((_, i) => i + PRESET_PLATES.length),
  ]);
  
  const finalSpots = [...guaranteedPlateSpots, ...randomOccupiedSpots, ...allSpotIndices.slice(occupiedCount)];
  
  let plateIdx = 0;
  
  for (let i = 0; i < finalSpots.length; i++) {
    const info = finalSpots[i];
    const id = `F${info.floor}-R${info.row}-C${info.col}`;
    
    const isOccupied = occupiedIndices.has(i);
    let plateNumber: string | undefined;
    let vehicleType: 'car' | 'suv' | 'none' = 'none';
    
    if (isOccupied) {
      if (plateIdx < PRESET_PLATES.length) {
        plateNumber = platesCopy[plateIdx];
        plateIdx++;
      }
      vehicleType = Math.random() > 0.7 ? 'suv' : 'car';
    }
    
    spots.push({
      id,
      floor: info.floor,
      row: info.row,
      col: info.col,
      position: { x: info.x, y: info.y, z: info.z },
      isOccupied,
      plateNumber,
      vehicleType,
    });
  }
  
  spots.sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  
  return spots;
}

export function findSpotByPlate(spots: ParkingSpot[], plate: string): ParkingSpot | undefined {
  return spots.find(s => s.plateNumber === plate);
}

export function getRampPosition(floor: number): THREE.Vector3 {
  return new THREE.Vector3(
    PARKING_WIDTH / 2 - 2,
    floor * FLOOR_HEIGHT,
    -PARKING_LENGTH / 2 + 3
  );
}
