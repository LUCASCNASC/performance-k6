export const BASE_URL = (__ENV.BASE_URL || 'https://serverest.dev').trim().replace(/\/+$/, '');

export function requirePerformanceBaseUrl() {
  const baseUrl = (__ENV.BASE_URL || '').trim();
  if (!baseUrl) {
    throw new Error(
      'BASE_URL must be set explicitly for performance tests to avoid loading the public API accidentally.',
    );
  }

  return baseUrl.replace(/\/+$/, '');
}
