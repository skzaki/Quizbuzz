import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const DOMAINS = [
  'Java', 'Python', 'JavaScript', 'Web Development', 'Cloud', 'AI',
  'Machine Learning', 'Data Science', 'Cybersecurity', 'Networking',
  'Database', 'DevOps', 'Blockchain', 'Software Engineering',
  'Operating Systems', 'Computer Networks', 'Data Structures', 'Algorithms',
  'C Programming', 'C++', 'React', 'Angular', 'Node.js', 'Git', 'Linux'
];

const MultiSelectDropdown = ({ selectedOptions = [], onChange, maxSelections = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const filteredDomains = DOMAINS.filter(domain =>
    domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleOption = (option) => {
    let newSelected;
    if (selectedOptions.includes(option)) {
      newSelected = selectedOptions.filter(item => item !== option);
    } else {
      if (maxSelections && selectedOptions.length >= maxSelections) return;
      newSelected = [...selectedOptions, option];
    }
    onChange(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOptions.length === DOMAINS.length) {
      onChange([]);
    } else {
      onChange([...DOMAINS]);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[42px] w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer flex flex-wrap gap-1.5 items-center justify-between transition-all hover:border-purple-400 focus:ring-2 focus:ring-purple-500"
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedOptions.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500 text-sm">Select domains...</span>
          ) : (
            selectedOptions.map(option => (
              <span
                key={option}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-md animate-in fade-in zoom-in duration-200"
              >
                {option}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-purple-900 dark:hover:text-purple-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(option);
                  }}
                />
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedOptions.length > 0 && (
            <span className="text-[10px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded-full">
              {selectedOptions.length}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[60] mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search domains..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm focus:ring-2 focus:ring-purple-500 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectAll();
              }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 rounded-md transition-colors"
            >
              {selectedOptions.length === DOMAINS.length ? 'Deselect All' : 'Select All Domains'}
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
            {filteredDomains.map(option => (
              <div
                key={option}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(option);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  selectedOptions.includes(option)
                    ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span className="text-sm">{option}</span>
                {selectedOptions.includes(option) && <Check className="w-4 h-4" />}
              </div>
            ))}
            {filteredDomains.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">No domains found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
