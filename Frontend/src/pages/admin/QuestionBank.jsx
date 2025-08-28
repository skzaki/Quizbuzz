import {
    BookOpen,
    Database,
    Download,
    Plus, Search,
    Target,
    Upload,
} from 'lucide-react';
import React, { Suspense, useCallback, useMemo, useState } from 'react';
import LoadingSpinner from "../../components/UI/LoadingSpinner";
import UnsavedWarning from "../../components/UI/UnsavedWarning";

import QuestionFormModal from '../../components/QuestionBank/QuestionFormModal';
import QuestionPreview from '../../components/QuestionBank/QuestionPreview';
import BulkImportModal from './../../components/QuestionBank/BulkImportModal';
import QuestionRow from './../../components/QuestionBank/QuestionRow';

const QuestionBank = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [newQuestion, setNewQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    topic: '',
    difficulty: 'medium',
    category: '',
    tags: '',
    xpReward: 10
  });

  // Mock data - TODO: Replace with API calls
  const topics = ['JavaScript', 'React', 'CSS', 'HTML', 'Node.js', 'TypeScript', 'Python'];
  const categories = ['Frontend', 'Backend', 'Full Stack', 'Data Structures', 'Algorithms'];

  // Mock questions data
  const mockQuestions = [
    {
      id: '1',
      text: 'What is the output of console.log(typeof null)?',
      options: ['null', 'undefined', 'object', 'boolean'],
      correctAnswer: 2,
      explanation: 'In JavaScript, typeof null returns "object" due to a historical bug that has been kept for compatibility reasons.',
      topic: 'JavaScript',
      difficulty: 'easy',
      category: 'Frontend',
      tags: ['typeof', 'null', 'operators'],
      xpReward: 10,
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15'
    },
    {
      id: '2',
      text: 'Which hook is used to manage state in functional React components?',
      options: ['useEffect', 'useState', 'useContext', 'useReducer'],
      correctAnswer: 1,
      explanation: 'useState is the primary hook for managing state in functional React components.',
      topic: 'React',
      difficulty: 'medium',
      category: 'Frontend',
      tags: ['hooks', 'state', 'functional-components'],
      xpReward: 15,
      createdAt: '2024-01-16',
      updatedAt: '2024-01-16'
    },
    {
      id: '3',
      text: 'What does the CSS property "contain: layout" do?',
      options: [
        'Contains the element within its parent',
        'Isolates the element for layout calculations',
        'Prevents overflow',
        'Sets the display property'
      ],
      correctAnswer: 1,
      explanation: 'The "contain: layout" property creates a new containing block for layout, isolating the element for performance optimizations.',
      topic: 'CSS',
      difficulty: 'hard',
      category: 'Frontend',
      tags: ['contain', 'layout', 'performance'],
      xpReward: 25,
      createdAt: '2024-01-17',
      updatedAt: '2024-01-17'
    }
  ];

  // Initialize questions on component mount
  React.useEffect(() => {
    // TODO: Replace with actual API call
    // fetchQuestions();
    setQuestions(mockQuestions);
  }, []);

  // API Functions - TODO: Implement actual API calls
  
  /**
   * Fetch all questions with pagination and filters
   * API: GET /api/questions?page=1&limit=10&search=term&topic=javascript&difficulty=easy
   */
  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Actual API call
      // const response = await fetch(`/api/questions?page=${currentPage}&limit=${itemsPerPage}&search=${searchTerm}&topic=${topicFilter}&difficulty=${difficultyFilter}`);
      // const data = await response.json();
      // setQuestions(data.questions);
      
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQuestions(mockQuestions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm, topicFilter, difficultyFilter]);

  /**
   * Create a new question
   * API: POST /api/questions
   */
  const createQuestion = async (questionData) => {
    try {
      // TODO: Actual API call
      // const response = await fetch('/api/questions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(questionData)
      // });
      // const newQuestion = await response.json();
      
      console.log('Creating question:', questionData);
      setHasUnsavedChanges(false);
      return { success: true, question: questionData };
    } catch (error) {
      console.error('Error creating question:', error);
      return { success: false, error };
    }
  };

  /**
   * Update an existing question
   * API: PUT /api/questions/:id
   */
  const updateQuestion = async (id, questionData) => {
    try {
      // TODO: Actual API call
      // const response = await fetch(`/api/questions/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(questionData)
      // });
      // const updatedQuestion = await response.json();
      
      console.log('Updating question:', id, questionData);
      setHasUnsavedChanges(false);
      return { success: true, question: questionData };
    } catch (error) {
      console.error('Error updating question:', error);
      return { success: false, error };
    }
  };

  /**
   * Delete a question
   * API: DELETE /api/questions/:id
   */
  const deleteQuestion = async (id) => {
    try {
      // TODO: Actual API call
      // const response = await fetch(`/api/questions/${id}`, {
      //   method: 'DELETE'
      // });
      
      console.log('Deleting question:', id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting question:', error);
      return { success: false, error };
    }
  };

  /**
   * Bulk import questions
   * API: POST /api/questions/bulk-import
   */
  const bulkImportQuestions = async (file) => {
    try {
      // TODO: Actual API call
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/questions/bulk-import', {
      //   method: 'POST',
      //   body: formData
      // });
      // const result = await response.json();
      
      console.log('Bulk importing questions from file:', file);
      return { success: true, imported: 0, failed: 0 };
    } catch (error) {
      console.error('Error bulk importing questions:', error);
      return { success: false, error} ;

    }
  };

  /**
   * Export questions
   * API: GET /api/questions/export?format=csv|json
   */
  const exportQuestions = async (format = 'csv') => {
    try {
      // TODO: Actual API call
      // const response = await fetch(`/api/questions/export?format=${format}`);
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `questions.${format}`;
      // a.click();
      
      console.log('Exporting questions as:', format);
    } catch (error) {
      console.error('Error exporting questions:', error);
    }
  };

  // Memoized filtered questions for performance
  const filteredQuestions = useMemo(() => {
    return questions.filter(question => {
      const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           question.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTopic = topicFilter === 'all' || question.topic === topicFilter;
      const matchesDifficulty = difficultyFilter === 'all' || question.difficulty === difficultyFilter;
      return matchesSearch && matchesTopic && matchesDifficulty;
    });
  }, [questions, searchTerm, topicFilter, difficultyFilter]);

  // Pagination
  const paginatedQuestions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredQuestions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredQuestions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredQuestions.length / itemsPerPage);

  // Event handlers
  const handleCreateQuestion = async () => {
    const result = await createQuestion(newQuestion);
    if (result.success) {
      setShowCreateForm(false);
      resetForm();
      fetchQuestions(); // Refresh the list
    }
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setNewQuestion({
      text: question.text,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topic: question.topic,
      difficulty: question.difficulty,
      category: question.category,
      tags: question.tags.join(', '),
      xpReward: question.xpReward
    });
    setShowCreateForm(true);
  };

  const handleDeleteQuestion = async (id) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const result = await deleteQuestion(id);
      if (result.success) {
        fetchQuestions(); // Refresh the list
      }
    }
  };

  const handlePreviewQuestion = (question) => {
    setPreviewQuestion(question);
    setShowPreview(true);
  };

  const resetForm = () => {
    setNewQuestion({
      text: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
      topic: '',
      difficulty: 'medium',
      category: '',
      tags: '',
      xpReward: 10
    });
    setEditingQuestion(null);
    setHasUnsavedChanges(false);
  };

  const handleFormChange = (field, value) => {
    setNewQuestion(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    if (editingQuestion) {
      updateQuestion(editingQuestion.id, newQuestion);
    } else {
      createQuestion(newQuestion);
    }
  };

  const handleDiscardChanges = () => {
    resetForm();
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Unsaved changes warning */}
      <UnsavedWarning 
        show={hasUnsavedChanges}
        onSave={handleSaveChanges}
        onDiscard={handleDiscardChanges}
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
              <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Question Bank</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your quiz questions and content</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={() => exportQuestions('csv')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Question</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
            </div>
            <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{topics.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Topics</div>
            </div>
            <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {questions.filter(q => q.difficulty === 'easy').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Easy Questions</div>
            </div>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {questions.filter(q => q.difficulty === 'hard').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Hard Questions</div>
            </div>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Topics</option>
            {topics.map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Topic
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      XP Reward
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedQuestions.map((question) => (
                    <QuestionRow 
                      key={question.id}
                      question={question}
                      onEdit={handleEditQuestion}
                      onDelete={handleDeleteQuestion}
                      onPreview={handlePreviewQuestion}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredQuestions.length)} of {filteredQuestions.length} results
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                      {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lazy loaded modals */}
      <Suspense fallback={<LoadingSpinner />}>
        {showCreateForm && (
          <QuestionFormModal
            question={newQuestion}
            editingQuestion={editingQuestion}
            topics={topics}
            categories={categories}
            isOpen={showCreateForm}
            onClose={() => {
              if (hasUnsavedChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                  handleDiscardChanges();
                }
              } else {
                setShowCreateForm(false);
                setEditingQuestion(null);
              }
            }}
            onSave={handleCreateQuestion}
            onChange={handleFormChange}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        )}
        
        {showBulkImport && (
          <BulkImportModal
            isOpen={showBulkImport}
            onClose={() => setShowBulkImport(false)}
            onImport={bulkImportQuestions}
          />
        )}
        
        {showPreview && previewQuestion && (
          <QuestionPreview
            question={previewQuestion}
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default QuestionBank;