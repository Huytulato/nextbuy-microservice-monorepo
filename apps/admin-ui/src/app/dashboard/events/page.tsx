'use client'
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import SearchBar from '../../../shared/components/search-bar';
import Table from '../../../shared/components/table';
import Pagination from '../../../shared/components/pagination';
import StatusBadge from '../../../shared/components/status-badge';
import axiosInstance from '../../../utils/axiosInstance';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  category: string;
  starting_date: string;
  ending_date: string;
  status: string;
}

export default function EventsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-events', page],
    queryFn: async () => {
      const response = await axiosInstance.get('/admin/api/get-all-events');
      return response.data.events || [];
    },
  });

  const filteredEvents = (data || []).filter((event: Event) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      event.title.toLowerCase().includes(searchLower) ||
      event.category.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil((filteredEvents.length || 0) / limit);
  const paginatedEvents = filteredEvents.slice((page - 1) * limit, page * limit);

  const columns = [
    {
      key: 'title',
      header: 'Event Name',
      render: (event: Event) => (
        <span className="font-medium text-gray-900">{event.title}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (event: Event) => event.category,
    },
    {
      key: 'starting_date',
      header: 'Start Date',
      render: (event: Event) =>
        format(new Date(event.starting_date), 'dd/MM/yyyy'),
    },
    {
      key: 'ending_date',
      header: 'End Date',
      render: (event: Event) => format(new Date(event.ending_date), 'dd/MM/yyyy'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event: Event) => <StatusBadge status={event.status || 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (event: Event) => (
        <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Events</h1>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'All Events' },
          ]}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <SearchBar
            placeholder="Search events..."
            value={searchTerm}
            onChange={setSearchTerm}
            className="max-w-md"
          />
        </div>

        <Table
          columns={columns}
          data={paginatedEvents}
          isLoading={isLoading}
          emptyMessage="No events found"
        />

        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
