import axios, { AxiosInstance } from 'axios';
import { ApiCredentials } from '../../types';
import { credentialsService } from '../../services';
import { formatErrorMessage } from '../../utils/errorHandling';

// Cache for the WooCommerce client
let clientCache: {
  instance: AxiosInstance | null;
  credentials: string | null; // JSON string of credentials for comparison
  timestamp: number | null;
  expiresIn: number; // milliseconds
} = {
  instance: null,
  credentials: null,
  timestamp: null,
  expiresIn: 30 * 60 * 1000 // 30 minutes
};

// Set API credentials
export const setApiCredentials = async (credentials: ApiCredentials): Promise<void> => {
  try {
    // Validate credentials before saving
    if (!credentials.store_url || !credentials.key || !credentials.secret) {
      throw new Error('All API credential fields are required');
    }
    
    // Ensure URL doesn't have trailing slash
    if (credentials.store_url.endsWith('/')) {
      credentials.store_url = credentials.store_url.slice(0, -1);
    }

    // Save to Supabase
    await credentialsService.saveCredentials(credentials);
    
    // Clear the client cache when credentials change
    clientCache.instance = null;
    clientCache.credentials = null;
    clientCache.timestamp = null;
  } catch (error) {
    console.error('Error saving API credentials:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

// Get API credentials
export const getApiCredentials = async (): Promise<ApiCredentials | null> => {
  try {
    const credentials = await credentialsService.getCredentials();
    return credentials;
  } catch (error) {
    console.error('Error getting API credentials:', error);
    return null;
  }
};

// Check if API credentials exist
export const hasApiCredentials = async (): Promise<boolean> => {
  try {
    const credentials = await credentialsService.getCredentials();
    return !!credentials;
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return false;
  }
};

// Create WooCommerce client
export const createWooCommerceClient = async (): Promise<AxiosInstance> => {
  try {
    // Check if we have a valid cached client
    if (
      clientCache.instance && 
      clientCache.timestamp && 
      (Date.now() - clientCache.timestamp < clientCache.expiresIn)
    ) {
      return clientCache.instance;
    }

    // Get credentials
    const credentials = await getApiCredentials();
    if (!credentials) {
      throw new Error('API credentials not found');
    }

    // Check if credentials have changed
    const credentialsJson = JSON.stringify(credentials);
    if (clientCache.credentials === credentialsJson && clientCache.instance) {
      // Update timestamp but reuse instance
      clientCache.timestamp = Date.now();
      return clientCache.instance;
    }

    // Create new client
    const { store_url, key, secret } = credentials;
    
    // Create axios instance
    const client = axios.create({
      baseURL: `${store_url}/wp-json/wc/v3`,
      params: {
        consumer_key: key,
        consumer_secret: secret
      }
    });

    // Add response interceptor for error handling
    client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error('API Error Response:', {
            status: error.response.status,
            data: error.response.data,
            headers: error.response.headers
          });
        } else if (error.request) {
          // The request was made but no response was received
          console.error('API Error Request:', error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );

    // Update cache
    clientCache.instance = client;
    clientCache.credentials = credentialsJson;
    clientCache.timestamp = Date.now();

    return client;
  } catch (error) {
    console.error('Error creating WooCommerce client:', error);
    throw error;
  }
};

// Check if Atum plugin is available
export const checkAtumApiAvailability = async (): Promise<boolean> => {
  try {
    const client = await createWooCommerceClient();
    const response = await client.get('/atum/inventory');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};