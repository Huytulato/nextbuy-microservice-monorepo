import { Response } from "express"; // import Response type from express to type the response object

export const setCookie = (res: Response, name: string, value: string) => {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: 'none', // allow cross-site cookies
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}