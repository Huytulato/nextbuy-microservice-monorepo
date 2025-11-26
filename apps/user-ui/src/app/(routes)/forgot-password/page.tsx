'use client'
import React, { useState, useRef }from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useMutation} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';



type FormData = {
  email: string;
  password: string;
};

const ForgotPassword = () => {
    const [step, setStep] = useState<"email" | "otp" | "reset">("email");
    const [otp, setOtp] = useState(["", "", "", ""]);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [canResend, setCanResend] = useState(true);
    const [timer, setTimer] = useState(60);
    const inputRefs = useRef<HTMLInputElement[]>([]);
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const router = useRouter();

    const {register, handleSubmit, formState: {errors}} = useForm<FormData>();

    const startResendTimer = () => {
        setCanResend(false);
        setTimer(60);
        const interval = setInterval(() => {
          setTimer( (prev) => {
          if (prev<=1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
        }, 1000);
      };

    const requestOtpMutation = useMutation({
        mutationFn: async ({email}: {email: string}) => {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/forgot-password`, {email}); 
            return response.data;
        },
        onSuccess: (_, {email}) => {
            setUserEmail(email);
            setStep("otp");
            setServerError(null);
            setCanResend(false);
            startResendTimer();
        },
        onError: (error: AxiosError) => {
            const errorMessage = (error.response?.data as {message?: string})?.message || 'Invalid credentials. Try again!';
            setServerError(errorMessage);
        }
    });

    const verifyOtpMutation = useMutation({
        mutationFn: async () => {
            if(!userEmail) return;
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-forgot-password-otp`, {email: userEmail, otp: otp.join("")});
            return response.data; 
        },
        onSuccess: () => {
            setStep("reset");
            setServerError(null);
        },
        onError: (error: AxiosError) => {
            const errorMessage = (error.response?.data as {message?: string})?.message || 'Invalid credentials. Try again!';
            setServerError(errorMessage || "Invalid OTP. Try again!");
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async ({password}: {password: string}) => {
            if (!password) return;
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/reset-password`, {email: userEmail, newPassword: password});
            return response.data; 
        },
        onSuccess: () => {
            setStep("email");
            toast.success("Password reset successfully!");
            setServerError(null);
            router.push("/login");
        },
        onError: (error: AxiosError) => {
            const errorMessage = (error.response?.data as {message?: string})?.message;
            setServerError(errorMessage || "Fail to reset password. Try again!");
        }
    });

    const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    const onSubmitEmail = ({email}: {email: string}) => {
        requestOtpMutation.mutate({email});
    }

    const onSubmitPassword = ({password}: {password: string}) => {
        resetPasswordMutation.mutate({password});
    }

    

  return (
    <div className='w-full py-10 min-h-[85vh] bg-gray-100'>
        <h1 className='text-3xl font-poppins font-bold text-center text-black mb-6'>
            Forgot Password
        </h1>
        <p className='text-center text-lg font-medium py-3 text-black'>
            Home . Forgot-Password
        </p>
        <div className='w-full flex justify-center px-4'>
            <div className='w-full max-w-md p-8 bg-white shadow-lg rounded-lg'>
                {step === "email" && (
                <>
                    <h3 className='text-2xl font-semibold text-center mb-2 text-gray-800'>
                        Login to NextBuy 
                    </h3>
                    <p className='text-center text-gray-600 mb-6'>
                    Go back to?{" "} <Link href='/login' className='text-blue-600 hover:text-blue-700 font-medium'>Login</Link>
                    </p>



                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmitEmail)} className='space-y-4'>
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

                        

                        {/* Submit Button */}
                        <button 
                            type='submit' 
                            disabled={requestOtpMutation.isPending}
                            className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        >
                            {requestOtpMutation.isPending ? 'Sending...' : 'Submit'}
                        </button>
                            {serverError && (
                                <p className='text-red-500 text -sm mt-2'>{serverError}</p>
                            )}
                    </form>
                </>
                )}

                {step === "otp" && (
                    <>
                        <h3 className='text-2xl font-semibold text-center mb-2 text-gray-800'>
                            Enter OTP
                        </h3>
                        <div className='flex justify-center gap-6'>
                            {otp.map((digit, index)=>(
                                <input
                                    key={index}
                                    type='text'
                                    ref={(el)=>{
                                        if (el) inputRefs.current[index] = el;
                                    }}
                                    maxLength={1}
                                    className='w-12 h-12 text-center border border-gray-300 rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
                                    value={digit}
                                    onChange={(e)=>handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                    
                                />
                                ))
                            }
                        </div>
                        <button
                            onClick={()=> verifyOtpMutation.mutate()}
                            className='w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                            disabled={verifyOtpMutation.isPending}
                        >
                            {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        {canResend ? (
                            <button
                                onClick={()=>
                                    requestOtpMutation.mutate({email: userEmail!})
                                }
                                className='w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
                            >
                                Resend OTP
                            </button>
                        ) : (
                            <p className='text-center text-gray-600 mt-4'>
                                Resend OTP in {timer} seconds
                            </p>
                        )}
                                          
                    </>
                )}

                {step === "reset" && (
                    <>
                        <h3 className='text-2xl font-semibold text-center mb-2 text-gray-800'>
                            Reset Password
                        </h3>
                        <form onSubmit={handleSubmit(onSubmitPassword)} className='space-y-4'>
                            {/* Password Field */}
                            <label htmlFor="password" className='block text-sm font-medium text-gray-700 mb-1'>Password</label>
                            <input
                                type="password"
                                placeholder='Enter new password'
                                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: {
                                        value: 6,
                                        message: "Password must be 6 characters",
                                    },
                                }
                            )}
                            />
                            {errors.password && (
                                <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>
                            )}

                            {/* Submit Button */}
                            <button
                                type='submit'
                                className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                                disabled={resetPasswordMutation.isPending}
                            >
                                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                            </button>
                            {serverError && (
                                <p className='text-red-500 text -sm mt-2'>{serverError}</p>
                            )}
                        </form>            
                    </>
                )}


            </div>
        </div>
    </div> 
  )
}

export default ForgotPassword

