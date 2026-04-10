import type { OnboardingCase, OnboardingTask } from '../types/hrms'

/** Matches backend {@code OnboardingService.EXIT_LETTER_TASKS} labels (case-insensitive). */
export function isExitDocumentTaskName(name: string): boolean {
  const n = name.trim().toLowerCase()
  return (
    n === 'issue relieving letter' ||
    n === 'issue experience letter' ||
    n === 'issue full and final letter'
  )
}

/** True when HR must not mark this task done yet (LWD missing or still in the future). */
export function isExitDocumentTaskBlockedByLwd(c: OnboardingCase, t: OnboardingTask): boolean {
  if (c.employeeId == null || !isExitDocumentTaskName(t.name)) {
    return false
  }
  return c.exitDocumentTasksEligible !== true
}
