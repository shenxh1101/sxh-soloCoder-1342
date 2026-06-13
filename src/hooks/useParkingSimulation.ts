import { useEffect, useRef, useCallback } from 'react';
import useParkingStore from '@/store/parkingStore';
import { PRESET_PLATES } from '@/types/parking';

export function useParkingSimulation(active: boolean) {
  const intervalRef = useRef<number | null>(null);
  const { 
    parkingSpots, 
    updateSpot, 
    setSelectedPlate,
    navigation,
    stopNavigation,
  } = useParkingStore();

  const simulateVehicleChange = useCallback(() => {
    const occupiedSpots = parkingSpots.filter(s => s.isOccupied);
    const emptySpots = parkingSpots.filter(s => !s.isOccupied);
    
    if (Math.random() > 0.5 && occupiedSpots.length > 0) {
      const randomIdx = Math.floor(Math.random() * occupiedSpots.length);
      const spot = occupiedSpots[randomIdx];
      
      const plate = spot.plateNumber;
      
      updateSpot(spot.id, {
        isOccupied: false,
        plateNumber: undefined,
        vehicleType: 'none',
      });
      
      if (navigation.isActive && navigation.plateNumber === plate) {
        stopNavigation();
        setSelectedPlate(null);
      }
    }
    
    if (Math.random() > 0.5 && emptySpots.length > 0) {
      const randomIdx = Math.floor(Math.random() * emptySpots.length);
      const spot = emptySpots[randomIdx];
      
      const usedPlates = new Set(parkingSpots.filter(s => s.isOccupied).map(s => s.plateNumber));
      const availablePlates = PRESET_PLATES.filter(p => !usedPlates.has(p));
      
      if (availablePlates.length > 0) {
        const plate = availablePlates[Math.floor(Math.random() * availablePlates.length)];
        const vehicleType = Math.random() > 0.7 ? 'suv' : 'car';
        
        updateSpot(spot.id, {
          isOccupied: true,
          plateNumber: plate,
          vehicleType,
        });
      }
    }
  }, [parkingSpots, updateSpot, navigation.isActive, navigation.plateNumber, stopNavigation, setSelectedPlate]);

  useEffect(() => {
    if (active) {
      intervalRef.current = window.setInterval(() => {
        simulateVehicleChange();
      }, 5000 + Math.random() * 3000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [active, simulateVehicleChange]);

  return null;
}
