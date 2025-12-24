'use client'
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Breadcrumbs from '../../../shared/components/breadcrumbs';
import Table from '../../../shared/components/table';
import axiosInstance from '../../../utils/axiosInstance';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminFormData {
  name: string;
  email: string;
  password: string;
}

export default function ManagementPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminFormData>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-admins'],
    queryFn: async () => {
      const response = await axiosInstance.get('/admin/api/get-all-admins');
      return response.data.admins || [];
    },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (formData: AdminFormData) => {
      const response = await axiosInstance.post('/admin/api/add-new-admin', formData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-admins'] });
      reset();
      setShowAddForm(false);
    },
  });

  const onSubmit = (data: AdminFormData) => {
    addAdminMutation.mutate(data);
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (admin: Admin) => <span className="font-medium text-gray-900">{admin.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      render: (admin: Admin) => admin.email,
    },
    {
      key: 'role',
      header: 'Role',
      render: (admin: Admin) => admin.role || 'admin',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Team Management' },
            ]}
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Add Admin
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Admin</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Email is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                {...register('password', { required: 'Password is required', minLength: 8 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addAdminMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addAdminMutation.isPending ? 'Adding...' : 'Add Admin'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  reset();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <Table
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          emptyMessage="No admins found"
        />
      </div>
    </div>
  );
}
