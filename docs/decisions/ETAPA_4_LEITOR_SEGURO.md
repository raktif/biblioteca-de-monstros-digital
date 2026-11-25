# Etapa 4 — Leitor seguro de pacotes

Data: 25 de novembro de 2026  
Status: concluída para validação de inventário e limites

## Entregas

- Limites centralizados em `src/portable/package-security.ts`.
- Validação de caminhos relativos, profundidade e equivalência sem distinção de caixa no Windows.
- Rejeição de entradas criptografadas, links simbólicos, duplicidades e arquivos não listados.
- Conferência de tamanhos, contagens, imagens declaradas e total descompactado.
- Limites distintos para pacote de biblioteca e pacote individual.
- Testes para inventário válido, Zip Slip, duplicidade e arquivo extra.

## Validação executada

- `tsc --noEmit`: passou.
- `portable:check`: passou.
- Vitest das etapas 3 e 4: 7 testes passaram.
- `git diff --check`: passou.

## Limite da etapa

O adaptador físico para abrir o arquivo ZIP e extrair por streaming ainda será conectado na etapa de integração de infraestrutura. Este módulo recebe somente o inventário já inspecionado, mantendo as regras de segurança testáveis sem acoplar o domínio a uma biblioteca ZIP.
