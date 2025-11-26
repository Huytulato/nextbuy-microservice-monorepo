'use client'
import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import GoogleButton from '../../../shared/components/google-button';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

type FormData = {
  name: string;
  email: string;
  password: string;
};

const Signup = () => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState(['','','','']);
    const [canResend, setCanResend] = useState(true);
    const [timer, setTimer] = useState(60);
    const [userData, setUserData] = useState<FormData | null>(null);
    const [otpError, setOtpError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();  

    const {register, handleSubmit, formState: {errors}} = useForm<FormData>();
    
    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const startResendTimer = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setCanResend(false);
        setTimer(60);
        timerRef.current = setInterval(() => {
            setTimer((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const signupMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user-registration`, data);
            return response.data;
        },
        onSuccess: (_,formData) => {
            setUserData(formData);
            setShowOtp(true);
            setServerError(null);
            startResendTimer();
        },
        onError: (error: any) => {
            setServerError(error.response?.data?.message || error.message || 'An error occurred');
        }
    });

    const verifyOtpMutation = useMutation({
        mutationFn: async (otpCode: string) => {
            if (!userData) throw new Error('User data not found');
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-user`, {
                email: userData.email,
                otp: otpCode,
                password: userData.password,
                name: userData.name
            });
            return response.data;
        },
        onSuccess: () => {
            router.push('/login?registered=true');
        },
        onError: (error: any) => {
            setOtpError(error.response?.data?.message || error.message || 'Invalid OTP');
        }
    });

    const resendOtpMutation = useMutation({
        mutationFn: async () => {
            if (!userData) throw new Error('User data not found');
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/user-registration`, {
                name: userData.name,
                email: userData.email
            });
            return response.data;
        },
        onSuccess: () => {
            setOtpError(null);
            setOtp(['','','','']);
            startResendTimer();
        },
        onError: (error: any) => {
            setOtpError(error.response?.data?.message || error.message || 'Failed to resend OTP');
        }
    });

    const onSubmit = (data: FormData) => {
        setServerError(null);
        setUserData(data);
        signupMutation.mutate(data);
    }

    const handleOtpChange = (index: number, value: string) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        setOtpError(null);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 4 digits are filled
        if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 4) {
            verifyOtpMutation.mutate(newOtp.join(''));
        }
    }

    const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    const resendOtp = () => {
        if(userData) {
            signupMutation.mutate(userData); 
        }
    }

    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (/^\d{4}$/.test(pastedData)) {
            const otpArray = pastedData.split('');
            setOtp(otpArray);
            setOtpError(null);
            inputRefs.current[3]?.focus();
            // Auto-submit
            setTimeout(() => {
                verifyOtpMutation.mutate(pastedData);
            }, 100);
        }
    }

    const handleResendOtp = () => {
        if (canResend && userData) {
            resendOtpMutation.mutate();
        }
    }

    const handleGoogleSignup = () => {
        // TODO: Implement Google OAuth
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
    }

  return (
    <div className='w-full py-10 min-h-[85vh] bg-gray-100'>
        <h1 className='text-3xl font-poppins font-bold text-center text-black mb-6'>
            Signup
        </h1>
        <p className='text-center text-lg font-medium py-3 text-black'>
            Home . Signup
        </p>
        <div className='w-full flex justify-center px-4'>
            <div className='w-full max-w-md p-8 bg-white shadow-lg rounded-lg'>
                <h3 className='text-2xl font-semibold text-center mb-2 text-gray-800'>
                    Signup to NextBuy 
                </h3>
                <p className='text-center text-gray-600 mb-6'>
                  Already have an account? <Link href='/login' className='text-blue-600 hover:text-blue-700 font-medium'>Login</Link>
                </p>
                
                {/* Google Button */}
                <div className='mb-6'>
                    <button 
                        onClick={handleGoogleSignup}
                        className='w-full flex items-center justify-center gap-3 p-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
                    >
                        <GoogleButton />
                        <span className='text-gray-700 font-medium'>Continue with Google</span>
                    </button>
                </div>

                {/* Divider */}
                <div className='flex items-center my-6'>
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className='px-4 text-gray-500 text-sm'>Or sign up with Email</span>
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
                    {/* Name Field */}
                    <div>
                        <label htmlFor="name" className='block text-sm font-medium text-gray-700 mb-1'>
                            Name
                        </label>
                        <input 
                            id="name"
                            type="text" 
                            placeholder='Enter your name' 
                            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                            {...register('name', {
                                required: 'Name is required', 
                                minLength: {
                                    value: 3, 
                                    message: 'Name must be at least 3 characters long'
                                }
                            })} 
                        />
                        {errors.name && (
                            <p className='text-red-500 text-sm mt-1'>{errors.name.message}</p>
                        )}
                    </div>

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

                    {/* Submit Button */}
                    <button 
                        type='submit' 
                        disabled={signupMutation.isPending || showOtp}
                        className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    >
                        {signupMutation.isPending ? 'Sending OTP...' : 'Signup'}
                    </button>
                </form>

                {/* OTP Verification Section */}
                {showOtp && userData && (
                    <div className='mt-6 pt-6 border-t border-gray-200'>
                        <div className='text-center mb-4'>
                            <h4 className='text-lg font-semibold text-gray-800 mb-2'>
                                Verify Your Email
                            </h4>
                            <p className='text-sm text-gray-600'>
                                We've sent a 4-digit code to <span className='font-medium'>{userData.email}</span>
                            </p>
                        </div>

                        {/* OTP Error */}
                        {otpError && (
                            <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
                                <p className='text-red-600 text-sm'>{otpError}</p>
                            </div>
                        )}

                        {/* OTP Input Fields */}
                        <div className='flex justify-center gap-3 mb-4'>
                            {[0, 1, 2, 3].map((index) => (
                                <input
                                    key={index}
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={otp[index]}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    onPaste={index === 0 ? handleOtpPaste : undefined}
                                    className={`w-14 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        otpError 
                                            ? 'border-red-500' 
                                            : otp[index] 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-gray-300'
                                    }`}
                                    disabled={verifyOtpMutation.isPending}
                                />
                            ))}
                        </div>

                        {/* Resend OTP */}
                        <div className='text-center'>
                            {canResend ? (
                                <button
                                    onClick={handleResendOtp}
                                    disabled={resendOtpMutation.isPending}
                                    className='text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400'
                                >
                                    {resendOtpMutation.isPending ? 'Sending...' : 'Resend OTP'}
                                </button>
                            ) : (
                                <p className='text-sm text-gray-500'>
                                    Resend OTP in <span className='font-medium'>{timer}s</span>
                                </p>
                            )}
                        </div>

                        {/* Verify Button (backup if auto-submit doesn't work) */}
                        <button
                            onClick={() => {
                                const otpCode = otp.join('');
                                if (otpCode.length === 4) {
                                    verifyOtpMutation.mutate(otpCode);
                                } else {
                                    setOtpError('Please enter all 4 digits');
                                }
                            }}
                            disabled={verifyOtpMutation.isPending || otp.join('').length !== 4}
                            className='w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        >
                            {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        {/* Back to form */}
                        <button
                            onClick={() => {
                                setShowOtp(false);
                                setOtp(['','','','']);
                                setOtpError(null);
                                setCanResend(true);
                                setTimer(60);
                                if (timerRef.current) {
                                    clearInterval(timerRef.current);
                                }
                            }}
                            className='w-full mt-3 text-sm text-gray-600 hover:text-gray-800'
                        >
                            Change email address
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  )
}

export default Signup

