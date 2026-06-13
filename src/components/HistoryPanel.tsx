import { useState } from 'react';
import { History, X, MapPin, Clock, ChevronLeft, ChevronRight, Trash2, RefreshCw, AlertCircle, Car } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES } from '@/types/parking';
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
    
    const historyItem = searchHistory.find(h => h.plateNumber === plate);
    const hasMoved = historyItem && historyItem.spotId !== currentSpot.id;
    
    if (hasMoved && navigation.isActive) {
      await continueNavigation(plate);
    } else {
      await continueNavigation(plate);
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
                    
                    <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {FLOOR_NAMES[item.floor]} {item.spotId}
                      </span>
                    </div>
                    
                    {hasMoved && currentSpot && (
                      <div className="mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-500/30">
                        <div className="flex items-center gap-1.5 text-xs text-yellow-400 mb-1">
                          <RefreshCw className="w-3 h-3" />
                          <span>车辆已移动到新位置</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="line-through">{item.spotId}</span>
                          <span>→</span>
                          <span className="text-yellow-300 font-mono">{currentSpot.row}-{currentSpot.col}</span>
                          <span className="text-yellow-400">({FLOOR_NAMES[currentSpot.floor]})</span>
                        </div>
                      </div>
                    )}
                    
                    {isCurrentlyParked && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-green-400">
                          <Car className="w-3 h-3" />
                          <span>当前位置: {FLOOR_NAMES[currentSpot!.floor]} {currentSpot!.row}-{currentSpot!.col}</span>
                        </div>
                        <div className="text-xs text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          点击继续导航 →
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
