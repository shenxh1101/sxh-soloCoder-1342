import { useState } from 'react';
import { ChevronUp, ChevronDown, MapPin, X, Navigation, Layers } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES } from '@/types/parking';
import { ParkingSpot } from '@/types/parking';
import { cn } from '@/lib/utils';

interface FloorPlanProps {
  onSpotClick: (spot: ParkingSpot) => void;
  onSpotNavigate: (spotId: string) => void;
  onFloorChange: (floor: number) => void;
}

export default function FloorPlan({ onSpotClick, onSpotNavigate, onFloorChange }: FloorPlanProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { parkingSpots, selectedFloor, selectedSpotId, navigation } = useParkingStore();
  
  const floorSpots = parkingSpots.filter(s => s.floor === selectedFloor);
  
  const rows = [...new Set(floorSpots.map(s => s.row))].sort();
  const cols = [...new Set(floorSpots.map(s => s.col))].sort();
  
  const spotWidth = 48;
  const spotHeight = 72;
  const gap = 4;
  const aisleWidth = 24;
  
  const totalWidth = cols.length * spotWidth + (cols.length - 1) * gap + aisleWidth;
  const totalHeight = rows.length * spotHeight + (rows.length - 1) * gap;
  
  const handleFloorChange = (delta: number) => {
    const newFloor = Math.max(0, Math.min(2, selectedFloor + delta));
    if (newFloor !== selectedFloor) {
      onFloorChange(newFloor);
    }
  };
  
  const handleSpotClick = (spot: ParkingSpot, e: React.MouseEvent) => {
    e.stopPropagation();
    onSpotClick(spot);
  };
  
  const handleSpotNavigate = (spot: ParkingSpot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (spot.isOccupied && spot.plateNumber) {
      onSpotNavigate(spot.id);
    }
  };
  
  const getSpotStyle = (spot: ParkingSpot) => {
    const isSelected = spot.id === selectedSpotId;
    const isNavTarget = spot.id === navigation.targetSpotId;
    
    let borderColor = spot.isOccupied ? 'border-red-500' : 'border-green-500';
    let bgColor = spot.isOccupied ? 'bg-red-900/30' : 'bg-green-900/20';
    
    if (isNavTarget) {
      borderColor = 'border-orange-500';
      bgColor = 'bg-orange-900/40';
    } else if (isSelected) {
      borderColor = 'border-cyan-400';
      bgColor = 'bg-cyan-900/40';
    }
    
    return {
      borderColor,
      bgColor,
    };
  };
  
  const getSpotPosition = (spot: ParkingSpot) => {
    const colIndex = cols.indexOf(spot.col);
    const rowIndex = rows.indexOf(spot.row);
    
    const leftSide = colIndex < Math.ceil(cols.length / 2);
    const x = leftSide 
      ? colIndex * (spotWidth + gap)
      : colIndex * (spotWidth + gap) + aisleWidth;
    const y = rowIndex * (spotHeight + gap);
    
    return { x, y };
  };

  return (
    <div className={`absolute top-1/2 right-4 -translate-y-1/2 z-20 transition-all duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-40px)]'}`}>
      <div className="flex items-start">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-16 bg-slate-900/90 backdrop-blur-md rounded-l-lg border border-r-0 border-cyan-500/30 flex flex-col items-center justify-center text-cyan-400 hover:bg-slate-800 transition-colors gap-1"
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px] font-mono">{FLOOR_NAMES[selectedFloor]}</span>
        </button>
        
        <div className="w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 font-semibold text-sm">楼层平面图</span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFloorChange(1)}
                disabled={selectedFloor >= 2}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  selectedFloor >= 2 ? "text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                )}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleFloorChange(-1)}
                disabled={selectedFloor <= 0}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  selectedFloor <= 0 ? "text-slate-600 cursor-not-allowed" : "text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                )}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="px-4 py-2 flex items-center justify-center gap-4 border-b border-slate-700/50">
            {FLOOR_NAMES.map((name, idx) => (
              <button
                key={name}
                onClick={() => onFloorChange(idx)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-mono font-semibold transition-all",
                  selectedFloor === idx
                    ? "bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300"
                )}
              >
                {name}
              </button>
            ))}
          </div>
          
          <div className="p-4 flex items-center justify-center">
            <div 
              className="relative bg-slate-800/50 rounded-lg p-3"
              style={{ width: totalWidth + 24, height: totalHeight + 24 }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div 
                  className="bg-slate-700/30 rounded"
                  style={{ width: aisleWidth, height: totalHeight }}
                />
              </div>
              
              <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
                {floorSpots.map(spot => {
                  const pos = getSpotPosition(spot);
                  const style = getSpotStyle(spot);
                  const isSelected = spot.id === selectedSpotId;
                  const isNavTarget = spot.id === navigation.targetSpotId;
                  
                  return (
                    <div
                      key={spot.id}
                      className={cn(
                        "absolute rounded border-2 cursor-pointer transition-all duration-200",
                        "hover:scale-105 hover:shadow-lg",
                        style.bgColor,
                        style.borderColor,
                        isSelected && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900",
                        isNavTarget && "ring-2 ring-orange-500 ring-offset-2 ring-offset-slate-900 animate-pulse"
                      )}
                      style={{
                        left: pos.x,
                        top: pos.y,
                        width: spotWidth,
                        height: spotHeight,
                      }}
                      onClick={(e) => handleSpotClick(spot, e)}
                    >
                      <div className="w-full h-full flex flex-col items-center justify-center p-1">
                        <span className="text-[8px] text-slate-400 font-mono mb-1">
                          {spot.row}-{spot.col}
                        </span>
                        {spot.isOccupied && spot.plateNumber && (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[9px] text-white font-mono leading-tight">
                              {spot.plateNumber}
                            </span>
                            <button
                              onClick={(e) => handleSpotNavigate(spot, e)}
                              className={cn(
                                "flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-semibold transition-colors",
                                isNavTarget
                                  ? "bg-orange-500 text-slate-900"
                                  : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                              )}
                            >
                              <Navigation className="w-2.5 h-2.5" />
                              导航
                            </button>
                          </div>
                        )}
                        {!spot.isOccupied && (
                          <span className="text-[9px] text-green-400 font-medium">
                            空闲
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="px-4 py-2 border-t border-slate-700/50 flex items-center justify-center gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-900/30" />
              <span className="text-slate-400">空闲</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-900/30" />
              <span className="text-slate-400">占用</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-orange-500 bg-orange-900/30" />
              <span className="text-slate-400">目标</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
