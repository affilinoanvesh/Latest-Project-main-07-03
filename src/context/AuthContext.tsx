import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, AuthUser } from '../services/authService';
import { supabase } from '../services/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check for user on mount
    const checkUser = async () => {
      console.log('AuthContext: Checking for current user...');
      try {
        // Set loading to true at the start of the check
        setLoading(true);
        
        const currentUser = await authService.getCurrentUser();
        console.log('AuthContext: Current user:', currentUser);
        
        // Update state based on the result
        setUser(currentUser);
        setIsAuthenticated(!!currentUser);
        console.log('AuthContext: isAuthenticated set to:', !!currentUser);
      } catch (error) {
        console.error('AuthContext: Error checking authentication:', error);
        // Reset auth state on error
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Mark auth as checked and loading as complete
        setAuthChecked(true);
        setLoading(false);
      }
    };

    checkUser();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthContext: Auth state changed -', event, !!session);
        
        if (event === 'SIGNED_IN' && session) {
          // User signed in
          const user = session.user;
          setUser({
            id: user.id,
            email: user.email || '',
          });
          setIsAuthenticated(true);
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );

    // Clean up listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext: Attempting to sign in...');
    setLoading(true);
    try {
      const { user, error } = await authService.signIn(email, password);
      console.log('AuthContext: Sign in result - User:', user, 'Error:', error);
      
      if (user && !error) {
        setUser(user);
        setIsAuthenticated(true);
        console.log('AuthContext: User authenticated successfully');
      } else {
        console.error('AuthContext: Sign in failed:', error);
      }
      
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('AuthContext: Signing out...');
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setIsAuthenticated(false);
      console.log('AuthContext: User signed out successfully');
    } catch (error) {
      console.error('AuthContext: Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
    isAuthenticated,
  };

  console.log('AuthContext: Current state -', { 
    isAuthenticated, 
    hasUser: !!user, 
    loading,
    authChecked
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 