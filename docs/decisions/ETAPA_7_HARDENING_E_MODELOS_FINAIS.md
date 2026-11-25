# Etapa 7 — Hardening e modelos finais

Data: 25 de novembro de 2026  
Status: concluída

## Entregas

- Testes combinados de schemas, mappers, manifesto, segurança, importadores e modelo de interface.
- Modelos JSON finais em `docs/examples/import-export/` para AD&D 2ª Edição e Shadowlords Mini System 3E.
- Manifestos JSON correspondentes a pacotes individuais e de biblioteca.
- Quatro ZIPs de referência:
  - `add2e-monster-reference.zip`;
  - `add2e-library-reference.zip`;
  - `shadowlords3e-monster-reference.zip`;
  - `shadowlords3e-library-reference.zip`.
- `SHA256SUMS.txt` com os hashes dos ZIPs.
- `VALIDATION_REPORT.md` com o resultado da inspeção dos pacotes.

## Validações finais

- Os quatro JSONs de monstro validam contra os schemas portáteis.
- Os dois JSONs de biblioteca validam contra `library.schema.json`.
- Os quatro ZIPs foram extraídos e conferidos.
- Todos os arquivos listados nos manifestos existem exatamente uma vez.
- Tamanhos e SHA-256 dos arquivos coincidem.
- Contagens e `totalUncompressedBytes` coincidem.
- Os envelopes não carregam identidade persistida.

Etapa final concluída.
