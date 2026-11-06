# Spike tests do ServeRest

Os cenários simulam um aumento súbito de carga na autenticação ou nas consultas de usuários, produtos e carrinhos. Como os dados do ambiente são apagados todas as noites, cada execução cria fixtures próprias antes do teste e as remove ao final. Configuração e ciclo de vida compartilhados ficam em [`scripts/common.js`](../common.js).

## Perfil padrão

O perfil dura 53 segundos: mantém 1 VU por 10 segundos, sobe para 20 VUs em 1 segundo, mantém o pico por 30 segundos, reduz para 1 VU em 1 segundo e encerra após 11 segundos de recuperação. A execução falha se algum check de status/contrato falhar ou se a taxa de requisições HTTP com erro atingir 5%.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\spike\login.js
k6 run .\scripts\spike\users.js
k6 run .\scripts\spike\products.js
k6 run .\scripts\spike\carts.js
```

Os scripts usam a variável `BASE_URL` para selecionar o ambiente. Consulte [`scripts/smoke/README.md`](../smoke/README.md) para detalhes de configuração.

Spike tests criam e removem temporariamente dados e podem gerar carga elevada em pouco tempo. Execute-os somente em ambientes que você tem autorização para testar; eles não são executados automaticamente no GitHub Actions.
