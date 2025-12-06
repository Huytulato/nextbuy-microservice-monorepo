'use client'
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';


type FormData = {
  email: string;
  password: string;
};

const Login = () => {
    // Build API base with safe fallback for local dev
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
    
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [rememberMe, setRememberMe] = useState(false); 
    const router = useRouter();

    const {register, handleSubmit, formState: {errors}} = useForm<FormData>();

    const loginMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await axios.post(`${API}/login-seller`, data, {withCredentials: true}); 
            return response.data;
        },
        onSuccess: (data) => {
            setServerError(null);
            router.push('/');
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
    <div className='w-full py-10 min-h-screen bg-gray-100'>
        <h1 className='text-3xl font-poppins font-bold text-center text-black mb-6'>
            Login
        </h1>
        <p className='text-center text-lg font-medium py-3 text-black'>
            Home . Login
        </p>
        <div className='w-full flex justify-center px-4'>
            <div className='w-full max-w-md p-8 bg-white shadow-lg rounded-lg'>
                <h3 className='text-2xl font-semibold text-center mb-2 text-gray-800'>
                    Login to NextBuy 
                </h3>
                <p className='text-center text-gray-600 mb-6'>
                  Don't have an account? <Link href='/signup' className='text-blue-600 hover:text-blue-700 font-medium'>Signup</Link>
                </p>
                

                {/* Divider */}
                <div className='flex items-center my-6'>
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className='px-4 text-gray-500 text-sm'>Or sign in with Email</span>
                    <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Error Message */}
                {serverError && (
                    <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
                        <p className='text-red-600 text-sm'>{serverError}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className='block text-sm font-medium text-gray-700 mb-1'>
                            Email
                        </label>
                        <input 
                            id="email"
                            type="email" 
                            placeholder='Enter your email' 
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
                        <label htmlFor="password" className='block text-sm font-medium text-gray-700 mb-1'>
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
                                className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                            >
                                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className='flex items-center justify-between'>
                        <label className='flex items-center gap-2 cursor-pointer'>
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className='w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500'
                            />
                            <span className='text-sm text-gray-700'>Remember me</span>
                        </label>
                        <Link href='/forgot-password' className='text-sm text-blue-600 hover:text-blue-700'>
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type='submit' 
                        disabled={loginMutation.isPending}
                        className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    >
                        {loginMutation.isPending ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    </div> 
  )
}

export default Login

