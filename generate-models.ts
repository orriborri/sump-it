/**
 * Model Generator with CRUD Operations
 * 
 * This script generates TypeScript model classes for database tables with full CRUD operations.
 * Each model provides type-safe database access using Kysely query builder.
 */
import { Project } from "ts-morph";
import fs from "fs/promises";
import path from "path";

// Configuration constants
const DB_INTERFACE_FILE = "./app/lib/db.d.ts";
const OUTPUT_DIR = "./app/lib/generated-models";

// Joined table configurations
const JOINED_TABLES = {
  brews: {
    joins: [
      { table: 'beans', on: 'brews.bean_id = beans.id', type: 'left' },
      { table: 'methods', on: 'brews.method_id = methods.id', type: 'left' },
      { table: 'grinders', on: 'brews.grinder_id = grinders.id', type: 'left' },
      { table: 'brew_feedback', on: 'brews.id = brew_feedback.brew_id', type: 'left' }
    ],
    selectFields: [
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
    ]
  }
};

/**
 * Generates model classes for all tables in the DB interface
 */
async function generate(): Promise<void> {
  const project = new Project();
  project.addSourceFileAtPath(DB_INTERFACE_FILE);

  const sourceFile = project.getSourceFileOrThrow(DB_INTERFACE_FILE);
  const dbInterface = sourceFile.getInterfaceOrThrow("DB");

  // Clean and recreate output directory
  await fs.rm(OUTPUT_DIR, { recursive: true, force: true }).catch(() => {
    // Directory might not exist, which is fine
  });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const tableNames: string[] = [];

  // Generate a model class for each table in the DB interface
  for (const prop of dbInterface.getProperties()) {
    const tableName = prop.getName();
    const interfaceName = toPascalCase(tableName);
    
    // Get the interface for this table
    const tableInterface = sourceFile.getInterface(interfaceName);
    if (!tableInterface) {
      console.warn(`⚠️ No interface found for table ${tableName}, skipping`);
      continue;
    }

    const code = generateModelClass(tableName, interfaceName, tableInterface);
    
    await fs.writeFile(path.join(OUTPUT_DIR, `${interfaceName}.ts`), code);
    console.log(`✅ Generated: ${interfaceName}.ts`);
    
    tableNames.push(tableName);
  }

  // Generate joined table types and queries
  await generateJoinedTables(project, sourceFile);

  // Generate index file to export all models
  await generateIndexFile(tableNames);
}

/**
 * Generates the model class code with full CRUD operations
 */
