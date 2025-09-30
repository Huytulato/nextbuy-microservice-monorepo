import cryto from 'crypto';
import { ValidationError } from '@packages/error-handler';
import redis from '@packages/libs/redis';
import { sendEmail } from '../utils/sendmail';
import { NextFunction } from 'express';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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
  const otp = cryto.randomInt(1000,9999).toString();
  await sendEmail(email, "Verify your email", template, {name, otp});  
  await redis.set(`otp:${email}`, otp, "EX", 300); // expire in 5 minutes
  await redis.set(`otp_cooldown:${email}`, "true", "EX", 60); // expire in 1 minute
}