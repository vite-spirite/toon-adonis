import type { ApplicationService } from '@adonisjs/core/types'
import ToonProvider from '../providers/toon_provider.ts'

let booted = false

/**
 * Boots the TOON provider macros exactly once per test process,
 * no matter how many spec files request it.
 */
export function bootToonForTests() {
  if (booted) {
    return
  }

  new ToonProvider(undefined as unknown as ApplicationService).boot()
  booted = true
}
