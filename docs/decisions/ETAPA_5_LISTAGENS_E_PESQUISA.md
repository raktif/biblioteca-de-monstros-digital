# Etapa 5 — Listagens e pesquisa

Implementação inicial em 25 de novembro de 2026.

## Entregue

- Busca parcial por nome, ignorando acentos, caixa e espaços repetidos, aplicada após debounce de 250 ms.
- Filtros combináveis de terreno e período de atividade. Valores da mesma categoria usam OU; terreno, atividade e busca são combinados com E.
- Ordenação alfabética crescente ou decrescente em pt-BR; empates usam data de criação e UUID.
- Alternância entre lista e grade, com miniaturas limitadas visualmente a 128 × 128 px.
- Paginação de 100 itens por página e estado vazio distinto para biblioteca vazia e filtros sem resultado.
- Preferências de lista/grade e ordenação gravadas por biblioteca no armazenamento local do WebView.
- Resumos de ambas as fichas expõem códigos estáveis de terreno e atividade; a interface resolve os códigos para os rótulos localizados.

## Validação disponível

- Teste de busca, filtros e ordenação com 5.000 resumos; valida o primeiro lote de até 100 itens em menos de 300 ms no processo de teste.
- `pnpm check`, `pnpm test` (21 testes), `pnpm lint`, `pnpm build` e `git diff --check` passaram.
- A validação da integração nativa SQLite/Rust não foi executada: Cargo não está instalado neste ambiente. Portanto, o gate completo de desempenho desktop com 5.000 fichas ainda depende dessa validação.

