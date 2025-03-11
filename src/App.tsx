import React, { useEffect, createContext, useState, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import TimeDisplay from './components/common/TimeDisplay';
import TableScrollHelper from './components/common/TableScrollHelper';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import ProductExpiry from './pages/expiry';
import PurchaseOrders from './pages/PurchaseOrders';
import SuppliersPage from './components/suppliers/SuppliersPage';
import AdditionalRevenuePage from './pages/AdditionalRevenue';
import StockReconciliation from './pages/StockReconciliation';
import Login from './pages/Login';
import InitialSetup from './pages/InitialSetup';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { initializeSupabase } from './utils/initializeSupabase';
import { scheduleAutomaticDraftCleanup } from './services/api/orders';

// Create a context for the navbar state
interface NavbarContextType {
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const NavbarContext = createContext<NavbarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useNavbar = () => useContext(NavbarContext);

// Navbar provider component
const NavbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <NavbarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </NavbarContext.Provider>
  );
};

function App() {
  useEffect(() => {
    // Initialize Supabase when the app starts
    const initSupabase = async () => {
      try {
        // Check if Supabase is already initialized
        const isInitialized = localStorage.getItem('supabase_initialized') === 'true';
        
        if (!isInitialized) {
          const result = await initializeSupabase();
          console.log('Supabase initialization result:', result.message);
        } else {
          console.log('Supabase already initialized');
        }
      } catch (error) {
        console.error('Failed to initialize Supabase on app start:', error);
      }
    };
    
    initSupabase();
    
    // Schedule automatic cleanup of old draft orders
    // Run every 24 hours
    scheduleAutomaticDraftCleanup(24);
  }, []);

  return (
    <AuthProvider>
      <NavbarProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/setup" element={<InitialSetup />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/additional-revenue" element={<AdditionalRevenuePage />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/expiry" element={<ProductExpiry />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/stock-reconciliation" element={<StockReconciliation />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </NavbarProvider>
    </AuthProvider>
  );
}

// Layout component that uses the navbar context
const AppLayout = () => {
  const { isCollapsed } = useNavbar();
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Navbar />
      <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-56'}`}>
        <div className="px-6 py-3 bg-white shadow-sm border-b">
          <TimeDisplay />
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
      <TableScrollHelper />
    </div>
  );
};

export default App;