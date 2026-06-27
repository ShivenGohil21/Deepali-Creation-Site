import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { initializeTheme } from './store/uiSlice';

// Components & Layout
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import Warehouses from './pages/Warehouses';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Adjustments from './pages/Adjustments';

// Private Route Auth Guard Component
const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin bypasses all checks
  if (user && user.role === 'Super Admin') {
    return children;
  }

  // Check roles
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Initialize theme from storage
  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes Layout */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
                {/* Sidebar Column */}
                <Sidebar />

                {/* Content Panel Column */}
                <div className="flex-1 flex flex-col min-w-0">
                  <Navbar />
                  
                  {/* Dynamic Inner Page Content */}
                  <main className="flex-grow overflow-y-auto">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      
                      <Route 
                        path="/pos" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager', 'Cashier']}>
                            <POS />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/products" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager', 'Warehouse Staff']}>
                            <Products />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/purchases" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager']}>
                            <Purchases />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/sales" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager', 'Cashier']}>
                            <Sales />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/warehouses" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Warehouse Staff']}>
                            <Warehouses />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/adjustments" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Warehouse Staff', 'Manager']}>
                            <Adjustments />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/customers" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager', 'Cashier']}>
                            <Customers />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/suppliers" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager']}>
                            <Suppliers />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/reports" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin', 'Manager']}>
                            <Reports />
                          </PrivateRoute>
                        } 
                      />
                      
                      <Route 
                        path="/settings" 
                        element={
                          <PrivateRoute allowedRoles={['Super Admin', 'Admin']}>
                            <Settings />
                          </PrivateRoute>
                        } 
                      />

                      {/* Fallback to Dashboard */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
