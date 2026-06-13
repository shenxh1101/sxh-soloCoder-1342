import { Play, Pause, SkipBack, SkipForward, Square, RotateCcw, Camera, Eye } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { cn } from '@/lib/utils';

interface NavigationControlsProps {
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onToggleCamera: () => void;
  onResetProgress: () => void;
}

export default function NavigationControls({
  onPause,
  onResume,
  onStop,
  onStepForward,
  onStepBackward,
  onToggleCamera,
  onResetProgress,
}: NavigationControlsProps) {
  const { navigation, cameraMode } = useParkingStore();
  
  if (!navigation.isActive) return null;
  
  const progress = navigation.totalDistance > 0
    ? ((navigation.totalDistance - navigation.distanceRemaining) / navigation.totalDistance) * 100
    : 0;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-24 z-20">
      <div className="bg-slate-900/95 backdrop-blur-md rounded-xl px-4 py-3 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg">
            <span className="text-xs text-slate-400">目标:</span>
            <span className="font-mono text-sm text-cyan-300 font-semibold">
              {navigation.plateNumber}
            </span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg">
            <span className="text-xs text-slate-400">状态:</span>
            <span className={cn(
              "text-sm font-semibold",
              navigation.isPaused ? "text-yellow-400" : "text-green-400"
            )}>
              {navigation.isPaused ? "已暂停" : "导航中"}
            </span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg">
            <span className="text-xs text-slate-400">剩余:</span>
            <span className="font-mono text-sm text-orange-300 font-semibold">
              {Math.round(navigation.distanceRemaining)}m
            </span>
          </div>
        </div>
        
        <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-green-400 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-500 transition-all duration-200"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={onStepBackward}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="后退 (Shift+←)"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            {navigation.isPaused ? (
              <button
                onClick={onResume}
                className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors"
                title="继续导航 (Space)"
              >
                <Play className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="p-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white transition-colors"
                title="暂停导航 (Space)"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={onStepForward}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="前进 (Shift+→)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            
            <button
              onClick={onResetProgress}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors ml-1"
              title="重置到起点"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            <button
              onClick={onStop}
              className="p-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors ml-1"
              title="结束导航"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">视角:</span>
            <button
              onClick={onToggleCamera}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                cameraMode === 'orbit'
                  ? "bg-cyan-500 text-slate-900"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              )}
              title="切换视角模式"
            >
              {cameraMode === 'orbit' ? (
                <>
                  <Eye className="w-4 h-4" />
                  自由
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  第一人称
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-center gap-4 text-[10px] text-slate-500">
          <span>空格键: 暂停/继续</span>
          <span>|</span>
          <span>Shift+←/→: 手动调整</span>
          <span>|</span>
          <span>进度可点击跳转</span>
        </div>
      </div>
    </div>
  );
}
