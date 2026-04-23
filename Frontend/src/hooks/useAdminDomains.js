import { useCallback, useEffect, useState } from 'react';

export const useAdminDomains = ({ baseUrl, token, autoFetch = true } = {}) => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDomains = useCallback(async () => {
    if (!token) {
      setDomains([]);
      return [];
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${baseUrl}/domains`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }

      const data = await response.json();
      const options = Array.isArray(data?.data?.domains)
        ? data.data.domains.map((domain) => ({
            id: domain._id,
            value: domain.name,
            label: domain.name
          }))
        : [];

      setDomains(options);
      return options;
    } catch (err) {
      const message = err.message || 'Failed to fetch domains';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token]);

  useEffect(() => {
    if (autoFetch) {
      fetchDomains();
    }
  }, [autoFetch, fetchDomains]);

  return {
    domains,
    loading,
    error,
    refetch: fetchDomains
  };
};