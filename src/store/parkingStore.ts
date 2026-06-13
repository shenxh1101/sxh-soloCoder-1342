import { create } from 'zustand';
import { 
  AppState, 
  ParkingSpot, 
  SearchHistoryItem, 
  CameraMode,
  NavigationSegment,
  ContinueOption,
} from '@/types/parking';
import { generateParkingSpots, findSpotByPlate } from '@/utils/parkingData';
import { 
  generateNavigationPath, 
  createSmoothPath,
  generateNavigationSegments,
  getCurrentSegmentIndex,
} from '@/utils/pathUtils';

interface VehicleLeftEvent {
  plateNumber: string;
  timestamp: number;
  reason: 'left' | 'moved';
  oldSpot?: ParkingSpot;
  newSpot?: ParkingSpot;
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
}

interface StoreState extends AppState {
  navigation: NavigationState;
  vehicleLeftEvent: VehicleLeftEvent | null;
  selectedFloor: number;
  selectedSpotId: string | null;
  filterKeyword: string;
}

interface StoreActions {
  initializeSpots: () => void;
  setParkingSpots: (spots: ParkingSpot[], preserveNavigation?: boolean) => void;
  updateSpot: (spotId: string, updates: Partial<ParkingSpot>) => void;
  startNavigation: (plateNumber: string, startProgress?: number) => boolean;
  startNavigationBySpotId: (spotId: string, startProgress?: number) => boolean;
  continueNavigation: (plate: string) => Promise<ContinueOption | null>;
  handleContinueNavigation: (plate: string, option: ContinueOption) => void;
  closeContinueDialog: () => void;
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
  updateNavigationSegment: () => void;
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
  setFilterKeyword: (keyword: string) => void;
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
  segments: [],
  currentSegmentIndex: 0,
};

