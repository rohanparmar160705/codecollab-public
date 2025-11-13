import crypto from 'crypto';

export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateNumericCode(length = 6): string {
  return Math.random().toString().slice(2, 2 + length);
}
