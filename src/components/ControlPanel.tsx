import { useRef } from 'react';
import { 
  Camera, Eye, Play, Pause, Download, Upload, RotateCcw, Zap 
} from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { exportSpotsToCSV, downloadCSV, parseCSV, readFileAsText } from '@/utils/csvUtils';
import { generateParkingSpots } from '@/utils/parkingData';
import { CameraMode } from '@/types/parking';

interface ControlPanelProps {
  onToggleSimulation: () => void;
  onResetParking?: () => void;
}

export default function ControlPanel({ onToggleSimulation, onResetParking }: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    parkingSpots, 
    cameraMode, 
    setCameraMode, 
    setParkingSpots,
    simulationActive,
    setSimulationActive,
  } = useParkingStore();

  const handleToggleCamera = () => {
    const newMode: CameraMode = cameraMode === 'orbit' ? 'firstPerson' : 'orbit';
    setCameraMode(newMode);
  };

  const handleExportCSV = () => {
    const csv = exportSpotsToCSV(parkingSpots);
    downloadCSV(csv, `parking-status-${Date.now()}.csv`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await readFileAsText(file);
      const spots = parseCSV(text);
      
      if (spots.length > 0) {
        const updatedSpots = parkingSpots.map(spot => {
          const imported = spots.find(s => s.id === spot.id);
          if (imported) {
            return {
              ...spot,
              isOccupied: imported.isOccupied,
              plateNumber: imported.plateNumber,
              vehicleType: imported.vehicleType,
            };
          }
          return spot;
        });
        setParkingSpots(updatedSpots);
      }
    } catch (error) {
      console.error('导入CSV失败:', error);
    }
    
    e.target.value = '';
  };

  const handleReset = () => {
    if (onResetParking) {
      onResetParking();
    } else {
      const newSpots = generateParkingSpots();
      setParkingSpots(newSpots);
    }
  };

  const handleToggleSim = () => {
    setSimulationActive(!simulationActive);
    onToggleSimulation();
  };

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl px-4 py-3 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCamera}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-white transition-colors border border-slate-600/50 hover:border-cyan-500/50"
            title={cameraMode === 'orbit' ? '切换到第一人称' : '切换到自由视角'}
          >
            {cameraMode === 'orbit' ? <Eye className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span className="text-sm">{cameraMode === 'orbit' ? '自由视角' : '第一人称'}</span>
          </button>
          
          <div className="w-px h-6 bg-slate-700" />
          
          <button
            onClick={handleToggleSim}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border ${
              simulationActive 
                ? 'bg-green-900/50 text-green-400 border-green-500/50 hover:bg-green-800/50' 
                : 'bg-slate-800/80 text-slate-400 border-slate-600/50 hover:bg-slate-700/80'
            }`}
            title={simulationActive ? '暂停模拟' : '开始模拟'}
          >
            {simulationActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="text-sm">{simulationActive ? '模拟中' : '已暂停'}</span>
            <Zap className={`w-3 h-3 ${simulationActive ? 'animate-pulse' : ''}`} />
          </button>
          
          <div className="w-px h-6 bg-slate-700" />
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-white transition-colors border border-slate-600/50 hover:border-cyan-500/50"
            title="导出车位状态"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">导出</span>
          </button>
          
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-white transition-colors border border-slate-600/50 hover:border-cyan-500/50"
            title="导入车位状态"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">导入</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="w-px h-6 bg-slate-700" />
          
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-lg text-white transition-colors border border-slate-600/50 hover:border-orange-500/50"
            title="重置停车场"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">重置</span>
          </button>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-center gap-4 text-xs text-slate-500">
          <span>鼠标拖拽：旋转视角</span>
          <span>|</span>
          <span>滚轮：缩放</span>
          <span>|</span>
          <span>WASD：移动</span>
        </div>
      </div>
    </div>
  );
}
