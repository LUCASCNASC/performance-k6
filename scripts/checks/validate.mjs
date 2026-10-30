import { spawnSync } from 'node:child_process';

const contractUrl =
  'https://raw.githubusercontent.com/ServeRest/ServeRest/trunk/docs/swagger.json';
const requiredOperations = [
  ['post', '/login'],
  ['get', '/usuarios'],
  ['post', '/usuarios'],
  ['get', '/usuarios/{_id}'],
  ['put', '/usuarios/{_id}'],
  ['delete', '/usuarios/{_id}'],
  ['get', '/produtos'],
  ['post', '/produtos'],
  ['get', '/produtos/{_id}'],
  ['put', '/produtos/{_id}'],
  ['delete', '/produtos/{_id}'],
  ['get', '/carrinhos'],
  ['post', '/carrinhos'],
  ['get', '/carrinhos/{_id}'],
  ['delete', '/carrinhos/concluir-compra'],
  ['delete', '/carrinhos/cancelar-compra'],
];
const k6Scripts = [
  'scripts/smoke/login.js',
  'scripts/smoke/users.js',
  'scripts/smoke/products.js',
  'scripts/smoke/carts.js',
  'scripts/load/login.js',
  'scripts/load/users.js',
  'scripts/load/products.js',
  'scripts/load/carts.js',
];

const response = await fetch(contractUrl, { signal: AbortSignal.timeout(15000) });
if (!response.ok) {
  throw new Error(`Could not download ServeRest OpenAPI contract: HTTP ${response.status}`);
}

const spec = await response.json();
const missingOperations = requiredOperations
  .filter(([method, path]) => !spec.paths?.[path]?.[method])
  .map(([method, path]) => `${method.toUpperCase()} ${path}`);

if (missingOperations.length > 0) {
  throw new Error(`Missing API operations: ${missingOperations.join(', ')}`);
}

console.log(`OpenAPI contract: all ${requiredOperations.length} required operations are present.`);

for (const script of k6Scripts) {
  const result = spawnSync(process.env.K6_BIN || 'k6', ['inspect', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw new Error(`Could not inspect ${script}. Is k6 installed and available on PATH?`, {
      cause: result.error,
    });
  }

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`k6 inspect failed for ${script} (exit code ${result.status}).`);
  }

  console.log(`k6 inspect: ${script}`);
}
