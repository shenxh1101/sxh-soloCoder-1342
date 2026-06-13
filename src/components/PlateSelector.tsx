import { useState, useMemo } from 'react';
import { Search, Car, MapPin, Layers, AlertCircle, CheckCircle, X } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { PRESET_PLATES, FLOOR_NAMES } from '@/types/parking';
import { findSpotByPlate } from '@/utils/parkingData';
import { ParkingSpot } from '@/types/parking';
import { cn } from '@/lib/utils';

interface PlateSelectorProps {
  onSearch: (plate: string) => void;
}

export default function PlateSelector({ onSearch }: PlateSelectorProps) {
  const [selectedPlate, setSelectedPlate] = useState(PRESET_PLATES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const { 
    parkingSpots, 
    filterKeyword, 
    setFilterKeyword,
    navigation,
  } = useParkingStore();

  const filteredPlates = useMemo(() => {
    if (!filterKeyword.trim()) return PRESET_PLATES;
    const keyword = filterKeyword.toLowerCase();
    return PRESET_PLATES.filter(plate => 
      plate.toLowerCase().includes(keyword)
    );
  }, [filterKeyword]);

  const getPlateSpot = (plate: string): ParkingSpot | undefined => {
    return findSpotByPlate(parkingSpots, plate);
  };

  const getPlateStatus = (plate: string): { status: 'parked' | 'left'; spot?: ParkingSpot } => {
    const spot = getPlateSpot(plate);
    return {
      status: spot?.isOccupied ? 'parked' : 'left',
      spot,
    };
  };

  const handleSearch = () => {
    const { status } = getPlateStatus(selectedPlate);
    if (status === 'left') {
      return;
    }
    onSearch(selectedPlate);
  };

  const handlePlateSelect = (plate: string) => {
    setSelectedPlate(plate);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const currentPlateInfo = getPlateStatus(selectedPlate);

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 w-80">
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-5 h-5 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-sm tracking-wider">智能寻车系统</h3>
        </div>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入车牌关键字筛选..."
            className="w-full pl-10 pr-8 py-2 bg-slate-800/80 border border-slate-600/50 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          {filterKeyword && (
            <button
              onClick={() => setFilterKeyword('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full px-4 py-3 bg-slate-800/80 border rounded-lg text-left text-white flex items-center justify-between transition-all",
              currentPlateInfo.status === 'left'
                ? 'border-red-500/50 hover:border-red-500'
                : 'border-slate-600/50 hover:border-cyan-500/50'
            )}
          >
            <div>
              <div className="text-xs text-slate-400 mb-1">选择车牌号</div>
              <div className={cn(
                "font-mono text-lg tracking-wider",
                currentPlateInfo.status === 'left' ? 'text-red-400' : 'text-cyan-300'
              )}>
                {selectedPlate}
              </div>
            </div>
            <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-md border border-slate-600/50 rounded-lg overflow-hidden z-30 max-h-64 overflow-y-auto">
              {filteredPlates.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                  未找到匹配的车牌
                </div>
              ) : (
                filteredPlates.map((plate) => {
                  const { status, spot } = getPlateStatus(plate);
                  return (
                    <button
                      key={plate}
                      onClick={() => {
                        handlePlateSelect(plate);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors flex items-start justify-between",
                        selectedPlate === plate ? 'bg-cyan-900/30' : ''
                      )}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "font-mono text-sm",
                            status === 'parked' ? 'text-cyan-300' : 'text-slate-500 line-through'
                          )}>
                            {plate}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded flex items-center gap-1",
                            status === 'parked' 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-red-900/50 text-red-400'
                          )}>
                            {status === 'parked' ? (
                              <><CheckCircle className="w-3 h-3" /> 已停</>
                            ) : (
                              <><AlertCircle className="w-3 h-3" /> 离场</>
                            )}
                          </span>
                        </div>
                        {status === 'parked' && spot && (
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {FLOOR_NAMES[spot.floor]}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {spot.row}-{spot.col}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
        
        {currentPlateInfo.status === 'parked' && currentPlateInfo.spot && (
          <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-2">车位摘要</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {FLOOR_NAMES[currentPlateInfo.spot.floor]}
                </div>
                <div className="text-[10px] text-slate-500">楼层</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {currentPlateInfo.spot.row}-{currentPlateInfo.spot.col}
                </div>
                <div className="text-[10px] text-slate-500">车位</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                  <Car className="w-4 h-4" />
                </div>
                <div className="text-lg font-bold text-white font-mono">
                  {currentPlateInfo.spot.vehicleType === 'suv' ? 'SUV' : '轿车'}
                </div>
                <div className="text-[10px] text-slate-500">车型</div>
              </div>
            </div>
          </div>
        )}
        
        {currentPlateInfo.status === 'left' && (
          <div className="mt-3 p-3 bg-red-900/30 rounded-lg border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">该车辆已离开停车场</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">请选择其他车牌或等待车辆返回</p>
          </div>
        )}
        
        <button
          onClick={handleSearch}
          disabled={currentPlateInfo.status === 'left' || navigation.isActive}
          className={cn(
            "w-full mt-3 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold",
            currentPlateInfo.status === 'left' || navigation.isActive
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-900 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50'
          )}
        >
          <Search className="w-5 h-5" />
          {navigation.isActive ? '导航进行中...' : '开始寻车'}
        </button>
      </div>
    </div>
  );
}
