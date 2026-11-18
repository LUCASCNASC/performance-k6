# Load tests do ServeRest

Os cenários de carga exercitam login, listagem e consulta de usuários, produtos e carrinhos. Como o ambiente pode ser limpo todas as noites, cada execução cria seus próprios dados temporários no `setup` do k6 e os remove no `teardown`. A cobertura de criação, atualização, exclusão e fluxo de compra está nos smoke tests; não é executada sob carga. Configuração, fixtures, verificações e perfis ficam em módulos separados sob [`scripts/lib/`](../lib/), reexportados por [`scripts/common.js`](../common.js).

## Perfil padrão

O perfil padrão em `LOAD_OPTIONS` dura 1 minuto: sobe de 0 a 1 VU nos primeiros 10 segundos, chega a 5 VUs nos 10 segundos seguintes, mantém 5 VUs por 30 segundos e reduz a carga a zero nos últimos 10 segundos. Cada VU aguarda 1 segundo ao fim de cada iteração para manter uma carga controlada em vez de disparar requisições sem pausa.

O cenário falha se algum check de contrato/status falhar ou se a taxa de requisições HTTP com erro atingir 5%. Não há threshold de latência definido, pois o contrato não estabelece um SLA.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\load\login.js
k6 run .\scripts\load\users.js
k6 run .\scripts\load\products.js
k6 run .\scripts\load\carts.js
```

Defina `BASE_URL` explicitamente para impedir que uma execução acidental atinja o endpoint público padrão:

```powershell
$env:BASE_URL = "http://localhost:3000"
k6 run .\scripts\load\products.js
```

Para sobrescrever o perfil de carga em uma execução, passe opções do k6 na linha de comando, por exemplo:

```powershell
k6 run --vus 3 --duration 30s .\scripts\load\products.js
```

Execute carga somente contra ambientes que você tem autorização para testar, pois cada execução cria e remove temporariamente dados e pode gerar carga significativa. Os testes de carga não são executados automaticamente no GitHub Actions.
