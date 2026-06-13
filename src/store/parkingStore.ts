import { create } from 'zustand';
import { AppState, ParkingSpot, SearchHistoryItem, CameraMode } from '@/types/parking';
import { generateParkingSpots, findSpotByPlate } from '@/utils/parkingData';

interface VehicleLeftEvent {
  plateNumber: string;
  timestamp: number;
}

const useParkingStore = create<AppState & {
  setParkingSpots: (spots: ParkingSpot[]) => void;
  updateSpot: (spotId: string, updates: Partial<ParkingSpot>) => void;
  startNavigation: (plateNumber: string) => boolean;
  stopNavigation: () => void;
  updateNavigationProgress: (distanceRemaining: number, currentFloor: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  addSearchHistory: (item: SearchHistoryItem) => void;
  clearHistory: () => void;
  setSimulationActive: (active: boolean) => void;
  setSelectedPlate: (plate: string | null) => void;
  initializeSpots: () => void;
  vehicleLeftEvent: VehicleLeftEvent | null;
  clearVehicleLeftEvent: () => void;
}>((set, get) => ({
  parkingSpots: [],
  navigation: {
    isActive: false,
    targetSpotId: null,
    plateNumber: null,
    currentFloor: 0,
    distanceRemaining: 0,
    totalDistance: 0,
    pathPoints: [],
  },
  cameraMode: 'orbit',
  searchHistory: [],
  simulationActive: true,
  selectedPlate: null,
  vehicleLeftEvent: null,

  initializeSpots: () => {
    const spots = generateParkingSpots();
    set({ parkingSpots: spots });
  },

  setParkingSpots: (spots) => set({ parkingSpots: spots }),

  updateSpot: (spotId, updates) => set((state) => {
    const spot = state.parkingSpots.find(s => s.id === spotId);
    const spots = state.parkingSpots.map(s =>
      s.id === spotId ? { ...s, ...updates } : s
    );
    
    const nav = state.navigation;
    if (nav.isActive && nav.targetSpotId === spotId && updates.isOccupied === false) {
      const plate = spot?.plateNumber || nav.plateNumber || '';
      return {
        parkingSpots: spots,
        navigation: {
          ...nav,
          isActive: false,
        },
        selectedPlate: null,
        vehicleLeftEvent: {
          plateNumber: plate,
          timestamp: Date.now(),
        },
      };
    }
    
    return { parkingSpots: spots };
  }),

  startNavigation: (plateNumber) => {
    const state = get();
    const spot = findSpotByPlate(state.parkingSpots, plateNumber);
    
    if (!spot || !spot.isOccupied) {
      return false;
    }
    
    set({
      selectedPlate: plateNumber,
    });
    
    return true;
  },

  stopNavigation: () => set((state) => ({
    navigation: {
      ...state.navigation,
      isActive: false,
    },
  })),

  updateNavigationProgress: (distanceRemaining, currentFloor) => set((state) => ({
    navigation: {
      ...state.navigation,
      distanceRemaining,
      currentFloor,
    },
  })),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  addSearchHistory: (item) => set((state) => {
    const filtered = state.searchHistory.filter(h => h.plateNumber !== item.plateNumber);
    const newHistory = [item, ...filtered].slice(0, 5);
    return { searchHistory: newHistory };
  }),

  clearHistory: () => set({ searchHistory: [] }),

  setSimulationActive: (active) => set({ simulationActive: active }),

  setSelectedPlate: (plate) => set({ selectedPlate: plate }),

  clearVehicleLeftEvent: () => set({ vehicleLeftEvent: null }),
}));

export default useParkingStore;
