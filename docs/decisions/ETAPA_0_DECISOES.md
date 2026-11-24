# Decisões consolidadas para a Etapa 0

Data: 24 de novembro de 2026  
Origem: confirmação do usuário após aprovação do plano de implantação.

Estas decisões complementam a cópia da especificação em `docs/specification/`. Em caso de divergência, as decisões explícitas do usuário abaixo prevalecem para o MVP e devem ser incorporadas à especificação na próxima revisão normativa.

| Tema | Decisão | Consequência |
|---|---|---|
| Monstros arquivados | Abas Ativos e Arquivados dentro da biblioteca | Ambos os estados compartilham busca, filtros, ordenação e modos de visualização. |
| Configurações | Remover a tela e a rota | Sobrescreve `RF-APP-007`, que lista Configurações mínimas na navegação. |
| Segunda instância | Focar a janela principal existente e encerrar o novo processo | O plugin Tauri de instância única encaminha foco à janela `main`. |
| Perfil Shadowlords sem ataques | Todo perfil principal exige ao menos um ataque | Não há campo `nonCombatant` no schema v1; a exceção textual da especificação não será aplicada. |
| Imagem de biblioteca | Guardar imagem normalizada e miniatura quadrada separadamente | Imagem principal até 2048 px; miniatura 256×256 para listagens. |
| Identificador Tauri | `br.com.bibliotecademonstros.digital` | Identificador congelado antes do primeiro instalador. |
| Runtime | `app_initialize` no Tauri e adaptador simulado no navegador | Ambos retornam ambiente e versão sem acesso direto do frontend ao núcleo. |
| Validação manual e instaladores | Gerar build desktop Windows NSIS no GitHub Actions para cada push, pull request para `main` e execução manual | Cada execução bem-sucedida publica um artefato instalável por 30 dias; o usuário testa o build da revisão antes de iniciar a etapa seguinte. |
| Assinatura do instalador | Fora do MVP | Builds de teste e o instalador final não serão assinados digitalmente; o Windows pode exibir aviso de editor desconhecido. |

## Versões fixadas na fundação

- Node.js 26.13.0;
- pnpm 11.29.0;
- React e React DOM 19.3.1;
- TypeScript 7.0.2;
- Vite 8.1.5 com `@vitejs/plugin-react` 6.3.0;
- Tauri 2.12.7 e API/CLI 2.12.5/2.12.6;
- Rust 1.100.0, alvo Windows x64 MSVC.

As versões de patch mais recentes dentro das linhas aprovadas foram escolhidas onde estavam publicadas na data desta implementação. O lockfile deve fixar as dependências transitivas.

O ecossistema `typescript-eslint` ainda declara suporte a TypeScript abaixo de 6.1. Por isso, o lint nesta fundação cobre os arquivos JavaScript de configuração; os arquivos TypeScript/TSX são verificados pelo compilador TypeScript 7. O lint tipado será ampliado quando o parser suportar a API do TypeScript 7.

## Inicialização de logs e migrações

O estágio inicial configura logs nativos em `<AppLogDir>`, com arquivos de até 2 MiB e até cinco arquivos retidos. Migrações versionadas começam quando a persistência SQLite entrar na Etapa 2. Nenhum conteúdo de ficha será incluído em logs.

## Ciclo de validação por etapa

O workflow `.github/workflows/ci.yml` executa verificações e compila o instalador NSIS em runner Windows hospedado pelo GitHub. O instalador fica disponível na execução como artefato `instalador-windows-<execução>-<commit>`, com retenção de 30 dias. O usuário baixa e instala o artefato para validar a aplicação como usuário e registrar feedback de correção. A etapa seguinte só começa após essa validação e o feedback correspondente. O instalador final é produzido pelo mesmo caminho a partir da revisão aprovada para produção.
