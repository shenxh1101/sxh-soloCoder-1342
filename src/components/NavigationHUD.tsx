import { MapPin, Layers, Navigation } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES } from '@/types/parking';

export default function NavigationHUD() {
  const { navigation, selectedPlate } = useParkingStore();
  
  const progress = navigation.totalDistance > 0 
    ? ((navigation.totalDistance - navigation.distanceRemaining) / navigation.totalDistance) * 100
    : 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl px-6 py-3 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-xs text-slate-400">当前楼层</div>
              <div className="text-xl font-bold text-cyan-300 font-mono">
                {FLOOR_NAMES[navigation.currentFloor] || 'B1'}
              </div>
            </div>
          </div>
          
          <div className="w-px h-10 bg-slate-700" />
          
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-400" />
            <div>
              <div className="text-xs text-slate-400">剩余距离</div>
              <div className="text-xl font-bold text-orange-300 font-mono">
                {navigation.isActive ? `${Math.round(navigation.distanceRemaining)}m` : '--'}
              </div>
            </div>
          </div>
          
          <div className="w-px h-10 bg-slate-700" />
          
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            <div>
              <div className="text-xs text-slate-400">目标车牌</div>
              <div className="text-lg font-bold text-green-300 font-mono">
                {selectedPlate || '--'}
              </div>
            </div>
          </div>
        </div>
        
        {navigation.isActive && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>导航进度</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
