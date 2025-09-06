import { CreditCard, Download } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';

import ErrorBoundary from '../../components/ErrorBoundary';
import LoadingSpinner from '../../components/UI/LoadingSpinner';

const PaymentTable = lazy(() => import('./../../components/PaymentManagement/PaymentTable'));
const PaymentFilters = lazy(() => import('../../components/PaymentManagement/PaymentFilters'));
const PaymentStats = lazy(() => import('../../components/PaymentManagement/PaymentStats'));
const PaymentSummary = lazy(() => import('../../components/PaymentManagement/PaymentSummary'));

const API_BASE = `${import.meta.env.VITE_URL}/payments`; // replace with env var if needed
const TOKEN = localStorage.getItem("authToken"); // example: get token from localStorage

const PaymentManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [contestFilter, setContestFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch payments + contests
  useEffect(() => {
    const fetchPaymentData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch payments
        const paymentsResponse = await fetch(`${API_BASE}/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN}`
          },
          body: JSON.stringify({
            filters: {
              status: statusFilter,
              contestId: contestFilter,
              searchTerm: searchTerm || undefined,
              dateRange: dateFilter !== "all" ? {
                startDate: dateFilter + "-01",
                endDate: dateFilter + "-31"
              } : undefined
            },
            pagination: { page: 1, limit: 100 },
            sorting: { field: "createdAt", order: "desc" }
          })
        });

        if (!paymentsResponse.ok) {
          throw new Error("Failed to fetch payments");
        }
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.data?.payments || []);

        // 2. Fetch contests
        const contestsResponse = await fetch(`${API_BASE}/contests`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${TOKEN}` }
        });

        if (!contestsResponse.ok) {
          throw new Error("Failed to fetch contests");
        }
        const contestsData = await contestsResponse.json();
        setContests(contestsData.data?.contests || []);

      } catch (err) {
        console.error("Error fetching payment data:", err);
        setError(err.message || "Failed to fetch payment data");
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentData();
  }, [searchTerm, statusFilter, contestFilter, dateFilter]);

  // Export functionality
  const exportPayments = async () => {
    try {
      const response = await fetch(`${API_BASE}/payments/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          filters: {
            status: statusFilter,
            contestId: contestFilter,
            dateRange: dateFilter !== "all" ? {
              startDate: dateFilter + "-01",
              endDate: dateFilter + "-31"
            } : undefined,
            searchTerm: searchTerm || undefined
          },
          format: "csv",
          columns: [
            "transactionId",
            "userName",
            "userEmail",
            "contestTitle",
            "amount",
            "status",
            "createdAt"
          ]
        })
      });

      if (!response.ok) throw new Error("Failed to export payments");

      const exportData = await response.json();
      const link = document.createElement("a");
      link.href = exportData.data.exportUrl;
      link.download = exportData.data.filename;
      link.click();

    } catch (err) {
      console.error("Error exporting payments:", err);
      setError("Failed to export payments");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-700">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Error Loading Payments
        </h2>
        <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Monitor transactions and revenue</p>
              </div>
            </div>
            <button
              onClick={exportPayments}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentStats payments={payments} />
        </Suspense>

        {/* Filters */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            contestFilter={contestFilter}
            setContestFilter={setContestFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            contests={contests}
          />
        </Suspense>

        {/* Payments Table */}
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentTable payments={payments} />
        </Suspense>
{/* 
        Summary
        <Suspense fallback={<LoadingSpinner />}>
          <PaymentSummary payments={payments} />
        </Suspense> */}
      </div>
    </ErrorBoundary>
  );
};

export default PaymentManagement;
