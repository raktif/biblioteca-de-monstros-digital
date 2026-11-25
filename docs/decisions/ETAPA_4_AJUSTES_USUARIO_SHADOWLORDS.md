# Decisões de correção da Etapa 4 — Shadowlords

Data: 24 de novembro de 2026  
Origem: feedback do usuário após testar a aplicação.

Este registro prevalece sobre os limites e os tipos de campo divergentes na cópia da especificação do MVP para o formulário Shadowlords. O usuário confirmou que não há fichas salvas no ambiente de teste; fixtures e testes devem acompanhar o contrato atualizado.

## Formulário e validação

- Abrir biblioteca não deve abrir formulário de monstro. O formulário de novo registro deve abrir para AD&D e Shadowlords; a edição continua vinculada ao sistema do documento.
- Mostrar erros compreensíveis junto ao campo, com nome do campo e caixa destacados em vermelho. Manter um resumo acessível no topo.
- O campo `label` é apresentado como “Variante do monstro”. No perfil principal novo, acompanha o nome do monstro até que o usuário edite esse valor.
- Listas controladas usam códigos persistidos estáveis e rótulos em português. Movimento, Tesouro e Velocidade de movimento continuam como texto livre; movimento não será dividido.

## Vocabulários

- Clima, terreno, frequência, organização, dieta e tamanho usam as listas fornecidas pelo usuário. Entradas repetidas foram deduplicadas. Atividade continua seleção múltipla com os rótulos localizados.
- Moral é uma seleção numérica de 0 a +3.
- Clima e terreno são seleções múltiplas; frequência, organização, dieta e tamanho são seleções únicas.
- Categorias de perfil, traço, poder, forma de sopro e atributo de resistência são exibidos em português, mantendo os códigos de contrato.

## Limites obrigatórios

| Campo | Limite |
|---|---:|
| PV | 1–250 |
| Defesa Natural | 10–15 |
| Bônus de escudo | 0–5 |
| Valor de RD | 0–10 |
| Usos limitados de RD | 1–15 |
| Modificador de habilidade | +1–+3 |
| Custo em PV | 0–20 |
| Dificuldade do sopro | 13–20 |
| Limite de ataques aéreos | 0 ou 1 |

Esses limites são aplicados no formulário e no schema compartilhado pelo frontend e pelo backend.

## Ataques e sopro

- Ataque guarda um único tipo de dano.
- `range` continua textual, com rótulo “Área de alcance em metros”.
- O antigo número de usos máximos por rodada passa a texto “Intervalo de uso”.
- O nome do sopro é fixo e não editável. O atributo de resistência não inclui `other`.

## Compatibilidade com a Fase 5

As listagens futuras devem filtrar por códigos estáveis e apresentar os mesmos rótulos localizados do formulário. Esta correção não altera o escopo de lista/grade, busca, ordenação ou preferências da Fase 5.
