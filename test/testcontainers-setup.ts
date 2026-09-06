import { GenericContainer, Wait, StartedTestContainer } from 'testcontainers';
import { execSync } from 'child_process';

let container: StartedTestContainer | undefined;

export async function startPostgresContainer() {
  try {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: 'root',
        POSTGRES_DB: 'tracking_test',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage('database system is ready to accept connections'),
      )
      .start();
  } catch {
    console.warn('Skipping integration tests: Docker runtime not available.');
    throw new Error('SKIP_INTEGRATION_TESTS');
  }

  if (!container) {
    throw new Error('SKIP_INTEGRATION_TESTS');
  }

  const port = container.getMappedPort(5432);
  const host = container.getHost();

  process.env.DATABASE_URL = `postgresql://postgres:root@${host}:${port}/tracking_test?connection_limit=10`;

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
  });

  execSync(
    'npx ts-node -r tsconfig-paths/register src/database/seeds/run-seeds.ts',
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: 'test',
      },
    },
  );
}

export async function stopPostgresContainer() {
  if (container) {
    await container.stop();
  }
}
