// File: services/paymentService.js
/**
 * Payment API service functions
 */

const API_BASE_URL = import.meta.env.REACT_APP_API_BASE_URL || '/api';

/**
 * HTTP request helper with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    throw error;
  }
};

/**
 * Payment API service
 */
export const paymentService = {
  // Get all payments with optional filtering
  getPayments: async (filters = {}) => {
    return apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  },

  // Get single payment by ID
  getPaymentById: async (paymentId) => {
    return apiRequest(`/payments/${paymentId}`);
  },

  // Process refund for a payment
  refundPayment: async (paymentId, refundData) => {
    return apiRequest(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify(refundData)
    });
  },

  // Update payment status
  updatePaymentStatus: async (paymentId, status, reason = '') => {
    return apiRequest(`/payments/${paymentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    });
  },

  // Export payments to CSV
  exportPayments: async (filters = {}) => {
    return apiRequest('/payments/export', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  },

  // Get payment statistics
  getPaymentStats: async (dateRange = {}) => {
    return apiRequest('/payments/stats', {
      method: 'POST',
      body: JSON.stringify(dateRange)
    });
  },

  // Get contests for filtering
  getContests: async () => {
    return apiRequest('/contests');
  },

  // Retry failed payment
  retryPayment: async (paymentId) => {
    return apiRequest(`/payments/${paymentId}/retry`, {
      method: 'POST'
    });
  }
};