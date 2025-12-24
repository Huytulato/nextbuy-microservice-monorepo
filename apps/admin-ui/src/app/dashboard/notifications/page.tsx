'use client'
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import Table from '../../../shared/components/table';
import StatusBadge from '../../../shared/components/status-badge';
import { format } from 'date-fns';
import { Check } from 'lucide-react';
import axiosInstance from '../../../utils/axiosInstance';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  redirect_link: string;
}

const fetchNotifications = async (): Promise<Notification[]> => {
  const res = await axiosInstance.get('/api/notifications');
  return res?.data?.notifications || [];
};

const markAsRead = async (notificationId: string) => {
  await axiosInstance.put(`/api/notifications/${notificationId}/read`);
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Poll every 30 seconds for realtime updates
    staleTime: 20000,
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (notification: Notification) => (
        <span className="font-medium text-gray-900">{notification.title}</span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (notification: Notification) => (
        <span className="text-sm text-gray-600">{notification.message}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (notification: Notification) => (
        <StatusBadge status={notification.isRead ? 'read' : 'unread'} />
      ),
    },
    {
      key: 'date',
      header: 'Date',
      render: (notification: Notification) =>
        format(new Date(notification.createdAt), 'MM/dd/yyyy HH:mm'),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (notification: Notification) => (
        <div className="flex gap-2">
          {!notification.isRead && (
            <button
              className="text-blue-600 hover:text-blue-800"
              onClick={() => handleMarkAsRead(notification.id)}
              title="Mark as read"
            >
              <Check size={18} />
            </button>
          )}
          <a
            href={notification.redirect_link}
            className="text-indigo-600 hover:text-indigo-800 text-sm"
          >
            View
          </a>
        </div>
      ),
    },
  ];

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Notifications {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-sm px-3 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </h1>
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Notifications' },
          ]}
        />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table
          columns={columns}
          data={notifications}
          isLoading={isLoading}
          emptyMessage="No notifications found"
        />
      </div>
    </div>
  );
}
