# Etapa 1 — Auditoria e alinhamento da importação/exportação

Data: 25 de novembro de 2026  
Escopo: somente auditoria, alinhamento e decisões de fronteira. Nenhum serviço de importação/exportação foi implementado nesta etapa.

## 1. Resultado

O modelo persistido atual é a fonte de verdade do domínio. Os schemas e exemplos recebidos no pacote `Especificacao_Importacao_Exportacao_BMD_v1.zip` são tratados como uma proposta de contrato de fronteira e deverão ser corrigidos na Etapa 2 para refletir o domínio interno, preservando as decisões específicas de embalagem portátil.

Não será feita migração do domínio para acomodar limites ou vocabulários divergentes do contrato recebido.

As prévias de importação usarão nomes calculados deterministicamente e somente para leitura. O usuário poderá editar o nome após a importação pelos fluxos normais do aplicativo.

## 2. Fontes auditadas

- `src/domain/types.ts`, `src/domain/validation.ts` e `src/domain/shadowlords-vocabularies.ts`;
- `schemas/add2e/v1/monster.schema.json` e `schemas/shadowlords3e/v1/monster.schema.json`;
- `src-tauri/migrations/0001_initial.sql` e `0002_shadowlords_monsters.sql`;
- `src-tauri/src/database.rs`, `libraries.rs`, `monsters.rs`, `monster_validation.rs` e `images.rs`;
- adaptadores `src/infrastructure/libraries.ts` e `src/infrastructure/monsters.ts`;
- especificação normativa de importação/exportação e os cinco schemas do pacote portátil;
- exemplos portáteis de AD&D, Shadowlords, biblioteca e manifestos.

## 3. Matriz de alinhamento

| Campo portátil | Campo interno | Exportação | Importação | Validação |
|---|---|---|---|---|
| `format`, `formatVersion`, `kind` | Não persistido | Constantes do contrato | Rejeitar valor desconhecido | Schema portátil |
| `systemCode` | `libraries.system_code` e `document.systemCode` | Copiar do sistema do registro | Exigir correspondência entre pacote, biblioteca e documento | Sistemas registrados em `systems` |
| `schemaKey`, `schemaVersion` | `monsters.schema_key/schema_version` e documento | Copiar da versão interna suportada | Exigir versão suportada; migrador futuro somente se explícito | Schema + compatibilidade do sistema |
| `library.name` | `libraries.name` | Copiar nome atual | Criar com colisão resolvida ou ignorar no modo biblioteca existente | Limite interno de 1–120 grafemas |
| `library.image` | `libraries.image_*` e `images/libraries/<uuid>` | Referência relativa, dimensões normalizadas | Validar manifesto, normalizar e criar caminho local novo | Tipo real, dimensões e pipeline de imagens |
| `monster.name` | `monsters.name` e documento | Copiar nome | Resolver colisão contra destino e lote; não sobrescrever | Normalização de busca e limite interno |
| `monster.status` | `monsters.status` | Exportar somente `active`/`archived`; excluir `trashed` | Criar ativo ou arquivado; nunca criar na lixeira | Estado portátil e regra de `archived_at` |
| `monster.image` | `monsters.image_*`, documento e diretório do UUID | Caminho relativo; sem hash interno | Verificar hash do manifesto, normalizar, gerar principal e miniatura | Conteúdo real JPEG/PNG/WebP; sem SVG/animação |
| `narratives` | Campo homônimo do documento interno | Construir explicitamente e normalizar NFC | Copiar sem interpretação editorial | Schema interno e Markdown limitado |
| `profiles[]` | `monster_profiles` + arrays no documento | Ordenar por `sortOrder`; omitir identidade e ordem | Atribuir ordem pelo índice e gerar novos IDs | Exatamente um perfil principal |
| `climates[]` | `profile_climates` e documento | Copiar códigos e complementos | Restaurar tabelas e documento | Vocabulário interno e complementos `other/special` |
| `terrains[]` | `profile_terrains` e documento | Mapear aliases internos para código portátil canônico | Converter código portátil para o código interno suportado | Rejeitar código não mapeado |
| `frequency` | Colunas de `monster_profiles` e documento | Copiar código/complemento | Restaurar código/complemento | Complemento obrigatório quando exigido |
| organização, dieta, tamanho, tesouro, quantidade, moral | Colunas de `monster_profiles` e documento | Copiar como o domínio interno representa | Preservar tipo interno; não converter texto em número | Schema interno, não o limite defeituoso recebido |
| AD&D `statistics` | `profiles[].statistics` no documento | Preservar expressões textuais | Preservar expressões textuais | `statistics.type=add2e` |
| AD&D `auxiliaryTables[]` | Documento interno | Ordenar, omitir IDs/ordem | Gerar IDs e ordens pelo índice | Quantidade de células igual à quantidade de colunas |
| Shadowlords atributos/PV/Defesa | `profiles[].statistics` no documento | Copiar valores internos | Copiar valores internos | Defesa Final e limites internos |
| Shadowlords RD/ataques/habilidades/traços/magias | Arrays em `statistics` e tabelas derivadas | Ordenar por `sortOrder`, omitir IDs/ordem | Gerar nova árvore de identidade e ordem | Coerência de `usesMode`, Defesa Ativa e vocabulários |
| Shadowlords `dragon` | `statistics.dragon` | Preservar por perfil, sem IDs | Recriar perfis e entidades | Cinco idades quando módulo habilitado |
| `sources[]` | Documento e tabelas/referências internas | Ordenar e omitir IDs/ordem | Gerar novas identidades quando exigido pelo modelo | Limites e campos do schema interno |
| `manifest.files[]` | Não persistido no domínio | Inventariar todos os arquivos do pacote | Conferir existência, tamanho, hash e papel | Validador de pacote |
| datas, `rowVersion`, `contentHash`, IDs | Campos internos | Nunca exportar | Gerar localmente/recalcular | Ausência obrigatória no contrato portátil |

