import { useState, useEffect, useCallback } from 'react';
import ParkingSceneComponent from '@/components/ParkingScene';
import PlateSelector from '@/components/PlateSelector';
import NavigationHUD from '@/components/NavigationHUD';
import HistoryPanel from '@/components/HistoryPanel';
import ControlPanel from '@/components/ControlPanel';
import FloorPlan from '@/components/FloorPlan';
import NavigationControls from '@/components/NavigationControls';
import ContinueNavigationDialog from '@/components/ContinueNavigationDialog';
import RouteOverview from '@/components/RouteOverview';
import Toast, { ToastType } from '@/components/Toast';
import useParkingStore from '@/store/parkingStore';
import { useParkingSimulation } from '@/hooks/useParkingSimulation';
import { findSpotByPlate } from '@/utils/parkingData';
import { ParkingScene } from '@/engine/ParkingScene';
import { ParkingSpot } from '@/types/parking';

export default function Home() {
  const [scene, setScene] = useState<ParkingScene | null>(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as ToastType });
  const [simRunning, setSimRunning] = useState(true);
  
  const { 
    initializeSpots, 
    parkingSpots,
    selectedPlate,
    navigation,
    startNavigation,
    stopNavigation,
    pauseNavigation,
    resumeNavigation,
    togglePauseNavigation,
    stepNavigation,
    setNavigationProgress,
    resetAllState,
    addSearchHistory,
    simulationActive,
    setSimulationActive,
    vehicleLeftEvent,
    clearVehicleLeftEvent,
    cameraMode,
    toggleCameraMode,
    focusOnSpot: storeFocusOnSpot,
    setSelectedFloor,
    selectedSpotId,
    setSelectedSpotId,
    updateNavigationPaused,
    setFilterKeyword,
    continueNavigation,
    setSelectedWaypoint,
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
      const { plateNumber, reason, oldSpot, newSpot } = vehicleLeftEvent;
      
      if (reason === 'left') {
        showToast(`车辆 ${plateNumber} 已离开停车场，导航已结束`, 'warning');
      } else if (reason === 'moved') {
        const oldPos = oldSpot ? `${oldSpot.row}-${oldSpot.col}` : '原位置';
        const newPos = newSpot ? `${newSpot.row}-${newSpot.col} (${newSpot.floor === 0 ? 'B1' : newSpot.floor === 1 ? 'B2' : 'B3'})` : '新位置';
        showToast(`车辆 ${plateNumber} 已从 ${oldPos} 移动到 ${newPos}，导航已自动更新`, 'info');
      }
      
      clearVehicleLeftEvent();
    }
  }, [vehicleLeftEvent, showToast, clearVehicleLeftEvent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && navigation.isActive) {
        e.preventDefault();
        const navState = scene?.getNavigationState();
        if (navState) {
          if (navState.isPaused) {
            resumeNavigation();
          } else {
            pauseNavigation();
          }
          updateNavigationPaused(!navState.isPaused);
        }
      }
      
      if (e.shiftKey && navigation.isActive && navigation.isPaused) {
        if (e.code === 'ArrowRight') {
          e.preventDefault();
          stepNavigation('forward', 0.02);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          stepNavigation('backward', 0.02);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation.isActive, navigation.isPaused, scene, pauseNavigation, resumeNavigation, stepNavigation, updateNavigationPaused]);

  const handleSearch = useCallback((plate: string) => {
    setFilterKeyword('');
    setSelectedWaypoint(null);
    
    const spot = findSpotByPlate(parkingSpots, plate);
    
    if (!spot || !spot.isOccupied) {
      showToast(`车辆 ${plate} 已离开停车场`, 'warning');
      return;
    }
    
    const success = startNavigation(plate);
    if (success) {
      showToast(`已定位到 ${plate}，正在为您导航`, 'success');
    }
  }, [parkingSpots, startNavigation, setFilterKeyword, setSelectedWaypoint, showToast]);

  const handleStartNavigationFromOverview = useCallback(() => {
    if (selectedPlate) {
      const spot = findSpotByPlate(parkingSpots, selectedPlate);
      if (!spot || !spot.isOccupied) {
        showToast(`车辆 ${selectedPlate} 已离开停车场`, 'warning');
        return;
      }
      
      const success = startNavigation(selectedPlate);
      if (success) {
        showToast(`已定位到 ${selectedPlate}，正在为您导航`, 'success');
      }
    }
  }, [selectedPlate, parkingSpots, startNavigation, showToast]);

  const handleHistorySelect = useCallback((plate: string) => {
    continueNavigation(plate);
  }, [continueNavigation]);

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

  const handleSpotClick = useCallback((spot: ParkingSpot) => {
    setSelectedSpotId(spot.id);
    setSelectedFloor(spot.floor);
    
    if (spot.isOccupied && spot.plateNumber) {
      showToast(`车位 ${spot.row}-${spot.col}: ${spot.plateNumber}`, 'info');
    } else {
      showToast(`车位 ${spot.row}-${spot.col}: 空闲`, 'info');
    }
  }, [setSelectedSpotId, setSelectedFloor, showToast]);

  const handleSpotNavigate = useCallback((spotId: string) => {
    const spot = parkingSpots.find(s => s.id === spotId);
    if (!spot || !spot.plateNumber) {
      showToast('该车位没有停放车辆', 'warning');
      return;
    }
    
    handleSearch(spot.plateNumber);
  }, [parkingSpots, handleSearch, showToast]);

  const handleFloorChange = useCallback((floor: number) => {
    setSelectedFloor(floor);
  }, [setSelectedFloor]);

  const handlePauseNav = useCallback(() => {
    pauseNavigation();
    if (scene) {
      updateNavigationPaused(true);
    }
  }, [pauseNavigation, scene, updateNavigationPaused]);

  const handleResumeNav = useCallback(() => {
    resumeNavigation();
    if (scene) {
      updateNavigationPaused(false);
    }
  }, [resumeNavigation, scene, updateNavigationPaused]);

  const handleStopNav = useCallback(() => {
    stopNavigation();
    setSelectedWaypoint(null);
    showToast('导航已结束', 'info');
  }, [stopNavigation, setSelectedWaypoint, showToast]);

  const handleStepForward = useCallback(() => {
    stepNavigation('forward', 0.05);
  }, [stepNavigation]);

  const handleStepBackward = useCallback(() => {
    stepNavigation('backward', 0.05);
  }, [stepNavigation]);

  const handleToggleCamera = useCallback(() => {
    toggleCameraMode();
    showToast(
      cameraMode === 'orbit' ? '已切换到第一人称视角' : '已切换到自由视角',
      'info'
    );
  }, [toggleCameraMode, cameraMode, showToast]);

  const handleResetProgress = useCallback(() => {
    setNavigationProgress(0);
    showToast('已重置到导航起点', 'info');
  }, [setNavigationProgress, showToast]);

  const handleResetParking = useCallback(() => {
    initializeSpots();
    setFilterKeyword('');
    showToast('停车场已重置，所有车位状态已重新生成', 'success');
  }, [initializeSpots, setFilterKeyword, showToast]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950">
      <ParkingSceneComponent onSceneReady={handleSceneReady} />
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </div>
      
      <PlateSelector onSearch={handleSearch} />
      <RouteOverview onStartNavigation={handleStartNavigationFromOverview} />
      <NavigationHUD />
      <HistoryPanel onSelectPlate={handleHistorySelect} />
      <ControlPanel 
        onToggleSimulation={handleToggleSimulation} 
        onResetParking={handleResetParking}
      />
      <NavigationControls
        onPause={handlePauseNav}
        onResume={handleResumeNav}
        onStop={handleStopNav}
        onStepForward={handleStepForward}
        onStepBackward={handleStepBackward}
        onToggleCamera={handleToggleCamera}
        onResetProgress={handleResetProgress}
      />
      <FloorPlan
        onSpotClick={handleSpotClick}
        onSpotNavigate={handleSpotNavigate}
        onFloorChange={handleFloorChange}
      />
      <ContinueNavigationDialog />
      
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
