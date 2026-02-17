import React, { useState } from "react";
import api from "../api/axios";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post("/auth/forgot-password", { username });

      alert("Temporary Password: " + res.data.tempPassword);

      window.location.href = "/";
    } catch (err) {
      alert(err.response?.data?.message || "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 relative overflow-hidden">
      
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-yellow-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '4s' }}></div>

      <form onSubmit={submit} className="relative z-10 bg-white/90 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
        
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-600 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Forgot Password?
        </h2>
        <p className="text-center text-gray-500 mb-8">Enter your username to reset your password</p>

        {/* Info Alert */}
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">Password Reset</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                A temporary password will be generated and displayed. Use it to login and change your password immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Username Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              className="w-full border-2 border-gray-200 pl-12 pr-4 py-3 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-100 transition-all outline-none bg-white/50"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Reset Button */}
        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 mb-6 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Password
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </span>
        </button>

        {/* Back to Login */}
        <div className="text-center text-sm">
          <span className="text-gray-600">Remember your password? </span>
          <a href="/" className="text-orange-600 hover:text-orange-700 font-semibold hover:underline transition-colors">
            Back to Login
          </a>
        </div>

        {/* Security Notice */}
        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Secure Password Reset
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact your administrator
          </p>
        </div>
      </form>
    </div>
  );
}