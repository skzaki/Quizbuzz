import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const BASE_URL = `${import.meta.env.VITE_URL}/admin`;

const AddQuestionsModal = ({ contestId, existingIds = [], onClose, onSaved }) => {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchQuestions();
  }, [search, difficulty]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 50,
        ...(search && { search }),
        ...(difficulty !== 'all' && { difficulty }),
      });
      const res = await fetch(`${BASE_URL}/questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      // Filter out already assigned questions
      const available = (json.data?.questions || []).filter(
        q => !existingIds.includes(q._id)
      );
      setQuestions(available);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!selected.length) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/questions/assign-to-contest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contestId, questionIds: selected })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Failed to assign questions');
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-white/[0.08] rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Add Questions to Contest</h2>
            <p className="text-xs text-slate-500 mt-0.5">{selected.length} selected</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search questions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-700 border border-white/[0.06] rounded-lg text-sm text-slate-200 placeholder-slate-500"
            />
          </div>
          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="px-3 py-1.5 bg-slate-700 border border-white/[0.06] rounded-lg text-sm text-slate-200"
          >
            <option value="all">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No questions available</div>
          ) : (
            questions.map(q => (
              <div
                key={q._id}
                onClick={() => toggle(q._id)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                  selected.includes(q._id)
                    ? 'bg-indigo-500/15 border-indigo-500/40'
                    : 'bg-slate-700/30 border-white/[0.04] hover:bg-slate-700/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(q._id)}
                  onChange={() => toggle(q._id)}
                  className="mt-0.5 accent-indigo-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">{q.questionText}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                      q.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{q.difficulty}</span>
                    {q.hint && <span className="text-xs text-slate-500">{q.hint}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {error && <p className="px-5 py-2 text-red-400 text-xs">{error}</p>}
        <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!selected.length || saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg"
          >
            {saving ? 'Saving...' : `Add ${selected.length} Question${selected.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionsModal;
