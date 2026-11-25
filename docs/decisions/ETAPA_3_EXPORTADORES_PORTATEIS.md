# Etapa 3 — Exportadores portáteis

Data: 25 de novembro de 2026  
Status: concluída para mapeamento e planejamento de pacote

## Entregas

- `mapAdd2eMonster`: construção explícita do envelope AD&D.
- `mapShadowlordsMonster`: construção explícita do envelope Shadowlords.
- `mapLibrary`: construção explícita do envelope de biblioteca.
- `mapMonster`: seleção do mapper pelo sistema.
- `buildManifest`: cálculo de inventário, contagens e bytes descompactados.
- Testes de exportação sem identidade persistida, normalização `deserts → desert`, validação dos quatro envelopes e manifesto de monstro.

## Regras verificadas

- IDs, `libraryId`, datas, hashes internos, `rowVersion` e `sortOrder` não são copiados.
- Entidades filhas são reconstruídas campo a campo; não há remoção genérica sobre o documento persistido.
- Expressões textuais AD&D permanecem textuais.
- Reduções de dano, ataques, habilidades, traços, magias e Defesa Ativa Shadowlords preservam os campos editoriais sem IDs.
- Imagens recebem somente referência relativa e dimensões; o caminho interno não é exportado.
- Estados `active` e `archived` são preservados; `trashed` não é convertido.
- Manifesto calcula `counts.files` e `totalUncompressedBytes` a partir do inventário recebido.

## Validação executada

- `tsc --noEmit`: passou.
- `portable:check`: passou para os quatro schemas.
- Vitest: 5 testes de validação, mappers e manifesto passaram.
- `git diff --check`: passou.

## Limite da etapa

O escritor físico de ZIP, a cópia/normalização de imagens a partir do armazenamento local e os comandos Tauri de exportação ainda não foram implementados. Eles permanecem isolados na etapa de infraestrutura de pacotes, para que o leitor seguro e o escritor usem o mesmo inventário, limites e verificação de manifesto.
