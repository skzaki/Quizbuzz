import { useCallback, useEffect, useState } from 'react';

const buildQuestionParams = ({ page, limit, search, difficulty, domain }) => {
  const params = new URLSearchParams();

  params.set('page', String(page));
  params.set('limit', String(limit));

  if (search) {
    params.set('search', search);
  }

  if (difficulty && difficulty !== 'all') {
    params.set('difficulty', difficulty);
  }

  if (domain && domain !== 'all') {
    params.set('domain', domain);
  }

  return params;
};

const buildStatsParams = ({ search, domain }) => {
  const params = new URLSearchParams();

  if (search) {
    params.set('search', search);
  }

  if (domain && domain !== 'all') {
    params.set('domain', domain);
  }

  return params;
};

export const useAdminQuestions = ({
  baseUrl,
  token,
  page = 1,
  limit = 10,
  search = '',
  difficulty = 'all',
  domain = 'all'
} = {}) => {
  const [questions, setQuestions] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchQuestions = useCallback(async () => {
    if (!token) {
      setQuestions([]);
      setTotalPages(1);
      setTotalItems(0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = buildQuestionParams({ page, limit, search, difficulty, domain });
      const response = await fetch(`${baseUrl}/questions?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      const payload = data?.data || {};

      setQuestions(Array.isArray(payload.questions) ? payload.questions : []);
      setTotalPages(payload.pagination?.totalPages || 1);
      setTotalItems(payload.pagination?.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, page, limit, search, difficulty, domain]);

  const fetchStats = useCallback(async () => {
    if (!token) {
      setStats({ total: 0, easy: 0, medium: 0, hard: 0 });
      return;
    }

    try {
      const params = buildStatsParams({ search, domain });
      const response = await fetch(`${baseUrl}/questions/stats?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch question stats');
      }

      const data = await response.json();
      const payload = data?.data || {};

      setStats({
        total: payload.total || 0,
        easy: payload.easy || 0,
        medium: payload.medium || 0,
        hard: payload.hard || 0
      });
    } catch (err) {
      setError(err.message || 'Failed to fetch question stats');
    }
  }, [baseUrl, token, search, domain]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchQuestions(), fetchStats()]);
  }, [fetchQuestions, fetchStats]);

  return {
    questions,
    totalPages,
    totalItems,
    stats,
    loading,
    error,
    refetchQuestions: fetchQuestions,
    refetchStats: fetchStats,
    refetch
  };
};