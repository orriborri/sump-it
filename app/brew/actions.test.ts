import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { saveBrew, setTestDatabase } from './actions'
import {
  createTestDatabase,
  setupTestDatabase,
  cleanupTestDatabase,
} from '../../test/database-setup'
import type { Kysely } from 'kysely'
import type { Database } from '../lib/db'
import type { FormData } from './types'

describe('Brew Workflow Actions - Unit Tests', () => {
  let testDb: Kysely<Database>

  beforeEach(async () => {
    testDb = await createTestDatabase()
    await setupTestDatabase(testDb)
    setTestDatabase(testDb)
  })

  afterEach(async () => {
    await cleanupTestDatabase(testDb)
    setTestDatabase(null)
  })

  describe('saveBrew', () => {
    it('successfully saves valid brew data to database', async () => {
      // Given: User has configured complete brew parameters
      const validBrewData: FormData = {
        bean_id: 1,
        method_id: 2,
        grinder_id: 1,
        dose: 20,
        water: 320,
        grind: 15,
        ratio: 16,
      }

      // When: User saves their brew
      const result = await saveBrew(validBrewData)

      // Then: System should save successfully
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.brew).toBeDefined()
      expect(result.brew!.id).toBeDefined()
      expect(result.brew!.dose).toBe(20)
      expect(result.brew!.water).toBe(320)
    })

    it('handles extreme parameter values appropriately', async () => {
      // Given: User enters unusual but not impossible values
      const extremeBrewData: FormData = {
        bean_id: 1,
        method_id: 1,
        grinder_id: 1,
        dose: 100, // Very large dose
        water: 1600, // Corresponding water amount
        grind: 1, // Very fine grind
        ratio: 16,
      }

      // When: System processes the data
      const result = await saveBrew(extremeBrewData)

      // Then: System should handle it (business decision on validation)
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.brew!.dose).toBe(100)
      expect(result.brew!.water).toBe(1600)
    })

    it('maintains data integrity across save operations', async () => {
      // Given: Multiple brew saves in sequence
      const firstBrew: FormData = {
        bean_id: 1,
        method_id: 1,
        grinder_id: 1,
        dose: 20,
        water: 320,
        grind: 15,
        ratio: 16,
      }

      const secondBrew: FormData = {
        bean_id: 2,
        method_id: 2,
        grinder_id: 1,
        dose: 25,
        water: 400,
        grind: 12,
        ratio: 16,
      }

      // When: User saves multiple brews
      const firstResult = await saveBrew(firstBrew)
      const secondResult = await saveBrew(secondBrew)

      // Then: Both should be saved independently with different IDs
      expect(firstResult).toBeDefined()
      expect(firstResult.success).toBe(true)
      expect(secondResult).toBeDefined()
      expect(secondResult.success).toBe(true)
      expect(firstResult.brew!.id).not.toBe(secondResult.brew!.id)
    })

    it('handles database constraint violations gracefully', async () => {
      // Given: Invalid foreign key reference
      const invalidBrewData: FormData = {
        bean_id: 999, // Non-existent bean
        method_id: 1,
        grinder_id: 1,
        dose: 20,
        water: 320,
        grind: 15,
        ratio: 16,
      }

      // When: System attempts to save invalid data
      const result = await saveBrew(invalidBrewData)

      // Then: System should handle the error gracefully
      expect(result).toBeDefined()
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
