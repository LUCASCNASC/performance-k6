import http from 'k6/http';
import {
  BASE_URL,
  checkJsonResponse,
  createFixture,
  SCALABILITY_OPTIONS,
  teardownFixture,
} from '../common.js';

export const options = SCALABILITY_OPTIONS;

export function setup() {
  return createFixture('carts');
}

export function teardown(fixture) {
  teardownFixture(fixture);
}

export default function (fixture) {
  const cartsResponse = http.get(`${BASE_URL}/carrinhos`, {
    tags: { name: 'scalability.carts.list' },
  });
  checkJsonResponse(
    cartsResponse,
    'Listagem de carrinhos',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.carrinhos),
  );

  const cartResponse = http.get(
    `${BASE_URL}/carrinhos/${encodeURIComponent(fixture.cartId)}`,
    { tags: { name: 'scalability.carts.get' } },
  );
  checkJsonResponse(
    cartResponse,
    'Consulta de carrinho por ID',
    (body) => typeof body._id === 'string' && Array.isArray(body.produtos),
  );
}
