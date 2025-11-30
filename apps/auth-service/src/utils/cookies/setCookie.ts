import { Response } from "express"; // import Response type from express to type the response object

export const setCookie = (res: Response, name: string, value: string) => {
  // For local development using gateway (different port) we need SameSite=None + Secure.
  // Browsers reject SameSite=None cookies without Secure.
  // In production behind HTTPS keep secure true; in dev localhost is treated as a secure context by modern browsers.
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};