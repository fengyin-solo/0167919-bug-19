import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast as ToastType } from '@/types';
import { useAppStore } from '@/store/useAppStore';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'bg-accent-green/20 border-accent-green/50 text-accent-green',
  error: 'bg-accent-red/20 border-accent-red/50 text-accent-red',
  warning: 'bg-accent-yellow/20 border-accent-yellow/50 text-accent-yellow',
  info: 'bg-primary-500/20 border-primary-500/50 text-primary-400',
};

interface ToastItemProps {
  toast: ToastType;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast }) => {
  const dismissToast = useAppStore(state => state.dismissToast);
  const Icon = iconMap[toast.type];
  const count = toast.count ?? 1;

  return (
    <div
      role="status"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md
        shadow-lg ${toast.leaving ? 'toast-exit' : 'toast-enter'} ${colorMap[toast.type]}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium text-dark-100">{toast.message}</span>
      {count > 1 && (
        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-white/15 text-dark-100">
          ×{count}
        </span>
      )}
      <button
        onClick={() => dismissToast(toast.id)}
        className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="关闭提醒"
      >
        <X className="w-4 h-4 text-dark-400" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useAppStore(state => state.toasts);

  if (toasts.length === 0) return null;

  return (
    // 位于头部按钮下方，避免遮挡右上角「会话记录」入口；最多同时显示 3 条
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
};
