import { useCallback, useEffect, useState } from 'react';

const buildContestParams = ({ page, limit, search, status }) => {
  const params = new URLSearchParams();

  params.set('page', String(page));
  params.set('limit', String(limit));

  if (search) {
    params.set('search', search);
  }

  if (status && status !== 'all') {
    params.set('status', status);
  }

  return params;
};

export const useAdminContests = ({
  baseUrl,
  token,
  page = 1,
  limit = 6,
  search = '',
  status = 'all'
} = {}) => {
  const [contests, setContests] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [overview, setOverview] = useState({
    totalContests: 0,
    statusSummary: {
      draft: 0,
      upcoming: 0,
      ongoing: 0,
      completed: 0,
      cancelled: 0
    },
    totalParticipants: 0,
    totalQuestionBank: 0,
    estimatedRevenue: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchContests = useCallback(async () => {
    if (!token) {
      setContests([]);
      setTotalPages(1);
      setTotalItems(0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = buildContestParams({ page, limit, search, status });
      const response = await fetch(`${baseUrl}/contests?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error?.message || 'Failed to fetch contests');
      }

      setContests(Array.isArray(data?.data?.contests) ? data.data.contests : []);
      setTotalPages(data?.data?.pagination?.totalPages || 1);
      setTotalItems(data?.data?.pagination?.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, page, limit, search, status]);

  const fetchOverview = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/contests/overview`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.error?.message || 'Failed to fetch contest overview');
      }

      setOverview((prev) => ({
        ...prev,
        ...(data?.data || {})
      }));
    } catch (err) {
      setError((prevError) => prevError || err.message || 'Failed to fetch contest overview');
    }
  }, [baseUrl, token]);

  useEffect(() => {
    fetchContests();
  }, [fetchContests]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const refetchAll = useCallback(async () => {
    await Promise.all([fetchContests(), fetchOverview()]);
  }, [fetchContests, fetchOverview]);

  return {
    contests,
    totalPages,
    totalItems,
    overview,
    loading,
    error,
    refetchContests: fetchContests,
    refetchOverview: fetchOverview,
    refetchAll
  };
};