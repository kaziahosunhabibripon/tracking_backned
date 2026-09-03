import { config as loadDotenv } from 'dotenv';

export type AppEnvironment = 'development' | 'production' | 'test';

export function resolveAppEnvironment(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): AppEnvironment {
  if (nodeEnv === 'production') {
    return 'production';
  }

  if (nodeEnv === 'test') {
    return 'test';
  }

  return 'development';
}

export function getEnvFilePath(
  environment: AppEnvironment = resolveAppEnvironment(),
): string {
  if (environment === 'production') {
    return '.env.prod';
  }

  return '.env.local';
}

export function loadAppEnv(): string {
  const envFilePath = getEnvFilePath();
  loadDotenv({
    path: envFilePath,
    override: false,
  });

  return envFilePath;
}
