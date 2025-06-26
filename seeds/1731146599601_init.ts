import { DB } from '@/app/lib/db'
import type { Kysely } from 'kysely'

export async function seed(db: Kysely<DB>): Promise<void> {
	await db.insertInto('beans').values({
		id: 1, name: "testBean", "roster": "Tuuli", rostery: "Tuulin paahtimo"
	}).execute()
	
	await db.insertInto('grinders').values({
		id: 1, 
		name: "testGrinder",
		min_setting: 1,
		max_setting: 40,
		step_size: 1.0,
		setting_type: 'numeric'
	}).execute()
	
	await db.insertInto('methods').values({
		id: 1, name: "test", 
	}).execute()
	
	await db.insertInto('brews').values({
		bean_id: 1,
		method_id: 1,
	}).execute()
}
