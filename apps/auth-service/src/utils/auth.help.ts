import crypto from 'crypto'; // import crypto module for generating random OTPs
import { ValidationError } from '@packages/error-handler'; // import custom validation error class
import redis from '@packages/libs/redis'; // import redis client for saving OTPs and tracking requests
import { sendEmail } from '../utils/sendmail'; // import utility function for sending emails
import { NextFunction } from 'express'; // import NextFunction type from express
import prisma from '@packages/libs/prisma'; // import prisma client for database interactions

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // regex pattern to validate email format
export const validationRegistrationData = (data: any, userType: "user" | "seller") => {
  const {name, email, password, phone_number, country} = data;
  if(
    !name || !email || !password || (userType == "seller" && (!phone_number || !country))
  ){
    throw new ValidationError(`Missing required fields!`)
  }

  if(!emailRegex.test(email)){
    throw new ValidationError(`Invalid email format!`)
  }
}

export const checkOtpRestrictions = async (email:string, next: NextFunction) => {
  if(await redis.get(`otp_lock:${email}`)){
    return next(new ValidationError('Too many OTP requests. Please try again after 30 minutes.'));
  }

  if(await redis.get(`otp_spam_lock:${email}`)){
    return next(new ValidationError('Too many OTP requests. Please try again after 1 hour.'));
  }

  if(await redis.get(`otp_cooldown:${email}`)){
    return next(new ValidationError('Please wait 1 minute before requesting another OTP.'));
  }
}

export const trackOtpRequest = async (email:string, next: NextFunction) => {
  const otpRequestKey = `otp_request_count:${email}`;
  let otpRequests = parseInt((await redis.get(otpRequestKey)) || '0');
  if (otpRequests >= 2){
    await redis.set(`otp_spam_lock:${email}`, "true", "EX", 3600); // lock in 1 hour
    return next(new ValidationError('Too many OTP requests. Please try again after 1 hour.'));
  }

  await redis.set(otpRequestKey, otpRequests + 1, "EX", 3600); // track for 1 hour
}

export const sendOtp = async (name:string, email:string, template:string) => {
  const otp = crypto.randomInt(1000,9999).toString();
  await sendEmail(email, "Verify your email", template, {name, otp});  
  await redis.set(`otp:${email}`, otp, "EX", 300); // expire in 5 minutes
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60); // expire in 1 minute
}

export const verifyOtp = async (email:string, otp:string, next: NextFunction) => {
  const storedOtp = await redis.get(`otp:${email}`);
  if (!storedOtp) {
    return next(new ValidationError('Invalid or expired OTP'));
  }

  const failedAttemptsKey = `otp_failed_attempts:${email}`;
  const failedAttempts = parseInt((await redis.get(failedAttemptsKey)) || '0');
  if (storedOtp !== otp) {
    if (failedAttempts >= 2) {
      await redis.set(`otp_lock:${email}`, "true", "EX", 1800); // lock for 30 minutes
      await redis.del(`otp:${email}`, failedAttemptsKey);
      return next(new ValidationError('Too many failed attempts. OTP has been locked for 30 minutes.'));
    }
    await redis.set(failedAttemptsKey, failedAttempts + 1, "EX", 300); // track failed attempts for 5 minutes
    return next(new ValidationError(`Invalid OTP. ${2 - failedAttempts} attempts left.`));
  }
  await redis.del(`otp:${email}`, failedAttemptsKey); // clear OTP and failed attempts on successful verification

};

export const handleForgotPassword = async (req:any, res:any, next:NextFunction, userType: "user" | "seller") => {
  try {
    const { email } = req.body;
    if (!email) throw new ValidationError('Email is required');
    
    //Find user/seller in DB
    const user = userType === "user" && await prisma.users.findUnique({ where: { email } });
    if (!user) throw new ValidationError('User not found');

    // Check OTP request restrictions
    await checkOtpRestrictions(email, next);
    await trackOtpRequest(email, next); // track the OTP request for rate limiting


    //Generate and send OTP
    await sendOtp(user.name, email, "forgot-password-user-email"); 

    res.status(200).json({message: "OTP sent to your email!. Please verify to reset your password."});
  } catch (error) {
    next(error);
  }
};

export const verifyForgotPasswordOtp = async (req:any, res:any, next:NextFunction) => {
  try {
    const { email, otp } = req.body;
    if ((!email || !otp)) throw new ValidationError('Email and OTP are required');

    await verifyOtp(email, otp, next); // verify the provided OTP
    res.status(200).json({message: "OTP verified. You can now reset your password."});
  } catch (error) {
    next(error);
  }
};