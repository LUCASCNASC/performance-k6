import http from 'k6/http';
import { BASE_URL, LOAD_OPTIONS, PRODUCT_ID, checkJsonResponse } from '../common.js';

export const options = LOAD_OPTIONS;

export default function () {
  const productsResponse = http.get(`${BASE_URL}/produtos`, {
    tags: { name: 'load.products.list' },
  });
  checkJsonResponse(
    productsResponse,
    'Listagem de produtos',
    (body) => Number.isInteger(body.quantidade) && Array.isArray(body.produtos),
  );

  const productResponse = http.get(`${BASE_URL}/produtos/${encodeURIComponent(PRODUCT_ID)}`, {
    tags: { name: 'load.products.get' },
  });
  checkJsonResponse(
    productResponse,
    'Consulta de produto por ID',
    (body) => typeof body._id === 'string' && typeof body.nome === 'string',
  );
}
