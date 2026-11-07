import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || 'https://serverest.dev').replace(/\/+$/, '');

export function checkJsonResponse(response, name, expectedShape) {
  let body;

  try {
    body = JSON.parse(response.body);
  } catch (error) {
    check(response, {
      [`${name}: HTTP 200`]: (res) => res.status === 200,
      [`${name}: corpo JSON válido`]: () => false,
    });
    return null;
  }

  const statusOk = response.status === 200;
  const shapeOk =
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    expectedShape(body);

  check(response, {
    [`${name}: HTTP 200`]: (res) => res.status === 200,
    [`${name}: contrato da resposta`]: () => shapeOk,
  });

  return statusOk && shapeOk ? body : null;
}

export function checkJsonStatusResponse(response, name, expectedStatus, expectedShape) {
  let body;

  try {
    body = JSON.parse(response.body);
  } catch (error) {
    check(response, {
      [`${name}: HTTP ${expectedStatus}`]: (res) => res.status === expectedStatus,
      [`${name}: corpo JSON válido`]: () => false,
    });
    return null;
  }

  const statusOk = response.status === expectedStatus;
  const shapeOk =
    body !== null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    expectedShape(body);

  check(response, {
    [`${name}: HTTP ${expectedStatus}`]: (res) => res.status === expectedStatus,
    [`${name}: contrato da resposta`]: () => shapeOk,
  });

  return statusOk && shapeOk ? body : null;
}

export function uniqueSuffix() {
  return `${Date.now()}-${__VU}-${__ITER}-${Math.random().toString(36).slice(2, 8)}`;
}

function requestJson(method, path, expectedStatus, payload, authorization, name) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) {
    headers.Authorization = authorization;
  }

  const response = http.request(
    method,
    `${BASE_URL}${path}`,
    payload === undefined ? null : JSON.stringify(payload),
    { headers, tags: { name: `fixture.${name}` } },
  );

  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${path} expected HTTP ${expectedStatus}, received ${response.status}`);
  }

  try {
    return JSON.parse(response.body);
  } catch (error) {
    throw new Error(`${method} ${path} returned invalid JSON`);
  }
}

function createUserFixture(admin) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const user = {
    nome: `k6 test ${uniqueId}`,
    email: `k6-${uniqueId}@example.com`,
    password: `k6-${uniqueId}`,
    administrador: admin ? 'true' : 'false',
  };
  const response = requestJson('POST', '/usuarios', 201, user, null, 'users.create');

  if (typeof response._id !== 'string' || response._id.length === 0) {
    throw new Error('POST /usuarios did not return a user ID');
  }

  return Object.assign({}, user, { id: response._id });
}

function loginFixtureUser(user) {
  const response = requestJson(
    'POST',
    '/login',
    200,
    { email: user.email, password: user.password },
    null,
    'login',
  );

  if (typeof response.authorization !== 'string' || response.authorization.length === 0) {
    throw new Error('POST /login did not return an authorization token');
  }

  return response.authorization;
}

function createProductFixture(authorization) {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const response = requestJson(
    'POST',
    '/produtos',
    201,
    {
      nome: `k6 test product ${uniqueId}`,
      preco: 10,
      descricao: `Temporary k6 fixture ${uniqueId}`,
      quantidade: 100,
    },
    authorization,
    'products.create',
  );

  if (typeof response._id !== 'string' || response._id.length === 0) {
    throw new Error('POST /produtos did not return a product ID');
  }

  return response._id;
}

function createCartFixture(productId, authorization) {
  const response = requestJson(
    'POST',
    '/carrinhos',
    201,
    { produtos: [{ idProduto: productId, quantidade: 1 }] },
    authorization,
    'carts.create',
  );

  if (typeof response._id !== 'string' || response._id.length === 0) {
    throw new Error('POST /carrinhos did not return a cart ID');
  }

  return response._id;
}

export function teardownFixture(fixture) {
  if (!fixture) {
    throw new Error('Cannot clean up a missing test fixture');
  }
  if (!fixture.user) {
    return;
  }

  const errors = [];
  let authorization;
  const attempt = (name, action) => {
    try {
      action();
    } catch (error) {
      errors.push(`${name}: ${error.message}`);
    }
  };

  if (fixture.productId || fixture.cartId) {
    attempt('authenticate for cleanup', () => {
      authorization = loginFixtureUser(fixture.user);
    });
  }

  if (fixture.cartId && authorization) {
    attempt('cancel cart', () => {
      requestJson('DELETE', '/carrinhos/cancelar-compra', 200, undefined, authorization, 'carts.cancel');
    });
  }

  if (fixture.productId && authorization) {
    attempt('delete product', () => {
      requestJson(
        'DELETE',
        `/produtos/${encodeURIComponent(fixture.productId)}`,
        200,
        undefined,
        authorization,
        'products.delete',
      );
    });
  }

  attempt('delete user', () => {
    requestJson(
      'DELETE',
      `/usuarios/${encodeURIComponent(fixture.user.id)}`,
      200,
      undefined,
      null,
      'users.delete',
    );
  });

  if (errors.length > 0) {
    throw new Error(`Test fixture cleanup failed: ${errors.join('; ')}`);
  }
}

export function createFixture(type) {
  if (!['login', 'users', 'products', 'carts'].includes(type)) {
    throw new Error(`Unknown test fixture type: ${type}`);
  }

  const fixture = { type, user: null, productId: null, cartId: null };

  try {
    fixture.user = createUserFixture(type !== 'users');

    if (type === 'products' || type === 'carts') {
      const authorization = loginFixtureUser(fixture.user);
      fixture.productId = createProductFixture(authorization);

      if (type === 'carts') {
        fixture.cartId = createCartFixture(fixture.productId, authorization);
      }
    }

    return fixture;
  } catch (error) {
    try {
      teardownFixture(fixture);
    } catch (cleanupError) {
      throw new Error(`${error.message}; setup cleanup also failed: ${cleanupError.message}`);
    }

    throw error;
  }
}

export const SMOKE_OPTIONS = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
  },
};

export const LOAD_OPTIONS = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const STRESS_OPTIONS = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '15s', target: 10 },
    { duration: '20s', target: 20 },
    { duration: '30s', target: 30 },
    { duration: '30s', target: 40 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};

export const SPIKE_OPTIONS = {
  stages: [
    { duration: '10s', target: 1 },
    { duration: '1s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '1s', target: 1 },
    { duration: '10s', target: 1 },
    { duration: '1s', target: 0 },
  ],
  thresholds: {
    checks: ['rate==1'],
    http_req_failed: ['rate<0.05'],
  },
};
