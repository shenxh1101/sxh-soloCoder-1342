import { useState } from 'react';
import { History, X, MapPin, Clock, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES } from '@/types/parking';

interface HistoryPanelProps {
  onSelectPlate: (plate: string) => void;
}

export default function HistoryPanel({ onSelectPlate }: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const { searchHistory, clearHistory } = useParkingStore();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSelect = (plate: string) => {
    onSelectPlate(plate);
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
              {searchHistory.map((item, index) => (
                <button
                  key={`${item.plateNumber}-${item.timestamp}`}
                  onClick={() => handleSelect(item.plateNumber)}
                  className="w-full p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-left transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-cyan-300 font-semibold">
                      {item.plateNumber}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {FLOOR_NAMES[item.floor]}
                    </span>
                    <span className="text-slate-600">|</span>
                    <span>{item.spotId}</span>
                  </div>
                  <div className="mt-2 text-xs text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    点击重新导航 →
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
