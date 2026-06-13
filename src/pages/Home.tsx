import { useState, useEffect, useCallback } from 'react';
import ParkingSceneComponent from '@/components/ParkingScene';
import PlateSelector from '@/components/PlateSelector';
import NavigationHUD from '@/components/NavigationHUD';
import HistoryPanel from '@/components/HistoryPanel';
import ControlPanel from '@/components/ControlPanel';
import Toast, { ToastType } from '@/components/Toast';
import useParkingStore from '@/store/parkingStore';
import { useParkingSimulation } from '@/hooks/useParkingSimulation';
import { findSpotByPlate } from '@/utils/parkingData';
import { generateNavigationPath, createSmoothPath } from '@/utils/pathUtils';
import { ParkingScene } from '@/engine/ParkingScene';

export default function Home() {
  const [scene, setScene] = useState<ParkingScene | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as ToastType });
  const [simRunning, setSimRunning] = useState(true);
  
  const { 
    initializeSpots, 
    parkingSpots,
    selectedPlate,
    setSelectedPlate,
    navigation,
    startNavigation,
    stopNavigation,
    addSearchHistory,
    simulationActive,
    setSimulationActive,
    vehicleLeftEvent,
    clearVehicleLeftEvent,
  } = useParkingStore();

  useParkingSimulation(simRunning && simulationActive);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    initializeSpots();
  }, [initializeSpots]);

  useEffect(() => {
    if (vehicleLeftEvent) {
      showToast(`车辆 ${vehicleLeftEvent.plateNumber} 已离开停车场`, 'warning');
      clearVehicleLeftEvent();
    }
  }, [vehicleLeftEvent, showToast, clearVehicleLeftEvent]);

  const handleSearch = useCallback((plate: string) => {
    const spot = findSpotByPlate(parkingSpots, plate);
    
    if (!spot || !spot.isOccupied) {
      showToast(`车辆 ${plate} 已离开停车场`, 'warning');
      stopNavigation();
      setSelectedPlate(null);
      return;
    }
    
    setSelectedPlate(plate);
    startNavigation(plate);
    
    const pathPoints = generateNavigationPath(spot);
    const { totalLength } = createSmoothPath(pathPoints);
    
    useParkingStore.setState((state) => ({
      navigation: {
        ...state.navigation,
        isActive: true,
        targetSpotId: spot.id,
        plateNumber: plate,
        totalDistance: totalLength,
        distanceRemaining: totalLength,
        currentFloor: 0,
      }
    }));
    
    addSearchHistory({
      plateNumber: plate,
      timestamp: Date.now(),
      floor: spot.floor,
      spotId: spot.id,
      position: { ...spot.position },
    });
    
    showToast(`已定位到 ${plate}，正在为您导航`, 'success');
  }, [parkingSpots, startNavigation, stopNavigation, setSelectedPlate, addSearchHistory, showToast]);

  const handleHistorySelect = useCallback((plate: string) => {
    handleSearch(plate);
  }, [handleSearch]);

  const handleToggleSimulation = useCallback(() => {
    setSimRunning(prev => !prev);
    showToast(
      simRunning ? '实时模拟已暂停' : '实时模拟已开启',
      'info'
    );
  }, [simRunning, showToast]);

  const handleSceneReady = useCallback((sceneInstance: ParkingScene) => {
    setScene(sceneInstance);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <ParkingSceneComponent onSceneReady={handleSceneReady} />
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </div>
      
      <PlateSelector onSearch={handleSearch} />
      <NavigationHUD />
      <HistoryPanel onSelectPlate={handleHistorySelect} />
      <ControlPanel onToggleSimulation={handleToggleSimulation} />
      
      <div className="absolute bottom-20 left-4 z-20">
        <div className="bg-slate-900/80 backdrop-blur-md rounded-lg px-3 py-2 border border-slate-700/50 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>空闲</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>占用</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500 animate-pulse" />
              <span>目标</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 z-10">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200 tracking-wider">
          智能停车场寻车系统
        </h1>
        <p className="text-xs text-slate-500 text-right mt-1">3D Navigation System</p>
      </div>
      
      <Toast 
        isVisible={toast.visible}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </div>
  );
}
