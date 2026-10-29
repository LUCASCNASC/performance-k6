import http from 'k6/http';
import {
  BASE_URL,
  checkJsonResponse,
  checkJsonStatusResponse,
  SMOKE_OPTIONS,
  uniqueSuffix,
} from '../common.js';

export const options = SMOKE_OPTIONS;

export default function () {
  const suffix = uniqueSuffix();
  const user = {
    nome: `k6 smoke admin ${suffix}`,
    email: `k6.smoke.admin.${suffix}@example.com`,
    password: `Smoke-${suffix}`,
    administrador: 'true',
  };
  const product = {
    nome: `k6 smoke product ${suffix}`,
    preco: 10,
    descricao: 'Temporary product created by the k6 smoke test',
    quantidade: 10,
  };
  let userId;
  let productId;
  let token;

  // Break skips the remaining requests but still reaches cleanup below.
  do {
    const productsResponse = http.get(`${BASE_URL}/produtos`, {
      tags: { name: 'smoke.products.list' },
    });
    if (
      !checkJsonResponse(
        productsResponse,
        'Listagem de produtos',
        (body) => Number.isInteger(body.quantidade) && Array.isArray(body.produtos),
      )
    ) {
      break;
    }

    const createUserResponse = http.post(`${BASE_URL}/usuarios`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'smoke.products.create-admin' },
    });
    const createdUser = checkJsonStatusResponse(
      createUserResponse,
      'Cadastro de administrador temporário',
      201,
      (body) =>
        body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
    );
    if (!createdUser) break;
    userId = createdUser._id;

    const loginResponse = http.post(
      `${BASE_URL}/login`,
      JSON.stringify({ email: user.email, password: user.password }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'smoke.products.login-admin' },
      },
    );
    const login = checkJsonStatusResponse(
      loginResponse,
      'Login do administrador temporário',
      200,
      (body) =>
        body.message === 'Login realizado com sucesso' &&
        typeof body.authorization === 'string' &&
        body.authorization.length > 0,
    );
    if (!login) break;
    token = login.authorization;

    const createProductResponse = http.post(`${BASE_URL}/produtos`, JSON.stringify(product), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      tags: { name: 'smoke.products.create' },
    });
    const createdProduct = checkJsonStatusResponse(
      createProductResponse,
      'Cadastro de produto',
      201,
      (body) =>
        body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
    );
    if (!createdProduct) break;
    productId = createdProduct._id;

    const productResponse = http.get(`${BASE_URL}/produtos/${encodeURIComponent(productId)}`, {
      tags: { name: 'smoke.products.get' },
    });
    if (
      !checkJsonResponse(
        productResponse,
        'Consulta de produto por ID',
        (body) => body._id === productId && body.nome === product.nome,
      )
    ) {
      break;
    }

    const updatedProduct = Object.assign({}, product, { preco: product.preco + 1 });
    const updateResponse = http.put(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      JSON.stringify(updatedProduct),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        tags: { name: 'smoke.products.update' },
      },
    );
    if (
      !checkJsonStatusResponse(
        updateResponse,
        'Atualização de produto',
        200,
        (body) => body.message === 'Registro alterado com sucesso',
      )
    ) break;

    const updatedResponse = http.get(`${BASE_URL}/produtos/${encodeURIComponent(productId)}`, {
      tags: { name: 'smoke.products.verify-update' },
    });
    if (
      !checkJsonResponse(
        updatedResponse,
        'Verificação da atualização de produto',
        (body) => body._id === productId && body.preco === updatedProduct.preco,
      )
    ) {
      break;
    }

    const deleteResponse = http.del(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      null,
      {
        headers: { Authorization: token },
        tags: { name: 'smoke.products.delete' },
      },
    );
    const deletedProduct = checkJsonStatusResponse(
      deleteResponse,
      'Exclusão de produto',
      200,
      (body) => body.message === 'Registro excluído com sucesso',
    );
    if (!deletedProduct) break;

    const deletedResponse = http.get(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      { tags: { name: 'smoke.products.verify-delete' } },
    );
    if (
      !checkJsonStatusResponse(
        deletedResponse,
        'Verificação da exclusão de produto',
        400,
        (body) => body.message === 'Produto não encontrado',
      )
    ) {
      break;
    }
    productId = null;
  } while (false);

  if (productId && token) {
    const cleanupProductResponse = http.del(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      null,
      {
        headers: { Authorization: token },
        tags: { name: 'smoke.products.cleanup' },
      },
    );
    checkJsonStatusResponse(
      cleanupProductResponse,
      'Limpeza do produto de smoke',
      200,
      (body) =>
        body.message === 'Registro excluído com sucesso' ||
        body.message === 'Nenhum registro excluído',
    );
  }

  if (userId) {
    const cleanupUserResponse = http.del(
      `${BASE_URL}/usuarios/${encodeURIComponent(userId)}`,
      null,
      { tags: { name: 'smoke.products.cleanup-admin' } },
    );
    checkJsonStatusResponse(
      cleanupUserResponse,
      'Limpeza do administrador temporário',
      200,
      (body) =>
        body.message === 'Registro excluído com sucesso' ||
        body.message === 'Nenhum registro excluído',
    );
  }
}
