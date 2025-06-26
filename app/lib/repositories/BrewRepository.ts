import { BaseRepository } from './BaseRepository';
import { Database } from '../db.d';
import { Kysely } from 'kysely';

export interface BrewWithDetails {
  id: number;
  bean_id: number | null;
  method_id: number | null;
  grinder_id: number | null;
  water: number | null;
  dose: number | null;
  grind: number | null;
  ratio: number | null;
  created_at: Date;
  bean_name?: string;
  method_name?: string;
  grinder_name?: string;
  feedback?: {
    overall_rating: number | null;
    too_strong: boolean;
    too_weak: boolean;
    is_sour: boolean;
    is_bitter: boolean;
    coffee_amount_ml: number | null;
  };
}

export interface CreateBrewData {
  bean_id: number;
  method_id: number;
  grinder_id: number;
  water: number;
  dose: number;
  grind: number;
  ratio: number;
}

export class BrewRepository extends BaseRepository<'brews'> {
  constructor(db: Kysely<Database>) {
    super(db, 'brews');
  }

  async create(data: CreateBrewData) {
    const [result] = await this.db
      .insertInto('brews')
      .values(data)
      .returning('id')
      .execute();
    
    return this.findById(result.id);
  }

  async findByParameters(
    beanId: number,
    methodId: number,
    grinderId: number
  ): Promise<BrewWithDetails[]> {
    return await this.db
      .selectFrom('brews')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .where('brews.bean_id', '=', beanId)
      .where('brews.method_id', '=', methodId)
      .where('brews.grinder_id', '=', grinderId)
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'brews.water',
        'brews.dose',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name',
        'brew_feedback.overall_rating',
        'brew_feedback.too_strong',
        'brew_feedback.too_weak',
        'brew_feedback.is_sour',
        'brew_feedback.is_bitter',
        'brew_feedback.coffee_amount_ml'
      ])
      .orderBy('brews.created_at', 'desc')
      .execute() as BrewWithDetails[];
  }

  async findWithDetails(id: number): Promise<BrewWithDetails | undefined> {
    const result = await this.db
      .selectFrom('brews')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .where('brews.id', '=', id)
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'brews.water',
        'brews.dose',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name'
      ])
      .executeTakeFirst();

    return result as BrewWithDetails | undefined;
  }

  async findTopRated(limit: number = 10): Promise<BrewWithDetails[]> {
    return await this.db
      .selectFrom('brews')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .where('brew_feedback.overall_rating', '>=', 4)
      .select([
        'brews.id',
        'brews.bean_id',
        'brews.method_id',
        'brews.grinder_id',
        'brews.water',
        'brews.dose',
        'brews.grind',
        'brews.ratio',
        'brews.created_at',
        'beans.name as bean_name',
        'methods.name as method_name',
        'grinders.name as grinder_name',
        'brew_feedback.overall_rating',
        'brew_feedback.too_strong',
        'brew_feedback.too_weak',
        'brew_feedback.is_sour',
        'brew_feedback.is_bitter',
        'brew_feedback.coffee_amount_ml'
      ])
      .orderBy('brew_feedback.overall_rating', 'desc')
      .limit(limit)
      .execute() as BrewWithDetails[];
  }
}
