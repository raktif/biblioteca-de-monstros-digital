# ADR-BASE-015: schemas normativos e validação de domínio

- Estado: aceito
- Data: 2026-11-24

## Contexto

O aplicativo precisa guardar dois formatos de ficha fixos, sem reinterpretar as expressões de AD&D nem permitir que dados Shadowlords incompatíveis sejam persistidos. A especificação define JSON Schema Draft 2020-12 como fonte única de verdade e exige tipos TypeScript derivados.

## Decisões

- Manter schemas independentes e versionados para `add2e.monster` e `shadowlords3e.monster` em `schemas/<sistema>/v1/`.
- Rejeitar propriedades desconhecidas e preservar expressões de AD&D como texto.
- Gerar os tipos TypeScript em `src/generated/` por `json-schema-to-typescript`; o CI falha se os arquivos gerados diferirem dos schemas.
- Validar os documentos no frontend usando Ajv 2020 e no núcleo Rust usando o mesmo schema Draft 2020-12 embutido no aplicativo. Manter as regras que envolvem vários campos em validação de domínio explícita nos dois lados.
- Validar no domínio exatamente um perfil principal, ao menos um ataque no perfil principal Shadowlords, soma da Defesa Final, conjunto das cinco idades dracônicas e alinhamento do número de colunas e células de tabelas AD&D.
- Usar fixtures fictícias e reduzidas, sem reproduzir conteúdo integral de livros publicados.
- Calcular o hash canônico do conteúdo no núcleo Rust após normalização Unicode NFC, excluindo caminho local da imagem, versão da linha e instante de atualização.

## Consequências

O formato persistido pode ser validado e tipado antes da implementação dos formulários e da persistência. Regras entre campos não expressáveis com clareza em JSON Schema permanecem cobertas por funções de domínio e testes unitários. Mudanças incompatíveis exigem nova versão de schema ou migração explícita.
