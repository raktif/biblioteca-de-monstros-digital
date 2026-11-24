# ADR-BASE-014: Fundação do toolchain e adaptador de execução

- Estado: aceito
- Data: 2026-11-24

## Contexto

O produto é offline, local e Windows x64. O frontend precisa iniciar durante o desenvolvimento web, mas produção deve usar Tauri e manter acesso nativo atrás de uma porta.

## Decisões

- Fixar Node.js 26.13.0, pnpm 11.29.0, React 19.3.1, TypeScript 7.0.2, Vite 8.1.5 e `@vitejs/plugin-react` 6.3.0.
- Fixar Tauri 2.12.7, seus pacotes JS CLI/API e Rust 1.100.0; registrar dependências Rust exatas no `Cargo.toml` e no `Cargo.lock`.
- Usar React com adaptador de runtime: `app_initialize` no Tauri e resposta simulada no navegador.
- Fixar `br.com.bibliotecademonstros.digital` antes de qualquer distribuição.
- Adotar uma CSP local restritiva, NSIS por usuário e nenhuma origem remota.
- Gravar logs nativos no diretório privado de logs, com rotação limitada a cinco arquivos de até 2 MiB cada.
- Executar verificações de frontend e Rust no CI Windows e compilar ali o instalador NSIS em cada push, pull request para `main` e execução manual do workflow.
- Disponibilizar o instalador resultante como artefato do GitHub Actions por 30 dias para teste manual de cada revisão; usar o mesmo processo para o build final.
- Não assinar digitalmente os instaladores no MVP.

## Consequências

O desenvolvimento web pode validar o shell sem inicializar Tauri. O browser mock não implementa persistência. Desenvolvimento e build nativo local exigem ambiente Windows com MSVC e Windows SDK; a máquina do usuário pode instalar os builds de teste gerados no runner Windows do GitHub sem esses componentes. Instaladores não assinados podem gerar aviso de editor desconhecido no Windows. A aplicação instalada permanece local e offline.
