# Teste de concorrência de estoque

Disputa N VUs pela mesma reserva de um produto com estoque pequeno e conhecido, para
observar como o ServRest se comporta quando a baixa de estoque (read-then-write em
`produtos-service.js`) ocorre sob requisições simultâneas. Fundamenta o requisito R1 de
[`docs/avaliacao-upstream.md`](../../docs/avaliacao-upstream.md).

O que o script faz:

1. **Setup:** cria usuário admin, cria produto com `estoqueInicial = VUs * quantidade` e
   registra o estoque de partida;
2. **Teste:** todos os VUs tentam criar carrinho com `quantidade` do mesmo produto;
3. **Teardown:** cancela a compra do usuário (devolve estoque), deleta produto e usuário.

Como cada usuário só pode ter 1 carrinho, parte das tentativas recebe 400
"Não é permitido ter mais de 1 carrinho" — isso é esperado. O que se observa é o **estoque
final** do produto: com baixa atômica ele deveria voltar exatamente ao valor inicial após
os cancelamentos; desvios indicam baixas/estornos inconsistentes sob concorrência.

A discrepância é medida pela métrica `stock_discrepancy` (contador) e reportada no console
(`race-estoque: ...`). Nas execuções contra `https://serverest.dev` já foram observados
desvios de estoque mesmo com todos os carrinhos criados e cancelados — o esperado dado que
a baixa é read-then-write sem controle de concorrência.

## Executar

```powershell
k6 run .\scripts\stress\cart-stock-race.js
```

Variáveis opcionais:

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `BASE_URL` | `https://serverest.dev` | URL da API |
| `RACE_VUS` | `10` | VUs disputando o mesmo produto |
| `RACE_QTY` | `1` | quantidade por carrinho |

Este teste **não roda no CI**: cria dados temporários e valida comportamento sensível a
concorrência; execute-o somente em ambiente autorizado.
