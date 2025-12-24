'use client'
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

type FormData = {
  email: string;
  password: string;
};

const page = () => {
  // Build API base with safe fallback for local dev
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
  
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const loginMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await axios.post(`${API}/login-admin`, data, { withCredentials: true });
      return response.data;
    },
    onSuccess: (data) => {
      setServerError(null);
      router.push('/dashboard');
    },
    onError: (error: AxiosError) => {
      const errorMessage = (error.response?.data as any)?.message || error.message || 'Invalid credentials';
      setServerError(errorMessage);
    }
  });

  const onSubmit = (data: FormData) => {
    loginMutation.mutate(data);
  }

  return (
    <div className='w-full min-h-screen bg-white flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        {/* Login Form Card */}
        <div className='bg-white shadow-lg rounded-lg p-8 border border-gray-200'>
          {/* Title */}
          <h1 className='text-2xl font-semibold text-center mb-8 text-gray-900'>
            Welcome Admin
          </h1>

          {/* Error Message */}
          {serverError && (
            <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
              <p className='text-red-600 text-sm'>{serverError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className='block text-sm font-medium text-gray-700 mb-2'>
                Email
              </label>
              <input 
                id="email"
                type="email" 
                placeholder='support@becodemy.com' 
                className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                {...register('email', {
                  required: 'Email is required', 
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, 
                    message: 'Invalid email address'
                  }
                })} 
              />
              {errors.email && (
                <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className='block text-sm font-medium text-gray-700 mb-2'>
                Password
              </label>
              <div className='relative'>
                <input 
                  id="password"
                  type={passwordVisible ? 'text' : 'password'} 
                  placeholder='Enter your password' 
                  className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  {...register('password', {
                    required: 'Password is required', 
                    minLength: {
                      value: 8, 
                      message: 'Password must be at least 8 characters long'
                    }
                  })} 
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none'
                >
                  {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button 
              type='submit' 
              disabled={loginMutation.isPending}
              className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div> 
  )
}

export default page
