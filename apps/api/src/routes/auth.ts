import express from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer";
import {
  VERIFY_CODE_TTL_MS,
  VERIFY_MAX_ATTEMPTS,
  canSendCode,
  generateVerificationCode,
  isCodeExpired,
  isValidCodeFormat,
} from "../lib/emailVerification";
import {
  hashPassword,
  isValidEmail,
  needsRehash,
  normalizeEmail,
  normalizeName,
  validatePassword,
  verifyPassword,
} from "../lib/password";

const router = express.Router();

const googleClient = new OAuth2Client();

// Accounts created before emails were lowercased may be stored with capitals,
// so look emails up case-insensitively. New accounts are always stored lowercase.
function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

// Stores a fresh one-time code (hashed) for the user and emails it. A mail
// provider failure is logged, not thrown: the person can ask for another code.
async function sendVerificationCode(userId: string, email: string) {
  const code = generateVerificationCode();
  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyCodeHash: await bcrypt.hash(code, 10),
      emailVerifyExpiresAt: new Date(Date.now() + VERIFY_CODE_TTL_MS),
      emailVerifyAttempts: 0,
      emailVerifySentAt: new Date(),
    },
  });
  try {
    await sendVerificationEmail(email, code);
  } catch (err) {
    console.error("[verify-email] Failed to send verification email:", err);
  }
}

function issueTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "15m" },
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "30d" },
  );
  return { accessToken, refreshToken };
}

router.post("/signup", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = normalizeName(req.body?.name);
  const password: unknown = req.body?.password;

  if (!email || !password || !req.body?.name) {
    return res.status(400).json({ error: "Name, email and password required" });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address" });
  }
  if (!name) {
    return res.status(400).json({ error: "Name must be 2 to 60 characters" });
  }
  const passwordError = validatePassword(password, { email, name });
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const passwordHash = await hashPassword(password as string);

  const existing = await findUserByEmail(email);
  let user;
  if (existing) {
    // A verified (or Google) account is taken. An unverified one was never
    // confirmed by whoever owns the inbox, so let this sign-up take it over
    // instead of locking the real owner out of their own address.
    if (existing.emailVerifiedAt || existing.googleId || !existing.passwordHash) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    user = await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } });
  } else {
    try {
      user = await prisma.user.create({ data: { email, name, passwordHash } });
    } catch (err) {
      // Two sign-ups with the same email racing past the check above.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      throw err;
    }
  }

  if (canSendCode(user.emailVerifySentAt)) {
    await sendVerificationCode(user.id, user.email);
  }

  // No tokens yet: the account only becomes usable after /auth/verify-email.
  res.status(201).json({ needsVerification: true, email: user.email });
});

router.post("/verify-email", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code: unknown = req.body?.code;

  if (!email || !isValidCodeFormat(code)) {
    return res.status(400).json({ error: "Enter the 6-digit code from your email" });
  }

  const user = await findUserByEmail(email);
  if (!user || !user.emailVerifyCodeHash || isCodeExpired(user.emailVerifyExpiresAt)) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  if (user.emailVerifyAttempts >= VERIFY_MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many wrong attempts. Request a new code" });
  }

  const valid = await bcrypt.compare(code, user.emailVerifyCodeHash);
  if (!valid) {
    const lastAttempt = user.emailVerifyAttempts + 1 >= VERIFY_MAX_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: lastAttempt
        ? { emailVerifyCodeHash: null, emailVerifyExpiresAt: null, emailVerifyAttempts: 0 }
        : { emailVerifyAttempts: { increment: 1 } },
    });
    return lastAttempt
      ? res.status(429).json({ error: "Too many wrong attempts. Request a new code" })
      : res.status(400).json({ error: "Invalid or expired code" });
  }

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyCodeHash: null,
      emailVerifyExpiresAt: null,
      emailVerifyAttempts: 0,
    },
  });

  const { accessToken, refreshToken } = issueTokens(verified.id);

  res.json({
    accessToken,
    refreshToken,
    user: { id: verified.id, email: verified.email, name: verified.name, isPremium: verified.isPremium, avatarUrl: verified.avatarUrl },
  });
});

router.post("/resend-verification", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const user = await findUserByEmail(email);
  // Same answer whether or not the account exists or needs verifying, so this
  // can't be used to find out which emails are registered.
  if (user && user.passwordHash && !user.emailVerifiedAt && canSendCode(user.emailVerifySentAt)) {
    await sendVerificationCode(user.id, user.email);
  }

  res.json({ message: "If that email is waiting for verification, a new code has been sent." });
});


