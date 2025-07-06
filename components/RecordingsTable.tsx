'use client';

import { useState } from 'react';
import { Recording, WorkType } from '@/types';
import { Clock, User, Users, Calendar } from 'lucide-react';

interface RecordingsTableProps {
  recordings: Recording[];
  workType: WorkType;
  onSelectionChange: (selectedIds: string[]) => void;
}

export default function RecordingsTable({ recordings, workType, onSelectionChange }: RecordingsTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelection = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter(selectedId => selectedId !== id)
      : [...selectedIds, id];
    
    setSelectedIds(newSelection);
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === recordings.length) {
      setSelectedIds([]);
      onSelectionChange([]);
    } else {
      const allIds = recordings.map(r => r.id);
      setSelectedIds(allIds);
      onSelectionChange(allIds);
    }
  };

  const getColumns = () => {
    switch (workType) {
      case 'concerto':
        return [
          { key: 'soloist', label: 'Soloist', icon: User },
          { key: 'conductor', label: 'Conductor', icon: User },
          { key: 'orchestra', label: 'Orchestra', icon: Users },
          { key: 'duration', label: 'Duration', icon: Clock },
          { key: 'year', label: 'Year', icon: Calendar }
        ];
      case 'solo':
        return [
          { key: 'performer', label: 'Performer', icon: User },
          { key: 'duration', label: 'Duration', icon: Clock },
          { key: 'year', label: 'Year', icon: Calendar }
        ];
      default:
        return [
          { key: 'conductor', label: 'Conductor', icon: User },
          { key: 'orchestra', label: 'Orchestra', icon: Users },
          { key: 'duration', label: 'Duration', icon: Clock },
          { key: 'year', label: 'Year', icon: Calendar }
        ];
    }
  };

  const columns = getColumns();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Found {recordings.length} recordings
          </h3>
          <button
            onClick={handleSelectAll}
            className="text-sm text-conductr-gold hover:text-yellow-600 font-medium"
          >
            {selectedIds.length === recordings.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Select
              </th>
              {columns.map(column => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1">
                    <column.icon className="w-4 h-4" />
                    {column.label}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {recordings.map(recording => (
              <tr
                key={recording.id}
                className={`hover:bg-gray-50 ${selectedIds.includes(recording.id) ? 'bg-conductr-gold bg-opacity-10' : ''}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(recording.id)}
                    onChange={() => handleToggleSelection(recording.id)}
                    className="w-4 h-4 text-conductr-gold focus:ring-conductr-gold border-gray-300 rounded"
                  />
                </td>
                {columns.map(column => (
                  <td key={column.key} className="px-4 py-3 text-sm text-gray-900">
                    {recording[column.key as keyof Recording] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <div className="px-4 py-3 bg-conductr-gold bg-opacity-10 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            <strong>{selectedIds.length}</strong> recording{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}
    </div>
  );
}