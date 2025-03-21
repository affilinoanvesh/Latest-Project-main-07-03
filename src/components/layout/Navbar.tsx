import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, ShoppingCart, Package, Settings, DollarSign, 
  Receipt, FileBarChart, Boxes, Calendar, ShoppingBag, 
  Truck, PlusCircle, ChevronDown, ChevronRight, LogOut,
  Menu, X, Home, Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavbar } from '../../App';

// Define the navigation structure with parent-child relationships
const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: Home,
  },
  {
    id: 'sales-finance',
    label: 'Sales & Finance',
    icon: DollarSign,
    children: [
      { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingCart },
      { id: 'additional-revenue', label: 'Additional Revenue', path: '/additional-revenue', icon: PlusCircle },
      { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Receipt },
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    children: [
      { id: 'products', label: 'Products', path: '/products', icon: Package },
      { id: 'inventory-management', label: 'Inventory', path: '/inventory', icon: Boxes },
      { id: 'stock-reconciliation', label: 'Stock Reconciliation', path: '/stock-reconciliation', icon: Boxes },
      { id: 'expiry', label: 'Expiry Tracking', path: '/expiry', icon: Calendar },
    ]
  },
  {
    id: 'purchasing',
    label: 'Purchasing',
    icon: ShoppingBag,
    children: [
      { id: 'purchase-orders', label: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingBag },
      { id: 'suppliers', label: 'Suppliers', path: '/suppliers', icon: Truck },
    ]
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    children: [
      { id: 'reports', label: 'Reports', path: '/reports', icon: FileBarChart },
      { id: 'customer-analytics', label: 'Customer Analytics', path: '/customer-analytics', icon: Users },
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const { isCollapsed, setIsCollapsed } = useNavbar();
  
  // Check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Check if a section has an active child
  const hasActiveChild = (item: any) => {
    if (!item.children) return false;
    return item.children.some((child: any) => child.path === location.pathname);
  };

  // Check if a section should be expanded based on current path
  useEffect(() => {
    const newExpandedSections = { ...expandedSections };
    
    navigationItems.forEach(item => {
      if (item.children) {
        const shouldExpand = item.children.some(child => child.path === location.pathname);
        if (shouldExpand) {
          newExpandedSections[item.id] = true;
        }
      }
    });
    
    setExpandedSections(newExpandedSections);
  }, [location.pathname]);

  // Auto-collapse navbar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isCollapsed, setIsCollapsed]);

  // Toggle a section's expanded state
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      {/* Google Font Import */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" />
      
      <nav 
        className={`bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col overflow-hidden transition-all duration-300 font-['Poppins'] z-50 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
        style={{ fontFamily: "'Poppins', sans-serif" }}
      >
        <div className={`p-4 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center border-b border-slate-700`}>
          {!isCollapsed && (
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 mr-2 text-teal-400" />
              <h1 className="text-lg font-semibold text-white">PetWise</h1>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>
        
        {user && !isCollapsed && (
          <div className="px-4 mb-4 mt-4">
            <div className="px-3 py-2 bg-slate-800 rounded-md">
              <p className="text-xs font-medium truncate text-slate-300">{user.email}</p>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto px-2 pb-20 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
          <ul className="space-y-1 mt-2">
            {navigationItems.map(item => (
              <li key={item.id} className="mb-1">
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSection(item.id)}
                      className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-700 transition-colors ${
                        hasActiveChild(item) ? 'bg-slate-800' : ''
                      }`}
                      title={item.label}
                    >
                      <div className="flex items-center">
                        <item.icon className={`h-5 w-5 ${!isCollapsed && 'mr-3'} ${hasActiveChild(item) ? 'text-teal-400' : 'text-slate-400'}`} />
                        {!isCollapsed && <span className={`text-sm font-medium ${hasActiveChild(item) ? 'text-teal-400' : 'text-slate-300'}`}>{item.label}</span>}
                      </div>
                      {!isCollapsed && (
                        <div className="bg-slate-700 rounded-full p-0.5">
                          {expandedSections[item.id] ? (
                            <ChevronDown className="h-3 w-3 text-slate-300" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-slate-300" />
                          )}
                        </div>
                      )}
                    </button>
                    
                    {(expandedSections[item.id] || isCollapsed) && (
                      <ul className={`mt-1 space-y-1 mb-2 ${!isCollapsed && 'ml-4'}`}>
                        {item.children.map(child => (
                          <li key={child.id}>
                            <Link
                              to={child.path}
                              className={`flex items-center p-2 rounded-md hover:bg-slate-700 transition-colors ${
                                isActive(child.path) ? 'bg-slate-800' : ''
                              } ${isCollapsed ? 'justify-center' : ''}`}
                              title={child.label}
                            >
                              <child.icon className={`h-5 w-5 ${!isCollapsed && 'mr-3'} ${isActive(child.path) ? 'text-teal-400' : 'text-slate-400'}`} />
                              {!isCollapsed && <span className={`text-sm ${isActive(child.path) ? 'text-teal-400' : 'text-slate-300'}`}>{child.label}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center p-2 rounded-md hover:bg-slate-700 transition-colors ${
                      isActive(item.path) ? 'bg-slate-800' : ''
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={item.label}
                  >
                    <item.icon className={`h-5 w-5 ${!isCollapsed && 'mr-3'} ${isActive(item.path) ? 'text-teal-400' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className={`text-sm font-medium ${isActive(item.path) ? 'text-teal-400' : 'text-slate-300'}`}>{item.label}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className={`p-4 border-t border-slate-700 bg-slate-900 mt-auto ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={handleLogout}
            className={`flex items-center p-2 rounded-md hover:bg-slate-700 transition-colors ${isCollapsed ? 'w-auto' : 'w-full'}`}
            title="Logout"
          >
            <LogOut className={`h-5 w-5 text-slate-400 ${!isCollapsed && 'mr-3'}`} />
            {!isCollapsed && <span className="text-sm text-slate-300">Logout</span>}
          </button>
        </div>
      </nav>
    </>
  );
};

export default Navbar;