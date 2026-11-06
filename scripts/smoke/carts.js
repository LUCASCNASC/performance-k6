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
    nome: `k6 smoke cart user ${suffix}`,
    email: `k6.smoke.cart.${suffix}@example.com`,
    password: `Smoke-${suffix}`,
    administrador: 'true',
  };
  const product = {
    nome: `k6 smoke cart product ${suffix}`,
    preco: 10,
    descricao: 'Temporary product created by the k6 smoke test',
    quantidade: 10,
  };
  let userId;
  let productId;
  let cartId;
  let token;

  // Break skips the remaining requests but still reaches cleanup below.
  do {
    const cartsResponse = http.get(`${BASE_URL}/carrinhos`, {
      tags: { name: 'smoke.carts.list' },
    });
    if (
      !checkJsonResponse(
        cartsResponse,
        'Listagem de carrinhos',
        (body) => Number.isInteger(body.quantidade) && Array.isArray(body.carrinhos),
      )
    ) {
      break;
    }

    const createUserResponse = http.post(`${BASE_URL}/usuarios`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'smoke.carts.create-user' },
    });
    const createdUser = checkJsonStatusResponse(
      createUserResponse,
      'Cadastro de usuário de carrinho',
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
        tags: { name: 'smoke.carts.login' },
      },
    );
    const login = checkJsonStatusResponse(
      loginResponse,
      'Login do usuário de carrinho',
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
      tags: { name: 'smoke.carts.create-product' },
    });
    const createdProduct = checkJsonStatusResponse(
      createProductResponse,
      'Cadastro do produto de carrinho',
      201,
      (body) =>
        body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
    );
    if (!createdProduct) break;
    productId = createdProduct._id;

    const items = [{ idProduto: productId, quantidade: 1 }];
    const createCartResponse = http.post(
      `${BASE_URL}/carrinhos`,
      JSON.stringify({ produtos: items }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        tags: { name: 'smoke.carts.create' },
      },
    );
    const createdCart = checkJsonStatusResponse(
      createCartResponse,
      'Cadastro de carrinho',
      201,
      (body) =>
        body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
    );
    if (!createdCart) break;
    cartId = createdCart._id;

    const cartResponse = http.get(`${BASE_URL}/carrinhos/${encodeURIComponent(cartId)}`, {
      tags: { name: 'smoke.carts.get' },
    });
    if (
      !checkJsonResponse(
        cartResponse,
        'Consulta de carrinho por ID',
        (body) =>
          body._id === cartId &&
          body.idUsuario === userId &&
          Array.isArray(body.produtos) &&
          body.produtos.length === 1,
      )
    ) {
      break;
    }

    const reservedStockResponse = http.get(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      { tags: { name: 'smoke.carts.verify-reserved-stock' } },
    );
    if (
      !checkJsonResponse(
        reservedStockResponse,
        'Verificação do estoque reservado',
        (body) => body._id === productId && body.quantidade === product.quantidade - 1,
      )
    ) {
      break;
    }

    const listResponse = http.get(`${BASE_URL}/carrinhos?idUsuario=${encodeURIComponent(userId)}`, {
      tags: { name: 'smoke.carts.list-created' },
    });
    if (
      !checkJsonResponse(
        listResponse,
        'Consulta do carrinho na listagem',
        (body) =>
          body.quantidade === 1 &&
          Array.isArray(body.carrinhos) &&
          body.carrinhos.some((cart) => cart._id === cartId),
      )
    ) break;

    const cancelResponse = http.del(`${BASE_URL}/carrinhos/cancelar-compra`, null, {
      headers: { Authorization: token },
      tags: { name: 'smoke.carts.cancel' },
    });
    const canceled = checkJsonStatusResponse(
      cancelResponse,
      'Cancelamento de compra',
      200,
      (body) =>
        body.message ===
        'Registro excluído com sucesso. Estoque dos produtos reabastecido',
    );
    if (!canceled) break;

    const canceledCartResponse = http.get(
      `${BASE_URL}/carrinhos/${encodeURIComponent(cartId)}`,
      { tags: { name: 'smoke.carts.verify-cancel' } },
    );
    if (
      !checkJsonStatusResponse(
        canceledCartResponse,
        'Verificação do cancelamento',
        400,
        (body) => body.message === 'Carrinho não encontrado',
      )
    ) {
      break;
    }

    const restoredStockResponse = http.get(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      { tags: { name: 'smoke.carts.verify-restored-stock' } },
    );
    if (
      !checkJsonResponse(
        restoredStockResponse,
        'Verificação da reposição de estoque',
        (body) => body._id === productId && body.quantidade === product.quantidade,
      )
    ) {
      break;
    }
    cartId = null;

    const secondCartResponse = http.post(
      `${BASE_URL}/carrinhos`,
      JSON.stringify({ produtos: items }),
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        tags: { name: 'smoke.carts.create-for-checkout' },
      },
    );
    const secondCart = checkJsonStatusResponse(
      secondCartResponse,
      'Cadastro de carrinho para conclusão',
      201,
      (body) =>
        body.message === 'Cadastro realizado com sucesso' && typeof body._id === 'string',
    );
    if (!secondCart) break;
    cartId = secondCart._id;

    const checkoutResponse = http.del(`${BASE_URL}/carrinhos/concluir-compra`, null, {
      headers: { Authorization: token },
      tags: { name: 'smoke.carts.checkout' },
    });
    const completed = checkJsonStatusResponse(
      checkoutResponse,
      'Conclusão de compra',
      200,
      (body) => body.message === 'Registro excluído com sucesso',
    );
    if (!completed) break;

    const completedCartResponse = http.get(
      `${BASE_URL}/carrinhos/${encodeURIComponent(cartId)}`,
      { tags: { name: 'smoke.carts.verify-checkout' } },
    );
    if (
      !checkJsonStatusResponse(
        completedCartResponse,
        'Verificação da conclusão',
        400,
        (body) => body.message === 'Carrinho não encontrado',
      )
    ) {
      break;
    }

    const soldStockResponse = http.get(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      { tags: { name: 'smoke.carts.verify-sold-stock' } },
    );
    if (
      !checkJsonResponse(
        soldStockResponse,
        'Verificação do estoque após conclusão',
        (body) => body._id === productId && body.quantidade === product.quantidade - 1,
      )
    ) {
      break;
    }
    cartId = null;
  } while (false);

  if (cartId && token) {
    const cleanupCartResponse = http.del(`${BASE_URL}/carrinhos/cancelar-compra`, null, {
      headers: { Authorization: token },
      tags: { name: 'smoke.carts.cleanup' },
    });
    checkJsonStatusResponse(
      cleanupCartResponse,
      'Limpeza do carrinho de smoke',
      200,
      (body) =>
        body.message ===
          'Registro excluído com sucesso. Estoque dos produtos reabastecido' ||
        body.message === 'Não foi encontrado carrinho para esse usuário',
    );
  }

  if (productId && token) {
    const cleanupProductResponse = http.del(
      `${BASE_URL}/produtos/${encodeURIComponent(productId)}`,
      null,
      {
        headers: { Authorization: token },
        tags: { name: 'smoke.carts.cleanup-product' },
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
      { tags: { name: 'smoke.carts.cleanup-user' } },
    );
    checkJsonStatusResponse(
      cleanupUserResponse,
      'Limpeza do usuário de smoke',
      200,
      (body) =>
        body.message === 'Registro excluído com sucesso' ||
        body.message === 'Nenhum registro excluído',
    );
  }
}
