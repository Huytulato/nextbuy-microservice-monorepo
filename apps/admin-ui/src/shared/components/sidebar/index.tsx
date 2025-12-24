'use client'
import React from 'react';
import { useAdmin } from '../../../hooks/useAdmin';
import SidebarMenu from './sidebar.menu';
import { User, LogOut } from 'lucide-react';

const Sidebar = () => {
  const { admin, logout } = useAdmin();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logout();
  };

  return (
    <div className="h-screen w-64 bg-white border-r border-gray-200 shadow-sm flex flex-col fixed left-0 top-0 z-40 hidden lg:flex">
      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="text-blue-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {admin?.name || 'Admin'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {admin?.email || 'admin@example.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <SidebarMenu />
      </div>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={20} />
          <span className="text-base font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
