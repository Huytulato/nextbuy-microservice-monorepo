'use client'
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { ChevronRight, Bell, Check, CheckCheck } from 'lucide-react';
import axiosInstance from 'apps/seller-ui/src/utils/axiosInstance';
import { format } from 'date-fns';

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

  const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;

  return (
    <div className="w-full min-h-screen p-8 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Bell className="text-blue-600" size={32} />
          Notifications
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-sm px-3 py-1 rounded-full">
              {unreadCount} new
            </span>
          )}
        </h1>
        <div className="flex items-center text-sm text-gray-600">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <ChevronRight size={16} className="mx-1" />
          <span className="text-gray-700">Notifications</span>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-600 text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-2">
              You'll see updates about your products and verification status here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification: Notification) => (
              <div
                key={notification.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notification.isRead ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={notification.redirect_link}
                    className="flex-1"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-1 p-2 rounded-full ${
                          !notification.isRead
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        <Bell size={18} />
                      </div>
                      <div className="flex-1">
                        <h3
                          className={`font-semibold mb-1 ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-2">
                          {notification.message}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {format(new Date(notification.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </Link>

                  {!notification.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
