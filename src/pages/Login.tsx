import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        const isAuthenticated = await authService.isAuthenticated();
        console.log('Is authenticated:', isAuthenticated);
        
        // Only redirect if authenticated and not coming from a redirect loop
        if (isAuthenticated) {
          // Get the intended destination or default to dashboard
          const from = location.state?.from?.pathname || '/';
          console.log('User is authenticated, redirecting to:', from);
          
          // Prevent redirect loop by checking if we're already on login page
          if (location.pathname === '/login') {
            navigate(from, { replace: true });
          }
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setDebugInfo(`Auth check error: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    
    checkAuth();
  }, [navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDebugInfo(null);
    setLoading(true);

    try {
      console.log('Attempting to sign in with:', email);
      const { user, error } = await authService.signIn(email, password);
      
      console.log('Sign in result - User:', user, 'Error:', error);
      
      if (error) {
        console.error('Login error:', error);
        setError(`Login failed: ${error.message}`);
        setDebugInfo(`Error details: ${JSON.stringify(error)}`);
        return;
      }

      if (user) {
        console.log('Login successful, redirecting to dashboard');
        // Redirect to dashboard on successful login
        navigate('/', { replace: true });
      } else {
        setError('Something went wrong. Please try again.');
        setDebugInfo('User object is null after successful login');
      }
    } catch (err) {
      console.error('Unexpected login error:', err);
      setError('An unexpected error occurred');
      setDebugInfo(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Pets Avenue</h1>
          <h2 className="mt-2 text-xl font-semibold text-gray-700">Sign in to your account</h2>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        {debugInfo && (
          <div className="p-3 text-xs text-gray-700 bg-gray-100 rounded-md overflow-auto max-h-32">
            <p className="font-bold">Debug Info:</p>
            <pre>{debugInfo}</pre>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 