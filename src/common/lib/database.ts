'use server'
import { createKysely } from '@vercel/postgres-kysely';
import { DB } from './db';

export const db = createKysely<DB>();