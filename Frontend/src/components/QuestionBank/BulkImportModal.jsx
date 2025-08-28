import { Upload, X } from 'lucide-react';
import { useState } from "react";
import ErrorBoundary from '../ErrorBoundary';
// Bulk Import Modal Component
const BulkImportModal = ({ isOpen, onClose, onImport }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (file && (file.type === "text/csv" || file.type === "application/json" || file.name.endsWith('.csv') || file.name.endsWith('.json'))) {
      setSelectedFile(file);
      processFile(file);
    } else {
      alert('Please select a valid CSV or JSON file.');
    }
  };

  const processFile = async (file) => {
    setIsProcessing(true);
    try {
      const text = await file.text();
      let data = [];
      
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        // TODO: Use Papa Parse library for better CSV handling
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < Math.min(6, lines.length); i++) { // Preview first 5 rows
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index];
            });
            data.push(row);
          }
        }
      } else if (file.type === "application/json" || file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text);
        data = Array.isArray(jsonData) ? jsonData.slice(0, 5) : [jsonData];
      }
      
      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please check the format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      await onImport(selectedFile);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <ErrorBoundary>
         
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Import Questions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          {!showPreview ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File (CSV or JSON)
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {isProcessing ? 'Processing file...' : 'Drag and drop your file here, or click to browse'}
                  </p>
                  {selectedFile && (
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                  <input 
                    type="file" 
                    accept=".csv,.json" 
                    onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                    className="hidden" 
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label 
                    htmlFor="file-upload"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer inline-block"
                  >
                    Choose File
                  </label>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">File Format Requirements:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• CSV: question, option1, option2, option3, option4, correct_answer, explanation, topic, difficulty</li>
                  <li>• JSON: Array of question objects with required fields</li>
                  <li>• Maximum file size: 10MB</li>
                </ul>
              </div>
            </>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Preview Data (First 5 rows)</h3>
              <div className="overflow-x-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <pre className="text-sm text-gray-700 dark:text-gray-300">
                  {JSON.stringify(previewData, null, 2)}
                </pre>
              </div>
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setSelectedFile(null);
                    setPreviewData([]);
                  }}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ← Back to file selection
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  File: {selectedFile?.name}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!selectedFile || isProcessing}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Import Questions'}
            </button>
          </div>
        </div>
      </div>
      </ErrorBoundary>
    </div>
  );
};

export default BulkImportModal;