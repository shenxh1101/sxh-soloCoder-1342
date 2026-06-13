import { useEffect, useRef } from 'react';
import { ParkingScene } from '@/engine/ParkingScene';
import useParkingStore from '@/store/parkingStore';
import { findSpotByPlate } from '@/utils/parkingData';

interface ParkingSceneProps {
  onSceneReady?: (scene: ParkingScene) => void;
}

export default function ParkingSceneComponent({ onSceneReady }: ParkingSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParkingScene | null>(null);
  
  const { 
    parkingSpots, 
    selectedPlate, 
    navigation,
    cameraMode,
    setCameraMode,
    updateNavigationProgress,
  } = useParkingStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new ParkingScene({
      container: containerRef.current,
      onFloorChange: (floor) => {
        useParkingStore.setState((state) => ({
          navigation: { ...state.navigation, currentFloor: floor }
        }));
      },
      onDistanceChange: (distance) => {
        useParkingStore.setState((state) => ({
          navigation: { ...state.navigation, distanceRemaining: distance }
        }));
      },
    });

    sceneRef.current = scene;
    onSceneReady?.(scene);

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [onSceneReady]);

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
    
    if (navigation.isActive && navigation.targetSpotId) {
      const spot = parkingSpots.find(s => s.id === navigation.targetSpotId);
      if (spot) {
        sceneRef.current.startNavigation(spot);
      }
    } else {
      sceneRef.current.stopNavigation();
    }
  }, [navigation.isActive, navigation.targetSpotId, parkingSpots]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
