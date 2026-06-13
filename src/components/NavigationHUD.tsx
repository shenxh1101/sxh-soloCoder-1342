import { useRef, useCallback } from 'react';
import { MapPin, Layers, Navigation, ChevronRight, CheckCircle, Flag } from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES, NavigationSegment } from '@/types/parking';
import { cn } from '@/lib/utils';

export default function NavigationHUD() {
  const { navigation, selectedPlate, setNavigationProgress } = useParkingStore();
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const progress = navigation.totalDistance > 0 
    ? ((navigation.totalDistance - navigation.distanceRemaining) / navigation.totalDistance) * 100
    : 0;

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'floor': return <Layers className="w-4 h-4" />;
      case 'aisle': return <Navigation className="w-4 h-4" />;
      case 'spot': return <MapPin className="w-4 h-4" />;
      case 'waypoint': return <Flag className="w-4 h-4" />;
      default: return <ChevronRight className="w-4 h-4" />;
    }
  };

  const getSegmentProgress = (segment: NavigationSegment) => {
    if (navigation.progress < segment.startProgress) return 0;
    if (navigation.progress >= segment.endProgress) return 100;
    
    const segmentTotal = segment.endProgress - segment.startProgress;
    const segmentCurrent = navigation.progress - segment.startProgress;
    return (segmentCurrent / segmentTotal) * 100;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !navigation.isActive) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setNavigationProgress(ratio);
  }, [navigation.isActive, setNavigationProgress]);

  const handleProgressDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 || !progressBarRef.current || !navigation.isActive) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setNavigationProgress(ratio);
  }, [navigation.isActive, setNavigationProgress]);

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
          <>
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-400">导航进度</span>
                  {navigation.isPaused && (
                    <span className="text-[10px] text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded">已暂停</span>
                  )}
                </div>
                <span className="text-xs text-cyan-400 font-mono">{Math.round(progress)}%</span>
              </div>
              <div 
                ref={progressBarRef}
                className="h-3 bg-slate-700 rounded-full overflow-hidden cursor-pointer relative"
                onClick={handleProgressClick}
                onMouseMove={handleProgressDrag}
              >
                {navigation.segments.map((segment, index) => {
                  const left = segment.startProgress * 100;
                  const width = (segment.endProgress - segment.startProgress) * 100;
                  const segProgress = getSegmentProgress(segment);
                  const isCompleted = navigation.progress >= segment.endProgress - 0.001;
                  
                  return (
                    <div
                      key={index}
                      className="absolute top-0 h-full"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <div 
                        className={cn(
                          "h-full transition-all duration-200",
                          isCompleted ? "bg-green-500" :
                          segment.type === 'waypoint' ? "bg-orange-500" :
                          "bg-cyan-500"
                        )}
                        style={{ width: `${segProgress}%` }}
                      />
                    </div>
                  );
                })}
                <div 
                  className="absolute top-0 w-1 h-full bg-white rounded-full shadow-lg shadow-white/50 transition-all duration-100"
                  style={{ left: `${progress}%` }}
                />
              </div>
            </div>
            
            {navigation.segments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <div className="text-xs text-slate-400 mb-3">当前路段</div>
                <div className="flex items-center gap-2">
                  {navigation.segments.map((segment, index) => {
                    const isCompleted = navigation.progress >= segment.endProgress - 0.001;
                    const isCurrent = navigation.currentSegmentIndex === index;
                    
                    return (
                      <div key={index} className="flex items-center flex-1">
                        <div className="flex-1">
                          <div 
                            className={cn(
                              "relative p-2 rounded-lg border-2 transition-all",
                              isCompleted ? "bg-green-900/30 border-green-500/50" :
                              isCurrent ? "bg-cyan-900/40 border-cyan-500 shadow-lg shadow-cyan-500/20" :
                              segment.type === 'waypoint' ? "bg-orange-900/20 border-orange-500/30" :
                              "bg-slate-800/50 border-slate-700/50"
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {isCompleted ? (
                                <CheckCircle className={cn(
                                  "w-4 h-4",
                                  isCurrent ? "text-cyan-400" : "text-green-400"
                                )} />
                              ) : (
                                <div className={cn(
                                  "w-4 h-4 flex items-center justify-center",
                                  isCurrent ? "text-cyan-400" : 
                                  segment.type === 'waypoint' ? "text-orange-400" :
                                  "text-slate-500"
                                )}>
                                  {getSegmentIcon(segment.type)}
                                </div>
                              )}
                              <span className={cn(
                                "text-xs font-semibold",
                                isCompleted ? "text-green-400" :
                                isCurrent ? "text-cyan-400" :
                                segment.type === 'waypoint' ? "text-orange-400" :
                                "text-slate-500"
                              )}>
                                {segment.name}
                              </span>
                            </div>
                            
                            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-300",
                                  isCompleted ? "bg-green-500" :
                                  segment.type === 'waypoint' ? "bg-orange-500" :
                                  isCurrent ? "bg-cyan-500" : "bg-slate-600"
                                )}
                                style={{ width: `${getSegmentProgress(segment)}%` }}
                              />
                            </div>
                            
                            {isCurrent && (
                              <div className="mt-1.5 text-[10px] text-cyan-300">
                                {segment.description}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {index < navigation.segments.length - 1 && (
                          <div className="px-1">
                            <ChevronRight className={cn(
                              "w-4 h-4",
                              isCompleted ? "text-green-500" : "text-slate-600"
                            )} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
