import "server-only";

export function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Required environment variable '${name}' is not configured`
    );
  }

  return value;
}