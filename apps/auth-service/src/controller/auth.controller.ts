import { NextFunction, Request, Response} from "express";
import { validationRegistrationData, checkOtpRestrictions, trackOtpRequest, sendOtp } from "../utils/auth.help";
import { ValidationError } from "@packages/error-handler";
import prisma from "@packages/libs/prisma";

// Register a new user
export const userRegistration = async (req:Request,res:Response,next:NextFunction) => {
  try {
    validationRegistrationData(req.body, "user");
    const {name, email} = req.body;

    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return next(new ValidationError('Email already exists'));
    };

    await checkOtpRestrictions(email, next);
    await trackOtpRequest(email, next);
    await sendOtp(name, email, "user-activation-email");

    res.status(200).json({message: "OTP sent to your email!. Please verify to complete registration."});
  } catch (error) {
    return next(error);
  }
}