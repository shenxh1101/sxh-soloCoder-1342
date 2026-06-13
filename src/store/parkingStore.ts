import { create } from 'zustand';
import { AppState, ParkingSpot, SearchHistoryItem, CameraMode } from '@/types/parking';
import { generateParkingSpots, findSpotByPlate } from '@/utils/parkingData';
import { generateNavigationPath, createSmoothPath } from '@/utils/pathUtils';

interface VehicleLeftEvent {
  plateNumber: string;
  timestamp: number;
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
}

interface StoreState extends AppState {
  navigation: NavigationState;
  vehicleLeftEvent: VehicleLeftEvent | null;
  selectedFloor: number;
  selectedSpotId: string | null;
}

interface StoreActions {
  initializeSpots: () => void;
  setParkingSpots: (spots: ParkingSpot[], preserveNavigation?: boolean) => void;
  updateSpot: (spotId: string, updates: Partial<ParkingSpot>) => void;
  startNavigation: (plateNumber: string) => boolean;
  startNavigationBySpotId: (spotId: string) => boolean;
  stopNavigation: () => void;
  pauseNavigation: () => void;
  resumeNavigation: () => void;
  togglePauseNavigation: () => void;
  setNavigationProgress: (progress: number) => void;
  stepNavigation: (direction: 'forward' | 'backward', amount?: number) => void;
  updateNavigationProgress: (distanceRemaining: number, currentFloor: number) => void;
  updateNavigationDistance: (distance: number) => void;
  updateNavigationFloor: (floor: number) => void;
  updateNavigationPaused: (isPaused: boolean) => void;
  completeNavigation: () => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  addSearchHistory: (item: SearchHistoryItem) => void;
  clearHistory: () => void;
  setSimulationActive: (active: boolean) => void;
  setSelectedPlate: (plate: string | null) => void;
  clearVehicleLeftEvent: () => void;
  setSelectedFloor: (floor: number) => void;
  setSelectedSpotId: (spotId: string | null) => void;
  focusOnSpot: (spotId: string) => void;
  resetAllState: () => void;
}

const initialNavigationState: NavigationState = {
  isActive: false,
  isPaused: false,
  targetSpotId: null,
  plateNumber: null,
  currentFloor: 0,
  distanceRemaining: 0,
  totalDistance: 0,
  pathPoints: [],
  progress: 0,
};

