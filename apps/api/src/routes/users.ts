import express from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { isAdminEmail } from "../middleware/requireAdmin";
import { deleteAccountData } from "../lib/deleteAccount";
import { deleteImagesFromSupabase } from "../lib/supabase";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, name: true, email: true, createdAt: true, isPremium: true, passwordHash: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  // Never send the hash itself. The app only needs to know whether to ask for a password.
  const { passwordHash, ...publicUser } = user;
  res.json({ ...publicUser, hasPassword: Boolean(passwordHash), isAdmin: isAdminEmail(user.email) });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || name.trim().length < 2) {
    return res
      .status(400)
      .json({ error: "Name must be at least 2 characters" });
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true },
  });

  res.json(user);
});

// DELETE /users/me — permanently deletes the signed-in account and everything it owns.
// Email accounts must send their password. Google accounts have none, so they send
// { confirm: "DELETE" }. A wrong password is 403, not 401: the app treats 401 as "session
// expired" and logs the person out.
router.delete("/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { password, confirm } = req.body ?? {};

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.passwordHash) {
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Enter your password to delete your account" });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(403).json({ error: "That password is not correct" });
    }
  } else if (confirm !== "DELETE") {
    return res.status(400).json({ error: 'Type "DELETE" to confirm' });
  }

  let files: string[];
  try {
    files = await prisma.$transaction((tx) => deleteAccountData(tx, userId), {
      timeout: 30_000,
    });
  } catch (err) {
    // Something was added to the account while it was being deleted (for example from another
    // device). Nothing was removed, because the transaction rolled back, so it is safe to retry.
    const code = (err as { code?: unknown }).code;
    if (code === "P2003" || code === "P2034") {
      return res.status(409).json({ error: "Your account changed while deleting it. Please try again" });
    }
    throw err;
  }

  // The account is gone either way, so a storage failure must not fail the request.
  await deleteImagesFromSupabase(files).catch((err) =>
    console.error("[users] Could not delete uploaded files:", err),
  );

  res.json({ success: true });
});

router.post("/push-token", requireAuth, async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: "pushToken required" });

  await prisma.user.update({
    where: { id: req.userId! },
    data: { pushToken },
  });
  res.json({ success: true });
});


router.get('/:id/public', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.params.id) },
    select: { id: true, name: true, createdAt: true },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const [postCount, reviewCount] = await Promise.all([
    prisma.post.count({ where: { userId: user.id } }),
    prisma.review.count({ where: { userId: user.id } }),
  ])

  res.json({ id: user.id, name: user.name, memberSince: user.createdAt, postCount, reviewCount })
})

export default router;
