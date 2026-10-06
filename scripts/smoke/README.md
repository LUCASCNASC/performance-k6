# Smoke tests do ServeRest

Os scripts cobrem as consultas de usuários, produtos e carrinhos e a autenticação documentadas em `serverest.json`. Cada execução roda uma vez, com um VU.

Os scripts são seguros para ambientes compartilhados: não criam, alteram ou excluem registros. `login.js` envia apenas uma solicitação de autenticação.

## Executar

Na raiz do repositório, rode cada script com k6:

```powershell
k6 run .\scripts\smoke\login.js
k6 run .\scripts\smoke\users.js
k6 run .\scripts\smoke\products.js
k6 run .\scripts\smoke\carts.js
```

Por padrão, as chamadas usam `https://serverest.dev`. Os dados de login e IDs abaixo vêm dos exemplos do contrato OpenAPI e podem ser substituídos por variáveis de ambiente:

| Variável | Padrão | Usada por |
| --- | --- | --- |
| `BASE_URL` | `https://serverest.dev` | Todos |
| `USER_EMAIL` | `fulano@qa.com` | `login.js` |
| `USER_PASSWORD` | `teste` | `login.js` |
| `USER_ID` | `0uxuPY0cbmQhpEz1` | `users.js` |
| `PRODUCT_ID` | `BeeJh5lz3k6kSIzA` | `products.js` |
| `CART_ID` | `qbMqntef4iTOwWfg` | `carts.js` |

Exemplo no PowerShell:

```powershell
$env:BASE_URL = "https://serverest.dev"
$env:USER_EMAIL = "fulano@qa.com"
$env:USER_PASSWORD = "teste"
$env:USER_ID = "0uxuPY0cbmQhpEz1"
$env:PRODUCT_ID = "BeeJh5lz3k6kSIzA"
$env:CART_ID = "qbMqntef4iTOwWfg"
```

Use IDs existentes no ambiente configurado. Valores de credenciais podem ser fornecidos pelo ambiente para evitar mantê-los em arquivos do projeto.

## GitHub Actions

O workflow [API checks](../../.github/workflows/api-checks.yml) é executado em `push`, `pull_request` e sob demanda. Ele valida o contrato OpenAPI e a sintaxe/carregamento dos scripts k6, executa cada smoke test em seu próprio job e verifica a disponibilidade da API com `GET /produtos`.

O ServeRest não documenta um endpoint dedicado de health check; por isso, o job `health` usa `GET /produtos` e valida o status HTTP e o formato básico da resposta. O job `tests` valida o contrato e carrega os scripts com `k6 inspect`; este repositório ainda não contém uma suíte pytest ou testes unitários separados.

Para apontar o workflow a outro ambiente, configure as variáveis de repositório `SERVEREST_BASE_URL`, `SERVEREST_USER_ID`, `SERVEREST_PRODUCT_ID` e `SERVEREST_CART_ID`. As credenciais podem ser configuradas como secrets `SERVEREST_USER_EMAIL` e `SERVEREST_USER_PASSWORD`; na ausência delas, são usados os exemplos públicos do contrato ServeRest.
