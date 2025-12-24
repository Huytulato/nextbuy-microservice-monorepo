'use client'
import React from 'react';
import Sidebar from '../../shared/components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
