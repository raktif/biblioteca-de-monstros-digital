# ADR-BASE-013: Decisões de navegação e modelo para o MVP

- Estado: aceito
- Data: 2026-11-24
- Decisor: usuário do produto

## Contexto

A especificação v1 exige que a navegação principal inclua Configurações, mas não detalha seus requisitos; prevê arquivamento de monstros sem definir uma superfície explícita de consulta; e permite uma exceção de zero ataques sem definir como o usuário declara uma criatura não combatente.

## Decisões

1. A tela e a rota Configurações não serão implementadas.
2. A biblioteca apresentará abas Ativos e Arquivados que compartilham os controles de consulta.
3. O perfil principal de Shadowlords exigirá ao menos um ataque. Não haverá marcação de não combatente na versão inicial.
4. A imagem da biblioteca terá arquivo normalizado e miniatura separada.
5. O identificador Tauri será `br.com.bibliotecademonstros.digital`.
6. Uma segunda instância encaminhará o foco à janela principal e terminará.

## Consequências

A especificação normativa deverá receber revisão de errata para retirar RF-APP-007 e esclarecer os contratos de imagem, arquivamento e ataques. A decisão de ataque elimina a exceção de criação prevista em RF-MON-SL-001.
