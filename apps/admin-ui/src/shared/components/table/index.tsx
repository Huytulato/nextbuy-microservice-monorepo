'use client'
import React from 'react';

interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

function Table<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available',
  className = '',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
        <div className="p-8 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
        <div className="p-8 text-center text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.className || ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                      column.className || ''
                    }`}
                  >
                    {column.render
                      ? column.render(item)
                      : item[column.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
