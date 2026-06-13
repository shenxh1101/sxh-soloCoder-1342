import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose,
  duration = 4000 
}: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  useEffect(() => {
    if (isVisible) {
      setIsLeaving(false);
    }
  }, [isVisible]);

  if (!isVisible && !isLeaving) return null;

  const icons = {
    error: <AlertTriangle className="w-5 h-5 text-red-400" />,
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    info: <Info className="w-5 h-5 text-cyan-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-orange-400" />,
  };

  const colors = {
    error: 'border-red-500/50 bg-red-900/30',
    success: 'border-green-500/50 bg-green-900/30',
    info: 'border-cyan-500/50 bg-cyan-900/30',
    warning: 'border-orange-500/50 bg-orange-900/30',
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
      <div
        className={cn(
          'flex items-center gap-3 px-5 py-3 rounded-xl backdrop-blur-md border shadow-lg transition-all duration-300',
          colors[type],
          isLeaving ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'
        )}
      >
        {icons[type]}
        <span className="text-white font-medium">{message}</span>
        <button
          onClick={() => {
            setIsLeaving(true);
            setTimeout(onClose, 300);
          }}
          className="ml-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