function generateModelClass(tableName: string, interfaceName: string, tableInterface: any): string {
  const properties = tableInterface.getProperties();
  
  // Identify primary key and timestamp fields
  const primaryKey = properties.find((p: { getName: () => string; }) => p.getName() === 'id') ? 'id' : properties[0].getName();
  const hasCreatedAt = properties.some((p: { getName: () => string; }) => p.getName() === 'created_at');
  const hasUpdatedAt = properties.some((p: { getName: () => string; }) => p.getName() === 'updated_at');
  
  // Generate auto-generated fields list
  const autoFields = ['id', hasCreatedAt && 'created_at', hasUpdatedAt && 'updated_at'].filter(Boolean);
  const createFields = autoFields.length > 0 ? autoFields.map(f => `'${f}'`).join(' | ') : 'never';

  return `import { Kysely, Selectable, Insertable, Updateable } from 'kysely';
import { DB } from '../db.d';

export type ${interfaceName}Select = Selectable<DB['${tableName}']>;
export type ${interfaceName}Insert = Insertable<DB['${tableName}']>;
export type ${interfaceName}Update = Updateable<DB['${tableName}']>;

/**
 * ${interfaceName} Model - Provides CRUD operations for the ${tableName} table
 */
export class ${interfaceName}Model {
  constructor(private db: Kysely<DB>) {}

  /**
   * Create a new ${tableName.slice(0, -1)} record
   */
  async create(data: Omit<${interfaceName}Insert, ${createFields}>): Promise<${interfaceName}Select | undefined> {
    return await this.db
      .insertInto('${tableName}')
      .values(data)
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Get a ${tableName.slice(0, -1)} by ${primaryKey}
   */
  async findById(${primaryKey}: ${getPrimaryKeyType(properties, primaryKey)}): Promise<${interfaceName}Select | undefined> {
    return await this.db
      .selectFrom('${tableName}')
      .where('${primaryKey}', '=', ${primaryKey})
      .selectAll()
      .executeTakeFirst();
  }

  /**
   * Get all ${tableName} records
   */
  async findAll(): Promise<${interfaceName}Select[]> {
    return await this.db
      .selectFrom('${tableName}')
      .selectAll()
      .execute();
  }

  /**
   * Update a ${tableName.slice(0, -1)} by ${primaryKey}
   */
  async updateById(
    ${primaryKey}: ${getPrimaryKeyType(properties, primaryKey)}, 
    data: ${interfaceName}Update
  ): Promise<${interfaceName}Select | undefined> {
    return await this.db
      .updateTable('${tableName}')
      .set(data)
      .where('${primaryKey}', '=', ${primaryKey})
      .returningAll()
      .executeTakeFirst();
  }

  /**
   * Delete a ${tableName.slice(0, -1)} by ${primaryKey}
   */
  async deleteById(${primaryKey}: ${getPrimaryKeyType(properties, primaryKey)}): Promise<void> {
    await this.db
      .deleteFrom('${tableName}')
      .where('${primaryKey}', '=', ${primaryKey})
      .execute();
  }

  /**
   * Count total ${tableName} records
   */
  async count(): Promise<number> {
    const result = await this.db
      .selectFrom('${tableName}')
      .select(({ fn }) => fn.count<number>('${primaryKey}').as('count'))
      .executeTakeFirst();
    
    return result?.count ?? 0;
  }

  /**
   * Check if a ${tableName.slice(0, -1)} exists by ${primaryKey}
   */
  async exists(${primaryKey}: ${getPrimaryKeyType(properties, primaryKey)}): Promise<boolean> {
    const result = await this.db
      .selectFrom('${tableName}')
      .where('${primaryKey}', '=', ${primaryKey})
      .select('${primaryKey}')
      .executeTakeFirst();
    
    return result !== undefined;
  }

  /**
   * Find ${tableName} with pagination
   */
  async findWithPagination(
    limit: number = 10, 
    offset: number = 0
  ): Promise<${interfaceName}Select[]> {
    return await this.db
      .selectFrom('${tableName}')
      .selectAll()
      .limit(limit)
      .offset(offset)
      .execute();
  }

  /**
   * Create multiple ${tableName} records
   */
  async createMany(data: Omit<${interfaceName}Insert, ${createFields}>[]): Promise<${interfaceName}Select[]> {
    return await this.db
      .insertInto('${tableName}')
      .values(data)
      .returningAll()
      .execute();
  }
}`;
}

/**
 * Generates joined table types and query functions
 */
async function generateJoinedTables(project: any, sourceFile: any): Promise<void> {
  for (const [tableName, config] of Object.entries(JOINED_TABLES)) {
    const interfaceName = toPascalCase(tableName);
    const joinedTypeName = `${interfaceName}WithJoins`;
    
    // Generate the joined type interface
    const joinedType = generateJoinedTypeInterface(tableName, config, sourceFile);
    
    // Generate the query functions
    const queryFunctions = generateJoinedQueryFunctions(tableName, interfaceName, joinedTypeName, config);
    
    const code = `import { Kysely } from 'kysely';
import { DB } from '../db.d';
import { ${interfaceName}Select } from './${interfaceName}';

${joinedType}

/**
 * ${interfaceName} Joined Queries - Provides queries with joined data
 */
export class ${interfaceName}JoinedQueries {
  constructor(private db: Kysely<DB>) {}

${queryFunctions}
}
`;

    await fs.writeFile(path.join(OUTPUT_DIR, `${interfaceName}Joined.ts`), code);
    console.log(`✅ Generated: ${interfaceName}Joined.ts`);
  }
}

/**
 * Generates the TypeScript interface for joined table data
 */
function generateJoinedTypeInterface(tableName: string, config: any, sourceFile: any): string {
  const interfaceName = toPascalCase(tableName);
  const joinedTypeName = `${interfaceName}WithJoins`;
  
  // Get base table properties
  const baseInterface = sourceFile.getInterface(interfaceName);
  const baseProperties = baseInterface ? baseInterface.getProperties() : [];
  
  // Generate joined properties based on select fields
  let joinedProperties = '';
  
  config.selectFields.forEach((field: string) => {
    if (field.includes(' as ')) {
      const [, alias] = field.split(' as ');
      const cleanAlias = alias.trim();
      
      // Determine type based on field name
      let type = 'string';
      if (cleanAlias.includes('rating')) type = 'number | null';
      else if (cleanAlias.includes('_strong') || cleanAlias.includes('_weak') || 
               cleanAlias.includes('is_sour') || cleanAlias.includes('is_bitter')) {
        type = 'boolean | null';
      } else if (cleanAlias.includes('_ml') || cleanAlias.includes('amount')) {
        type = 'number | null';
      } else {
        type = 'string | null';
      }
      
      joinedProperties += `  ${cleanAlias}?: ${type};\n`;
    }
  });
  
  return `export interface ${joinedTypeName} extends ${interfaceName}Select {
${joinedProperties}}`;
}

