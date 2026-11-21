import http from 'k6/http';
import { BASE_URL, checkJsonResponse, createFixture, SPIKE_OPTIONS, teardownFixture } from '../common.js';

export const options = SPIKE_OPTIONS;

export function setup() {
  return createFixture('products');
}

export function teardown(fixture) {
  teardownFixture(fixture);
}

export default function (fixture) {
  const productsResponse = http.get(`${BASE_URL}/produtos`, {
    tags: { name: 'spike.products.list' },
  });
  checkJsonResponse(
    productsResponse,
    'Listagem de produtos',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.produtos),
  );

  const productResponse = http.get(`${BASE_URL}/produtos/${encodeURIComponent(fixture.productId)}`, {
    tags: { name: 'spike.products.get' },
  });
  checkJsonResponse(
    productResponse,
    'Consulta de produto por ID',
    (body) => typeof body._id === 'string' && typeof body.nome === 'string',
  );
}
