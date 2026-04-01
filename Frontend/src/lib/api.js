/**
 * Centralized API utility for standardizing fetch requests across the application.
 * Handles base URL, auth tokens, and response formatting.
 */

const BASE_URL = import.meta.env.VITE_URL;

const getHeaders = (options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Automatically take tokens from localStorage
  const adminToken = localStorage.getItem('adminToken');
  const contestToken = localStorage.getItem('contestToken');

  // Use adminToken if available and specifically requested or in admin path
  if (options.isAdmin && adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  } else if (contestToken) {
    headers['Authorization'] = `Bearer ${contestToken}`;
  }

  return headers;
};

const handleResponse = async (response) => {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = (data && data.error) || {
      code: 'UNEXPECTED_ERROR',
      message: response.statusText || 'An unexpected error occurred'
    };
    return Promise.reject(error);
  }

  return data;
};

export const api = {
  get: (endpoint, options = {}) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(options),
      ...options,
    }).then(handleResponse);
  },

  post: (endpoint, body, options = {}) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(options),
      body: JSON.stringify(body),
      ...options,
    }).then(handleResponse);
  },

  put: (endpoint, body, options = {}) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(options),
      body: JSON.stringify(body),
      ...options,
    }).then(handleResponse);
  },

  delete: (endpoint, options = {}) => {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(options),
      ...options,
    }).then(handleResponse);
  },
};
