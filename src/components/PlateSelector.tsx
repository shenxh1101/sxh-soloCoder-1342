import { useState } from 'react';
import { Search, Car } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { PRESET_PLATES } from '@/types/parking';
import { findSpotByPlate } from '@/utils/parkingData';

interface PlateSelectorProps {
  onSearch: (plate: string) => void;
}

export default function PlateSelector({ onSearch }: PlateSelectorProps) {
  const [selectedPlate, setSelectedPlate] = useState(PRESET_PLATES[0]);
  const [isOpen, setIsOpen] = useState(false);
  const { parkingSpots } = useParkingStore();

  const handleSearch = () => {
    onSearch(selectedPlate);
  };

  const getPlateStatus = (plate: string) => {
    const spot = findSpotByPlate(parkingSpots, plate);
    return spot?.isOccupied ? '已停' : '离场';
  };

  return (
    <div className="absolute top-4 left-4 z-20">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <div className="flex items-center gap-2 mb-3">
          <Car className="w-5 h-5 text-cyan-400" />
          <h3 className="text-cyan-400 font-semibold text-sm tracking-wider">智能寻车系统</h3>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-lg text-left text-white flex items-center justify-between hover:border-cyan-500/50 transition-all"
          >
            <div>
              <div className="text-xs text-slate-400 mb-1">选择车牌号</div>
              <div className="font-mono text-lg text-cyan-300 tracking-wider">{selectedPlate}</div>
            </div>
            <div className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>
          
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-md border border-slate-600/50 rounded-lg overflow-hidden z-30 max-h-64 overflow-y-auto">
              {PRESET_PLATES.map((plate) => (
                <button
                  key={plate}
                  onClick={() => {
                    setSelectedPlate(plate);
                    setIsOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left hover:bg-slate-700/50 transition-colors flex items-center justify-between ${
                    selectedPlate === plate ? 'bg-cyan-900/30 text-cyan-300' : 'text-white'
                  }`}
                >
                  <span className="font-mono">{plate}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    getPlateStatus(plate) === '已停' 
                      ? 'bg-green-900/50 text-green-400' 
                      : 'bg-red-900/50 text-red-400'
                  }`}>
                    {getPlateStatus(plate)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={handleSearch}
          className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-900 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
        >
          <Search className="w-5 h-5" />
          开始寻车
        </button>
      </div>
    </div>
  );
}
