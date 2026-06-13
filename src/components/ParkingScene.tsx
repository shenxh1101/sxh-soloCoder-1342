import { useEffect, useRef } from 'react';
import { ParkingScene } from '@/engine/ParkingScene';
import useParkingStore from '@/store/parkingStore';
import { findSpotByPlate } from '@/utils/parkingData';
import { ParkingSpot } from '@/types/parking';

interface ParkingSceneProps {
  onSceneReady?: (scene: ParkingScene) => void;
}

export default function ParkingSceneComponent({ onSceneReady }: ParkingSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParkingScene | null>(null);
  const lastTargetSpotIdRef = useRef<string | null>(null);
  const lastNavigationProgressRef = useRef<number>(0);
  
  const { 
    parkingSpots, 
    selectedPlate, 
    navigation,
    cameraMode,
    setCameraMode,
    setNavigationProgress,
    updateNavigationDistance,
    updateNavigationFloor,
    updateNavigationPaused,
    selectedSpotId,
    selectedFloor,
    focusOnSpot: storeFocusOnSpot,
  } = useParkingStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ParkingScene({
      container: containerRef.current,
      onFloorChange: (floor) => {
        updateNavigationFloor(floor);
      },
      onDistanceChange: (distance) => {
        updateNavigationDistance(distance);
      },
      onProgressChange: (progress) => {
        setNavigationProgress(progress);
        lastNavigationProgressRef.current = progress;
      },
      onSpotClick: (spotId: string) => {
        storeFocusOnSpot(spotId);
      },
      onNavigationComplete: () => {
        useParkingStore.getState().completeNavigation();
      },
    });

    sceneRef.current = scene;
    onSceneReady?.(scene);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [onSceneReady, updateNavigationFloor, updateNavigationDistance, setNavigationProgress, storeFocusOnSpot]);

  useEffect(() => {
    if (sceneRef.current && parkingSpots.length > 0) {
      sceneRef.current.updateParkingSpots(parkingSpots);
    }
  }, [parkingSpots]);

  useEffect(() => {
    if (!sceneRef.current) return;
    
    if (selectedPlate) {
      const spot = findSpotByPlate(parkingSpots, selectedPlate);
      if (spot) {
        sceneRef.current.highlightSpot(spot.id);
        sceneRef.current.focusOnSpot(spot);
      }
    } else {
      sceneRef.current.highlightSpot(null);
    }
  }, [selectedPlate, parkingSpots]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.setCameraMode(cameraMode);
  }, [cameraMode]);

  useEffect(() => {
    if (!sceneRef.current) return;
    
    const targetSpotId = navigation.targetSpotId;
    
    if (navigation.isActive && targetSpotId) {
      if (targetSpotId !== lastTargetSpotIdRef.current) {
        const spot = parkingSpots.find(s => s.id === targetSpotId);
        if (spot) {
          sceneRef.current.startNavigation(spot);
          lastTargetSpotIdRef.current = targetSpotId;
          lastNavigationProgressRef.current = 0;
        }
      }
    } else {
      sceneRef.current.stopNavigation();
      lastTargetSpotIdRef.current = null;
      lastNavigationProgressRef.current = 0;
    }
  }, [navigation.isActive, navigation.targetSpotId, parkingSpots]);

  useEffect(() => {
    if (!sceneRef.current || !navigation.isActive) return;
    
    const navState = sceneRef.current.getNavigationState();
    
    if (navigation.isPaused !== navState.isPaused) {
      if (navigation.isPaused) {
        sceneRef.current.pauseNavigation();
      } else {
        sceneRef.current.resumeNavigation();
      }
    }
  }, [navigation.isPaused, navigation.isActive]);

  useEffect(() => {
    if (!sceneRef.current || !navigation.isActive) return;
    
    const currentProgress = lastNavigationProgressRef.current;
    const storeProgress = navigation.progress;
    
    if (Math.abs(storeProgress - currentProgress) > 0.001) {
      sceneRef.current.setNavigationProgress(storeProgress);
      lastNavigationProgressRef.current = storeProgress;
    }
  }, [navigation.progress, navigation.isActive]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.focusOnFloor(selectedFloor);
  }, [selectedFloor]);

  useEffect(() => {
    if (!sceneRef.current || !selectedSpotId) return;
    
    const spot = parkingSpots.find(s => s.id === selectedSpotId);
    if (spot) {
      sceneRef.current.focusOnSpot(spot);
      sceneRef.current.highlightSpot(selectedSpotId);
    }
  }, [selectedSpotId, parkingSpots]);

  useEffect(() => {
    const handlePause = () => {
      if (sceneRef.current && navigation.isActive) {
        sceneRef.current.togglePauseNavigation();
        const newState = sceneRef.current.getNavigationState();
        updateNavigationPaused(newState.isPaused);
      }
    };
    
    const handleStepForward = () => {
      if (sceneRef.current && navigation.isActive && navigation.isPaused) {
        sceneRef.current.stepNavigation('forward', 0.02);
        const state = sceneRef.current.getNavigationState();
        lastNavigationProgressRef.current = state.progress;
      }
    };
    
    const handleStepBackward = () => {
      if (sceneRef.current && navigation.isActive && navigation.isPaused) {
        sceneRef.current.stepNavigation('backward', 0.02);
        const state = sceneRef.current.getNavigationState();
        lastNavigationProgressRef.current = state.progress;
      }
    };
    
    window.addEventListener('nav:pause', handlePause);
    window.addEventListener('nav:stepForward', handleStepForward);
    window.addEventListener('nav:stepBackward', handleStepBackward);
    
    return () => {
      window.removeEventListener('nav:pause', handlePause);
      window.removeEventListener('nav:stepForward', handleStepForward);
      window.removeEventListener('nav:stepBackward', handleStepBackward);
    };
  }, [navigation.isActive, navigation.isPaused, updateNavigationPaused]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
