# Etapa 6 — Interface de importação e exportação

Data: 25 de novembro de 2026  
Status: concluída para contratos e wizard de importação

## Entregas

- Porta IPC em `src/infrastructure/portable.ts` para inspeção, execução, cancelamento e relatório.
- Tipos de inspeção, progresso, opções e relatório.
- Modelo de UI em `src/portable/ui-model.ts`.
- Wizard em `src/app/PortableImportWizard.tsx`.
- Prévia de renomeações somente leitura.
- Fases de progresso com `aria-live`.
- Mensagens de erro e bloqueio de confirmação quando a inspeção retorna erros.
- Adaptador explícito para impedir uso de importação em modo navegador.
- Testes do modelo visual e dos rótulos de progresso.

## Fluxo implementado

1. Selecionar caminho do pacote.
2. Inspecionar sem gravar.
3. Exibir sistema, quantidade e nomes finais.
4. Confirmar importação sem editar nomes.
5. Exibir progresso.
6. Entregar relatório final ao chamador.

## Validação executada

- `tsc --noEmit`: passou.
- Vitest do modelo da interface: 2 testes passaram.
- `git diff --check`: passou.

## Limite da etapa

O wizard ainda não foi conectado ao shell principal nem aos comandos Tauri reais de inspeção/execução, pois esses comandos dependem da integração transacional e do leitor ZIP físico. A interface já possui a porta IPC estável para essa conexão.
