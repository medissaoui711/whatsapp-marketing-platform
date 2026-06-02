import { execSync } from 'child_process';
import path from 'path';
import { getPrisma } from '../connection';

export interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export async function runMigrations(options: MigrationOptions = {}): Promise<void> {
  const { dryRun = false, verbose = false } = options;

  console.log('Running database migrations...');

  if (dryRun) {
    console.log('DRY RUN - no changes will be applied');
    try {
      execSync(
        'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma',
        { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') }
      );
    } catch (error) {
      console.error('Migration diff failed:', error);
      throw error;
    }
    return;
  }

  try {
    execSync('npx prisma migrate deploy', {
      stdio: verbose ? 'inherit' : 'pipe',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('Migrations applied successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export async function createMigration(name: string): Promise<void> {
  console.log(`Creating migration: ${name}`);

  try {
    execSync(`npx prisma migrate dev --name ${name}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log(`Migration created: ${name}`);
  } catch (error) {
    console.error('Migration creation failed:', error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  console.log('Resetting database...');

  const prisma = getPrisma();

  try {
    const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    `;

    await prisma.$executeRaw`SET session_replication_role = 'replica';`;

    for (const { tablename } of rows) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }

    await prisma.$executeRaw`SET session_replication_role = 'origin';`;

    console.log('Database reset completed');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}


