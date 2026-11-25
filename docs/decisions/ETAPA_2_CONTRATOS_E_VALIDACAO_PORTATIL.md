# Etapa 2 — DTOs, schemas e validação portátil

Data: 25 de novembro de 2026  
Status: concluída

## Entregas

- Schemas de fronteira versionados em `schemas/portable/v1/`:
  - `common.schema.json`;
  - `manifest.schema.json`;
  - `library.schema.json`;
  - `add2e-monster.schema.json`;
  - `shadowlords3e-monster.schema.json`.
- Tipos TypeScript separados do domínio persistido em `src/portable/types.ts`.
- Validador AJV 2020-12 em `src/portable/validation.ts`.
- Modelos Rust de manifesto, biblioteca, imagem e envelope de monstro em `src-tauri/src/portable.rs`.
- Testes unitários dos envelopes AD&D e Shadowlords em `tests/unit/portable-validation.test.ts`.

## Regras implementadas

- Envelopes portáteis não aceitam identidade persistida (`id`, `libraryId`, `schemaKey` interno no conteúdo, datas, hashes internos, `rowVersion` ou `sortOrder`).
- O estado portátil aceita somente `active` e `archived`.
- Schemas têm `additionalProperties: false` nos envelopes, biblioteca, perfis e entidades repetíveis principais.
- Limites numéricos e textuais seguem o domínio interno auditado, não os limites divergentes do pacote recebido.
- O manifesto possui inventário, papéis, tamanhos e SHA-256.
- A validação semântica inicial exige exatamente um perfil principal e confere a soma da Defesa Final Shadowlords.
- O validador permanece separado do validador dos documentos persistidos.

## Validação executada

- TypeScript: `tsc --noEmit` passou.
- AJV: os cinco schemas compilam individualmente com Draft 2020-12 e referências comuns resolvidas.
- Vitest: `tests/unit/portable-validation.test.ts` passou (2 testes).
- `git diff --check` passou.

## Limites desta etapa

Ainda não foram implementados mappers, leitura/escrita ZIP, imagens portáteis, transações de importação, histórico, comandos Tauri ou interface. Esses itens pertencem às etapas seguintes.
