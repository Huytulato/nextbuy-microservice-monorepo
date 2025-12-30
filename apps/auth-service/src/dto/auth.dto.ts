/**
 * Auth DTOs for request/response validation
 */

export interface RegisterUserDto {
  name: string;
  email: string;
  password: string;
}

export interface VerifyUserDto {
  email: string;
  otp: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterSellerDto {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  country: string;
}

export interface VerifySellerDto {
  email: string;
  otp: string;
  password: string;
  name: string;
  phone_number: string;
  country: string;
}

export interface RegisterAdminDto {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface VerifyForgotPasswordOtpDto {
  email: string;
  otp: string;
}

export interface ResetPasswordDto {
  email: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export interface AddAddressDto {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updateAt: Date;
}

export interface SellerResponseDto {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  country: string;
  verificationStatus: string;
  shops?: any;
  createdAt: Date;
  updateAt: Date;
}

export interface AdminResponseDto {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: Date;
  updateAt: Date;
}

