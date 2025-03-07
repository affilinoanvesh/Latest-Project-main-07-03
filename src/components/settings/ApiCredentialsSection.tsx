import React from 'react';
import { Key, Lock } from 'lucide-react';
import { ApiCredentials } from '../../types';

interface ApiCredentialsSectionProps {
  apiCredentials: ApiCredentials;
  credentialsExist: boolean;
  editingCredentials: boolean;
  onEditCredentials: () => void;
  onApiCredentialsChange: (field: keyof ApiCredentials, value: string) => void;
}

const ApiCredentialsSection: React.FC<ApiCredentialsSectionProps> = ({
  apiCredentials,
  credentialsExist,
  editingCredentials,
  onEditCredentials,
  onApiCredentialsChange
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">API Credentials</h2>
        {credentialsExist && !editingCredentials && (
          <button
            onClick={onEditCredentials}
            className="flex items-center text-sm bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200"
          >
            <Key className="h-4 w-4 mr-1" />
            Edit Credentials
          </button>
        )}
      </div>
      
      {credentialsExist && !editingCredentials ? (
        <div>
          <div className="bg-green-50 p-4 rounded-md mb-4 flex items-start">
            <Lock className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
            <div>
              <p className="text-green-700 font-medium">API credentials are securely stored</p>
              <p className="text-sm text-green-600">
                Your API credentials are securely stored in the database. 
                Click "Edit Credentials" if you need to update them.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500">Store URL</p>
              <p className="text-sm font-medium">{apiCredentials.store_url}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consumer Key</p>
              <p className="text-sm font-medium">••••••••••••••••••••{apiCredentials.key.slice(-4)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Consumer Secret</p>
              <p className="text-sm font-medium">••••••••••••••••••••{apiCredentials.secret.slice(-4)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Enter your API credentials to connect to your store.
            You can generate these in your WordPress admin under WooCommerce &gt; Settings &gt; Advanced &gt; REST API.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store URL
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="https://your-store.com"
                value={apiCredentials.store_url}
                onChange={(e) => onApiCredentialsChange('store_url', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your full store URL without trailing slash (e.g., https://your-store.com)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumer Key
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiCredentials.key}
                onChange={(e) => onApiCredentialsChange('key', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consumer Secret
              </label>
              <input
                type="password"
                className="w-full p-2 border rounded"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={apiCredentials.secret}
                onChange={(e) => onApiCredentialsChange('secret', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiCredentialsSection;