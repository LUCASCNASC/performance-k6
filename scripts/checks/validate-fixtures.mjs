import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';

const repositoryRoot = process.cwd();
const loadScripts = ['login', 'users', 'products', 'carts']
  .map((type) => `scripts/load/${type}.js`);
const volumeScripts = ['users', 'products', 'carts']
  .map((type) => `scripts/volume/${type}.js`);
const k6 = process.env.K6_BIN || 'k6';
let nextId = 1;
const state = {
  users: new Map(),
  products: new Map(),
  carts: new Map(),
  tokens: new Map(),
};

function resetState() {
  nextId = 1;
  for (const collection of Object.values(state)) {
    collection.clear();
  }
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function authorizedUser(request) {
  return state.tokens.get(request.headers.authorization);
}

const server = createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  const body = rawBody ? JSON.parse(rawBody) : {};
  const { pathname } = new URL(request.url, 'http://127.0.0.1');
  const parts = pathname.split('/').filter(Boolean);

  if (request.method === 'POST' && pathname === '/usuarios') {
    const id = `user-${nextId++}`;
    state.users.set(id, { ...body, _id: id });
    sendJson(response, 201, { message: 'Cadastro realizado com sucesso', _id: id });
    return;
  }

  if (request.method === 'POST' && pathname === '/login') {
    const user = [...state.users.values()].find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );
    if (!user) {
      sendJson(response, 401, { message: 'Email e/ou senha inválidos' });
      return;
    }

    const token = `token-${user._id}`;
    state.tokens.set(token, user);
    sendJson(response, 200, {
      message: 'Login realizado com sucesso',
      authorization: token,
    });
    return;
  }

  if (request.method === 'POST' && pathname === '/produtos') {
    if (authorizedUser(request)?.administrador !== 'true') {
      sendJson(response, 401, { message: 'Token não autorizado' });
      return;
    }

    const id = `product-${nextId++}`;
    state.products.set(id, { ...body, _id: id });
    sendJson(response, 201, { message: 'Cadastro realizado com sucesso', _id: id });
    return;
  }

  if (request.method === 'POST' && pathname === '/carrinhos') {
    const user = authorizedUser(request);
    if (!user) {
      sendJson(response, 401, { message: 'Token não autorizado' });
      return;
    }

    const id = `cart-${nextId++}`;
    state.carts.set(id, { ...body, _id: id, idUsuario: user._id });
    sendJson(response, 201, { message: 'Cadastro realizado com sucesso', _id: id });
    return;
  }

  if (request.method === 'GET' && parts.length === 1 && parts[0] === 'usuarios') {
    const usuarios = [...state.users.values()];
    sendJson(response, 200, { quantidade: usuarios.length, usuarios });
    return;
  }

  if (request.method === 'GET' && parts[0] === 'usuarios' && parts.length === 2) {
    const user = state.users.get(parts[1]);
    sendJson(response, user ? 200 : 400, user || { message: 'Usuário não encontrado' });
    return;
  }

  if (request.method === 'GET' && parts.length === 1 && parts[0] === 'produtos') {
    const produtos = [...state.products.values()];
    sendJson(response, 200, { quantidade: produtos.length, produtos });
    return;
  }

  if (request.method === 'GET' && parts[0] === 'produtos' && parts.length === 2) {
    const product = state.products.get(parts[1]);
    sendJson(response, product ? 200 : 400, product || { message: 'Produto não encontrado' });
    return;
  }

  if (request.method === 'GET' && parts.length === 1 && parts[0] === 'carrinhos') {
    const carrinhos = [...state.carts.values()];
    sendJson(response, 200, { quantidade: carrinhos.length, carrinhos });
    return;
  }

  if (request.method === 'GET' && parts[0] === 'carrinhos' && parts.length === 2) {
    const cart = state.carts.get(parts[1]);
    sendJson(response, cart ? 200 : 400, cart || { message: 'Carrinho não encontrado' });
    return;
  }

  if (request.method === 'DELETE' && pathname === '/carrinhos/cancelar-compra') {
    const user = authorizedUser(request);
    const cart = [...state.carts.entries()].find(([, candidate]) => candidate.idUsuario === user?._id);
    if (!cart) {
      sendJson(response, 400, { message: 'Não foi encontrado carrinho para esse usuário' });
      return;
    }

    state.carts.delete(cart[0]);
    sendJson(response, 200, { message: 'Registro excluído com sucesso. Estoque dos produtos reabastecido' });
    return;
  }

  if (request.method === 'DELETE' && parts[0] === 'produtos' && parts.length === 2) {
    if (authorizedUser(request)?.administrador !== 'true') {
      sendJson(response, 401, { message: 'Token não autorizado' });
      return;
    }

    state.products.delete(parts[1]);
    sendJson(response, 200, { message: 'Registro excluído com sucesso' });
    return;
  }

  if (request.method === 'DELETE' && parts[0] === 'usuarios' && parts.length === 2) {
    state.users.delete(parts[1]);
    sendJson(response, 200, { message: 'Registro excluído com sucesso' });
    return;
  }

  sendJson(response, 404, { message: `Unhandled mock route: ${request.method} ${pathname}` });
});

function runK6(args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(k6, args, {
      cwd: repositoryRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    const timeout = setTimeout(() => {
      child.kill();
      settled = true;
      rejectRun(new Error(`k6 command timed out: ${args.join(' ')}`));
    }, 60000);

    child.once('error', (error) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        rejectRun(error);
      }
    });
    child.once('close', (status) => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        resolveRun({ status, stdout, stderr });
      }
    });
  });
}

try {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const missingBaseUrlEnv = { ...process.env };
  delete missingBaseUrlEnv.BASE_URL;

  for (const script of [...loadScripts, 'scripts/stress/cart-stock-race.js']) {
    const missingBaseUrl = await runK6(
      ['run', '--vus', '1', '--iterations', '1', script],
      missingBaseUrlEnv,
    );
    assert.notEqual(missingBaseUrl.status, 0, `${script} must reject an unset BASE_URL`);
    assert.match(
      `${missingBaseUrl.stdout}\n${missingBaseUrl.stderr}`,
      /BASE_URL must be set explicitly/,
    );
    assert.equal(state.users.size, 0, 'Unset BASE_URL must not make any API requests');
  }

  for (const script of [...loadScripts, ...volumeScripts]) {
    resetState();
    const result = await runK6(['run', '--vus', '1', '--iterations', '1', script], {
      ...process.env,
      BASE_URL: baseUrl,
    });

    if (result.status !== 0) {
      throw new Error(
        `k6 fixture validation failed for ${script}.\n${result.stdout}\n${result.stderr}`,
      );
    }

    assert.equal(state.carts.size, 0, `${script} fixture cleanup left carts behind`);
    assert.equal(state.products.size, 0, `${script} fixture cleanup left products behind`);
    assert.equal(state.users.size, 0, `${script} fixture cleanup left users behind`);
    console.log(`Fixture setup and teardown passed: ${script}`);
  }
} finally {
  await new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
}
