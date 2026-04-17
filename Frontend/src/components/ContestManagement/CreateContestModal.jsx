import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import ErrorBoundary from '../ErrorBoundary';
import { DEFAULT_CONTEST_RULES_TEXT } from '../../utils/defaultContestRules';
import {
  DIFFICULTY_LEVELS,
  MAX_SELECTABLE_DOMAINS,
  MIN_DOMAIN_PERCENTAGE,
  TOTAL_PERCENTAGE,
  getDifficultyTotal,
  getSliderBounds,
  isValidDifficultyDistribution,
  normalizeDomainDistribution,
  rebalanceAfterDomainChange,
  updateDifficultyForDomain
} from '../../utils/domainDistribution';

const getInitialFormData = () => ({
  title: '',
  description: '',
  duration: '',
  startDate: '',
  startTime: '',
  registrationFee: '',
  prizePool: '',
  topics: [],
  domainDistribution: [],
  maxParticipants: '',
  rules: DEFAULT_CONTEST_RULES_TEXT
});

const CreateContestModal = ({ isOpen, onClose, onSubmit, editData = null, serverError = '' }) => {
  const [formData, setFormData] = useState(getInitialFormData);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Pre-populate form if editing
  useEffect(() => {
    if (editData) {
      const topics = Array.isArray(editData.topics) ? editData.topics : [];
      setFormData({
        title: editData.title || '',
        description: editData.description || '',
        duration: editData.duration || '',
        startDate: editData.startDate || editData.date || '',
        startTime: editData.startTime || editData.time || '',
        registrationFee: editData.registrationFee ?? '',
        prizePool: editData.prizePool ?? '',
        topics,
        domainDistribution: normalizeDomainDistribution(topics, editData.domainDistribution || []),
        maxParticipants: editData.maxParticipants ?? '',
        rules: Array.isArray(editData.rules) ? editData.rules.join('\n') : (editData.rules || '')
      });
    }
  }, [editData]);

  const handleTopicsSelectionChange = (selectedTopics) => {
    const constrainedTopics = selectedTopics.slice(0, MAX_SELECTABLE_DOMAINS);

    setFormData(prev => ({
      ...prev,
      topics: constrainedTopics,
      domainDistribution: normalizeDomainDistribution(constrainedTopics, prev.domainDistribution)
    }));

    if (errors.topics || errors.domainDistribution) {
      setErrors(prev => ({
        ...prev,
        topics: '',
        domainDistribution: ''
      }));
    }
  };

  const handleDomainWeightChange = (domainName, nextValue) => {
    setFormData(prev => ({
      ...prev,
      domainDistribution: rebalanceAfterDomainChange(
        prev.topics,
        prev.domainDistribution,
        domainName,
        nextValue
      )
    }));

    if (errors.domainDistribution) {
      setErrors(prev => ({
        ...prev,
        domainDistribution: ''
      }));
    }
  };

  const handleDifficultyInputChange = (domainName, difficultyLevel, nextValue) => {
    setFormData(prev => ({
      ...prev,
      domainDistribution: updateDifficultyForDomain(
        prev.domainDistribution,
        domainName,
        difficultyLevel,
        nextValue
      )
    }));

    if (errors.domainDistribution || errors.domainDifficultyDistribution) {
      setErrors(prev => ({
        ...prev,
        domainDistribution: '',
        domainDifficultyDistribution: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters long';
    }
    
    if (!formData.duration || formData.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    } else if (formData.duration > 480) {
      newErrors.duration = 'Duration cannot exceed 8 hours (480 minutes)';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const selectedDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (formData.registrationFee !== '' && (formData.registrationFee < 0 || formData.registrationFee > 1000)) {
      newErrors.registrationFee = 'Registration fee must be between 0 and 1000';
    }
    
    if (formData.prizePool !== '' && (formData.prizePool < 0 || formData.prizePool > 100000)) {
      newErrors.prizePool = 'Prize pool must be between 0 and 100000';
    }

    if (formData.maxParticipants !== '' && (formData.maxParticipants <= 0 || formData.maxParticipants > 10000)) {
      newErrors.maxParticipants = 'Max participants must be between 1 and 10000';
    }

    if (!formData.topics || formData.topics.length === 0) {
      newErrors.topics = 'At least one domain must be selected';
    } else if (formData.topics.length > MAX_SELECTABLE_DOMAINS) {
      newErrors.topics = `You can select up to ${MAX_SELECTABLE_DOMAINS} domains (minimum ${MIN_DOMAIN_PERCENTAGE}% each)`;
    }

    const normalizedDistribution = normalizeDomainDistribution(formData.topics, formData.domainDistribution);
    const distributionTotal = normalizedDistribution.reduce((sum, item) => sum + item.percentage, 0);
    const hasInvalidMin = normalizedDistribution.some((item) => (
      formData.topics.length > 1 && item.percentage < MIN_DOMAIN_PERCENTAGE
    ));
    const hasInvalidDifficulty = normalizedDistribution.some((item) => !isValidDifficultyDistribution(item.difficulty));

    if (formData.topics.length > 0) {
      if (normalizedDistribution.length !== formData.topics.length) {
        newErrors.domainDistribution = 'Domain distribution is out of sync with selected domains';
      } else if (distributionTotal !== TOTAL_PERCENTAGE) {
        newErrors.domainDistribution = `Total domain allocation must be exactly ${TOTAL_PERCENTAGE}%`;
      } else if (hasInvalidMin) {
        newErrors.domainDistribution = `Each domain must be at least ${MIN_DOMAIN_PERCENTAGE}%`;
      }

      if (hasInvalidDifficulty) {
        newErrors.domainDifficultyDistribution = 'Each domain must have valid difficulty values between 0 and 100 totaling exactly 100';
      }
    }

    return newErrors;
  };

  const handleSubmit = async (e, isDraft = false) => {
    // e may be a real form submit event OR a synthetic button click — guard both cases
    if (e && e.preventDefault) e.preventDefault();

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      return;
    }

    setLoading(true);

    try {
      const normalizedDistribution = normalizeDomainDistribution(formData.topics, formData.domainDistribution);

      // Pass raw primitive values — let the parent (ContestManagement) do the
      // final shaping so there is only ONE place that builds the API payload.
      const contestData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        // Send as separate fields — parent combines them into startTime (Date)
        startDate: formData.startDate,
        startTime: formData.startTime,
        duration: formData.duration,
        registrationFee: formData.registrationFee,
        prizePool: formData.prizePool,
        maxParticipants: formData.maxParticipants,
        // Send raw comma-separated string so parent's split() works correctly
        topics: formData.topics,
        domainDistribution: normalizedDistribution,
        rules: formData.rules,
        status: isDraft ? 'draft' : 'upcoming',
      };

      await onSubmit(contestData);
      resetForm();
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: error.message || 'Failed to save contest. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setErrors({});
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading]);

  if (!isOpen) return null;

  const generalError = errors.general || serverError;
  const totalDomainPercentage = formData.domainDistribution.reduce((sum, item) => sum + (item.percentage || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <ErrorBoundary>

        
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editData ? 'Edit Contest' : 'Create New Contest'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            disabled={loading}
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {generalError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{generalError}</p>
          </div>
        )}
        
        <form className="space-y-4" onSubmit={(e) => handleSubmit(e, false)}>
          {/* Title and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contest Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.title ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors`}
                placeholder="Enter contest title"
                disabled={loading}
                maxLength={100}
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.duration ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g. 60"
                disabled={loading}
              />
              {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Brief description of the contest"
              disabled={loading}
            />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.startDate ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                disabled={loading}
              />
              {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.startTime ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                disabled={loading}
              />
              {errors.startTime && <p className="text-red-500 text-xs mt-1">{errors.startTime}</p>}
            </div>
          </div>

          {/* Registration Fee & Prize Pool */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Registration Fee
              </label>
              <input
                type="number"
                name="registrationFee"
                value={formData.registrationFee}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.registrationFee ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g. 50"
                disabled={loading}
              />
              {errors.registrationFee && <p className="text-red-500 text-xs mt-1">{errors.registrationFee}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prize Pool
              </label>
              <input
                type="number"
                name="prizePool"
                value={formData.prizePool}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.prizePool ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g. 10000"
                disabled={loading}
              />
              {errors.prizePool && <p className="text-red-500 text-xs mt-1">{errors.prizePool}</p>}
            </div>
          </div>

          {/* Topics & Max Participants */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Topics (Domains) *
              </label>
              <MultiSelectDropdown
                selectedOptions={formData.topics}
                onChange={handleTopicsSelectionChange}
                maxSelections={MAX_SELECTABLE_DOMAINS}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select up to {MAX_SELECTABLE_DOMAINS} domains. Minimum {MIN_DOMAIN_PERCENTAGE}% per domain.
              </p>
              {errors.topics && <p className="text-red-500 text-xs mt-1">{errors.topics}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Participants
              </label>
              <input
                type="number"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${errors.maxParticipants ? 'border-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                placeholder="e.g. 500"
                disabled={loading}
              />
              {errors.maxParticipants && <p className="text-red-500 text-xs mt-1">{errors.maxParticipants}</p>}
            </div>
          </div>

          {formData.topics.length > 0 && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-4 space-y-3 transition-all duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Domain Weight Distribution
                </h3>
                <span className={`text-xs font-semibold ${
                  totalDomainPercentage === TOTAL_PERCENTAGE
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  Total: {totalDomainPercentage}%
                </span>
              </div>

              <div className="space-y-3">
                {formData.domainDistribution.map((item) => {
                  const sliderBounds = getSliderBounds(formData.topics.length);
                  const disableSlider = formData.topics.length === 1 || formData.topics.length > MAX_SELECTABLE_DOMAINS;
                  const difficultyTotal = getDifficultyTotal(item.difficulty);

                  return (
                    <div key={item.name} className="space-y-2.5 transition-all duration-200 rounded-md border border-gray-200/80 dark:border-gray-700/60 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">{item.percentage}%</span>
                      </div>
                      <input
                        type="range"
                        min={sliderBounds.min}
                        max={sliderBounds.max}
                        step="1"
                        value={item.percentage}
                        onChange={(e) => handleDomainWeightChange(item.name, Number(e.target.value))}
                        disabled={loading || disableSlider}
                        className="w-full accent-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {DIFFICULTY_LEVELS.map((level) => (
                          <div key={`${item.name}-${level}`}>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 capitalize">
                              {level} (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={item.difficulty?.[level] ?? 0}
                              onChange={(e) => handleDifficultyInputChange(item.name, level, e.target.value)}
                              disabled={loading}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>

                      <p className={`text-xs font-medium ${
                        difficultyTotal === TOTAL_PERCENTAGE
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        Total: {difficultyTotal}%
                      </p>
                    </div>
                  );
                })}
              </div>

              {formData.topics.length > MAX_SELECTABLE_DOMAINS && (
                <p className="text-red-500 text-xs">
                  This contest has more than {MAX_SELECTABLE_DOMAINS} domains. Reduce domains to enable weighted sliders.
                </p>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allocation updates in real-time and always remains exactly {TOTAL_PERCENTAGE}%.
              </p>

              {errors.domainDistribution && (
                <p className="text-red-500 text-xs">{errors.domainDistribution}</p>
              )}

              {errors.domainDifficultyDistribution && (
                <p className="text-red-500 text-xs">{errors.domainDifficultyDistribution}</p>
              )}
            </div>
          )}

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rules
            </label>
            <textarea
              name="rules"
              rows="3"
              value={formData.rules}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="List contest rules..."
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : editData ? 'Update Contest' : 'Create Contest'}
            </button>
          </div>
        </form>
      </div>
    </ErrorBoundary>
    </div>
  );
};

export default CreateContestModal;
