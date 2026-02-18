import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev_secret";
const EXPIRES = (process.env.JWT_EXPIRES_IN || "120m") as SignOptions["expiresIn"];
//                                                      👆 cast al tipo correcto

export function signJwt(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, SECRET) as T;
}