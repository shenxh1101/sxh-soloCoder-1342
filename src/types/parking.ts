export interface ParkingSpot {
  id: string;
  floor: number;
  row: number;
  col: number;
  position: { x: number; y: number; z: number };
  isOccupied: boolean;
  plateNumber?: string;
  vehicleType?: 'car' | 'suv' | 'none';
}

export interface SearchHistoryItem {
  plateNumber: string;
  timestamp: number;
  floor: number;
  spotId: string;
  position: { x: number; y: number; z: number };
  lastProgress: number;
  lastSegmentIndex: number;
}

export type NavigationSegmentType = 'floor' | 'aisle' | 'spot' | 'waypoint';

export interface NavigationSegment {
  type: NavigationSegmentType;
  name: string;
  description: string;
  startProgress: number;
  endProgress: number;
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
}

export interface WaypointInfo {
  spotId: string;
  name: string;
  position: { x: number; y: number; z: number };
  floor: number;
  row: number;
  col: number;
}

export interface NavigationState {
  isActive: boolean;
  isPaused: boolean;
  targetSpotId: string | null;
  plateNumber: string | null;
  currentFloor: number;
  distanceRemaining: number;
  totalDistance: number;
  pathPoints: Array<{ x: number; y: number; z: number }>;
  progress: number;
  segments: NavigationSegment[];
  currentSegmentIndex: number;
  waypoint: WaypointInfo | null;
}

export type CameraMode = 'orbit' | 'firstPerson';

export type ContinueOption = 'continue' | 'restart';

export interface ContinueNavigationDialogState {
  isOpen: boolean;
  plateNumber: string | null;
  oldSpot: ParkingSpot | null;
  newSpot: ParkingSpot | null;
}

export interface AppState {
  parkingSpots: ParkingSpot[];
  navigation: NavigationState;
  cameraMode: CameraMode;
  searchHistory: SearchHistoryItem[];
  simulationActive: boolean;
  selectedPlate: string | null;
  continueDialog: ContinueNavigationDialogState;
}

export const PRESET_PLATES = [
  '京A12345',
  '京B67890',
  '沪C11111',
  '粤D22222',
  '川E33333',
  '浙F44444',
  '苏G55555',
  '鲁H66666',
  '冀J77777',
  '豫K88888',
];

export const FLOOR_NAMES = ['B1', 'B2', 'B3'];
export const FLOOR_COUNT = 3;
export const SPOTS_PER_FLOOR = 20;
export const ROWS_PER_FLOOR = 5;
export const COLS_PER_FLOOR = 4;
