import { apiFetch } from './client'

export interface ProfileCompleteness {
  percent: number
  done: string[]
  missing: string[]
}

// Mirrors the API's SkinProfile row (apps/api/prisma/schema.prisma) plus the
// computed `completeness`. Fields added later are optional here, so an older
// server that doesn't send them still type-checks and works.
export interface SkinProfile {
  id: string
  skinType: string
  concerns: string[]
  sensitivities: string[]
  goals: string[]
  climateZone?: string | null
  monthlyBudget?: number | null
  sensitiveSkin?: string | null
  acneType?: string | null
  skinTone?: number | null
  ageRange?: string | null
  specialSituations?: string[]
  avoidIngredients?: string[]
  completedSections?: string[]
  completeness?: ProfileCompleteness
}

/** A whole profile, or just the fields of the section being edited. */
export type SkinProfileInput = Record<string, unknown>

export function saveSkinProfile(data: SkinProfileInput) {
  return apiFetch<SkinProfile>('/skin-profile', { method: 'POST', body: JSON.stringify(data) })
}

/** Updates only the fields sent. Fails with 'No skin profile yet' until a first profile is saved. */
export function patchSkinProfile(data: SkinProfileInput) {
  return apiFetch<SkinProfile>('/skin-profile', { method: 'PATCH', body: JSON.stringify(data) })
}

export function getMySkinProfile() {
  return apiFetch<SkinProfile>('/skin-profile/me')
}

export function updateMonthlyBudget(monthlyBudget: number) {
  return apiFetch<SkinProfile>('/skin-profile/budget', {
    method: 'PATCH',
    body: JSON.stringify({ monthlyBudget }),
  })
}
