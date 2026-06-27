import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleDarkMode } from '../store/uiSlice';
import { logout } from '../store/authSlice';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import {
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { darkMode } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await API.put('/notifications');
      setUnreadCount(0);
      // set locally
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await API.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10 transition-colors duration-300 shadow-sm">
      {/* Current Page Context Title */}
      <div className="flex items-center space-x-2">
        <span className="text-sm font-semibold px-2.5 py-1 bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-md font-sans">
          Deepali Creation POS
        </span>
        <div className="hidden md:flex items-center space-x-1 text-slate-400 dark:text-slate-500 text-xs">
          <Clock size={14} />
          <span>Local Time: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Utilities */}
      <div className="flex items-center space-x-4">
        {/* Dark Mode Switch */}
        <button
          onClick={() => dispatch(toggleDarkMode())}
          className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          id="theme-toggle-btn"
        >
          {darkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-500" />}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setShowProfileDropdown(false);
            }}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors focus:outline-none relative"
            title="Notifications"
            id="notifications-bell-btn"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-2 fade-in">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-700 dark:text-slate-200">Alerts & Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                    No active notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`px-4 py-3 border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex items-start space-x-3 ${!notif.isRead ? 'bg-primary-50/20 dark:bg-primary-950/10' : ''
                        }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'Low Stock' && <AlertTriangle size={16} className="text-amber-500" />}
                        {notif.type === 'Sale' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {notif.type !== 'Low Stock' && notif.type !== 'Sale' && <Info size={16} className="text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal">{notif.message}</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                          {new Date(notif.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <button
                  onClick={handleClearNotifications}
                  className="text-xs text-slate-400 hover:text-red-500 dark:text-slate-500 transition-colors"
                >
                  Clear all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Account Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotifDropdown(false);
            }}
            className="flex items-center space-x-2 focus:outline-none p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            id="user-profile-menu-btn"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-400 flex items-center justify-center font-bold text-sm uppercase">
              {user?.name?.slice(0, 1) || 'A'}
            </div>
            <span className="hidden md:block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {user?.name || 'Admin'}
            </span>
          </button>

          {showProfileDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 py-2 fade-in">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 dark:text-slate-500">Logged in as</p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user?.username || 'deepali'}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileDropdown(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center space-x-2"
              >
                <User size={16} />
                <span>Profile Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors flex items-center space-x-2 border-t border-slate-100 dark:border-slate-800/60 mt-1"
                id="logout-btn-navbar"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
