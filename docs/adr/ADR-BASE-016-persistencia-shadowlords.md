# ADR-BASE-016: persistência de monstros Shadowlords

- Estado: aceito
- Data: 2026-11-24

## Contexto

As fichas Shadowlords têm um contrato e regras de validação próprios. O repositório de monstros deve aceitar ambos os sistemas sem permitir que uma ficha seja salva em uma biblioteca incompatível.

## Decisões

- Manter o armazenamento de documentos e perfis compartilhado, usando `systemCode` e `schemaKey` para distinguir os contratos versionados.
- Aplicar uma migração aditiva que atualiza os gatilhos SQLite de consistência entre biblioteca, ficha e versão.
- Validar o schema Shadowlords no núcleo Rust e aplicar ali as regras de Defesa Final, perfil principal, ataques e cinco idades dracônicas.
- Manter formulários e fichas de consulta separados por sistema, sobre os mesmos comandos e ciclo de vida de persistência.
- Manter listas e expressões Shadowlords como dados tipados conforme o contrato, sem inferir ou recalcular regras além da Defesa Final especificada.

## Consequências

Uma biblioteca Shadowlords pode persistir fichas Shadowlords após a migração e continua bloqueada para fichas AD&D. Mudanças futuras de contrato exigem nova versão de schema e migração explícita quando alterarem o armazenamento.
