# ADR-BASE-016: Persistência local e ciclo de vida de bibliotecas

## Status

Aceito na Etapa 2.

## Decisão

- O Tauri mantém uma única base SQLite no diretório privado de dados da aplicação. SQLx executa migrações versionadas; SQLite usa chaves estrangeiras, WAL e timeout de espera de cinco segundos.
- Operações de biblioteca passam por comandos Tauri. A interface não acessa o banco nem constrói caminhos locais.
- Capas são validadas e reencodificadas no núcleo Rust para WebP; arquivos são preparados em staging e substituídos junto à transação de metadados, com rollback em falhas.
- Bibliotecas removidas recebem `deleted_at` e `purge_after` por 30 dias; os estados dos monstros não são alterados. A exclusão definitiva confirma o nome e enfileira limpeza local se o sistema de arquivos falhar.
- A manutenção é verificada ao iniciar e em intervalos de uma hora; itens expirados deixam de ser restauráveis no instante de expiração e a limpeza física ocorre na próxima verificação.
- O modo navegador serve para testar a interface e usa `localStorage`; os dados do navegador não são importados pelo aplicativo desktop.
- Falha de inicialização do banco interrompe operações e apresenta a tela em modo somente leitura.

## Consequências

- O diretório de dados permanece local e funciona sem rede após instalar o aplicativo.
- As migrações, limites de imagens, transações e regras de exclusão são verificadas por testes Rust no CI Windows.
- A execução de `cargo check` e `cargo test` para o alvo MSVC requer `link.exe` e o Windows SDK; a máquina de desenvolvimento atual não possui os Build Tools.
- O instalador NSIS continua sendo produzido pelo workflow Windows para teste manual.
