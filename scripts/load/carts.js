import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, CART_ID, LOAD_OPTIONS, checkJsonResponse } from '../common.js';

export const options = LOAD_OPTIONS;

export default function () {
  const cartsResponse = http.get(`${BASE_URL}/carrinhos`, {
    tags: { name: 'load.carts.list' },
  });
  checkJsonResponse(
    cartsResponse,
    'Listagem de carrinhos',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.carrinhos),
  );

  const cartResponse = http.get(`${BASE_URL}/carrinhos/${encodeURIComponent(CART_ID)}`, {
    tags: { name: 'load.carts.get' },
  });
  checkJsonResponse(
    cartResponse,
    'Consulta de carrinho por ID',
    (body) => typeof body._id === 'string' && Array.isArray(body.produtos),
  );

  sleep(1);
}