/**
 * Generates query functions for joined data
 */
function generateJoinedQueryFunctions(tableName: string, interfaceName: string, joinedTypeName: string, config: any): string {
  const joins = config.joins.map((join: any) => {
    const [leftTable, leftColumn] = join.on.split(' = ')[0].split('.');
    const [rightTable, rightColumn] = join.on.split(' = ')[1].split('.');
    return `      .${join.type}Join('${join.table}', '${leftTable}.${leftColumn}', '${rightTable}.${rightColumn}')`;
  }).join('\n');
  
  const selectFields = config.selectFields.map((field: string) => `'${field}'`).join(',\n        ');
  
  return `  /**
   * Find ${tableName} with all joined data by parameters
   */
  async findByParameters(
    beanId: number,
    methodId: number,
    grinderId: number
  ): Promise<${joinedTypeName}[]> {
    return await this.db
      .selectFrom('${tableName}')
${joins}
      .where('${tableName}.bean_id', '=', beanId)
      .where('${tableName}.method_id', '=', methodId)
      .where('${tableName}.grinder_id', '=', grinderId)
      .select([
        ${selectFields}
      ])
      .orderBy('${tableName}.created_at', 'desc')
      .execute() as ${joinedTypeName}[];
  }

  /**
   * Find ${tableName} with all joined data by id
   */
  async findByIdWithJoins(id: number): Promise<${joinedTypeName} | undefined> {
    return await this.db
      .selectFrom('${tableName}')
${joins}
      .where('${tableName}.id', '=', id)
      .select([
        ${selectFields}
      ])
      .executeTakeFirst() as ${joinedTypeName} | undefined;
  }

  /**
   * Find top rated ${tableName} with all joined data
   */
  async findTopRated(limit: number = 10): Promise<${joinedTypeName}[]> {
    return await this.db
      .selectFrom('${tableName}')
${joins}
      .where('brew_feedback.overall_rating', '>=', 4)
      .select([
        ${selectFields}
      ])
      .orderBy('brew_feedback.overall_rating', 'desc')
      .limit(limit)
      .execute() as ${joinedTypeName}[];
  }`;
}

/**
 * Get the TypeScript type for the primary key
 */
function getPrimaryKeyType(properties: any[], primaryKey: string): string {
  const pkProp = properties.find(p => p.getName() === primaryKey);
  if (!pkProp) return 'number';
  
  const type = pkProp.getType().getText();
  if (type.includes('string')) return 'string';
  if (type.includes('number')) return 'number';
  return 'number'; // default
}

/**
 * Generates an index file that exports all models
 */
async function generateIndexFile(tableNames: string[]): Promise<void> {
  const imports = tableNames
    .map(name => {
      const pascalName = toPascalCase(name);
      const hasJoined = JOINED_TABLES[name as keyof typeof JOINED_TABLES];
      const joinedImport = hasJoined ? `export { ${pascalName}JoinedQueries } from './${pascalName}Joined';` : '';
      return `export { ${pascalName}Model } from './${pascalName}';\n${joinedImport}`;
    })
    .join('\n');
  
  const code = `// Auto-generated model exports
${imports}

// Re-export types for convenience
${tableNames.map(name => {
  const pascalName = toPascalCase(name);
  const hasJoined = JOINED_TABLES[name as keyof typeof JOINED_TABLES];
  const joinedType = hasJoined ? `export type { ${pascalName}WithJoins } from './${pascalName}Joined';` : '';
  return `export type { ${pascalName}Select, ${pascalName}Insert, ${pascalName}Update } from './${pascalName}';\n${joinedType}`;
}).join('\n')}
`;

  await fs.writeFile(path.join(OUTPUT_DIR, "index.ts"), code);
  console.log("✅ Generated: index.ts");
}

/**
 * Converts snake_case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

// Execute the generator
generate().catch((error) => {
  console.error("❌ Error generating models:", error);
  process.exit(1);
});
