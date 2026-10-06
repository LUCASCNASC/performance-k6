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

  check(response, {
    [`${name}: HTTP 200`]: (res) => res.status === 200,
    [`${name}: contrato da resposta`]: () => body !== null && typeof body === 'object' && expectedShape(body),
  });

  return body;
}

export const options = {
  vus: 1,
  iterations: 1,
};
