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
  
  for (let floor = 0; floor < FLOOR_COUNT; floor++) {
    for (let row = 0; row < ROWS_PER_FLOOR; row++) {
      for (let col = 0; col < COLS_PER_FLOOR; col++) {
        const id = `F${floor}-R${row}-C${col}`;
        const x = col * SPOT_WIDTH + SPOT_WIDTH / 2 - PARKING_WIDTH / 2 + SPOT_WIDTH / 2;
        const z = row * SPOT_LENGTH + SPOT_LENGTH / 2 - PARKING_LENGTH / 2;
        const y = floor * FLOOR_HEIGHT;
        
        const isOccupied = Math.random() > 0.5;
        let plateNumber: string | undefined;
        
        if (isOccupied && platesCopy.length > 0) {
          const idx = Math.floor(Math.random() * platesCopy.length);
          plateNumber = platesCopy.splice(idx, 1)[0];
        }
        
        spots.push({
          id,
          floor,
          row,
          col,
          position: { x, y, z },
          isOccupied,
          plateNumber,
          vehicleType: isOccupied ? (Math.random() > 0.7 ? 'suv' : 'car') : 'none',
        });
      }
    }
  }
  
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
