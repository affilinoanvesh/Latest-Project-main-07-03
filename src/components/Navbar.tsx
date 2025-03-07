import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ShoppingCart, Package, Settings, DollarSign, Receipt, FileBarChart, Boxes, Calendar, ShoppingBag, Truck, PlusCircle, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Define the navigation structure with parent-child relationships
const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: BarChart3,
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: FileBarChart,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    children: [
      { id: 'products', label: 'Products', path: '/products', icon: Package },
      { id: 'inventory-management', label: 'Inventory Management', path: '/inventory', icon: Boxes },
      { id: 'expiry', label: 'Expiry Tracking', path: '/expiry', icon: Calendar },
      { id: 'stock-reconciliation', label: 'Stock Reconciliation', path: '/stock-reconciliation', icon: Boxes },
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
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    children: [
      { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingCart },
      { id: 'additional-revenue', label: 'Additional Revenue', path: '/additional-revenue', icon: PlusCircle },
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: DollarSign,
    children: [
      { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Receipt },
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
  
  // Check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : '';
  };

  // Check if a section has an active child
  const hasActiveChild = (item: any) => {
    if (!item.children) return false;
    return item.children.some((child: any) => child.path === location.pathname);
  };

  // Check if a section should be expanded based on current path
  React.useEffect(() => {
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
    <nav className="bg-blue-800 text-white h-screen w-56 fixed left-0 top-0 flex flex-col overflow-hidden">
      <div className="p-4">
        <div className="flex items-center mb-8">
          <DollarSign className="h-7 w-7 mr-2" />
          <h1 className="text-xl font-bold">PetWise</h1>
        </div>
        
        {user && (
          <div className="mb-6 px-2 py-3 bg-blue-900 rounded-md">
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <ul className="space-y-1">
          {navigationItems.map(item => (
            <li key={item.id} className="mb-1">
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleSection(item.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-md hover:bg-blue-700 transition-colors ${hasActiveChild(item) ? 'bg-blue-600' : ''}`}
                  >
                    <div className="flex items-center">
                      <item.icon className="h-4 w-4 mr-2" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="bg-blue-700 rounded-full p-1">
                      {expandedSections[item.id] ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </div>
                  </button>
                  
                  {expandedSections[item.id] && (
                    <ul className="ml-4 mt-1 space-y-1 mb-2">
                      {item.children.map(child => (
                        <li key={child.id}>
                          <Link
                            to={child.path}
                            className={`flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors ${isActive(child.path)}`}
                          >
                            <child.icon className="h-4 w-4 mr-2" />
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors ${isActive(item.path)}`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-blue-700 bg-blue-800 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center p-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;