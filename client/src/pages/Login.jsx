import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API from '../utils/api';
import { loginStart, loginSuccess, loginFailure, clearError } from '../store/authSlice';
import { ShoppingBag, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    dispatch(clearError());
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    dispatch(loginStart());
    try {
      const res = await API.post('/auth/login', {
        username,
        password
      });
      if (res.data.success) {
        dispatch(loginSuccess(res.data));
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      dispatch(loginFailure(msg));
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 relative overflow-hidden font-sans">
      {/* Background Graphic Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-950/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-950/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-800/80 border border-slate-700/50 backdrop-blur-xl rounded-3xl shadow-2xl p-8 space-y-8 z-10 transition-all">

        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-primary-700/20 hover:rotate-6 transition-transform">
            DC
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-sans">
            Deepali Creation
          </h2>
        </div>



        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 flex items-center space-x-2 animate-pulse font-sans">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-sans">
              Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <User size={18} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition duration-200 font-sans"
                id="login-username-input"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-sans">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition duration-200 font-sans"
                id="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 active:scale-95 text-white font-semibold py-3.5 rounded-xl shadow-lg hover:shadow-primary-600/20 transition-all duration-200 flex items-center justify-center space-x-2 disabled:bg-primary-800 disabled:text-slate-400 disabled:scale-100 font-sans"
            id="login-submit-btn"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="text-center font-sans">
          <p className="text-[11px] text-slate-500">
            Deepali POS Systems &copy; 2026. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
