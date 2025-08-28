import { Edit, Eye, Trash2 } from 'lucide-react';
import React from "react";
import Badge from '../UI/Badge';
const QuestionRow = React.memo(({ question, onEdit, onDelete, onPreview }) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <td className="px-6 py-4">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
            {question.text}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {question.tags.map((tag, index) => (
              <Badge key={index} variant="default" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <Badge variant="info">{question.topic}</Badge>
      </td>
      <td className="px-6 py-4">
        <Badge variant={getDifficultyColor(question.difficulty)}>
          {question.difficulty}
        </Badge>
      </td>
      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
        {question.xpReward} XP
      </td>
      <td className="px-6 py-4">
        <div className="flex space-x-2">
          <button
            onClick={() => onPreview(question)}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(question)}
            className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(question.id)}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
});

QuestionRow.displayName = 'QuestionRow';


export default QuestionRow;