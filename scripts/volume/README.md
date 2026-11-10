# Volume tests do ServeRest

Os cenários medem a leitura de coleções com um volume controlado de dados temporários. Cada script prepara 25 registros para uma coleção (usuários, produtos ou carrinhos), consulta a coleção cinco vezes com apenas 1 VU e verifica se todos os registros criados aparecem na resposta. O cenário de carrinhos também cria os 25 usuários necessários, um produto e um administrador temporários; o cenário de produtos cria um administrador.

O perfil é uma demonstração de baixo impacto, não uma avaliação de capacidade máxima. Login não possui uma coleção para consultar e, por isso, não tem cenário de volume. Os dados são criados durante o setup e removidos no teardown; usuários e produtos são independentes de registros existentes, que podem ser apagados diariamente.

## Executar

Na raiz do repositório:

```powershell
k6 run .\scripts\volume\users.js
k6 run .\scripts\volume\products.js
k6 run .\scripts\volume\carts.js
```

`BASE_URL` seleciona o ambiente; o padrão é `https://serverest.dev`. Cada execução cria registros temporários e pode alterar o estoque enquanto prepara carrinhos. O setup está limitado a 25 registros de coleção por execução. Execute somente em um ambiente autorizado e confira a saída do k6 para garantir que o teardown concluiu sem erros.

Os cenários não são executados automaticamente no GitHub Actions. Não aumente o volume ou a concorrência sem um ambiente controlado e autorização para gerar a carga.
