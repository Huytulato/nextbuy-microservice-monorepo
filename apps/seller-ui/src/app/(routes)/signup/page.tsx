'use client'
import React from 'react'
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useSearchParams } from 'next/navigation';
import CreateShop from '../../../shared/modules/create-shop';
import SubmitDocuments from '../../../shared/modules/submit-documents';
import { countries } from '../../../utils/countries';
import StripeLogo from 'apps/seller-ui/src/assets/svgs/stripe-logo';
import useSeller from '../../../hooks/useSeller';
import axiosInstance from '../../../utils/axiosInstance';



type FormData = {
    name: string;
    email: string;
    password: string;
    phone: string;
    country: string;
};

const Signup = () => {
    // Build API base with safe fallback for local dev
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const API = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;
    
    // Get step from URL query parameter
    const searchParams = useSearchParams();
    const stepFromUrl = searchParams.get('step');
    
    // Get seller data if already logged in
    const { seller, isLoading: sellerLoading } = useSeller();
    
    // Steps: 1 = Create Account, 2 = Submit Documents, 3 = Setup Shop, 4 = Connect Bank
    // Initialize activeStep from URL if provided, otherwise default to 1
    const initialStep = stepFromUrl ? parseInt(stepFromUrl, 10) : 1;
    const [activeStep, setActiveStep] = useState(initialStep >= 1 && initialStep <= 4 ? initialStep : 1);
    const [sellerId, setSellerId] = useState<string>('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    // Server error banner is not wired into the UI yet.
    void serverError;
    // OTP section should appear only after successful signup
    const [showOtp, setShowOtp] = useState(false);
    const [otp, setOtp] = useState(['','','','']);
    const [canResend, setCanResend] = useState(true);
    const [timer, setTimer] = useState(60);
    const [sellerData, setSellerData] = useState<FormData | null>(null);
    const [otpError, setOtpError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const {register, handleSubmit, formState: {errors}} = useForm<FormData>();
    
    // Initialize sellerId and activeStep if seller is already logged in and step is provided
    useEffect(() => {
        if (!sellerLoading && seller && seller.id) {
            // If seller is logged in, set sellerId
            setSellerId(seller.id);
            
            // If step is provided in URL and seller is logged in, update activeStep
            if (stepFromUrl) {
                const step = parseInt(stepFromUrl, 10);
                if (step >= 1 && step <= 4) {
                    setActiveStep(step);
                }
            }
        }
    }, [seller, sellerLoading, stepFromUrl]);
    
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
            const payload = {
                name: data.name,
                email: data.email,
                password: data.password,
                phone_number: data.phone,
                country: data.country,
            };
            const response = await axios.post(`${API}/seller-registration`, payload);
            return response.data;
        },
        onSuccess: (_,formData) => {
            setSellerData(formData);
            setShowOtp(true);
            setServerError(null);
            // Keep step at 1 while user enters OTP
            startResendTimer();
        },
        onError: (error: any) => {
            setServerError(error.response?.data?.message || error.message || 'An error occurred');
        }
    });

    const verifyOtpMutation = useMutation({
        mutationFn: async (otpCode: string) => {
            if (!sellerData) throw new Error('User data not found');
            const response = await axios.post(`${API}/verify-seller`, {
                email: sellerData.email,
                otp: otpCode,
                password: sellerData.password,
                name: sellerData.name,
                phone_number: sellerData.phone,
                country: sellerData.country,
            });
            return response.data;
        },
        onSuccess: (resp) => {
            // After successful verification, go to Step 2 (Submit Documents)
            setSellerId(resp?.data?.id || '');
            setShowOtp(false);
            setActiveStep(2);
        },
        onError: (error: any) => {
            setOtpError(error.response?.data?.message || error.message || 'Invalid OTP');
        }
    });

    const resendOtpMutation = useMutation({
        mutationFn: async () => {
            if (!sellerData) throw new Error('User data not found');
            const response = await axios.post(`${API}/seller-registration`, {
                name: sellerData.name,
                email: sellerData.email,
                password: sellerData.password,
                phone_number: sellerData.phone,
                country: sellerData.country,
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
        setSellerData(data);
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

    // Old resendOtp unused; using resendOtpMutation directly via handleResendOtp

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
        if (canResend && sellerData) {
            resendOtpMutation.mutate();
        }
    }

    const connectStripe = async () => {
        try {
            const response = await axiosInstance.post('/seller/api/create-stripe-account', 
            {sellerId});
            if (response.data.url){
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error('Error connecting to Stripe:', error);
        }
    }


        return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
            {/* Stepper */}
            <div className='w-full max-w-xl mx-auto pt-10 px-4'>
                {(() => {
                    const steps = [
                        { number: 1, label: 'Create Account' },
                        { number: 2, label: 'Submit Documents' },
                        { number: 3, label: 'Setup Shop' },
                        { number: 4, label: 'Connect Bank' },
                    ];
                    const progressPercent = ((activeStep - 1) / (steps.length - 1)) * 100;
                    return (
                        <div className='relative'>
                            <div className='h-1 w-full bg-gray-200 rounded'/>
                            <div className='h-1 bg-blue-600 rounded absolute top-0 left-0 transition-all duration-500' style={{width: `${progressPercent}%`}} />
                            <div className='flex justify-between mt-2'>
                                {steps.map(step => (
                                    <div key={step.number} className='flex flex-col items-center w-1/3'>
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors duration-300 ${activeStep >= step.number ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}`}>{step.number}</div>
                                        <span className={`mt-2 text-xs md:text-sm font-medium text-center ${activeStep >= step.number ? 'text-blue-600' : 'text-gray-500'}`}>{step.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>
            {/* Steps content*/}
            <div className='w-full max-w-md p-8 bg-white shadow rounded-lg'>
                {activeStep === 1 && (
                  <>
                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                        <h3 className='text-2xl font-semibold text-center mb-2 text-gray-800'>
                            Create Your Account
                        </h3>
                        <p className='text-center text-gray-600 mb-4'>
                            Already have an account? <Link href='/login' className='text-blue-600 hover:text-blue-700 font-medium'>Login</Link>
                        </p>
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

                                                {/* Phone Field */}
                                                <div>
                                                        <label htmlFor="phone" className='block text-sm font-medium text-gray-700 mb-1'>
                                                                Phone Number
                                                        </label>
                                                        <input
                                                            id="phone"
                                                            type="tel"
                                                            placeholder='+84 912 345 678'
                                                            className={`w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                                                            {...register('phone', {
                                                                required: 'Phone number is required',
                                                                validate: (value) => {
                                                                    // Normalize: remove spaces, dashes, parentheses
                                                                    const normalized = value.replace(/[\s\-()]/g, '');
                                                                    // E.164 basic check (allow leading +, digits 8-15)
                                                                    const e164 = /^\+?[0-9]\d{7,14}$/;
                                                                    if (!e164.test(normalized)) {
                                                                        return 'Invalid phone format';
                                                                    }
                                                                    return true;
                                                                }
                                                            })}
                                                        />
                                                        {errors.phone && (
                                                            <p className='text-red-500 text-sm mt-1'>{errors.phone.message}</p>
                                                        )}
                                                </div>

                                                {/* Country Select */}
                                                <div>
                                                        <label htmlFor="country" className='block text-sm font-medium text-gray-700 mb-1'>
                                                                Country
                                                        </label>
                                                        <select
                                                            id="country"
                                                            className={`w-full p-3 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.country ? 'border-red-500' : 'border-gray-300'}`}
                                                            defaultValue=""
                                                            {...register('country', { required: 'Country is required' })}
                                                        >
                                                            <option value="" disabled>Select country</option>
                                                            {countries.map(c => (
                                                                <option key={c.code} value={c.code}>{c.name}</option>
                                                            ))}
                                                        </select>
                                                        {errors.country && (
                                                            <p className='text-red-500 text-sm mt-1'>{errors.country.message}</p>
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
                            disabled={signupMutation.isPending}
                            className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        >
                            {signupMutation.isPending ? 'Sending OTP...' : 'Signup'}
                        </button>
                    </form>

                    {/* OTP Verification Section */}
                    {showOtp && sellerData && ( 
                        <div className='mt-6 pt-6 border-t border-gray-200'>
                            <div className='text-center mb-4'>
                                <h4 className='text-lg font-semibold text-gray-800 mb-2'>
                                    Verify Your Email
                                </h4>
                                <p className='text-sm text-gray-600'>
                                    We've sent a 4-digit code to <span className='font-medium'>{sellerData.email}</span>
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
                  </>
                )}
                {activeStep === 2 && 
                    <SubmitDocuments 
                        sellerId={sellerId} 
                        onSuccess={() => {
                            // After documents submitted, wait for approval
                            // For now, allow proceeding to shop creation
                            // In production, should check verification status
                            setActiveStep(3);
                        }}
                    />
                }
                {activeStep === 3 && 
                    <CreateShop sellerId={sellerId} setActiveStep={setActiveStep} />
                }
                {activeStep === 4 &&(
                    <div className='text-center'>
                        <h3 className='text-2xl font-semibold text-gray-800 mb-4'>
                            Withdraw Method
                        </h3>
                        <br/>
                        <button 
                            onClick={connectStripe}
                            className='w-full m-auto flex items-center justify-center gap-3 text-lg bg-red-600 text-white p-2 rounded-md hover:bg-red-700 transition'
                        >
                            Connect Stripe <StripeLogo />
                        </button>
                    </div>
                )}
            </div>
    </div>
  )
}

export default Signup

