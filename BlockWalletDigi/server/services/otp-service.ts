/**
 * OTP Service — Agent 1, PRD §1.5, §1.6
 * Handles generation, hashing, rate-limiting, and delivery of OTP codes.
 */
import bcrypt from 'bcryptjs';
import { storage } from '../storage';

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_PER_WINDOW = 3;
const WINDOW_MINUTES = 10;

export type OtpPurpose = 'email_verify' | 'phone_verify' | 'password_reset';

/** Generate a 6-digit OTP, store hashed, and return the plaintext code */
export async function generateOtp(
  identifier: string,
  purpose: OtpPurpose,
  userId?: number,
): Promise<string> {
  // Rate-limit: max 3 requests per identifier per 10 min
  const recent = await storage.countRecentOtps(identifier, purpose, WINDOW_MINUTES);
  if (recent >= MAX_OTP_PER_WINDOW) {
    throw new Error('Too many OTP requests. Please wait before requesting another code.');
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hashedCode = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await storage.createOtpCode({
    identifier,
    code: hashedCode,
    purpose,
    userId: userId ?? null,
    expiresAt,
    usedAt: null,
  });

  return code;
}

/** Verify an OTP code. Returns true on success, throws on failure. */
export async function verifyOtp(
  identifier: string,
  purpose: OtpPurpose,
  plainCode: string,
): Promise<true> {
  const record = await storage.getLatestOtpCode(identifier, purpose);
  if (!record) throw new Error('No OTP found. Please request a new code.');
  if (record.usedAt) throw new Error('This OTP has already been used.');
  if (new Date() > new Date(record.expiresAt)) throw new Error('OTP has expired. Please request a new code.');

  const valid = await bcrypt.compare(plainCode, record.code);
  if (!valid) throw new Error('Invalid OTP code.');

  await storage.markOtpUsed(record.id);
  return true;
}

/** Send OTP via email using Resend */
export async function sendEmailOtp(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[OTP] RESEND_API_KEY not set — skipping email send (dev code:', code, ')');
    return;
  }
  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: 'noreply@credverse.app',
    to: email,
    subject: 'Your CredVerse verification code',
    html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`,
  });
}

/** Send OTP via SMS using Twilio */
export async function sendSmsOtp(phone: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.warn('[OTP] Twilio env vars not set — skipping SMS send (dev code:', code, ')');
    return;
  }
  const twilio = (await import('twilio')).default;
  const client = twilio(sid, token);
  await client.messages.create({
    body: `Your CredVerse code is: ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    from,
    to: phone,
  });
}
