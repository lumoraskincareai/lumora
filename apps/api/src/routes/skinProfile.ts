import express from 'express'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { awardBounty } from '../lib/bounties'
import { computeCompleteness, validateSkinProfileInput } from '../lib/skinProfile'
import type { ProfileSection } from '../lib/skinProfile'

const router = express.Router()

// Which onboarding section each field belongs to, so the profile can say
// which sections have been answered (older apps send only the first four
// fields, which still marks all three sections done).
const SECTION_FIELDS: Record<ProfileSection, string[]> = {
  skin: ['skinType', 'sensitiveSkin', 'concerns', 'acneType'],
  safety: ['sensitivities', 'avoidIngredients', 'specialSituations'],
  you: ['skinTone', 'ageRange', 'goals'],
}

function sectionsSentIn(body: Record<string, unknown>): ProfileSection[] {
  return (Object.keys(SECTION_FIELDS) as ProfileSection[]).filter((section) =>
    SECTION_FIELDS[section].some((field) => body[field] !== undefined),
  )
}

function withCompleteness<T extends Parameters<typeof computeCompleteness>[0]>(profile: T) {
  return { ...profile, completeness: computeCompleteness(profile) }
}

// Saves a whole profile (first onboarding, or "retake"). Fields the app didn't
// send keep their stored value; unknown fields are ignored so a newer app
// talking to an older server never breaks.
router.post('/', requireAuth, async (req, res) => {
  const userId = req.userId!

  const result = validateSkinProfileInput(req.body, { partial: false })
  if (!result.ok) return res.status(400).json({ error: result.error })
  const { skinType, ...rest } = result.value

  const existing = await prisma.skinProfile.findUnique({ where: { userId } })
  const completedSections = [
    ...new Set([...(existing?.completedSections ?? []), ...sectionsSentIn(req.body)]),
  ]

  const profile = await prisma.skinProfile.upsert({
    where: { userId },
    update: { skinType: skinType!, ...rest, completedSections },
    create: { userId, skinType: skinType!, ...rest, completedSections },
  })

  // Only the first assessment earns the bounty, not every retake.
  if (!existing) await awardBounty(userId, 'skin_assessment')

  res.json(withCompleteness(profile))
})

// Edits one or more sections without touching the rest.
router.patch('/', requireAuth, async (req, res) => {
  const userId = req.userId!

  const result = validateSkinProfileInput(req.body, { partial: true })
  if (!result.ok) return res.status(400).json({ error: result.error })

  // The app's entry gate looks for exactly this message to start onboarding.
  const existing = await prisma.skinProfile.findUnique({ where: { userId } })
  if (!existing) return res.status(404).json({ error: 'No skin profile yet' })

  const completedSections = [
    ...new Set([...(existing.completedSections ?? []), ...sectionsSentIn(req.body)]),
  ]

  const profile = await prisma.skinProfile.update({
    where: { userId },
    data: { ...result.value, completedSections },
  })
  res.json(withCompleteness(profile))
})

router.patch('/budget', requireAuth, async (req, res) => {
  const userId = req.userId!
  const { monthlyBudget } = req.body

  if (typeof monthlyBudget !== 'number' || monthlyBudget < 0) {
    return res.status(400).json({ error: 'monthlyBudget must be a non-negative number' })
  }

  try {
    const profile = await prisma.skinProfile.update({ where: { userId }, data: { monthlyBudget } })
    res.json(withCompleteness(profile))
  } catch {
    res.status(404).json({ error: 'Complete your skin assessment first' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  const profile = await prisma.skinProfile.findUnique({ where: { userId: req.userId! } })
  if (!profile) return res.status(404).json({ error: 'No skin profile yet' })
  res.json(withCompleteness(profile))
})

export default router
