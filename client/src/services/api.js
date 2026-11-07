const BASE_URL = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('soukdz_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Request failed with status ' + response.status);
    }
    return data;
  }
  if (!response.ok) {
    throw new Error('Request failed with status ' + response.status);
  }
  return await response.text();
}

export const api = {
  // Auth
  auth: {
    login: async (credentials) => {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      return handleResponse(res);
    },
    register: async (userData) => {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return handleResponse(res);
    },
    google: async (payload) => {
      const res = await fetch(`${BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return handleResponse(res);
    },
    getMe: async () => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    updateMe: async (userData) => {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(userData)
      });
      return handleResponse(res);
    },
    forgotPassword: async (email) => {
      const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return handleResponse(res);
    },
    resetPassword: async (data) => {
      const res = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    }
  },

  // Algerian Wilayas and Communes
  wilayas: {
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/wilayas`);
      return handleResponse(res);
    },
    getStats: async () => {
      const res = await fetch(`${BASE_URL}/wilayas/stats`);
      return handleResponse(res);
    },
    getCommunes: async (wilayaCode) => {
      const res = await fetch(`${BASE_URL}/wilayas/${wilayaCode}/communes`);
      return handleResponse(res);
    },
    getRawJson: async () => {
      const res = await fetch(`${BASE_URL}/wilayas/raw-json`);
      return handleResponse(res);
    }
  },

  // Products
  products: {
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/products?${query}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${BASE_URL}/products/${id}`);
      return handleResponse(res);
    },
    create: async (productData) => {
      const res = await fetch(`${BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(productData)
      });
      return handleResponse(res);
    },
    update: async (id, productData) => {
      const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(productData)
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    toggleActive: async (id) => {
      const res = await fetch(`${BASE_URL}/products/${id}/toggle-active`, {
        method: 'PATCH',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    uploadImage: async (formData, onProgress = () => {}) => {
      return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `${BASE_URL}/products/upload-image`);
        Object.entries(getAuthHeader()).forEach(([name, value]) => request.setRequestHeader(name, value));
        request.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        });
        request.addEventListener('load', () => {
          let data;
          try {
            data = JSON.parse(request.responseText);
          } catch {
            reject(new Error(`Image upload returned an invalid response (HTTP ${request.status}).`));
            return;
          }

          if (request.status < 200 || request.status >= 300) {
            reject(new Error(data.message || `Image upload failed with status ${request.status}.`));
            return;
          }
          resolve(data);
        });
        request.addEventListener('error', () => reject(new Error('Network error while uploading the image.')));
        request.addEventListener('abort', () => reject(new Error('Image upload was cancelled.')));
        request.send(formData);
      });
    }
  },

  // Categories
  categories: {
    getAll: async () => {
      const res = await fetch(`${BASE_URL}/categories`);
      return handleResponse(res);
    },
    create: async (data) => {
      const res = await fetch(`${BASE_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    update: async (id, data) => {
      const res = await fetch(`${BASE_URL}/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(data)
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    }
  },

  // Orders
  orders: {
    create: async (orderData) => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(orderData)
      });
      return handleResponse(res);
    },
    track: async (orderNumber) => {
      const res = await fetch(`${BASE_URL}/orders/track/${encodeURIComponent(orderNumber)}`);
      return handleResponse(res);
    },
    getMyOrders: async () => {
      const res = await fetch(`${BASE_URL}/orders/my-orders`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    getAll: async (params = {}) => {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${BASE_URL}/orders?${query}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    getById: async (id) => {
      const res = await fetch(`${BASE_URL}/orders/${id}`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    updateStatus: async (id, status) => {
      const res = await fetch(`${BASE_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ status })
      });
      return handleResponse(res);
    },
    delete: async (id) => {
      const res = await fetch(`${BASE_URL}/orders/${id}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.status === 404 && !res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('La route de suppression est absente du serveur actif. Redémarrez ou redéployez le backend puis réessayez.');
      }
      return handleResponse(res);
    },
    getExportCsvUrl: () => `${BASE_URL}/orders/export/csv`
  },

  // Admin Dashboard & Management
  admin: {
    getStats: async () => {
      const res = await fetch(`${BASE_URL}/admin/stats`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    getCustomers: async () => {
      const res = await fetch(`${BASE_URL}/admin/customers`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    deleteCustomer: async (customerId) => {
      const res = await fetch(`${BASE_URL}/admin/customers/${customerId}`, {
        method: 'DELETE',
        headers: { ...getAuthHeader() }
      });
      if (res.status === 404 && !res.headers.get('content-type')?.includes('application/json')) {
        throw new Error('La route de suppression des clients est absente du serveur actif. Redémarrez ou redéployez le backend puis réessayez.');
      }
      return handleResponse(res);
    },
    getInventory: async () => {
      const res = await fetch(`${BASE_URL}/admin/inventory`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    updateStock: async (productId, quantity) => {
      const res = await fetch(`${BASE_URL}/admin/inventory/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ stock_quantity: quantity })
      });
      return handleResponse(res);
    }
  },

  // Settings
  settings: {
    get: async () => {
      const res = await fetch(`${BASE_URL}/settings`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    getPublic: async () => {
      const res = await fetch(`${BASE_URL}/settings/public`);
      return handleResponse(res);
    },
    update: async (settings) => {
      const res = await fetch(`${BASE_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(settings)
      });
      return handleResponse(res);
    },
    getAdminAccount: async () => {
      const res = await fetch(`${BASE_URL}/auth/admin-account`, {
        headers: { ...getAuthHeader() }
      });
      return handleResponse(res);
    },
    updateAdminAccount: async (account) => {
      const res = await fetch(`${BASE_URL}/auth/admin-account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(account)
      });
      return handleResponse(res);
    }
  }
};