const useParkingStore = create<StoreState & StoreActions>((set, get) => ({
  parkingSpots: [],
  navigation: initialNavigationState,
  cameraMode: 'orbit',
  searchHistory: [],
  simulationActive: true,
  selectedPlate: null,
  vehicleLeftEvent: null,
  selectedFloor: 0,
  selectedSpotId: null,

  initializeSpots: () => {
    const spots = generateParkingSpots();
    get().setParkingSpots(spots, false);
  },

  setParkingSpots: (spots, preserveNavigation = false) => {
    const state = get();
    let newNav = { ...state.navigation };
    
    if (!preserveNavigation && state.navigation.isActive) {
      const targetSpot = spots.find(s => s.id === state.navigation.targetSpotId);
      if (!targetSpot || !targetSpot.isOccupied || targetSpot.plateNumber !== state.navigation.plateNumber) {
        newNav = { ...initialNavigationState };
      }
    }
    
    if (state.selectedPlate) {
      const spot = findSpotByPlate(spots, state.selectedPlate);
      if (!spot || !spot.isOccupied) {
        set({
          selectedPlate: null,
          selectedSpotId: null,
          vehicleLeftEvent: {
            plateNumber: state.selectedPlate,
            timestamp: Date.now(),
          },
        });
      }
    }
    
    set({
      parkingSpots: spots,
      navigation: newNav,
    });
  },

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
        navigation: { ...initialNavigationState },
        selectedPlate: null,
        selectedSpotId: null,
        vehicleLeftEvent: {
          plateNumber: plate,
          timestamp: Date.now(),
        },
      };
    }
    
    if (state.selectedPlate && spot?.plateNumber === state.selectedPlate && updates.isOccupied === false) {
      return {
        parkingSpots: spots,
        selectedPlate: null,
        selectedSpotId: null,
        vehicleLeftEvent: {
          plateNumber: state.selectedPlate,
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
      set({
        selectedPlate: null,
        selectedSpotId: null,
        vehicleLeftEvent: {
          plateNumber,
          timestamp: Date.now(),
        },
      });
      return false;
    }
    
    const pathPoints = generateNavigationPath(spot);
    const { totalLength, points } = createSmoothPath(pathPoints);
    
    set({
      selectedPlate: plateNumber,
      selectedSpotId: spot.id,
      selectedFloor: spot.floor,
      navigation: {
        isActive: true,
        isPaused: false,
        targetSpotId: spot.id,
        plateNumber,
        currentFloor: 0,
        distanceRemaining: totalLength,
        totalDistance: totalLength,
        pathPoints: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
        progress: 0,
      },
    });
    
    get().addSearchHistory({
      plateNumber,
      timestamp: Date.now(),
      floor: spot.floor,
      spotId: spot.id,
      position: { ...spot.position },
    });
    
    return true;
  },

  startNavigationBySpotId: (spotId) => {
    const state = get();
    const spot = state.parkingSpots.find(s => s.id === spotId);
    
    if (!spot || !spot.isOccupied || !spot.plateNumber) {
      return false;
    }
    
    return get().startNavigation(spot.plateNumber);
  },

  stopNavigation: () => set({
    navigation: { ...initialNavigationState },
    selectedPlate: null,
    selectedSpotId: null,
  }),

  pauseNavigation: () => set((state) => ({
    navigation: { ...state.navigation, isPaused: true },
  })),

  resumeNavigation: () => set((state) => ({
    navigation: { ...state.navigation, isPaused: false },
  })),

  togglePauseNavigation: () => set((state) => ({
    navigation: { ...state.navigation, isPaused: !state.navigation.isPaused },
  })),

  setNavigationProgress: (progress) => set((state) => {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const distanceRemaining = state.navigation.totalDistance * (1 - clampedProgress);
    const points = state.navigation.pathPoints;
    const pointIndex = Math.floor(clampedProgress * (points.length - 1));
    const point = points[pointIndex] || points[0];
    const currentFloor = point ? Math.round(point.y / 3.5) : 0;
    
    return {
      navigation: {
        ...state.navigation,
        progress: clampedProgress,
        distanceRemaining,
        currentFloor: Math.min(Math.max(currentFloor, 0), 2),
      },
    };
  }),

  stepNavigation: (direction, amount = 0.02) => set((state) => {
    if (!state.navigation.isActive) return {};
    
    const delta = direction === 'forward' ? amount : -amount;
    const newProgress = Math.max(0, Math.min(1, state.navigation.progress + delta));
    const distanceRemaining = state.navigation.totalDistance * (1 - newProgress);
    const points = state.navigation.pathPoints;
    const pointIndex = Math.floor(newProgress * (points.length - 1));
    const point = points[pointIndex] || points[0];
    const currentFloor = point ? Math.round(point.y / 3.5) : 0;
    
    return {
      navigation: {
        ...state.navigation,
        progress: newProgress,
        distanceRemaining,
        currentFloor: Math.min(Math.max(currentFloor, 0), 2),
      },
    };
  }),

  updateNavigationProgress: (distanceRemaining, currentFloor) => set((state) => ({
    navigation: {
      ...state.navigation,
      distanceRemaining,
      currentFloor,
    },
  })),

  updateNavigationDistance: (distance) => set((state) => ({
    navigation: {
      ...state.navigation,
      distanceRemaining: distance,
    },
  })),

  updateNavigationFloor: (floor) => set((state) => ({
    navigation: {
      ...state.navigation,
      currentFloor: floor,
    },
  })),

  updateNavigationPaused: (isPaused) => set((state) => ({
    navigation: {
      ...state.navigation,
      isPaused,
    },
  })),

  completeNavigation: () => set({
    navigation: { ...initialNavigationState },
  }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  toggleCameraMode: () => set((state) => ({
    cameraMode: state.cameraMode === 'orbit' ? 'firstPerson' : 'orbit',
  })),

  addSearchHistory: (item) => set((state) => {
    const filtered = state.searchHistory.filter(h => h.plateNumber !== item.plateNumber);
    const newHistory = [item, ...filtered].slice(0, 5);
    return { searchHistory: newHistory };
  }),

  clearHistory: () => set({ searchHistory: [] }),

  setSimulationActive: (active) => set({ simulationActive: active }),

  setSelectedPlate: (plate) => set((state) => {
    if (!plate) {
      return { selectedPlate: null, selectedSpotId: null };
    }
    
    const spot = findSpotByPlate(state.parkingSpots, plate);
    return {
      selectedPlate: plate,
      selectedSpotId: spot?.id || null,
      selectedFloor: spot?.floor || state.selectedFloor,
    };
  }),

  clearVehicleLeftEvent: () => set({ vehicleLeftEvent: null }),

  setSelectedFloor: (floor) => set({ selectedFloor: floor }),

  setSelectedSpotId: (spotId) => set((state) => {
    if (!spotId) {
      return { selectedSpotId: null };
    }
    
    const spot = state.parkingSpots.find(s => s.id === spotId);
    return {
      selectedSpotId: spotId,
      selectedFloor: spot?.floor || state.selectedFloor,
      selectedPlate: spot?.plateNumber || state.selectedPlate,
    };
  }),

  focusOnSpot: (spotId) => {
    const state = get();
    const spot = state.parkingSpots.find(s => s.id === spotId);
    
    if (spot) {
      set({
        selectedSpotId: spotId,
        selectedFloor: spot.floor,
        selectedPlate: spot.plateNumber || null,
      });
    }
  },

  resetAllState: () => {
    const spots = generateParkingSpots();
    set({
      parkingSpots: spots,
      navigation: { ...initialNavigationState },
      selectedPlate: null,
      selectedSpotId: null,
      selectedFloor: 0,
      vehicleLeftEvent: null,
    });
  },
}));

export default useParkingStore;
