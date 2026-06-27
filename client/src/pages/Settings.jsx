import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import API from '../utils/api';
import { KeyRound, ShieldAlert, Activity, ClipboardList, AlertCircle, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { user } = useSelector((state) => state.auth);
  
  // Change password forms
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: '', type: 'success' });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');

  const showPasswordToast = (text, type = 'success') => {
    setPasswordMsg({ text, type });
    setTimeout(() => setPasswordMsg({ text: '', type: 'success' }), 5000);
  };

  const fetchAuditLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError('');
      const res = await API.get('/auditlogs');
      if (res.data.success) {
        setAuditLogs(res.data.data);
      }
    } catch (err) {
      setLogsError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      showPasswordToast('New passwords do not match', 'error');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await API.put('/auth/changepassword', {
        currentPassword,
        newPassword
      });

      if (res.data.success) {
        showPasswordToast('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showPasswordToast(err.message, 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in font-sans">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Audit & Settings Center</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage credentials, audit administrative logs, and view security records.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Account Info & Password Update (1 Col) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* User Profile Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm border-b pb-2 dark:border-slate-800">
              Account Metadata
            </h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold uppercase">
                  {user?.name?.slice(0, 2) || 'AD'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{user?.name || 'Deepali Owner'}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Role: {user?.role || 'Super Admin'}</p>
                </div>
              </div>
              
              <div className="space-y-1.5 border-t dark:border-slate-800 pt-3 text-slate-500">
                <div className="flex justify-between">
                  <span>Username:</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-200">{user?.username || 'deepali'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="font-semibold text-slate-750 dark:text-slate-200">{user?.email || 'deepali@shop.com'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Permissions:</span>
                  <span className="font-semibold text-primary-500 text-[10px] uppercase font-mono">
                    {user?.permissions?.[0] || 'all'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center space-x-1.5 border-b pb-2 dark:border-slate-800">
              <KeyRound size={16} className="text-primary-600 dark:text-primary-400" />
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Change Password
              </h3>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs font-sans">
              {passwordMsg.text && (
                <div className={`p-2.5 rounded-lg border text-[11px] flex items-center space-x-1 ${
                  passwordMsg.type === 'error' 
                    ? 'bg-red-500/10 border-red-500/20 text-red-500' 
                    : 'bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400'
                }`}>
                  {passwordMsg.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                  <span>{passwordMsg.text}</span>
                </div>
              )}

              <div className="space-y-1">
                <span>Current Password *</span>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 focus:outline-none"
                  placeholder="Enter current password"
                  id="settings-curr-pass"
                />
              </div>

              <div className="space-y-1">
                <span>New Password *</span>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 focus:outline-none"
                  placeholder="Enter new password (min 6 chars)"
                  id="settings-new-pass"
                />
              </div>

              <div className="space-y-1">
                <span>Confirm New Password *</span>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2 px-3 focus:outline-none"
                  placeholder="Confirm new password"
                  id="settings-confirm-pass"
                />
              </div>

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 rounded-xl transition active:scale-95 disabled:bg-primary-800"
                id="change-password-submit-btn"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Audit Logs Records Viewer (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
            <div className="flex items-center space-x-1.5">
              <ClipboardList size={18} className="text-slate-450" />
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">System Audit Records</h3>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-650 dark:text-slate-300 px-3 py-1.5 rounded-lg font-semibold transition"
            >
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-850 text-slate-400 font-semibold sticky top-0 bg-white dark:bg-slate-900 py-2">
                  <th className="py-2.5 pr-2">Date/Time</th>
                  <th className="py-2.5">User</th>
                  <th className="py-2.5">Action</th>
                  <th className="py-2.5">Target</th>
                  <th className="py-2.5">Details</th>
                  <th className="py-2.5 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-650 dark:text-slate-350">
                {logsLoading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Retrieving audit database logs...</span>
                    </td>
                  </tr>
                ) : logsError ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-red-500">
                      Error: {logsError}
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No administrative audit records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                      <td className="py-2.5 pr-2 text-slate-400 shrink-0 whitespace-nowrap">
                        {new Date(log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{log.username}</td>
                      <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">{log.action}</td>
                      <td className="py-2.5 font-semibold text-primary-600 dark:text-primary-400 truncate max-w-[120px]">{log.target}</td>
                      <td className="py-2.5 text-slate-400 truncate max-w-[180px]" title={log.details}>
                        {log.details || 'N/A'}
                      </td>
                      <td className="py-2.5 text-right font-mono text-[10px] text-slate-450">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
