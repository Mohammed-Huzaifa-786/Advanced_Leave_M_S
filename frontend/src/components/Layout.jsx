import React, { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, isLoading, role } = useAuth();

  useEffect(() => {
    const handleAuthVerification = () => {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        window.location.replace("/");
      }
    };
    window.addEventListener("pageshow", handleAuthVerification);
    window.addEventListener("popstate", handleAuthVerification);
    return () => {
      window.removeEventListener("pageshow", handleAuthVerification);
      window.removeEventListener("popstate", handleAuthVerification);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors">
      <Navbar
        isMobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          role={role}
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
