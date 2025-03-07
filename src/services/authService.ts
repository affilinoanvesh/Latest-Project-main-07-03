import { supabase, supabaseAdmin } from './supabase';
import { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
}

export class AuthService {
  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    console.log('AuthService: Attempting to sign in with email:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthService: Error signing in:', error);
        return { user: null, error };
      }

      if (!data.user) {
        console.warn('AuthService: No user returned after sign in');
        return { user: null, error: new Error('No user returned after sign in') };
      }

      console.log('AuthService: Sign in successful for user ID:', data.user.id);
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
        },
        error: null,
      };
    } catch (err) {
      console.error('AuthService: Exception during sign in:', err);
      return { user: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ error: Error | null }> {
    console.log('AuthService: Signing out user');
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthService: Error signing out:', error);
        return { error };
      }

      console.log('AuthService: Sign out successful');
      return { error: null };
    } catch (err) {
      console.error('AuthService: Exception during sign out:', err);
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }

  /**
   * Get the current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    console.log('AuthService: Getting current user');
    try {
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('AuthService: Error getting current user:', error);
        return null;
      }
      
      if (!data.user) {
        console.log('AuthService: No current user found');
        return null;
      }

      console.log('AuthService: Current user found with ID:', data.user.id);
      return {
        id: data.user.id,
        email: data.user.email || '',
      };
    } catch (err) {
      console.error('AuthService: Exception getting current user:', err);
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    console.log('AuthService: Checking if user is authenticated');
    try {
      const user = await this.getCurrentUser();
      const isAuth = !!user;
      console.log('AuthService: User is authenticated:', isAuth);
      return isAuth;
    } catch (err) {
      console.error('AuthService: Exception checking authentication:', err);
      return false;
    }
  }

  /**
   * Create a new user (admin only)
   * This should only be used once to create the initial admin user
   */
  async createUser(email: string, password: string): Promise<{ user: AuthUser | null; error: Error | null }> {
    console.log('AuthService: Attempting to create user with email:', email);
    if (!supabaseAdmin) {
      console.error('AuthService: Admin client not available');
      return { 
        user: null, 
        error: new Error('Admin client not available. Cannot create user.') 
      };
    }

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (error) {
        console.error('AuthService: Error creating user:', error);
        return { user: null, error };
      }

      if (!data.user) {
        console.warn('AuthService: No user returned after creation');
        return { user: null, error: new Error('No user returned after creation') };
      }

      console.log('AuthService: User created successfully with ID:', data.user.id);
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
        },
        error: null,
      };
    } catch (err) {
      console.error('AuthService: Exception during user creation:', err);
      return { user: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  }
}

export const authService = new AuthService(); 