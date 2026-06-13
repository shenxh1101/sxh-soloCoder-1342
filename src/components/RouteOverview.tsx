import { useState, useCallback, useRef } from 'react';
import { 
  MapPin, 
  Layers, 
  Navigation, 
  ChevronDown, 
  ChevronUp, 
  Route, 
  Map as MapIcon,
  CheckCircle,
  Circle,
  Flag,
  X
} from 'lucide-react';
import useParkingStore from '@/store/parkingStore';
import { FLOOR_NAMES, NavigationSegment, WaypointInfo } from '@/types/parking';
import { cn } from '@/lib/utils';

interface RouteOverviewProps {
  onStartNavigation?: () => void;
}

export default function RouteOverview({ onStartNavigation }: RouteOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { 
    navigation, selectedPlate, selectedSpotId, parkingSpots,
    availableWaypoints, selectedWaypoint, setSelectedWaypoint,
  } = useParkingStore();

  const targetSpot = parkingSpots.find(s => s.id === navigation.targetSpotId || selectedSpotId);
  const hasRoute = navigation.segments.length > 0 || targetSpot;
  const segments = navigation.segments;

  const getSegmentIcon = (type: string) => {
    switch (type) {
      case 'floor': return <Layers className="w-4 h-4" />;
      case 'aisle': return <Navigation className="w-4 h-4" />;
      case 'spot': return <MapPin className="w-4 h-4" />;
      case 'waypoint': return <Flag className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getSegmentProgress = (segment: NavigationSegment) => {
    if (navigation.progress < segment.startProgress) return 0;
    if (navigation.progress >= segment.endProgress) return 100;
    
    const segmentTotal = segment.endProgress - segment.startProgress;
    const segmentCurrent = navigation.progress - segment.startProgress;
    return (segmentCurrent / segmentTotal) * 100;
  };

  const getRampInfo = () => {
    if (!targetSpot || targetSpot.floor === 0) return null;
    const ramps: string[] = [];
    for (let f = 0; f < targetSpot.floor; f++) {
      ramps.push(`${FLOOR_NAMES[f]}→${FLOOR_NAMES[f + 1]}`);
    }
    return ramps;
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-500/10 w-[420px] overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-400 font-semibold text-sm">路线总览</span>
            {selectedPlate && (
              <span className="text-xs text-slate-400 font-mono">
                目标: {selectedPlate}
              </span>
            )}
            {!navigation.isActive && segments.length > 0 && (
              <span className="text-[10px] text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded">预览</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4">
            {!hasRoute ? (
              <div className="py-6 text-center text-slate-500 text-sm">
                <MapIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>暂无路线信息</p>
                <p className="text-xs mt-1">选择车牌查看路线预览</p>
              </div>
            ) : (
              <>
                {targetSpot && (
                  <div className="mb-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white font-semibold">目标车位</span>
                      </div>
                      <span className="text-xs font-mono text-cyan-300">
                        {FLOOR_NAMES[targetSpot.floor]} {targetSpot.row}-{targetSpot.col}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>总距离: <span className="text-cyan-400 font-mono">{Math.round(navigation.totalDistance || 0)}m</span></span>
                      <span>楼层: <span className="text-cyan-400 font-mono">{FLOOR_NAMES[targetSpot.floor]}</span></span>
                      <span>路段: <span className="text-cyan-400 font-mono">{segments.length} 段</span></span>
                      {getRampInfo() && (
                        <span>坡道: <span className="text-orange-400 font-mono">{getRampInfo()?.join(' ')}</span></span>
                      )}
                    </div>
                  </div>
                )}
                
                {!navigation.isActive && availableWaypoints.length > 0 && (
                  <div className="mb-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-slate-400">途经点</span>
                      </div>
                      {selectedWaypoint && (
                        <button
                          onClick={() => setSelectedWaypoint(null)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setSelectedWaypoint(null)}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded border transition-colors",
                          !selectedWaypoint 
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-400"
                            : "bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-cyan-500/30"
                        )}
                      >
                        无途经点
                      </button>
                      {availableWaypoints.map((wp) => (
                        <button
                          key={wp.spotId}
                          onClick={() => setSelectedWaypoint(wp)}
                          className={cn(
                            "text-[10px] px-2 py-1 rounded border transition-colors",
                            selectedWaypoint?.spotId === wp.spotId
                              ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                              : "bg-slate-700/50 border-slate-600/50 text-slate-400 hover:border-orange-500/30"
                          )}
                        >
                          {wp.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="text-xs text-slate-400 mb-2">导航分段</div>
                  
                  {segments.length > 0 ? (
                    segments.map((segment, index) => {
                      const isCompleted = navigation.isActive && navigation.progress >= segment.endProgress - 0.001;
                      const isCurrent = navigation.isActive && index === navigation.currentSegmentIndex;
                      const isPreview = !navigation.isActive;
                      
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all",
                              isCompleted 
                                ? "bg-green-500/20 border-green-500 text-green-400" 
                                : isCurrent 
                                  ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse"
                                  : segment.type === 'waypoint'
                                    ? "bg-orange-500/10 border-orange-500/30 text-orange-400/60"
                                    : isPreview
                                      ? "bg-slate-800/80 border-cyan-500/30 text-cyan-400/60"
                                      : "bg-slate-800 border-slate-600 text-slate-500"
                            )}>
                              {isCompleted ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                getSegmentIcon(segment.type)
                              )}
                            </div>
                            {index < segments.length - 1 && (
                              <div className={cn(
                                "w-0.5 h-8 my-1",
                                isCompleted ? "bg-green-500" : 
                                isPreview ? "bg-cyan-500/20" : "bg-slate-700"
                              )} />
                            )}
                          </div>
                          
                          <div className="flex-1 pb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                "text-sm font-medium",
                                isCompleted ? "text-green-400" :
                                isCurrent ? "text-cyan-400" :
                                segment.type === 'waypoint' ? "text-orange-300" :
                                isPreview ? "text-slate-300" : "text-slate-500"
                              )}>
                                {segment.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">当前</span>
                              )}
                              {isPreview && segment.type === 'waypoint' && (
                                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">途经</span>
                              )}
                              {isPreview && segment.type !== 'waypoint' && (
                                <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">预览</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mb-2">
                              {segment.description}
                            </p>
                            {navigation.isActive && (
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
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      选择车牌查看完整路线
                    </div>
                  )}
                </div>
                
                {onStartNavigation && !navigation.isActive && segments.length > 0 && (
                  <button
                    onClick={onStartNavigation}
                    className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-900 font-semibold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                  >
                    <Navigation className="w-4 h-4" />
                    进入 3D 跟随导航
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
