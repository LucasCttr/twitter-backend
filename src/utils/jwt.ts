import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

// En un entorno real, el secret debería ser una variable de entorno y no algo hardcodeado
const SECRET = process.env.JWT_SECRET || "dev_secret";
const EXPIRES = (process.env.JWT_EXPIRES_IN || "120m") as SignOptions["expiresIn"];

// Función para firmar un JWT con un payload dado
export function signJwt(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyJwt<T = any>(token: string): T {
  return jwt.verify(token, SECRET) as T;
}