import { useState } from 'react';
import { History, X, MapPin, Clock, ChevronLeft, ChevronRight, Trash2, RefreshCw, AlertCircle, Car, Layers, Navigation, Flag } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES, NavigationSegment } from '@/types/parking';
import { findSpotByPlate } from '@/utils/parkingData';
import { cn } from '@/lib/utils';

interface HistoryPanelProps {
  onSelectPlate: (plate: string) => void;
}

export default function HistoryPanel({ onSelectPlate }: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { 
    searchHistory, 
    clearHistory, 
    parkingSpots,
    continueNavigation,
    navigation,
  } = useParkingStore();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const getCurrentSpotForPlate = (plate: string) => {
    return findSpotByPlate(parkingSpots, plate);
  };

  const handleSelect = async (plate: string) => {
    const currentSpot = getCurrentSpotForPlate(plate);
    
    if (!currentSpot || !currentSpot.isOccupied) {
      onSelectPlate(plate);
      return;
    }
    
    await continueNavigation(plate);
  };

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'floor': return <Layers className="w-2.5 h-2.5" />;
      case 'aisle': return <Navigation className="w-2.5 h-2.5" />;
      case 'spot': return <MapPin className="w-2.5 h-2.5" />;
      case 'waypoint': return <Flag className="w-2.5 h-2.5" />;
      default: return null;
    }
  };

  return (
    <div className={`absolute top-4 right-4 z-20 transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -left-10 top-4 w-10 h-10 bg-slate-900/90 backdrop-blur-md rounded-l-lg border border-r-0 border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-slate-800 transition-colors"
      >
        {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
      
      <div className="w-72 bg-slate-900/90 backdrop-blur-md rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-cyan-400 font-semibold text-sm">反向寻车历史</h3>
          </div>
          {searchHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-slate-400 hover:text-red-400 transition-colors p-1"
              title="清空历史"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {searchHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>暂无查询记录</p>
              <p className="text-xs mt-1">最近5条记录将显示在这里</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {searchHistory.map((item, index) => {
                const currentSpot = getCurrentSpotForPlate(item.plateNumber);
                const isCurrentlyParked = currentSpot?.isOccupied;
                const hasMoved = isCurrentlyParked && currentSpot && item.spotId !== currentSpot.id;
                
                return (
                  <button
                    key={`${item.plateNumber}-${item.timestamp}`}
                    onClick={() => handleSelect(item.plateNumber)}
                    className="w-full p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "font-mono font-semibold",
                        isCurrentlyParked ? 'text-cyan-300' : 'text-slate-500 line-through'
                      )}>
                        {item.plateNumber}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {formatTime(item.timestamp)}
                        </span>
                        {!isCurrentlyParked && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-400 flex items-center gap-0.5">
                            <AlertCircle className="w-3 h-3" />
                            离场
                          </span>
                        )}
                        {hasMoved && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400 flex items-center gap-0.5">
                            <RefreshCw className="w-3 h-3" />
                            已移位
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="p-1.5 bg-slate-900/50 rounded text-center">
                        <div className="text-[9px] text-slate-500">上次</div>
                        <div className="text-xs text-slate-400 font-mono">
                          {FLOOR_NAMES[item.floor]} {item.spotId.split('-').slice(-2).join('-')}
                        </div>
                      </div>
                      <div className="p-1.5 bg-slate-900/50 rounded text-center">
                        <div className="text-[9px] text-slate-500">当前</div>
                        {currentSpot && isCurrentlyParked ? (
                          <div className={cn(
                            "text-xs font-mono",
                            hasMoved ? "text-yellow-300" : "text-green-400"
                          )}>
                            {FLOOR_NAMES[currentSpot.floor]} {currentSpot.row}-{currentSpot.col}
                          </div>
                        ) : (
                          <div className="text-xs text-red-400 font-mono">已离场</div>
                        )}
                      </div>
                    </div>
                    
                    {item.lastProgress > 0 && navigation.segments.length > 0 && (
                      <div className="mb-2">
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden mb-1">
                          <div 
                            className="h-full bg-cyan-500/60"
                            style={{ width: `${Math.round(item.lastProgress * 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                          <span>停在 {Math.round(item.lastProgress * 100)}%</span>
                          <span>·</span>
                          <span>第 {item.lastSegmentIndex + 1} 段</span>
                        </div>
                      </div>
                    )}
                    
                    {isCurrentlyParked && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-green-400">
                          <Car className="w-3 h-3" />
                          <span>在场</span>
                        </div>
                        <div className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          点击继续 →
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t border-slate-700/50 text-[10px] text-slate-500 text-center">
          点击历史记录可继续导航
        </div>
      </div>
    </div>
  );
}