## 4. Divergências encontradas e tratamento aprovado

### 4.1 Limites e tipos

Os schemas portáteis recebidos possuem limites mais amplos ou diferentes dos schemas internos. Exemplos confirmados:

- moral Shadowlords portátil numérica de `-100..100`; domínio atual `0..3`;
- PV portátil até `9999`; domínio atual até `250`;
- RD portátil até `99`; domínio atual até `10`;
- modificadores de perícia portáteis `-5..10`; domínio atual `1..3`;
- vários limites textuais portáteis maiores que os limites internos.

Tratamento: os schemas portáteis da Etapa 2 serão ajustados ao domínio interno. O mapper não truncará, arredondará ou reinterpretará dados.

### 4.2 Vocabulários

O contrato recebido usa códigos portáteis reduzidos e o domínio atual possui vocabulários mais extensos. O mapper terá tabelas explícitas de conversão. O alias interno `deserts` será exportado como `desert` e convertido de volta na importação quando aplicável. Códigos sem conversão segura serão rejeitados com erro localizado, nunca descartados silenciosamente.

### 4.3 Imagens

O domínio atual já normaliza imagens para WebP, armazena a principal e miniatura e usa staging. A regra portátil não transportará Base64, caminho absoluto, hash interno ou miniatura. A diferença de tamanho da miniatura será tratada na Etapa 2: monstro portátil usará miniatura 128×128 e capa/listagem de biblioteca continuará 256×256, conforme a especificação geral e a decisão consolidada da Etapa 0.

### 4.4 Persistência e atomicidade

O banco já possui `import_journal`, staging, WAL e tarefas de limpeza. A Etapa 2 deverá ampliar o journal/histórico somente se necessário para registrar hash do ZIP e recuperação, sem substituir o modelo atual nem expor ZIP ao repositório de domínio.

## 5. Vocabulários canônicos aprovados

- Sistemas: `add2e`, `shadowlords3e`.
- Estado portátil: `active`, `archived`; `trashed` nunca é exportado.
- Terreno portátil: códigos canônicos do contrato corrigido; `desert` é a forma portátil, `deserts` a forma interna atualmente observada.
- Imagens: `image/jpeg`, `image/png`, `image/webp`; armazenamento interno normalizado em WebP.
- Perfil: ordem editorial do array portátil; `sortOrder` somente interno.
- Identidade: todos os IDs são locais e recém-gerados na importação.

## 6. Decisões para a Etapa 2

1. Criar schemas portáteis versionados separados dos schemas internos.
2. Corrigir os schemas portáteis para refletir o domínio interno revisado por humanos.
3. Criar tipos DTO separados dos tipos persistidos.
4. Implementar mappers explícitos por sistema e biblioteca.
5. Não alterar tabelas ou documentos internos para copiar o formato portátil.
6. Não fazer reconciliação por UUID, hash, nome ou conteúdo.
7. Manter colisão de nomes determinística e não editável durante a importação.
8. Manter a edição manual de nomes para depois da importação, pelos formulários existentes.
9. Validar primeiro schema portátil corrigido e depois semântica do domínio interno.

## 7. Critério de conclusão da Etapa 1

- Auditoria das camadas TypeScript, Rust, SQLite e imagens concluída.
- Matriz portátil↔interno registrada.
- Divergências dos schemas recebidos registradas.
- Fonte de verdade definida como o modelo interno atual.
- Vocabulários e aliases de fronteira registrados.
- Decisão sobre nomes não editáveis durante a importação registrada.
- Nenhum código de importação/exportação iniciado.

Etapa 1 concluída.
