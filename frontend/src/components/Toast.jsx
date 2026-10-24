import React, { createContext, useContext, useState, useCallback } from "react";
import Icon from "./Icons";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, duration) => addToast("success", msg, duration),
    error: (msg, duration) => addToast("error", msg, duration),
    warning: (msg, duration) => addToast("warning", msg, duration),
    info: (msg, duration) => addToast("info", msg, duration),
  };
  toast.toast = toast;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="assertive"
        className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const styles = {
            success: {
              bg: "bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
              iconName: "checkCircle",
              iconColor: "text-emerald-600 dark:text-emerald-400",
            },
            error: {
              bg: "bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100",
              iconName: "xCircle",
              iconColor: "text-rose-600 dark:text-rose-400",
            },
            warning: {
              bg: "bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
              iconName: "alertTriangle",
              iconColor: "text-amber-600 dark:text-amber-400",
            },
            info: {
              bg: "bg-indigo-50/95 dark:bg-indigo-950/90 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-100",
              iconName: "info",
              iconColor: "text-indigo-600 dark:text-indigo-400",
            },
          }[t.type] || {
            bg: "bg-slate-50/95 dark:bg-slate-800/95 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100",
            iconName: "info",
            iconColor: "text-slate-600 dark:text-slate-400",
          };

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-slideInRight ${styles.bg}`}
            >
              <Icon name={styles.iconName} className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconColor}`} />
              <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
                {t.message}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 rounded transition -mr-1 -mt-1"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback safe dummy if used outside provider
    const fallback = {
      success: (m) => console.log("Toast [Success]:", m),
      error: (m) => console.error("Toast [Error]:", m),
      warning: (m) => console.warn("Toast [Warning]:", m),
      info: (m) => console.info("Toast [Info]:", m),
    };
    fallback.toast = fallback;
    return fallback;
  }
  return ctx;
}

export default ToastProvider;