router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password: unknown = req.body?.password;

  if (!email || typeof password !== "string" || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = await findUserByEmail(email);
  // Always run a bcrypt comparison, even for unknown emails, so response time
  // doesn't reveal whether an account exists.
  const valid = await verifyPassword(password, user?.passwordHash);
  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.emailVerifiedAt) {
    if (canSendCode(user.emailVerifySentAt)) {
      await sendVerificationCode(user.id, user.email);
    }
    return res.status(403).json({
      error: "Please verify your email to continue. We've sent you a new code",
      needsVerification: true,
      email: user.email,
    });
  }

  // Quietly upgrade hashes made with the old, cheaper work factor.
  if (user.passwordHash && needsRehash(user.passwordHash)) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    });
  }

  const { accessToken, refreshToken } = issueTokens(user.id);

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, isPremium: user.isPremium, avatarUrl: user.avatarUrl },
  });
});

router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "idToken required" });
  }

  const audience = process.env.GOOGLE_WEB_CLIENT_ID;
  if (!audience) {
    return res.status(500).json({ error: "Google sign-in is not configured" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch (err) {
    console.warn("Google ID token verification failed:", (err as Error).message);
    return res.status(401).json({ error: "Invalid Google token" });
  }

  if (!payload?.email) {
    return res.status(401).json({ error: "Invalid Google token" });
  }

  // Never trust an unverified email: we link Google identities to existing
  // password accounts by email below, so an unverified one would let anyone
  // take over an account just by claiming its address.
  if (!payload.email_verified) {
    return res.status(403).json({ error: "Your Google email address is not verified" });
  }

  const email: string = payload.email!.trim().toLowerCase();
  const { sub: googleId, name, picture } = payload;

  let user = await prisma.user.findUnique({ where: { googleId } });
  let isNewUser = false;

  if (!user) {
    // Link to an existing password account with the same email, or create a new one.
    user = await findUserByEmail(email);
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          avatarUrl: user.avatarUrl ?? picture ?? null,
          // Google has confirmed this inbox, so it counts as verified.
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
          emailVerifyCodeHash: null,
          emailVerifyExpiresAt: null,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0] || "Lumora user",
          googleId,
          avatarUrl: picture ?? null,
          emailVerifiedAt: new Date(),
        },
      });
      isNewUser = true;
    }
  }

  const { accessToken, refreshToken } = issueTokens(user.id);

  res.json({
    accessToken,
    refreshToken,
    isNewUser,
    user: { id: user.id, email: user.email, name: user.name, isPremium: user.isPremium, avatarUrl: user.avatarUrl },
  });
});

// POST /auth/refresh — swaps a valid refresh token for a new token pair, so
// the app can keep a session alive past the 15-minute access token.
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== "string" || !refreshToken) {
    return res.status(400).json({ error: "refreshToken required" });
  }

  let userId: string;
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId?: unknown };
    if (typeof payload.userId !== "string") throw new Error("no userId");
    userId = payload.userId;
  } catch {
    return res.status(401).json({ error: "Your session has expired. Please log in again" });
  }

  // A deleted account must not be able to mint new tokens.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return res.status(401).json({ error: "Your session has expired. Please log in again" });
  }

  res.json(issueTokens(user.id));
});

router.post("/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  const user = await findUserByEmail(email);

  // Always respond the same way whether or not the account exists, so
  // this endpoint can't be used to find out which emails are registered.
  if (user && user.passwordHash) {
    const code = randomInt(100000, 1000000).toString();
    const resetCodeHash = await bcrypt.hash(code, 10);
    const resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetCodeHash, resetCodeExpiresAt },
    });

    try {
      await sendPasswordResetEmail(email, code);
    } catch (err) {
      // Don't let an email-provider failure change this endpoint's
      // response — that would leak whether the account exists. The code
      // is already saved; log the failure server-side for debugging.
      console.error("[forgot-password] Failed to send reset email:", err);
    }
  }

  res.json({ message: "If that email is registered, a reset code has been sent." });
});

router.post("/reset-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const { code, newPassword } = req.body ?? {};

  if (!email || typeof code !== "string" || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code and new password required" });
  }

  const user = await findUserByEmail(email);
  if (!user?.resetCodeHash || !user.resetCodeExpiresAt) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  if (user.resetCodeExpiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const validCode = await bcrypt.compare(code, user.resetCodeHash);
  if (!validCode) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  const passwordError = validatePassword(newPassword, { email: user.email, name: user.name });
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetCodeHash: null,
      resetCodeExpiresAt: null,
      // Receiving the reset code proves the person controls this inbox.
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });

  const { accessToken, refreshToken } = issueTokens(updated.id);

  res.json({
    accessToken,
    refreshToken,
    user: { id: updated.id, email: updated.email, name: updated.name, isPremium: updated.isPremium, avatarUrl: updated.avatarUrl },
  });
});

export default router;
