import React, { createContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from storage on application startup
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedRole = localStorage.getItem("role");
      const storedUserId = localStorage.getItem("userId");
      const storedName = localStorage.getItem("name");
      const storedUsername = localStorage.getItem("username");
      const storedStudentId = localStorage.getItem("studentId");

      if (storedToken && storedRole) {
        // Validate token expiry if payload is standard JWT
        let isExpired = false;
        try {
          const parts = storedToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(
              decodeURIComponent(
                atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
                  .split("")
                  .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                  .join("")
              )
            );
            if (payload.exp && payload.exp * 1000 < Date.now()) {
              isExpired = true;
            }
          }
        } catch (jwtErr) {
          console.warn("Could not parse JWT payload on startup:", jwtErr);
        }

        if (isExpired) {
          localStorage.clear();
          setToken(null);
          setRole(null);
          setUser(null);
        } else {
          setToken(storedToken);
          setRole(storedRole);
          setUser({
            id: storedUserId ? parseInt(storedUserId, 10) : null,
            role: storedRole,
            username: storedUsername || "",
            name: storedName || storedUsername || "User",
            studentId: storedStudentId ? parseInt(storedStudentId, 10) : null,
          });
        }
      } else {
        setToken(null);
        setRole(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Auth initialization error:", err);
      setToken(null);
      setRole(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Synchronous atomic login state updater
  const login = (authData) => {
    if (!authData || !authData.token || !authData.role) {
      throw new Error("Invalid authentication payload received");
    }

    const tokenVal = authData.token;
    const roleVal = authData.role;
    const userObj = authData.user || {
      id: authData.userId,
      role: authData.role,
      username: authData.username,
      name: authData.name || authData.username,
      studentId: authData.studentId || null,
    };

    // 1. Persist to storage
    localStorage.setItem("token", tokenVal);
    localStorage.setItem("role", roleVal);
    if (userObj.id) localStorage.setItem("userId", String(userObj.id));
    if (userObj.name) localStorage.setItem("name", userObj.name);
    if (userObj.username) localStorage.setItem("username", userObj.username);
    if (userObj.studentId) {
      localStorage.setItem("studentId", String(userObj.studentId));
    } else {
      localStorage.removeItem("studentId");
    }

    // 2. Synchronously update React state
    setToken(tokenVal);
    setRole(roleVal);
    setUser(userObj);
    setIsLoading(false);

    return true;
  };

  // Clean logout action
  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setUser(null);
    setIsLoading(false);
  };

  // Synchronously update partial user profile (e.g. name or username)
  const updateUser = (partialUser) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partialUser };
      if (updated.name) localStorage.setItem("name", updated.name);
      if (updated.username) localStorage.setItem("username", updated.username);
      return updated;
    });
  };

  const value = {
    token,
    role,
    user,
    isAuthenticated: Boolean(token && role),
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