const initialContinueDialog = {
  isOpen: false,
  plateNumber: null,
  oldSpot: null,
  newSpot: null,
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
  filterKeyword: '',
  continueDialog: initialContinueDialog,

  initializeSpots: () => {
    const spots = generateParkingSpots();
    get().setParkingSpots(spots, false);
  },

  setParkingSpots: (spots, preserveNavigation = false) => {
    const state = get();
    let newNav = { ...state.navigation };
    let vehicleEvent: VehicleLeftEvent | null = null;
    let newSelectedPlate = state.selectedPlate;
    let newSelectedSpotId = state.selectedSpotId;
    let newSelectedFloor = state.selectedFloor;
    
    if (state.navigation.isActive && state.navigation.plateNumber) {
      const plate = state.navigation.plateNumber;
      const newSpot = findSpotByPlate(spots, plate);
      const oldSpot = state.parkingSpots.find(s => s.id === state.navigation.targetSpotId);
      
      if (!newSpot || !newSpot.isOccupied) {
        newNav = { ...initialNavigationState };
        vehicleEvent = {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'left',
          oldSpot: oldSpot || undefined,
        };
        newSelectedPlate = null;
        newSelectedSpotId = null;
      } else if (newSpot.id !== state.navigation.targetSpotId) {
        const pathPoints = generateNavigationPath(newSpot);
        const { totalLength, points } = createSmoothPath(pathPoints);
        const segments = generateNavigationSegments(newSpot, points, totalLength);
        const currentProgress = state.navigation.progress;
        
        newNav = {
          ...state.navigation,
          targetSpotId: newSpot.id,
          totalDistance: totalLength,
          distanceRemaining: totalLength * (1 - currentProgress),
          pathPoints: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
          segments,
          currentSegmentIndex: getCurrentSegmentIndex(currentProgress, segments),
        };
        newSelectedSpotId = newSpot.id;
        newSelectedFloor = newSpot.floor;
        vehicleEvent = {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'moved',
          oldSpot: oldSpot || undefined,
          newSpot,
        };
      }
    } else if (state.selectedPlate) {
      const plate = state.selectedPlate;
      const newSpot = findSpotByPlate(spots, plate);
      const oldSpot = findSpotByPlate(state.parkingSpots, plate);
      
      if (!newSpot || !newSpot.isOccupied) {
        vehicleEvent = {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'left',
          oldSpot: oldSpot || undefined,
        };
        newSelectedPlate = null;
        newSelectedSpotId = null;
      } else if (oldSpot && newSpot.id !== oldSpot.id) {
        newSelectedSpotId = newSpot.id;
        newSelectedFloor = newSpot.floor;
        vehicleEvent = {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'moved',
          oldSpot,
          newSpot,
        };
      }
    }
    
    set({
      parkingSpots: spots,
      navigation: newNav,
      selectedPlate: newSelectedPlate,
      selectedSpotId: newSelectedSpotId,
      selectedFloor: newSelectedFloor,
      vehicleLeftEvent: vehicleEvent,
    });
  },

  updateSpot: (spotId, updates) => set((state) => {
    const spot = state.parkingSpots.find(s => s.id === spotId);
    const spots = state.parkingSpots.map(s =>
      s.id === spotId ? { ...s, ...updates } : s
    );
    
    const nav = state.navigation;
    let vehicleEvent: VehicleLeftEvent | null = null;
    let newNav = { ...nav };
    let newSelectedPlate = state.selectedPlate;
    let newSelectedSpotId = state.selectedSpotId;
    let newSelectedFloor = state.selectedFloor;
    
    if (nav.isActive && nav.plateNumber) {
      if (nav.targetSpotId === spotId && updates.isOccupied === false) {
        const plate = spot?.plateNumber || nav.plateNumber;
        const updatedSpot = spots.find(s => s.id === spotId);
        const newSpot = findSpotByPlate(spots, plate);
        
        if (newSpot && newSpot.isOccupied && newSpot.id !== spotId) {
          const pathPoints = generateNavigationPath(newSpot);
          const { totalLength, points } = createSmoothPath(pathPoints);
          const segments = generateNavigationSegments(newSpot, points, totalLength);
          const currentProgress = nav.progress;
          
          newNav = {
            ...nav,
            targetSpotId: newSpot.id,
            totalDistance: totalLength,
            distanceRemaining: totalLength * (1 - currentProgress),
            pathPoints: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
            segments,
            currentSegmentIndex: getCurrentSegmentIndex(currentProgress, segments),
          };
          newSelectedSpotId = newSpot.id;
          newSelectedFloor = newSpot.floor;
          vehicleEvent = {
            plateNumber: plate,
            timestamp: Date.now(),
            reason: 'moved',
            oldSpot: updatedSpot || undefined,
            newSpot,
          };
        } else {
          newNav = { ...initialNavigationState };
          vehicleEvent = {
            plateNumber: plate,
            timestamp: Date.now(),
            reason: 'left',
            oldSpot: updatedSpot || undefined,
          };
          newSelectedPlate = null;
          newSelectedSpotId = null;
        }
      }
    }
    
    if (state.selectedPlate && spot?.plateNumber === state.selectedPlate && updates.isOccupied === false) {
      const plate = state.selectedPlate;
      const newSpot = findSpotByPlate(spots, plate);
      
      if (newSpot && newSpot.isOccupied) {
        newSelectedSpotId = newSpot.id;
        newSelectedFloor = newSpot.floor;
        vehicleEvent = {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'moved',
          oldSpot: spot || undefined,
          newSpot,
        };
      } else {
        vehicleEvent = {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'left',
          oldSpot: spot || undefined,
        };
        newSelectedPlate = null;
        newSelectedSpotId = null;
      }
    }
    
    return {
      parkingSpots: spots,
      navigation: newNav,
      selectedPlate: newSelectedPlate,
      selectedSpotId: newSelectedSpotId,
      selectedFloor: newSelectedFloor,
      vehicleLeftEvent: vehicleEvent,
    };
  }),

  startNavigation: (plateNumber, startProgress = 0) => {
    const state = get();
    const spot = findSpotByPlate(state.parkingSpots, plateNumber);
    
    if (!spot || !spot.isOccupied) {
      set({
        selectedPlate: null,
        selectedSpotId: null,
        vehicleLeftEvent: {
          plateNumber,
          timestamp: Date.now(),
          reason: 'left',
        },
      });
      return false;
    }
    
    const pathPoints = generateNavigationPath(spot);
    const { totalLength, points } = createSmoothPath(pathPoints);
    const segments = generateNavigationSegments(spot, points, totalLength);
    const clampedProgress = Math.max(0, Math.min(1, startProgress));
    const distanceRemaining = totalLength * (1 - clampedProgress);
    
    set({
      selectedPlate: plateNumber,
      selectedSpotId: spot.id,
      selectedFloor: spot.floor,
      continueDialog: initialContinueDialog,
      navigation: {
        isActive: true,
        isPaused: false,
        targetSpotId: spot.id,
        plateNumber,
        currentFloor: 0,
        distanceRemaining,
        totalDistance: totalLength,
        pathPoints: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
        progress: clampedProgress,
        segments,
        currentSegmentIndex: getCurrentSegmentIndex(clampedProgress, segments),
      },
    });
    
    get().addSearchHistory({
      plateNumber,
      timestamp: Date.now(),
      floor: spot.floor,
      spotId: spot.id,
      position: { ...spot.position },
      lastProgress: clampedProgress,
    });
    
    return true;
  },

  startNavigationBySpotId: (spotId, startProgress = 0) => {
    const state = get();
    const spot = state.parkingSpots.find(s => s.id === spotId);
    
    if (!spot || !spot.isOccupied || !spot.plateNumber) {
      return false;
    }
    
    return get().startNavigation(spot.plateNumber, startProgress);
  },

  continueNavigation: async (plate) => {
    const state = get();
    const newSpot = findSpotByPlate(state.parkingSpots, plate);
    
    if (!newSpot || !newSpot.isOccupied) {
      set({
        vehicleLeftEvent: {
          plateNumber: plate,
          timestamp: Date.now(),
          reason: 'left',
        },
        continueDialog: initialContinueDialog,
      });
      return null;
    }
    
    const historyItem = state.searchHistory.find(h => h.plateNumber === plate);
    const oldSpot = historyItem 
      ? state.parkingSpots.find(s => s.id === historyItem.spotId)
      : null;
    
    const hasHistoryProgress = historyItem && historyItem.lastProgress > 0;
    const spotChanged = oldSpot && oldSpot.id !== newSpot.id;
    
    if (hasHistoryProgress || spotChanged) {
      set({
        selectedPlate: plate,
        selectedSpotId: newSpot.id,
        selectedFloor: newSpot.floor,
        continueDialog: {
          isOpen: true,
          plateNumber: plate,
          oldSpot: oldSpot || null,
          newSpot,
        },
      });
      return null;
    }
    
    get().startNavigation(plate, 0);
    return 'restart';
  },

  handleContinueNavigation: (plate, option) => {
    const state = get();
    const historyItem = state.searchHistory.find(h => h.plateNumber === plate);
    const startProgress = option === 'continue' && historyItem
      ? historyItem.lastProgress
      : 0;
    
    get().startNavigation(plate, startProgress);
  },

  closeContinueDialog: () => {
    set({ continueDialog: initialContinueDialog });
  },

  stopNavigation: () => set({
    navigation: { ...initialNavigationState },
    selectedPlate: null,
    selectedSpotId: null,
    continueDialog: initialContinueDialog,
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
    const segmentIndex = getCurrentSegmentIndex(clampedProgress, state.navigation.segments);
    
    const updatedHistory = state.searchHistory.map(h => 
      h.plateNumber === state.navigation.plateNumber
        ? { ...h, lastProgress: clampedProgress }
        : h
    );
    
    return {
      navigation: {
        ...state.navigation,
        progress: clampedProgress,
        distanceRemaining,
        currentFloor: Math.min(Math.max(currentFloor, 0), 2),
        currentSegmentIndex: segmentIndex,
      },
      searchHistory: updatedHistory,
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
    const segmentIndex = getCurrentSegmentIndex(newProgress, state.navigation.segments);
    
    const updatedHistory = state.searchHistory.map(h => 
      h.plateNumber === state.navigation.plateNumber
        ? { ...h, lastProgress: newProgress }
        : h
    );
    
    return {
      navigation: {
        ...state.navigation,
        progress: newProgress,
        distanceRemaining,
        currentFloor: Math.min(Math.max(currentFloor, 0), 2),
        currentSegmentIndex: segmentIndex,
      },
      searchHistory: updatedHistory,
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

  updateNavigationSegment: () => set((state) => ({
    navigation: {
      ...state.navigation,
      currentSegmentIndex: getCurrentSegmentIndex(state.navigation.progress, state.navigation.segments),
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
      return { 
        selectedPlate: null, 
        selectedSpotId: null,
        navigation: state.navigation.isActive ? state.navigation : initialNavigationState,
      };
    }
    
    const spot = findSpotByPlate(state.parkingSpots, plate);
    
    if (!spot || !spot.isOccupied) {
      return {
        selectedPlate: plate,
        selectedSpotId: null,
        navigation: state.navigation.isActive ? state.navigation : initialNavigationState,
      };
    }
    
    if (state.navigation.isActive && state.navigation.plateNumber === plate) {
      return {
        selectedPlate: plate,
        selectedSpotId: spot.id,
        selectedFloor: spot.floor,
      };
    }
    
    const pathPoints = generateNavigationPath(spot);
    const { totalLength, points } = createSmoothPath(pathPoints);
    const segments = generateNavigationSegments(spot, points, totalLength);
    
    return {
      selectedPlate: plate,
      selectedSpotId: spot.id,
      selectedFloor: spot.floor,
      navigation: {
        ...initialNavigationState,
        targetSpotId: spot.id,
        plateNumber: plate,
        totalDistance: totalLength,
        distanceRemaining: totalLength,
        pathPoints: points.map(p => ({ x: p.x, y: p.y, z: p.z })),
        segments,
        currentSegmentIndex: 0,
      },
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
      continueDialog: initialContinueDialog,
      filterKeyword: '',
    });
  },

  setFilterKeyword: (keyword) => set({ filterKeyword: keyword }),
}));

export default useParkingStore;
