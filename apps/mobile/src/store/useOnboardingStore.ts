import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from './useAuthStore'
import { Answers, EMPTY_ANSWERS, PRIVATE_FIELDS, StepId } from '../lib/onboardingSteps'

// A draft lets someone who closes the app mid-onboarding pick up where they
// left off. It is tied to the signed-in user, and the private answers (the
// "be careful about" step) are never written to the device.
const DRAFT_KEY = 'onboardingDraft'
const DRAFT_VERSION = 1

interface Draft {
  v: number
  userId: string
  stepId: StepId
  answers: Answers
}

interface OnboardingState {
  answers: Answers
  stepId: StepId
  setAnswers: (patch: Partial<Answers>) => void
  setStep: (id: StepId) => void
  /** Starts from known answers (editing or retaking an existing profile). */
  startFrom: (answers: Answers, stepId: StepId) => void
  /** Restores this user's draft, if there is one. Returns true when it did. */
  loadDraft: () => Promise<boolean>
  reset: () => Promise<void>
}

function currentUserId() {
  return useAuthStore.getState().user?.id ?? null
}

async function saveDraft(stepId: StepId, answers: Answers) {
  const userId = currentUserId()
  if (!userId) return
  const safe = { ...answers }
  for (const field of PRIVATE_FIELDS) (safe as Record<string, unknown>)[field] = EMPTY_ANSWERS[field]
  const draft: Draft = { v: DRAFT_VERSION, userId, stepId, answers: safe }
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // A draft is a convenience; failing to save it must never get in the way.
  }
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  answers: { ...EMPTY_ANSWERS },
  stepId: 'skinType',

  setAnswers: (patch) => {
    const answers = { ...get().answers, ...patch }
    set({ answers })
    void saveDraft(get().stepId, answers)
  },

  setStep: (stepId) => {
    set({ stepId })
    void saveDraft(stepId, get().answers)
  },

  startFrom: (answers, stepId) => set({ answers, stepId }),

  loadDraft: async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY)
      if (!raw) return false
      const draft = JSON.parse(raw) as Draft
      if (draft.v !== DRAFT_VERSION || draft.userId !== currentUserId()) return false
      set({ answers: { ...EMPTY_ANSWERS, ...draft.answers }, stepId: draft.stepId })
      return true
    } catch {
      return false
    }
  },

  reset: async () => {
    set({ answers: { ...EMPTY_ANSWERS }, stepId: 'skinType' })
    try {
      await AsyncStorage.removeItem(DRAFT_KEY)
    } catch {
      // Nothing to clean up if storage is unavailable.
    }
  },
}))
