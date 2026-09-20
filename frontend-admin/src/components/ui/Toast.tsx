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
  const removeToast = useAppStore(state => state.removeToast);
  const Icon = iconMap[toast.type];

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md
        shadow-lg animate-fade-in pointer-events-auto ${colorMap[toast.type]}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium text-dark-100">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
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
    // 定位在顶栏下方，避免遮挡右上角"会话记录"入口；
    // 容器自身不拦截点击，仅提醒条本身可交互
    <div className="fixed top-24 right-4 md:right-6 z-50 flex flex-col items-end gap-2 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
