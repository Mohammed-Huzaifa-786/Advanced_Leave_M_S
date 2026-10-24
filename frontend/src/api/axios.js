import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const isAuthRoute = config.url && config.url.includes("/auth/");
  const token = localStorage.getItem("token");
  if (token && !isAuthRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If a protected route returns 401 Unauthorized (expired or invalid token)
    if (error.response?.status === 401) {
      const isLoginRoute = error.config?.url && error.config.url.includes("/auth/login");
      if (!isLoginRoute) {
        localStorage.clear();
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
