import { check } from 'k6';

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
