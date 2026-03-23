import { BookOpen, Database, Download, Plus, Search, Target, Upload } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import LoadingSpinner from "../../components/UI/LoadingSpinner";

const BASE_URL = `${import.meta.env.VITE_URL}/admin`;

const QuestionBank = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [error, setError] = useState('');
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctOptionIndex: 0,
    correctOptionText: '',
    difficulty: 'medium',
    hint: '',
    explanation: '',
  });

  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, searchTerm, difficultyFilter]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(difficultyFilter !== 'all' && { difficulty: difficultyFilter }),
      });
      const res = await fetch(`${BASE_URL}/questions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      setQuestions(json.data?.questions || []);
      setTotalPages(json.data?.pagination?.totalPages || 1);
      setTotalItems(json.data?.pagination?.totalItems || 0);
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      correctOptionText: '',
      difficulty: 'medium',
      hint: '',
      explanation: '',
    });
    setEditingQuestion(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      correctOptionIndex: parseInt(form.correctOptionIndex),
      correctOptionText: form.options[parseInt(form.correctOptionIndex)] || '',
    };

    try {
      const url = editingQuestion
        ? `${BASE_URL}/questions/${editingQuestion._id}`
        : `${BASE_URL}/questions`;
      const method = editingQuestion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Failed to save question');
        return;
      }

      setShowCreateForm(false);
      resetForm();
      fetchQuestions();
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  const handleEdit = (question) => {
    setEditingQuestion(question);
    setForm({
      questionText: question.questionText,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      correctOptionText: question.correctOptionText,
      difficulty: question.difficulty,
      hint: question.hint || '',
      explanation: question.explanation || '',
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await fetch(`${BASE_URL}/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchQuestions();
    } catch (err) {
      console.error(err);
    }
  };

  const easyCount = questions.filter(q => q.difficulty === 'easy').length;
  const hardCount = questions.filter(q => q.difficulty === 'hard').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Question Bank</h1>
              <p className="text-gray-600 dark:text-gray-400">{totalItems} questions total</p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); setShowCreateForm(true); }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: totalItems, icon: BookOpen, color: 'text-purple-400' },
          { label: 'Easy', value: easyCount, icon: Target, color: 'text-green-400' },
          { label: 'Hard', value: hardCount, icon: Target, color: 'text-red-400' },
          { label: 'Medium', value: totalItems - easyCount - hardCount, icon: Target, color: 'text-yellow-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label} Questions</div>
              </div>
              <s.icon className={`h-6 w-6 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={difficultyFilter}
          onChange={(e) => { setDifficultyFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500"><LoadingSpinner /></div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No questions yet.{' '}
            <button onClick={() => setShowCreateForm(true)} className="text-purple-500 hover:underline">
              Add one
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['Question', 'Difficulty', 'Options', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {questions.map((q) => (
                <tr key={q._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {q.questionText}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      q.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      q.difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {q.options?.length} options
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(q)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >Previous</button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Question Text *</label>
                <textarea
                  rows={3}
                  value={form.questionText}
                  onChange={(e) => setForm(p => ({ ...p, questionText: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Options *</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={parseInt(form.correctOptionIndex) === i}
                      onChange={() => setForm(p => ({ ...p, correctOptionIndex: i, correctOptionText: p.options[i] }))}
                      className="text-purple-600"
                    />
                    <input
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...form.options];
                        newOpts[i] = e.target.value;
                        setForm(p => ({ ...p, options: newOpts }));
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                    <span className="text-xs text-gray-400">{parseInt(form.correctOptionIndex) === i ? '✓ Correct' : ''}</span>
                  </div>
                ))}
                <p className="text-xs text-gray-500">Select the radio button next to the correct answer</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Difficulty *</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm(p => ({ ...p, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic / Hint</label>
                  <input
                    type="text"
                    value={form.hint}
                    onChange={(e) => setForm(p => ({ ...p, hint: e.target.value }))}
                    placeholder="e.g. JavaScript"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Explanation</label>
                <textarea
                  rows={2}
                  value={form.explanation}
                  onChange={(e) => setForm(p => ({ ...p, explanation: e.target.value }))}
                  placeholder="Explain the correct answer..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  {editingQuestion ? 'Update' : 'Create'} Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank;
