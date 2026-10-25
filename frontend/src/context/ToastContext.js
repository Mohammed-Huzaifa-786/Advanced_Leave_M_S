import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

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

export default ToastContext;
