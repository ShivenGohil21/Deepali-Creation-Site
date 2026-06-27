import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { toggleSidebar } from '../store/uiSlice';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  Users,
  Truck,
  Warehouse,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ShoppingBag,
  Bell
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const { sidebarCollapsed } = useSelector((state) => state.ui);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Super Admin', 'Admin', 'Manager', 'Cashier', 'Warehouse Staff'] },
    { name: 'POS (Point of Sale)', path: '/pos', icon: ShoppingCart, roles: ['Super Admin', 'Admin', 'Manager', 'Cashier'] },
    { name: 'Products', path: '/products', icon: Package, roles: ['Super Admin', 'Admin', 'Manager', 'Warehouse Staff'] },
    { name: 'Purchases', path: '/purchases', icon: Truck, roles: ['Super Admin', 'Admin', 'Manager'] },
    { name: 'Sales History', path: '/sales', icon: ShoppingBag, roles: ['Super Admin', 'Admin', 'Manager', 'Cashier'] },
    { name: 'Warehouses', path: '/warehouses', icon: Warehouse, roles: ['Super Admin', 'Admin', 'Warehouse Staff'] },
    { name: 'Stock Adjustments', path: '/adjustments', icon: ArrowLeftRight, roles: ['Super Admin', 'Admin', 'Warehouse Staff', 'Manager'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['Super Admin', 'Admin', 'Manager', 'Cashier'] },
    { name: 'Suppliers', path: '/suppliers', icon: ArrowLeftRight, roles: ['Super Admin', 'Admin', 'Manager'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['Super Admin', 'Admin', 'Manager'] },
    { name: 'Audit & Settings', path: '/settings', icon: Settings, roles: ['Super Admin', 'Admin'] }
  ];

  // Filter items by role
  const allowedItems = navItems.filter(item =>
    user && (user.role === 'Super Admin' || item.roles.includes(user.role))
  );

  return (
    <aside
      className={`bg-slate-900 text-slate-300 h-screen sticky top-0 flex flex-col z-20 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <span className="bg-primary-600 text-white p-1.5 rounded-lg flex items-center justify-center font-bold text-lg">
              DC
            </span>
            <span className="font-extrabold text-xl tracking-wider text-white font-sans">
              Deepali Creation
            </span>
          </div>
        )}

        {sidebarCollapsed && (
          <span className="mx-auto bg-primary-600 text-white p-2 rounded-lg font-bold text-md">
            DC
          </span>
        )}

        <button
          onClick={() => dispatch(toggleSidebar())}
          className="text-slate-400 hover:text-white transition-colors focus:outline-none p-1 rounded hover:bg-slate-800"
          id="sidebar-toggle-btn"
        >
          {sidebarCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                  ? 'bg-primary-600 text-white font-semibold shadow-md shadow-primary-900/20'
                  : 'hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon size={20} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
              {!sidebarCollapsed && <span className="text-sm font-sans tracking-wide">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col space-y-3">
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold border border-slate-700 font-sans uppercase shrink-0">
                {user?.name?.slice(0, 2) || 'AD'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white truncate font-sans">{user?.name || 'Deepali Admin'}</span>
                <span className="text-xs text-primary-400 font-medium truncate font-sans">{user?.role || 'Super Admin'}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              title="Logout"
              id="logout-btn-desktop"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Logout"
            id="logout-btn-collapsed"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
