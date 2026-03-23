import { Award, Calendar, DollarSign, Plus, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ totalContests: 0, totalParticipants: 0, totalRevenue: 0 });
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${import.meta.env.VITE_URL}/admin/contests?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (json?.data?.contests) {
                const all = json.data.contests;
                setContests(all.slice(0, 5));
                setStats({
                    totalContests: json.data.pagination?.totalItems || all.length,
                    totalParticipants: all.reduce((sum, c) => sum + (c.registrationCount || 0), 0),
                    totalRevenue: all.reduce((sum, c) => sum + ((c.registrationFee || 0) * (c.registrationCount || 0)), 0),
                });
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-slate-500/20 text-slate-400',
            upcoming: 'bg-blue-500/20 text-blue-400',
            ongoing: 'bg-green-500/20 text-green-400',
            completed: 'bg-purple-500/20 text-purple-400',
            cancelled: 'bg-red-500/20 text-red-400',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
                {status}
            </span>
        );
    };

    const formatDate = (startDate, startTime) => {
        if (!startDate) return '—';
        try {
            return new Date(`${startDate}T${startTime || '00:00'}`).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch { return startDate; }
    };

    const statCards = [
        { title: 'Total Contests', value: stats.totalContests, icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { title: 'Total Participants', value: stats.totalParticipants, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { title: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
        { title: 'Certificates Issued', value: 0, icon: Award, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">Admin Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage and monitor your quiz platform</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigate('/admin/contests')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
                        <Plus className="w-4 h-4" /> Add Contest
                    </button>
                    <button onClick={() => navigate('/admin/questions')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg">
                        <Plus className="w-4 h-4" /> Add Questions
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((card) => (
                    <div key={card.title} className="bg-slate-800/50 border border-white/[0.06] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-slate-400">{card.title}</p>
                            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                                <card.icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{loading ? '—' : card.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Schedule Contest', icon: Calendar, path: '/admin/contests' },
                    { label: 'Add Questions', icon: Trophy, path: '/admin/questions' },
                    { label: 'View Analytics', icon: Award, path: '/admin/analytics' },
                    { label: 'Manage Payments', icon: DollarSign, path: '/admin/payments' },
                ].map((action) => (
                    <button key={action.label} onClick={() => navigate(action.path)}
                        className="flex items-center gap-2 p-3 bg-slate-800/50 border border-white/[0.06] rounded-xl text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
                        <action.icon className="w-4 h-4 text-indigo-400 shrink-0" />
                        {action.label}
                    </button>
                ))}
            </div>

            {/* Recent Contests */}
            <div className="bg-slate-800/50 border border-white/[0.06] rounded-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                    <h2 className="text-sm font-semibold text-slate-100">Recent Contests</h2>
                    <button onClick={() => navigate('/admin/contests')} className="text-xs text-indigo-400 hover:text-indigo-300">
                        View all →
                    </button>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading...</div>
                ) : contests.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        No contests yet.{' '}
                        <button onClick={() => navigate('/admin/contests')} className="text-indigo-400 hover:underline">
                            Create one
                        </button>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                {['Title', 'Start Date', 'Participants', 'Fee', 'Status'].map(h => (
                                    <th key={h} className="text-left text-[11px] font-medium text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {contests.map((contest) => (
                                <tr key={contest.id} onClick={() => navigate(`/admin/contests/${contest.id}`)}
                                    className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors">
                                    <td className="px-5 py-3 text-sm text-slate-200 font-medium">{contest.title}</td>
                                    <td className="px-5 py-3 text-sm text-slate-400">{formatDate(contest.startDate, contest.startTime)}</td>
                                    <td className="px-5 py-3 text-sm text-slate-400">{contest.registrationCount || 0}</td>
                                    <td className="px-5 py-3 text-sm text-slate-400">
                                        {contest.registrationFee === 0 ? 'Free' : `₹${contest.registrationFee}`}
                                    </td>
                                    <td className="px-5 py-3">{getStatusBadge(contest.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
