import { db } from '../schema';
import { ApiCredentials } from '../../types';
import CryptoJS from 'crypto-js';

// Secret key for encryption (in a real app, this would be stored in a secure environment variable)
const ENCRYPTION_KEY = 'woocommerce-pnl-tracker-secret-key';

// Helper function to encrypt sensitive data
const encryptData = (data: string): string => {
  return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
};

// Helper function to decrypt sensitive data
const decryptData = (encryptedData: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Helper functions for API credentials operations
export async function saveApiCredentials(credentials: ApiCredentials): Promise<void> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    
    // Encrypt sensitive data before storing
    const encryptedCredentials = {
      ...credentials,
      consumerKey: encryptData(credentials.consumerKey),
      consumerSecret: encryptData(credentials.consumerSecret)
    };
    
    await db.transaction('rw', db.apiCredentials, async () => {
      await db.apiCredentials.clear();
      await db.apiCredentials.add({
        ...encryptedCredentials,
        id: 1
      });
    });
    
    // Also store a flag in localStorage to indicate credentials exist
    localStorage.setItem('has_api_credentials', 'true');
  } catch (error) {
    console.error('Error saving API credentials:', error);
    throw error;
  }
}

export async function getApiCredentials(): Promise<ApiCredentials | null> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    
    const encryptedCredentials = await db.apiCredentials.get(1);
    
    if (!encryptedCredentials) {
      return null;
    }
    
    // Decrypt sensitive data
    return {
      url: encryptedCredentials.url,
      consumerKey: decryptData(encryptedCredentials.consumerKey),
      consumerSecret: decryptData(encryptedCredentials.consumerSecret)
    };
  } catch (error) {
    console.error('Error getting API credentials:', error);
    return null;
  }
}

export async function hasApiCredentials(): Promise<boolean> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    
    // First check localStorage for a quick answer
    const hasCredentialsFlag = localStorage.getItem('has_api_credentials');
    if (hasCredentialsFlag === 'true') {
      // Double-check by actually querying the database
      const credentials = await db.apiCredentials.get(1);
      return !!credentials;
    }
    
    // If no flag in localStorage, check the database directly
    const credentials = await db.apiCredentials.get(1);
    if (credentials) {
      // Set the flag if credentials exist
      localStorage.setItem('has_api_credentials', 'true');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return false;
  }
}