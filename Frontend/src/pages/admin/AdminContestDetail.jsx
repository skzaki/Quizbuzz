import {
    ArrowLeft, Award, BarChart3, Download, Edit,
    FileText, Play, Square, Trophy, Users
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';

const BASE_URL = `${import.meta.env.VITE_URL}/admin`;
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL;

const StatusBadge = ({ status }) => {
    const styles = {
        draft: 'bg-slate-500/20 text-slate-400',
        upcoming: 'bg-blue-500/20 text-blue-400',
        ongoing: 'bg-green-500/20 text-green-400',
        completed: 'bg-purple-500/20 text-purple-400',
        cancelled: 'bg-red-500/20 text-red-400',
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
            {status}
        </span>
    );
};

const AdminContestDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [contest, setContest] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [waitingRoom, setWaitingRoom] = useState([]);
    const [quizRoom, setQuizRoom] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const socketRef = useRef(null);
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        fetchContestData();
    }, [id]);

    useEffect(() => {
        if (!contest) return;
        // Connect socket for waiting room
        socketRef.current = io(WS_URL, {
            path: '/ws/',
            auth: { token },
            transports: ['websocket'],
        });

        socketRef.current.on('connect', () => {
            socketRef.current.emit('get-room-status', { contestId: id });
        });

        socketRef.current.on('room-status', ({ waiting, quiz }) => {
            setWaitingRoom(waiting || []);
            setQuizRoom(quiz || []);
        });

        socketRef.current.on('participant-joined', () => {
            socketRef.current.emit('get-room-status', { contestId: id });
        });

        socketRef.current.on('participant-left', () => {
            socketRef.current.emit('get-room-status', { contestId: id });
        });

        // Poll room status every 10 seconds
        const interval = setInterval(() => {
            socketRef.current?.emit('get-room-status', { contestId: id });
        }, 10000);

        return () => {
            clearInterval(interval);
            socketRef.current?.disconnect();
        };
    }, [contest]);

    const fetchContestData = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${BASE_URL}/contests/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setContest(json.data);
            setParticipants(json.data?.participants || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setActionLoading(true);
        try {
            await fetch(`${BASE_URL}/contests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            setContest(prev => ({ ...prev, status: newStatus }));
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleStartNow = () => {
        if (!socketRef.current) return;
        socketRef.current.emit('start-quiz', { contestId: id });
        handleStatusChange('ongoing');
    };

    const handleDelete = async () => {
        if (!window.confirm(`Type "delete" to confirm`)) return;
        try {
            await fetch(`${BASE_URL}/contests/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/admin/contests');
        } catch (err) {
            console.error(err);
        }
    };

    const exportCSV = () => {
        if (!participants.length) return;
        const headers = ['Name', 'Email', 'Joined At'];
        const rows = participants.map(p => [
            `${p.firstName} ${p.lastName}`,
            p.email,
            new Date(p.createdAt).toLocaleDateString()
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contest?.slug}-participants.csv`;
        a.click();
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error || !contest) return (
        <div className="p-6 text-center text-red-400">{error || 'Contest not found'}</div>
    );

    const tabs = [
        { key: 'overview', label: 'Overview', icon: Trophy },
        { key: 'waiting', label: `Waiting Room (${waitingRoom.length})`, icon: Users },
        { key: 'questions', label: 'Questions', icon: FileText },
        { key: 'participants', label: `Participants (${participants.length})`, icon: Users },
        { key: 'analytics', label: 'Analytics', icon: BarChart3 },
        { key: 'export', label: 'Export', icon: Download },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-slate-800/50 border border-white/[0.06] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to="/admin/contests" className="text-slate-400 hover:text-slate-200">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-semibold text-slate-100">{contest.title}</h1>
                                <StatusBadge status={contest.status} />
                            </div>
                            <p className="text-sm text-slate-500 mt-0.5">
                                {new Date(contest.startTime).toLocaleString('en-IN')} •
                                {contest.duration} mins •
                                {contest.registerFee === 0 ? ' Free' : ` ₹${contest.registerFee}`} •
                                {contest.QuestionBank?.length || 0} questions
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {contest.status === 'draft' && (
                            <button
                                onClick={() => handleStatusChange('upcoming')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1.5"
                            >
                                <Play className="w-3.5 h-3.5" /> Publish
                            </button>
                        )}
                        {contest.status === 'upcoming' && (
                            <button
                                onClick={handleStartNow}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1.5"
                            >
                                <Play className="w-3.5 h-3.5" /> Start Now
                            </button>
                        )}
                        {contest.status === 'ongoing' && (
                            <button
                                onClick={() => handleStatusChange('completed')}
                                disabled={actionLoading}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-1.5"
                            >
                                <Square className="w-3.5 h-3.5" /> Stop
                            </button>
                        )}
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-red-600 text-white text-sm rounded-lg"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 border border-white/[0.06] rounded-xl p-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            activeTab === tab.key
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="bg-slate-800/50 border border-white/[0.06] rounded-xl p-5">

                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-300">Contest Details</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Status', value: <StatusBadge status={contest.status} /> },
                                { label: 'Start Time', value: new Date(contest.startTime).toLocaleString('en-IN') },
                                { label: 'Deadline', value: new Date(contest.deadline).toLocaleString('en-IN') },
                                { label: 'Duration', value: `${contest.duration} minutes` },
                                { label: 'Registration Fee', value: contest.registerFee === 0 ? 'Free' : `₹${contest.registerFee}` },
                                { label: 'Participants', value: participants.length },
                                { label: 'Questions', value: contest.QuestionBank?.length || 0 },
                                { label: 'Slug', value: contest.slug },
                            ].map(item => (
                                <div key={item.label} className="bg-slate-700/30 rounded-lg p-3">
                                    <p className="text-xs text-slate-500 mb-1">{item.label}</p>
                                    <p className="text-sm text-slate-200">{item.value}</p>
                                </div>
                            ))}
                        </div>

                        {contest.description && (
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Description</p>
                                <p className="text-sm text-slate-300">{contest.description}</p>
                            </div>
                        )}

                        {contest.topics?.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Topics</p>
                                <div className="flex flex-wrap gap-2">
                                    {contest.topics.map(t => (
                                        <span key={t} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-xs rounded-full">{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {contest.rules?.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Rules</p>
                                <ul className="space-y-1">
                                    {contest.rules.map((r, i) => (
                                        <li key={i} className="text-sm text-slate-300 flex gap-2">
                                            <span className="text-indigo-400">{i + 1}.</span> {r}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {contest.prizes?.length > 0 && (
                            <div>
                                <p className="text-xs text-slate-500 mb-2">Prizes</p>
                                <div className="flex flex-wrap gap-2">
                                    {contest.prizes.map((p, i) => (
                                        <div key={i} className="bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
                                            <span className="text-yellow-400">🏆 Rank {p.rankFrom}-{p.rankTo}:</span>
                                            <span className="text-slate-200 ml-1">₹{p.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* WAITING ROOM TAB */}
                {activeTab === 'waiting' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-sm text-slate-300">Live Waiting Room</span>
                                <span className="text-xs text-slate-500">— {waitingRoom.length} waiting, {quizRoom.length} in quiz</span>
                            </div>
                            {contest.status === 'upcoming' && (
                                <button
                                    onClick={handleStartNow}
                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-1.5"
                                >
                                    <Play className="w-3.5 h-3.5" /> Start Quiz Now
                                </button>
                            )}
                        </div>

                        {waitingRoom.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No participants in waiting room yet
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        <th className="text-left text-xs text-slate-500 uppercase pb-2">User ID</th>
                                        <th className="text-left text-xs text-slate-500 uppercase pb-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waitingRoom.map((userId, i) => (
                                        <tr key={i} className="border-b border-white/[0.04]">
                                            <td className="py-2 text-sm text-slate-300 font-mono">{userId}</td>
                                            <td className="py-2">
                                                <span className="text-xs text-yellow-400">Waiting</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {quizRoom.map((userId, i) => (
                                        <tr key={`quiz-${i}`} className="border-b border-white/[0.04]">
                                            <td className="py-2 text-sm text-slate-300 font-mono">{userId}</td>
                                            <td className="py-2">
                                                <span className="text-xs text-green-400">In Quiz</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* QUESTIONS TAB */}
                {activeTab === 'questions' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-300">
                                {contest.QuestionBank?.length || 0} Questions Assigned
                            </h2>
                        </div>
                        {!contest.QuestionBank?.length ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No questions assigned to this contest yet
                            </div>
                        ) : (
                            contest.QuestionBank.map((q, i) => (
                                <div key={q._id || i} className="bg-slate-700/30 rounded-lg p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm text-slate-200">
                                            <span className="text-slate-500 mr-2">{i + 1}.</span>
                                            {q.questionText}
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                                            q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                            q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                            'bg-yellow-500/20 text-yellow-400'
                                        }`}>{q.difficulty}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* PARTICIPANTS TAB */}
                {activeTab === 'participants' && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-300">{participants.length} Registered Participants</h2>
                        {!participants.length ? (
                            <div className="text-center py-8 text-slate-500 text-sm">No participants registered yet</div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Name', 'Email', 'Registration ID', 'Joined'].map(h => (
                                            <th key={h} className="text-left text-xs text-slate-500 uppercase pb-2 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {participants.map((p, i) => (
                                        <tr key={p._id || i} className="border-b border-white/[0.04]">
                                            <td className="py-2 text-sm text-slate-200 pr-4">{p.firstName} {p.lastName}</td>
                                            <td className="py-2 text-sm text-slate-400 pr-4">{p.email}</td>
                                            <td className="py-2 text-sm text-slate-400 pr-4 font-mono">{p.registrationId}</td>
                                            <td className="py-2 text-sm text-slate-400">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-300">Contest Analytics</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Registered', value: participants.length, color: 'text-blue-400' },
                                { label: 'In Waiting Room', value: waitingRoom.length, color: 'text-yellow-400' },
                                { label: 'In Quiz', value: quizRoom.length, color: 'text-green-400' },
                                { label: 'Questions', value: contest.QuestionBank?.length || 0, color: 'text-purple-400' },
                            ].map(s => (
                                <div key={s.label} className="bg-slate-700/30 rounded-lg p-4 text-center">
                                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="text-center py-4 text-slate-500 text-sm">
                            Detailed analytics available after contest completion
                        </div>
                    </div>
                )}

                {/* EXPORT TAB */}
                {activeTab === 'export' && (
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold text-slate-300">Export Data</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-700/30 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <Users className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">Participants CSV</p>
                                        <p className="text-xs text-slate-500">{participants.length} participants</p>
                                    </div>
                                </div>
                                <button
                                    onClick={exportCSV}
                                    disabled={!participants.length}
                                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Download CSV
                                </button>
                            </div>
                            <div className="bg-slate-700/30 rounded-xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <Award className="w-5 h-5 text-yellow-400" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">Contest Details JSON</p>
                                        <p className="text-xs text-slate-500">Full contest data</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(contest, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${contest.slug}.json`;
                                        a.click();
                                    }}
                                    className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Download JSON
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminContestDetail;
