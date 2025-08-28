import {
    AlertTriangle
} from 'lucide-react';

const UnsavedWarning = ({ show, onSave, onDiscard }) => {
  if (!show) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-lg z-50">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Unsaved Changes</h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            You have unsaved changes that will be lost if you leave.
          </p>
          <div className="flex space-x-2 mt-3">
            <button 
              onClick={onSave}
              className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded"
            >
              Save Changes
            </button>
            <button 
              onClick={onDiscard}
              className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnsavedWarning;