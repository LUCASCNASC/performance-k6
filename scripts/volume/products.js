import http from 'k6/http';
import {
  BASE_URL,
  checkJsonResponse,
  createVolumeFixture,
  teardownVolumeFixture,
  VOLUME_OPTIONS,
  VOLUME_RECORD_COUNT,
} from '../common.js';

export const options = VOLUME_OPTIONS;

export function setup() {
  return createVolumeFixture('products', VOLUME_RECORD_COUNT);
}

export function teardown(fixture) {
  teardownVolumeFixture(fixture);
}

export default function (fixture) {
  const response = http.get(`${BASE_URL}/produtos`, {
    tags: { name: 'volume.products.list' },
  });

  checkJsonResponse(
    response,
    'Listagem de produtos com volume',
    (body) =>
      Number.isInteger(body.quantidade) &&
      Array.isArray(body.produtos) &&
      body.quantidade >= fixture.products.length &&
      fixture.products.every((id) => body.produtos.some((product) => product._id === id)),
  );
}
