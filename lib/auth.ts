import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

if (!process.env.JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set");
}
const JWT_SECRET: string = process.env.JWT_SECRET;
const COOKIE_NAME = "livetv_token";

export interface JwtPayload {
  id: number;
  username: string;
  nickname: string;
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(req?: { cookies: { get: (name: string) => { value: string } | undefined } }): Promise<JwtPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
