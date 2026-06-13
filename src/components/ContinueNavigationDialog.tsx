import { MapPin, RefreshCcw, Play, RotateCcw, X, AlertTriangle, History, Layers, Navigation, Flag } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES } from '@/types/parking';
import { cn } from '@/lib/utils';

export default function ContinueNavigationDialog() {
  const { 
    continueDialog, 
    handleContinueNavigation, 
    closeContinueDialog,
    searchHistory,
    navigation,
  } = useParkingStore();
  
  if (!continueDialog.isOpen || !continueDialog.plateNumber) return null;
  
  const { plateNumber, oldSpot, newSpot } = continueDialog;
  
  const historyItem = searchHistory.find(h => h.plateNumber === plateNumber);
  const lastProgress = historyItem ? Math.round(historyItem.lastProgress * 100) : 0;
  const lastSegmentIndex = historyItem?.lastSegmentIndex ?? 0;
  const isSpotChanged = oldSpot && newSpot && oldSpot.id !== newSpot.id;
  
  const currentSegments = navigation.segments;
  const lastSegmentName = currentSegments[lastSegmentIndex]?.name || '未知';
  const lastSegmentType = currentSegments[lastSegmentIndex]?.type || 'floor';

  const handleOptionClick = (option: 'continue' | 'restart') => {
    if (plateNumber) {
      handleContinueNavigation(plateNumber, option);
    }
  };

  const getSegmentIcon = (type: string, size: string = "w-3 h-3") => {
    switch (type) {
      case 'floor': return <Layers className={size} />;
      case 'aisle': return <Navigation className={size} />;
      case 'spot': return <MapPin className={size} />;
      case 'waypoint': return <Flag className={size} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={closeContinueDialog}
      />
      
      <div className="relative bg-slate-900/95 backdrop-blur-md rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 max-w-md w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isSpotChanged ? "bg-yellow-500/20" : "bg-cyan-500/20"
              )}>
                {isSpotChanged ? (
                  <AlertTriangle className="w-6 h-6 text-yellow-400" />
                ) : (
                  <History className="w-6 h-6 text-cyan-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {isSpotChanged ? '车辆位置已变更' : '继续寻车'}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  <span className="font-mono text-cyan-300">{plateNumber}</span>
                  {isSpotChanged ? ' 已移动到新车位' : ' 的上次导航记录'}
                </p>
              </div>
            </div>
            <button
              onClick={closeContinueDialog}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-800/80 rounded-lg">
                <div className="text-[10px] text-slate-500 mb-2">上次车位摘要</div>
                {oldSpot ? (
                  <>
                    <div className="text-sm text-slate-400 mb-1">
                      {FLOOR_NAMES[oldSpot.floor]}
                    </div>
                    <div className={cn(
                      "text-xl font-bold font-mono",
                      isSpotChanged ? "text-slate-500 line-through" : "text-cyan-300"
                    )}>
                      {oldSpot.row}-{oldSpot.col}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">无记录</div>
                )}
              </div>
              
              <div className="text-center p-3 bg-slate-800/80 rounded-lg">
                <div className="text-[10px] text-green-500 mb-2">当前车位</div>
                {newSpot ? (
                  <>
                    <div className="text-sm text-green-400 mb-1">
                      {FLOOR_NAMES[newSpot.floor]}
                    </div>
                    <div className="text-xl font-bold text-green-400 font-mono">
                      {newSpot.row}-{newSpot.col}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">已离场</div>
                )}
              </div>
            </div>
          </div>
          
          {lastProgress > 0 && currentSegments.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2">上次导航进度</div>
              <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all duration-300"
                    style={{ width: `${lastProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">入口</span>
                  <span className="text-cyan-400 font-mono">{lastProgress}%</span>
                  <span className="text-slate-500">车位</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    lastSegmentType === 'waypoint' ? "bg-orange-500/20 text-orange-400" :
                    "bg-cyan-500/20 text-cyan-400"
                  )}>
                    {getSegmentIcon(lastSegmentType)}
                  </div>
                  <span className="text-xs text-slate-300">
                    停在第 <span className="text-cyan-400 font-mono">{lastSegmentIndex + 1}</span> 段 · {lastSegmentName}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {currentSegments.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2">路线总览</div>
              <div className="flex gap-1">
                {currentSegments.map((seg, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center border",
                      seg.type === 'waypoint' ? "border-orange-500/50 text-orange-400 bg-orange-500/10" :
                      "border-slate-600 text-slate-400 bg-slate-800"
                    )}>
                      {getSegmentIcon(seg.type, "w-2.5 h-2.5")}
                    </div>
                    <span className="text-[8px] text-slate-500 truncate w-full text-center">
                      {seg.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-xs text-slate-400 mb-4">
            请选择导航方式继续寻车：
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOptionClick('continue')}
              className="group relative overflow-hidden p-4 bg-slate-800/80 hover:bg-cyan-900/30 border-2 border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/10 group-hover:to-cyan-500/0 transition-all" />
              <div className="relative">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:bg-cyan-500/30 transition-colors">
                  <Play className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-sm font-semibold text-white mb-1">
                  {isSpotChanged ? '从当前进度继续' : '继续上次进度'}
                </div>
                <div className="text-[10px] text-slate-400">
                  接着第 {lastSegmentIndex + 1} 段 ({lastProgress}%) 往下走
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleOptionClick('restart')}
              className="group relative overflow-hidden p-4 bg-slate-800/80 hover:bg-orange-900/30 border-2 border-slate-700 hover:border-orange-500/50 rounded-xl transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/0 group-hover:from-orange-500/10 group-hover:to-orange-500/0 transition-all" />
              <div className="relative">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:bg-orange-500/30 transition-colors">
                  <RotateCcw className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-sm font-semibold text-white mb-1">
                  从入口重新开始
                </div>
                <div className="text-[10px] text-slate-400">
                  重新规划完整路线
                </div>
              </div>
            </button>
          </div>
          
          {newSpot && (
            <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <MapPin className="w-3 h-3" />
                <span>
                  目标车位: {FLOOR_NAMES[newSpot.floor]} 层 {newSpot.row}-{newSpot.col} 号
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
