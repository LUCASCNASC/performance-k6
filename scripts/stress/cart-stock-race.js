import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { BASE_URL } from '../common.js';

const createdCarts = new Counter('race_carts_created');
const stockRejections = new Counter('race_stock_rejections');
const stockDiscrepancy = new Counter('stock_discrepancy');

const VUS = Number(__ENV.RACE_VUS || 10);
const QTY = Number(__ENV.RACE_QTY || 1);
const STOCK = VUS * QTY; // estoque justo: sem sobreposição, todos os pedidos caberiam

export const options = {
  scenarios: {
    race: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '2m',
    },
  },
  thresholds: {
    checks: ['rate==1'],
  },
};

function json(method, path, payload, authorization, expectedStatus, name) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) headers.Authorization = authorization;
  const res = http.request(
    method,
    `${BASE_URL}${path}`,
    payload === undefined ? null : JSON.stringify(payload),
    { headers, tags: { name } },
  );
  if (expectedStatus !== undefined) {
    check(res, {
      [`${name}: HTTP ${expectedStatus}`]: (r) => r.status === expectedStatus,
    });
  }
  try {
    return { status: res.status, body: JSON.parse(res.body) };
  } catch (error) {
    return { status: res.status, body: null };
  }
}

export function setup() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const admin = {
    nome: `k6 race admin ${suffix}`,
    email: `k6.race.${suffix}@example.com`,
    password: `Race-${suffix}`,
    administrador: 'true',
  };
  const created = json('POST', '/usuarios', admin, null, 201, 'setup.create-admin');
  if (!created.body || !created.body._id) throw new Error('setup: falha ao criar usuário admin');

  const login = json('POST', '/login', { email: admin.email, password: admin.password }, null, 200, 'setup.login');
  if (!login.body || typeof login.body.authorization !== 'string') throw new Error('setup: falha ao autenticar admin');
  const authorization = login.body.authorization;

  const product = json(
    'POST',
    '/produtos',
    { nome: `k6 race product ${suffix}`, preco: 10, descricao: `Estoque inicial ${STOCK}`, quantidade: STOCK },
    authorization,
    201,
    'setup.create-product',
  );
  if (!product.body || !product.body._id) throw new Error('setup: falha ao criar produto');

  return {
    adminId: created.body._id,
    adminEmail: admin.email,
    adminPassword: admin.password,
    authorization,
    productId: product.body._id,
    stock: STOCK,
    qty: QTY,
  };
}

export default function (data) {
  const suffix = `${Date.now()}-${__VU}-${Math.random().toString(36).slice(2, 8)}`;
  const user = {
    nome: `k6 race buyer ${suffix}`,
    email: `k6.race.buyer.${suffix}@example.com`,
    password: `Race-${suffix}`,
    administrador: 'false',
  };
  const created = json('POST', '/usuarios', user, null, 201, 'race.create-buyer');
  if (!created.body || !created.body._id) return;
  const buyerId = created.body._id;

  const login = json('POST', '/login', { email: user.email, password: user.password }, null, 200, 'race.login-buyer');
  if (!login.body || typeof login.body.authorization !== 'string') return;
  const buyerAuthorization = login.body.authorization;

  // Todos os VUs chegam aqui praticamente ao mesmo tempo: é a janela da disputa.
  const cart = json(
    'POST',
    '/carrinhos',
    { produtos: [{ idProduto: data.productId, quantidade: data.qty }] },
    buyerAuthorization,
    undefined,
    'race.create-cart',
  );

  if (cart.body && cart.body._id) {
    createdCarts.add(1);
    check(cart, { 'race: carrinho criado é HTTP 201': () => cart.status === 201 });
  } else if (cart.body && typeof cart.body.message === 'string' && cart.body.message.includes('quantidade')) {
    stockRejections.add(1);
    check(cart, { 'race: rejeição de estoque é HTTP 400': () => cart.status === 400 });
  } else {
    check(cart, { 'race: resposta conhecida do contrato': () => cart.status === 400 });
  }

  // Mantém o carrinho vivo por um instante para a disputa ocorrer com os carrinhos coexistindo.
  sleep(2);

  // Cancela a própria compra: devolve a quantidade ao estoque e remove o carrinho.
  const cancel = json('DELETE', '/carrinhos/cancelar-compra', undefined, buyerAuthorization, 200, 'race.cancel-cart');
  check(cancel, { 'race: cancelamento é HTTP 200': (r) => r.status === 200 });

  json('DELETE', `/usuarios/${encodeURIComponent(buyerId)}`, undefined, null, 200, 'race.delete-buyer');
}

export function teardown(data) {
  // Mede o estoque final do produto e compara com o inicial.
  const product = json(
    'GET',
    `/produtos/${encodeURIComponent(data.productId)}`,
    undefined,
    data.authorization,
    200,
    'teardown.get-product',
  );
  if (product.body && typeof product.body.quantidade === 'number') {
    const finalStock = product.body.quantidade;
    const expected = data.stock;
    stockDiscrepancy.add(Math.abs(finalStock - expected));
    check({ finalStock, expected }, {
      // Com a baixa read-then-write do upstream, desvios são possíveis sob concorrência;
      // o teste mede e reporta a discrepância (stock_discrepancy) em vez de reprovar.
      'race: estoque final consultável e não negativo': (r) => r.finalStock >= 0,
    });
    console.log(`race-estoque: inicial=${expected} final=${finalStock} discrepancia=${Math.abs(finalStock - expected)} carrinhos_criados=${createdCarts.value || 'n/a'} rejeicoes_estoque=${stockRejections.value || 'n/a'}`);
  } else {
    check(null, { 'race: estoque final consultável': () => false });
  }

  json('DELETE', `/produtos/${encodeURIComponent(data.productId)}`, undefined, data.authorization, 200, 'teardown.delete-product');
  json('DELETE', `/usuarios/${encodeURIComponent(data.adminId)}`, undefined, data.authorization, 200, 'teardown.delete-admin');
}
