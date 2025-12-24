'use client'
import React, { useState } from 'react';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import SearchBar from '../../../shared/components/search-bar';
import Table from '../../../shared/components/table';
import { format } from 'date-fns';

interface Log {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  source: string;
}

export default function LoggersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  // Mock data - replace with API call
  const logs: Log[] = [];

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.message.toLowerCase().includes(searchLower) ||
      log.level.toLowerCase().includes(searchLower) ||
      log.source.toLowerCase().includes(searchLower)
    );
  });

  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (log: Log) => format(new Date(log.timestamp), 'MM/dd/yyyy HH:mm:ss'),
    },
    {
      key: 'level',
      header: 'Level',
      render: (log: Log) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            log.level === 'error'
              ? 'bg-red-100 text-red-800'
              : log.level === 'warning'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {log.level.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (log: Log) => log.source,
    },
    {
      key: 'message',
      header: 'Message',
      render: (log: Log) => <span className="text-sm">{log.message}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Loggers</h1>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Loggers' },
          ]}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <SearchBar
            placeholder="Search logs..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={filteredLogs}
          isLoading={false}
          emptyMessage="No logs found"
        />
      </div>
    </div>
  );
}
