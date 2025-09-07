import { Kysely } from 'kysely';
import { DB } from '../db.d';
import { BrewsSelect } from './Brews';

export interface BrewsWithJoins extends BrewsSelect {
  bean_name?: string | null;
  method_name?: string | null;
  grinder_name?: string | null;
}

/**
 * Brews Joined Queries - Provides queries with joined data
 */
export class BrewsJoinedQueries {
  constructor(private db: Kysely<DB>) {}

  /**
   * Find brews with all joined data by parameters
   */
  async findByParameters(
    beanId: number,
    methodId: number,
    grinderId: number
  ): Promise<BrewsWithJoins[]> {
    return await this.db
      .selectFrom('brews')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
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
      .execute() as BrewsWithJoins[];
  }

  /**
   * Find brews with all joined data by id
   */
  async findByIdWithJoins(id: number): Promise<BrewsWithJoins | undefined> {
    return await this.db
      .selectFrom('brews')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
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
        'grinders.name as grinder_name',
        'brew_feedback.overall_rating',
        'brew_feedback.too_strong',
        'brew_feedback.too_weak',
        'brew_feedback.is_sour',
        'brew_feedback.is_bitter',
        'brew_feedback.coffee_amount_ml'
      ])
      .executeTakeFirst() as BrewsWithJoins | undefined;
  }

  /**
   * Find top rated brews with all joined data
   */
  async findTopRated(limit: number = 10): Promise<BrewsWithJoins[]> {
    return await this.db
      .selectFrom('brews')
      .leftJoin('beans', 'brews.bean_id', 'beans.id')
      .leftJoin('methods', 'brews.method_id', 'methods.id')
      .leftJoin('grinders', 'brews.grinder_id', 'grinders.id')
      .leftJoin('brew_feedback', 'brews.id', 'brew_feedback.brew_id')
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
      .execute() as BrewsWithJoins[];
  }
}
