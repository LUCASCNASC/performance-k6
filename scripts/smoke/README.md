# Smoke tests do ServeRest

Os quatro scripts cobrem os métodos documentados em `serverest.json`: login; listagem, criação, consulta, atualização e exclusão de usuários e produtos; e listagem, criação, consulta, cancelamento e conclusão de carrinhos. Cada execução roda uma vez, com um VU. Configurações e verificações compartilhadas estão em [`scripts/common.js`](../common.js).

Os testes que alteram dados criam registros temporários com valores únicos, validam o estado após atualizações/exclusões e tentam limpar os registros ao final. `login.js` usa as credenciais de exemplo do contrato por padrão; defina credenciais válidas para o ambiente configurado se necessário.

As verificações de exclusão consultam o recurso novamente e esperam `400` com a mensagem de não encontrado. Por isso, o indicador `http_req_failed` do k6 pode incluir essas respostas esperadas; o resultado do smoke é determinado pelos checks, que precisam ficar em 100%.

## Executar

Na raiz do repositório, rode cada script com k6:

```powershell
k6 run .\scripts\smoke\login.js
k6 run .\scripts\smoke\users.js
k6 run .\scripts\smoke\products.js
k6 run .\scripts\smoke\carts.js
```

Por padrão, as chamadas usam `https://serverest.dev`. Configure a URL e, se necessário, as credenciais de login:

| Variável | Padrão | Usada por |
| --- | --- | --- |
| `BASE_URL` | `https://serverest.dev` | Todos |
| `USER_EMAIL` | `fulano@qa.com` | `login.js` |
| `USER_PASSWORD` | `teste` | `login.js` |

Exemplo no PowerShell:

```powershell
$env:BASE_URL = "https://serverest.dev"
$env:USER_EMAIL = "fulano@qa.com"
$env:USER_PASSWORD = "teste"
```

`users.js`, `products.js` e `carts.js` criam seus próprios dados de teste; não é necessário configurar IDs existentes. Os usuários e produtos temporários são removidos durante a execução.

## GitHub Actions

O workflow [API checks](../../.github/workflows/api-checks.yml) é executado em `push`, `pull_request` e sob demanda. Ele valida o contrato OpenAPI e a sintaxe/carregamento dos scripts k6, executa cada smoke test em seu próprio job e verifica a disponibilidade da API com `GET /produtos`.

O ServeRest não documenta um endpoint dedicado de health check; por isso, o job `health` usa `GET /produtos` e valida o status HTTP e o formato básico da resposta. O job `tests` valida cada combinação de método e rota do contrato e carrega os scripts de smoke e carga com `k6 inspect`.

Para apontar o workflow a outro ambiente, configure as variáveis de repositório `SERVEREST_BASE_URL`, `SERVEREST_USER_ID`, `SERVEREST_PRODUCT_ID` e `SERVEREST_CART_ID`. As credenciais podem ser configuradas como secrets `SERVEREST_USER_EMAIL` e `SERVEREST_USER_PASSWORD`; na ausência delas, são usados os exemplos públicos do contrato ServeRest.

Os cenários de carga e seu perfil padrão estão documentados em [`scripts/load/README.md`](../load/README.md).
