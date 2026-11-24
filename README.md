# Biblioteca de Monstros Digital

Aplicativo desktop local, em português do Brasil, para organizar fichas de monstros de AD&D 2ª Edição e Shadowlords Mini System 3E.

## Estado do projeto

Etapa 2 — persistência local e gestão de bibliotecas. A especificação normativa está em [`docs/specification/Especificacao_Tecnica_Biblioteca_de_Monstros_Digital_MVP_v1.md`](docs/specification/Especificacao_Tecnica_Biblioteca_de_Monstros_Digital_MVP_v1.md). Decisões aprovadas e esclarecimentos estão em [`docs/decisions/ETAPA_0_DECISOES.md`](docs/decisions/ETAPA_0_DECISOES.md) e nos ADRs.

O aplicativo oferece criação, edição, consulta, remoção para lixeira, restauração e exclusão definitiva de bibliotecas. O núcleo Tauri mantém os dados em SQLite local com migrações, e processa capas JPEG, PNG ou WebP. A tela de detalhes prepara o espaço para o cadastro de monstros, previsto para a Etapa 3. A Etapa 1 permanece disponível nos schemas, tipos gerados e validações de domínio.

## Requisitos de desenvolvimento

- Windows 10/11 x64;
- Node.js 26.13.0 e pnpm 11.29.0;
- Rust 1.100.0 para `x86_64-pc-windows-msvc`;
- Microsoft C++ Build Tools com o Windows SDK;
- WebView2 Runtime.

As versões estão fixadas em `.node-version`, `package.json`, `pnpm-lock.yaml` e `rust-toolchain.toml`.

O VS Code é o editor do projeto; não instalaremos o Visual Studio nesta máquina. Para desenvolvimento e compilação local da janela desktop Tauri, o Rust requer Microsoft C++ Build Tools e Windows SDK. Esses componentes não são necessários para baixar e instalar os builds de teste produzidos pelo CI.

## Instalar builds de teste

O GitHub Actions compila o instalador Windows NSIS em cada push, pull request para `main` e execução manual do workflow. Para baixar:

1. Abra a aba **Actions** do repositório no GitHub e selecione a execução concluída;
2. baixe o artefato `instalador-windows-...` na seção **Artifacts**;
3. extraia o arquivo e execute o instalador `*-setup.exe`.

Os artefatos ficam disponíveis por 30 dias. Cada execução bem-sucedida produz o instalador otimizado da revisão correspondente, para validação manual como usuário. Builds sem assinatura digital podem mostrar o aviso do Windows sobre editor desconhecido. A aplicação continua local e offline depois de instalada.

## Instalação e execução

```powershell
pnpm install --frozen-lockfile
pnpm dev       # navegador, usando o adaptador local simulado
pnpm tauri dev # janela desktop Tauri
```

## Verificações locais

```powershell
pnpm check
pnpm lint
pnpm build
pnpm schemas:check
pnpm test
cd src-tauri
cargo fmt --check
cargo clippy -- -D warnings
cargo check
cargo test
```

Os comandos Tauri locais exigem o toolchain nativo listado acima. Esta máquina não possui `link.exe`, então a compilação e os testes Rust são executados no CI do Windows. Sem os Build Tools, use os instaladores de teste publicados como artefatos do CI.

Para regenerar os tipos após alterar um schema, execute `pnpm schemas:generate`; `pnpm schemas:check` confirma que os tipos versionados estão atualizados.

## Arquitetura inicial

- `src/`: shell React, estilos e porta de inicialização;
- `src-tauri/`: contêiner desktop e comandos nativos;
- `docs/adr/`: decisões arquiteturais;
- `docs/specification/`: cópia versionada da especificação aprovada;
- `schemas/`: contratos JSON Schema Draft 2020-12 para fichas AD&D e Shadowlords;
- `src/generated/`: tipos TypeScript derivados dos schemas;
- `fixtures/`: exemplos fictícios e reduzidos para testes;
- `src-tauri/migrations/`: migrações versionadas do banco SQLite.

O frontend não acessa diretamente o banco ou caminhos do sistema de arquivos; ele usa comandos Tauri. `pnpm dev` oferece um adaptador de demonstração no navegador com armazenamento local do navegador. Não há fontes, scripts ou serviços remotos.
