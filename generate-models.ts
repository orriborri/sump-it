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

  // Generate index file to export all models
  await generateIndexFile(tableNames);
}

/**
 * Generates the model class code with full CRUD operations
 */
function generateModelClass(tableName: string, interfaceName: string, tableInterface: any): string {
  const properties = tableInterface.getProperties();
  
  // Identify primary key and timestamp fields
  const primaryKey = properties.find(p => p.getName() === 'id') ? 'id' : properties[0].getName();
  const hasCreatedAt = properties.some(p => p.getName() === 'created_at');
  const hasUpdatedAt = properties.some(p => p.getName() === 'updated_at');
  
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
      return `export { ${pascalName}Model } from './${pascalName}';`;
    })
    .join('\n');
  
  const code = `// Auto-generated model exports
${imports}

// Re-export types for convenience
${tableNames.map(name => {
  const pascalName = toPascalCase(name);
  return `export type { ${pascalName}Select, ${pascalName}Insert, ${pascalName}Update } from './${pascalName}';`;
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
