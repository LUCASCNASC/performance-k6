import { check } from 'k6';

export const BASE_URL = (__ENV.BASE_URL || 'https://serverest.dev').replace(/\/+$/, '');
export const USER_ID = __ENV.USER_ID || '0uxuPY0cbmQhpEz1';
export const PRODUCT_ID = __ENV.PRODUCT_ID || 'BeeJh5lz3k6kSIzA';
export const CART_ID = __ENV.CART_ID || 'qbMqntef4iTOwWfg';

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
