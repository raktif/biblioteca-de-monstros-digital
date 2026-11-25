# Etapa 5 — Importadores portáteis

Data: 25 de novembro de 2026  
Status: concluída para mapeamento, identidade e resolução de nomes

## Entregas

- Resolução determinística de nomes em `src/portable/name-collision.ts`.
- Fábrica de identidade e contexto de importação em `src/portable/import-mappers.ts`.
- Mapper portátil→rascunho interno AD&D.
- Mapper portátil→rascunho interno Shadowlords.
- Geração de IDs para monstro, perfis, fontes, tabelas, ataques, RD, habilidades, traços e magias.
- Restauração do alias interno `desert → deserts`.
- Atribuição de `sortOrder` pelo índice do array portátil.
- Estado, biblioteca, datas locais e `rowVersion` inicializados no rascunho.
- Testes de colisões, truncamento, identidade e entidades filhas.

## Regras verificadas

- Colisão compara Unicode sem diacríticos, caixa e espaços excedentes.
- Sufixos são `- Importado`, `- Importado (2)` e assim por diante.
- Nomes são truncados por grafemas antes do sufixo.
- O mesmo lote reserva nomes já produzidos.
- O mapper não tenta reconciliar por UUID, hash, nome ou conteúdo.
- O mapper não converte AD&D em Shadowlords.

## Validação executada

- `tsc --noEmit`: passou.
- Testes unitários dos importadores: 3 testes passaram.
- `git diff --check`: passou.

## Limite da etapa

Os rascunhos ainda não são gravados no SQLite. A transação, a criação de registros derivados, o cálculo de `contentHash`, a normalização física das imagens e o journal de recuperação pertencem à integração de importação.
