# Biblioteca de Monstros Digital

## Especificação Técnica e Funcional do MVP

**Versão do documento:** 1.0.0  
**Data de referência:** 23 de novembro de 2026  
**Status:** Diretriz normativa para arquitetura, implementação, testes e entrega  
**Produto:** Biblioteca de Monstros Digital  
**Plataforma do MVP:** Windows 10 e Windows 11, arquitetura x64  
**Idioma da aplicação:** Português do Brasil (`pt-BR`)  
**Modo de operação:** Aplicativo local, instalado, integralmente offline e sem servidor externo

---

## 0. Instruções obrigatórias para o agente autônomo

Este documento é a fonte normativa para o MVP. O agente responsável pela implementação deve:

1. implementar somente o escopo descrito como **incluído no MVP**;
2. não criar funcionalidades adicionais para “completar” o produto sem autorização;
3. não introduzir contas, sincronização, servidor, telemetria, anúncios ou dependências de rede;
4. não transformar o formulário em um construtor dinâmico de campos;
5. manter estruturas fixas e versionadas, independentes para AD&D 2ª Edição e Shadowlords Mini System 3E;
6. preservar todos os dados do usuário em migrações, importações, atualizações e operações de lixeira;
7. tratar importação e exportação como operações transacionais e verificáveis;
8. escrever toda a interface, mensagens, validações e documentação de uso em português do Brasil;
9. manter a lógica de domínio fora dos componentes visuais;
10. escrever testes automatizados para toda regra identificada neste documento como obrigatória;
11. registrar qualquer desvio inevitável por meio de um ADR em `docs/adr/`, com justificativa, impacto e alternativa rejeitada;
12. interromper a implementação de uma parte apenas quando houver contradição real que não possa ser resolvida por esta especificação. Preferências de implementação menores devem ser decididas pelo agente seguindo os princípios de simplicidade, integridade e menor privilégio.

Os termos **DEVE**, **NÃO DEVE**, **DEVERÁ**, **OBRIGATÓRIO**, **PROIBIDO**, **PODE** e **RECOMENDADO** têm caráter normativo.

---

## 1. Objetivo do documento

Esta especificação define a arquitetura, os contratos de dados, os fluxos de interface, as regras de persistência, os formatos de importação e exportação, os requisitos de segurança, os critérios de aceite e o plano de desenvolvimento do MVP da aplicação **Biblioteca de Monstros Digital**.

O documento deve permitir que um agente autônomo implemente o produto sem depender de inferências sobre o domínio. Ele não é um manual de conversão de regras de RPG e não autoriza a criação automática de estatísticas. O aplicativo armazena, apresenta, pesquisa, importa e exporta fichas; ele **não converte automaticamente** monstros de AD&D para Shadowlords no MVP.

---

## 2. Fontes normativas do domínio

A estrutura dos formulários e a apresentação das fichas foram derivadas dos seguintes materiais do projeto:

1. `add-2e-livro-dos-monstros-digital-biblioteca-elfica.pdf`  
   - páginas de conteúdo “Como Usar Este Livro”, especialmente as páginas 3 e 4 do livro, correspondentes aproximadamente às páginas 7 e 8 do PDF;
   - verbetes usados para validar casos simples e complexos: Bugbear, Dragão Azul e Yuan-ti;
   - fonte da semântica dos campos de AD&D, inclusive Clima/Terreno, Frequência, Organização, Período de Atividade, Dieta, Inteligência, Tesouro, Tendência, Quantidade/Encontro, CA, Movimento, Dados de Vida, TAC0, ataques, dano, proteções, Tamanho, Moral, XP, Psiônicos e seções narrativas.
2. `Ficha_Bugbear_Bestiario_Shadowlords_Modelo_Final.pdf`  
   - referência visual e editorial primária para a ficha somente leitura de Shadowlords;
   - referência para cabeçalho, imagem, tabela geral, faixa de atributos, estatísticas operacionais, narrativa em colunas, variações e referência.
3. `Manual_Conversao_ADD_2e_para_Shadowlords_Revisado_Defesa_Natural_e_Cavaleiro_da_Morte.pdf`  
   - referência para a estrutura mecânica das fichas convertidas;
   - diferenciação entre Defesa Natural, bônus externos, Defesa Final e Redução de Dano;
   - atributos, ataques, habilidades, magia, movimento, sentidos, traços e auditoria;
   - exclusão de Tendência e Valor em XP dos blocos finais de Shadowlords.
4. `Regras da Casa (1).txt`  
   - referência obrigatória para atributos, Níveis de Habilidade, Defesa Natural, RD, equipamentos, Defesa Ativa, críticos, Dano Massivo, magia e demais ajustes do projeto.
5. `Adendo_Conversao_Dragoes_Shadowlords.pdf`  
   - referência obrigatória para o módulo dracônico de Shadowlords;
   - exatamente cinco categorias: Filhote, Jovem, Adulto, Antigo e Ancião;
   - campos de sopro, limites de ataques físicos e demais informações operacionais próprias de dragões.
6. `Shadowlords_MANUAL_DE_REGRAS.pdf`  
   - referência subsidiária para terminologia e fundamentos do sistema.
7. `Tabela_Tesouros_Convertida_Shadowlords.pdf`  
   - referência subsidiária para a indicação textual de tipos de tesouro de Shadowlords; o MVP não executará sorteios automáticos de tesouro.

### 2.1 Hierarquia em caso de conflito

Para o comportamento do aplicativo, prevalece esta especificação. Para a semântica das fichas:

1. decisões explícitas consolidadas nesta especificação;
2. Regras da Casa vigentes;
3. Adendo de Dragões, exclusivamente para dragões;
4. Manual de Conversão revisado;
5. Manual de Regras de Shadowlords;
6. Livro dos Monstros de AD&D 2ª Edição;
7. ficha-modelo do Bugbear para apresentação visual.

Os PDFs de AD&D informam que passaram por OCR. A aplicação não deve “corrigir” conteúdo importado ou digitado. Ela deve armazenar exatamente o texto validado pelo usuário.

---

## 3. Resumo executivo do produto

A Biblioteca de Monstros Digital será um aplicativo instalado no Windows, com interface construída em tecnologias web e executada em um contêiner nativo Tauri. Todos os dados serão mantidos localmente em SQLite e em diretórios privados da aplicação. Nenhum servidor, conta ou conexão com a internet será necessário para usar o produto.

O usuário poderá:

- criar bibliotecas de monstros;
- escolher o sistema da biblioteca entre AD&D 2ª Edição e Shadowlords Mini System 3E;
- cadastrar, consultar, editar, arquivar, remover, restaurar e excluir definitivamente monstros;
- associar imagens às bibliotecas e aos monstros;
- visualizar monstros em lista ou grade;
- pesquisar por nome e combinar filtros de terreno e período de atividade;
- abrir a ficha em modo somente leitura;
- ampliar a imagem do monstro em tela cheia, com zoom e deslocamento;
- exportar e importar monstros individuais por pacote ZIP;
- exportar e importar bibliotecas completas por pacote ZIP;
- recuperar itens da lixeira durante 30 dias;
- usar o aplicativo integralmente offline.

Cada biblioteca pertence a exatamente um sistema. Cada sistema possui um esquema fixo próprio. Bibliotecas do mesmo sistema compartilham o mesmo esquema.

---

## 4. Decisões de arquitetura já aprovadas

| ID | Decisão |
|---|---|
| ADR-BASE-001 | O MVP será um aplicativo instalado para Windows, não uma aplicação hospedada. |
| ADR-BASE-002 | A interface será uma aplicação React comum, escrita em HTML, CSS e TypeScript, executável no navegador durante desenvolvimento e empacotada com Tauri para produção. |
| ADR-BASE-003 | Não haverá servidor local ou remoto, conta, autenticação, sincronização ou telemetria. |
| ADR-BASE-004 | O banco será SQLite local e privado à aplicação. |
| ADR-BASE-005 | Imagens serão arquivos no diretório privado da aplicação; o banco armazenará metadados e caminhos relativos. |
| ADR-BASE-006 | AD&D e Shadowlords terão esquemas de ficha separados, fixos e versionados. |
| ADR-BASE-007 | O formato de intercâmbio será um ZIP com JSONs e imagens separadas. |
| ADR-BASE-008 | Relações entre registros e imagens serão feitas por UUID e caminho declarado, nunca apenas pelo nome visível. |
| ADR-BASE-009 | Importações serão validadas completamente antes de alterar a base e serão atômicas. |
| ADR-BASE-010 | Textos narrativos usarão Markdown limitado, sem HTML arbitrário; tabelas de dados serão estruturadas. |
| ADR-BASE-011 | O modelo de persistência será híbrido: núcleo relacional pesquisável e documentos JSON validados para dados específicos de cada sistema. |
| ADR-BASE-012 | A exportação normal incluirá monstros ativos e arquivados, mas excluirá a lixeira. |

---

## 5. Escopo

### 5.1 Incluído no MVP

1. criação, consulta, edição e remoção de bibliotecas;
2. criação, consulta, edição e remoção de monstros;
3. seleção entre AD&D 2ª Edição e Shadowlords Mini System 3E;
4. formulário fixo e distinto para cada sistema;
5. imagem da biblioteca;
6. imagem do monstro;
7. visualizações em lista e grade;
8. pesquisa por nome;
9. filtros combináveis por terreno e período de atividade;
10. ordenação alfabética;
11. ficha em modo somente leitura;
12. ação Editar na ficha;
13. arquivamento e desarquivamento de monstros;
14. lixeira recuperável por 30 dias;
15. exclusão definitiva;
16. imagem em tela cheia com zoom e deslocamento;
17. importação e exportação de monstro individual;
18. importação e exportação de biblioteca completa;
19. operação integralmente offline;
20. banco de dados local;
21. interface responsiva para janelas do Windows;
22. instalador para Windows 10/11 x64;
23. migrações versionadas do banco;
24. testes automatizados e conjunto de dados de referência.

### 5.2 Explicitamente fora do MVP

- campos personalizados;
- alteração do formulário pelo usuário;
- outros sistemas de RPG;
- conversão automática entre sistemas;
- sincronização;
- contas e autenticação;
- servidor;
- colaboração;
- pacotes diferenciais ou sincronização incremental;
- histórico completo de alterações;
- editor visual de layout;
- geração de PDF;
- criptografia da base;
- publicação em lojas;
- atualização automática pela internet;
- compartilhamento em tempo real;
- catálogos públicos;
- inteligência artificial embutida;
- sorteio automático de tesouros;
- edição de imagens além de recorte de miniatura e normalização.

### 5.3 Compatibilidade futura planejada, mas não implementada

A arquitetura deve permitir futuras compilações para macOS, Linux e Android sem reescrever a camada de domínio ou os componentes principais. Essa preparação não autoriza criar instaladores ou adaptar a interface móvel no MVP.

---

## 6. Terminologia do produto

| Termo | Definição |
|---|---|
| Biblioteca | Contêiner local de monstros pertencente a um único sistema de RPG. |
| Sistema | `add2e` ou `shadowlords3e` no MVP. |
| Monstro | Registro editorial composto por identidade, imagem, narrativas e um ou mais perfis estatísticos. |
| Perfil | Conjunto de estatísticas de uma forma, casta, variante ou idade do monstro. Todo monstro possui pelo menos um perfil principal. |
| Perfil principal | Perfil exibido por padrão ao abrir a ficha. |
| Variante | Perfil adicional, como líder, chefe, xamã, forma alternativa ou casta. |
| Categoria etária | Perfil dracônico de Shadowlords: Filhote, Jovem, Adulto, Antigo ou Ancião. |
| Ativo | Visível na listagem normal. |
| Arquivado | Preservado, mas oculto da listagem normal. |
| Lixeira | Estado de remoção reversível durante 30 dias. |
| Exclusão definitiva | Remoção irreversível do banco e dos arquivos associados. |
| Pacote | Arquivo ZIP de monstro ou biblioteca. |
| Item divergente | Registro com o mesmo UUID, mas hash de conteúdo diferente. |
| Esquema | Contrato de dados fixo e versionado de um sistema. |
| Formato de intercâmbio | Estrutura versionada do ZIP e de seus JSONs. |
| Markdown limitado | Subconjunto de Markdown permitido para narrativa, sem HTML, imagens incorporadas ou execução de conteúdo. |

---

## 7. Perfis de uso e premissas

O MVP possui um único perfil funcional: **usuário local**. Não existem permissões, papéis, perfis administrativos ou separação entre leitores e editores.

Premissas:

- o usuário controla o dispositivo;
- o banco não é compartilhado simultaneamente por processos diferentes;
- apenas uma instância do aplicativo poderá abrir a base em modo de escrita;
- arquivos importados são potencialmente maliciosos e devem ser tratados como não confiáveis;
- o usuário é responsável por criar cópias de segurança por exportação;
- nomes duplicados de bibliotecas e monstros são permitidos; UUIDs definem identidade.

---

## 8. Requisitos funcionais gerais

### 8.1 Inicialização e shell

**RF-APP-001** — Na primeira execução, o aplicativo deve criar o diretório privado, o banco SQLite, as tabelas, os sistemas padrão e as preferências iniciais.  
**RF-APP-002** — A inicialização deve executar migrações pendentes antes de abrir a interface principal.  
**RF-APP-003** — Se uma migração falhar, o aplicativo não deve continuar em modo de escrita; deve preservar a base anterior e exibir erro recuperável.  
**RF-APP-004** — Apenas uma instância deve possuir bloqueio de escrita da base. Uma segunda instância deve focar a primeira ou abrir em modo informativo sem escrita.  
**RF-APP-005** — O aplicativo deve funcionar sem acesso à internet.  
**RF-APP-006** — Nenhuma tela deve tentar carregar fontes, scripts, imagens ou estilos remotos.  
**RF-APP-007** — A navegação principal deve oferecer: Bibliotecas, Lixeira e Configurações mínimas.  
**RF-APP-008** — A ação Voltar deve obedecer ao histórico interno sem perder alterações não salvas.

### 8.2 Sistemas disponíveis

**RF-SYS-001** — O banco deve ser semeado com os sistemas:

- `add2e`: **Advanced Dungeons & Dragons 2ª Edição**;
- `shadowlords3e`: **Shadowlords Mini System 3E**.

**RF-SYS-002** — Não deve existir interface para cadastrar, editar ou remover sistemas no MVP.  
**RF-SYS-003** — O sistema de uma biblioteca vazia pode ser alterado.  
**RF-SYS-004** — Após a existência do primeiro monstro, o sistema da biblioteca deve ficar bloqueado.  
**RF-SYS-005** — A importação nunca deve converter um registro de um sistema para outro.


## 9. Requisitos de bibliotecas

### 9.1 Cadastro

**RF-BIB-001** — O usuário deve poder criar uma biblioteca informando:

| Campo | Obrigatório | Regra |
|---|---:|---|
| Nome | Sim | Texto aparado, de 1 a 120 caracteres. |
| Sistema | Sim | Uma das duas opções semeadas. |
| Imagem | Não | JPEG, PNG ou WebP, conforme regras da seção de imagens. |

**RF-BIB-002** — O nome não precisa ser único.  
**RF-BIB-003** — O aplicativo deve gerar um UUID v4 imutável para a biblioteca.  
**RF-BIB-004** — Datas de criação e atualização devem ser geradas automaticamente em UTC.  
**RF-BIB-005** — A criação deve ser transacional: falha de imagem ou banco não pode deixar biblioteca parcial.

### 9.2 Página inicial

**RF-BIB-010** — A página inicial deve exibir apenas bibliotecas não removidas.  
**RF-BIB-011** — Cada cartão deve apresentar imagem ou placeholder, nome, sistema e quantidade de monstros ativos.  
**RF-BIB-012** — A ordenação padrão será alfabética pelo nome em colação `pt-BR`, ignorando acentos e diferença entre maiúsculas e minúsculas.  
**RF-BIB-013** — Deve existir ação destacada **Nova biblioteca**.  
**RF-BIB-014** — Estado vazio deve explicar que nenhuma biblioteca existe e oferecer a criação da primeira.

### 9.3 Consulta e edição

**RF-BIB-020** — Ao abrir uma biblioteca, a tela deve exibir:

- imagem, nome e sistema;
- ações Importar monstro, Importar biblioteca, Exportar biblioteca, Editar biblioteca e Remover biblioteca;
- busca e filtros;
- alternância Lista/Grade;
- ação Novo monstro;
- contadores de ativos e arquivados.

**RF-BIB-021** — A edição deve permitir alterar nome e imagem.  
**RF-BIB-022** — O sistema só pode ser alterado se a biblioteca não tiver monstros ativos, arquivados ou na lixeira.  
**RF-BIB-023** — Ao substituir a imagem, o arquivo anterior deve ser removido após confirmação da transação.  
**RF-BIB-024** — Ao sair com alterações não salvas, deve ser exibido diálogo com as opções Salvar, Descartar e Continuar editando.

### 9.4 Remoção e restauração

**RF-BIB-030** — Remover uma biblioteca deve movê-la para a lixeira por 30 dias.  
**RF-BIB-031** — Os monstros não devem receber exclusões independentes quando a biblioteca inteira for removida.  
**RF-BIB-032** — Restaurar a biblioteca deve restaurar o conjunto e preservar os estados anteriores dos monstros.  
**RF-BIB-033** — A exclusão definitiva de biblioteca deve exigir confirmação reforçada por digitação do nome da biblioteca.  
**RF-BIB-034** — A exclusão definitiva deve remover registros, imagens, miniaturas e resíduos de importação associados.  
**RF-BIB-035** — Uma biblioteca na lixeira não pode ser exportada sem ser restaurada.

---

## 10. Requisitos de monstros

### 10.1 Regras comuns

**RF-MON-001** — Todo monstro deve pertencer a exatamente uma biblioteca.  
**RF-MON-002** — Todo monstro deve possuir UUID v4 imutável.  
**RF-MON-003** — Todo monstro deve possuir nome de 1 a 120 caracteres.  
**RF-MON-004** — Todo monstro deve possuir pelo menos um perfil.  
**RF-MON-005** — Exatamente um perfil deve ser marcado como principal.  
**RF-MON-006** — O esquema do monstro deve ser o esquema do sistema da biblioteca.  
**RF-MON-007** — A imagem é opcional.  
**RF-MON-008** — O salvamento deve validar o documento inteiro e todos os perfis.  
**RF-MON-009** — O usuário deve poder duplicar um perfil dentro do mesmo monstro para facilitar variantes.  
**RF-MON-010** — O usuário deve poder reordenar perfis adicionais.  
**RF-MON-011** — A exclusão do perfil principal só será permitida após outro perfil ser definido como principal.  
**RF-MON-012** — Nomes duplicados dentro da mesma biblioteca são permitidos.

### 10.2 Ciclo de vida

**RF-MON-020** — Estados possíveis: `active`, `archived`, `trashed`.  
**RF-MON-021** — Arquivar deve remover o monstro da listagem de ativos sem iniciar o prazo de exclusão.  
**RF-MON-022** — Desarquivar deve devolver o monstro à listagem ativa.  
**RF-MON-023** — Remover deve enviar o monstro à lixeira por 30 dias.  
**RF-MON-024** — Restaurar deve devolver o monstro ao estado que possuía antes da remoção.  
**RF-MON-025** — Exclusão definitiva deve exigir confirmação.  
**RF-MON-026** — Um monstro na lixeira não pode ser editado ou exportado; deve ser restaurado antes.  
**RF-MON-027** — Monstros arquivados devem ser incluídos na exportação da biblioteca e manter o estado arquivado ao serem importados.

### 10.3 Ficha somente leitura

**RF-MON-030** — Abrir um monstro deve iniciar no modo somente leitura.  
**RF-MON-031** — A tela deve conter as ações Editar, Arquivar/Desarquivar, Remover e Exportar.  
**RF-MON-032** — A imagem deve ser clicável e abrir o visualizador em tela cheia.  
**RF-MON-033** — Quando houver múltiplos perfis, deve existir seletor de perfil e quadro comparativo.  
**RF-MON-034** — O perfil principal deve ser selecionado inicialmente.  
**RF-MON-035** — Campos vazios opcionais não devem produzir linhas vazias na ficha.  
**RF-MON-036** — A ficha deve ser responsiva e não deve exigir rolagem horizontal em largura igual ou superior a 768 px, exceto em tabelas auxiliares extensas, que podem usar um contêiner horizontal próprio.

### 10.4 Edição

**RF-MON-040** — O botão Editar deve abrir o formulário do sistema da biblioteca.  
**RF-MON-041** — O usuário deve poder Salvar ou Cancelar.  
**RF-MON-042** — Cancelar com alterações deve pedir confirmação.  
**RF-MON-043** — O formulário deve destacar campos inválidos e apresentar resumo de erros no topo.  
**RF-MON-044** — Erros devem manter todos os valores digitados.  
**RF-MON-045** — O salvamento deve incrementar `rowVersion`, atualizar `updatedAt` e recalcular o hash de conteúdo.

---

## 11. Pesquisa, filtros, ordenação e visualizações

### 11.1 Pesquisa por nome

**RF-PESQ-001** — A busca deve ocorrer por correspondência parcial de nome.  
**RF-PESQ-002** — A busca deve ignorar acentos, caixa e espaços duplicados.  
**RF-PESQ-003** — Exemplo: `dragao` deve encontrar `Dragão Azul`.  
**RF-PESQ-004** — A busca deve ser aplicada após um atraso de 200 a 300 ms para evitar consultas a cada tecla.  
**RF-PESQ-005** — A limpeza da busca deve restaurar a lista sem recarregar a tela inteira.

### 11.2 Filtros

**RF-PESQ-010** — Filtros obrigatórios do MVP:

- terreno;
- período de atividade.

**RF-PESQ-011** — Filtros de categorias diferentes usam operador **E**.  
**RF-PESQ-012** — Múltiplos valores dentro do mesmo filtro usam operador **OU**.  
**RF-PESQ-013** — Exemplo: `(deserto OU subterrâneo) E noturno`.  
**RF-PESQ-014** — A pesquisa por nome deve ser combinada com os filtros usando **E**.  
**RF-PESQ-015** — Um monstro é compatível com o filtro quando qualquer um de seus perfis contém a classificação selecionada.  
**RF-PESQ-016** — Deve existir ação Limpar filtros.  
**RF-PESQ-017** — O estado sem resultados deve diferenciar “biblioteca vazia” de “nenhum resultado para os filtros”.

### 11.3 Ordenação

**RF-PESQ-020** — O MVP deve oferecer ordenação alfabética crescente e decrescente.  
**RF-PESQ-021** — O desempate deve usar data de criação e UUID.  
**RF-PESQ-022** — A preferência deve ser persistida por biblioteca.

### 11.4 Lista e grade

**RF-VIS-001** — Lista e grade devem utilizar a mesma consulta e os mesmos filtros.  
**RF-VIS-002** — A grade deve adaptar a quantidade de colunas à largura disponível.  
**RF-VIS-003** — O cartão de grade deve exibir miniatura de até 128 × 128 px e nome logo abaixo.  
**RF-VIS-004** — A lista deve exibir miniatura, nome e, quando disponível, até dois dados auxiliares: terreno principal e período principal.  
**RF-VIS-005** — A preferência Lista/Grade deve ser persistida por biblioteca.  
**RF-VIS-006** — Imagens completas não devem ser carregadas na listagem; somente miniaturas.  
**RF-VIS-007** — A listagem deve ser virtualizada ou paginada para manter desempenho com milhares de registros.

---

## 12. Vocabulários controlados

Os vocabulários são fixos no MVP, mas devem ser armazenados por código estável e apresentados por rótulo localizado.

### 12.1 Frequência

| Código | Rótulo |
|---|---|
| `common` | Comum |
| `uncommon` | Incomum |
| `rare` | Rara |
| `very_rare` | Muito rara |
| `unique` | Única |
| `variable` | Variável |
| `other` | Outra |

`other` exige complemento textual.

### 12.2 Período de atividade

| Código | Rótulo |
|---|---|
| `day` | Diurno |
| `night` | Noturno |
| `twilight` | Crepuscular |
| `dawn` | Amanhecer |
| `dusk` | Anoitecer |
| `any` | Qualquer |
| `continuous` | Contínuo |
| `seasonal` | Sazonal |
| `special` | Especial |
| `other` | Outro |

`special` e `other` exigem complemento textual. O campo aceita múltiplos valores.

### 12.3 Clima

| Código | Rótulo |
|---|---|
| `arctic` | Ártico |
| `subarctic` | Subártico |
| `cold` | Frio |
| `temperate` | Temperado |
| `subtropical` | Subtropical |
| `tropical` | Tropical |
| `hot` | Quente |
| `arid` | Árido |
| `any` | Qualquer |
| `extraplanar` | Extraplanar |
| `special` | Especial |
| `other` | Outro |

### 12.4 Terreno

| Código | Rótulo |
|---|---|
| `underground` | Subterrâneo |
| `plains` | Planícies |
| `forest` | Floresta |
| `jungle` | Selva |
| `hills` | Colinas |
| `mountains` | Montanhas |
| `swamp` | Pântano |
| `desert` | Deserto |
| `coast` | Costa |
| `freshwater` | Água doce |
| `ocean` | Oceano |
| `aquatic` | Aquático |
| `urban` | Urbano |
| `ruins` | Ruínas |
| `wilderness` | Ermos |
| `aerial` | Aéreo |
| `space` | Espaço |
| `extraplanar` | Extraplanar |
| `any` | Qualquer |
| `special` | Especial |
| `other` | Outro |

O formulário sempre deve oferecer campo complementar de texto para preservar expressões como “desertos áridos”, “qualquer ambiente subterrâneo”, “selvas tropicais” ou “plano específico”. O filtro usa os códigos normalizados; o texto complementar é apresentado na ficha.

### 12.5 Tipo de perfil

| Código | Rótulo |
|---|---|
| `primary` | Principal |
| `variant` | Variante |
| `leader` | Líder |
| `chief` | Chefe |
| `shaman` | Xamã |
| `form` | Forma |
| `caste` | Casta |
| `age` | Categoria etária |
| `other` | Outro |

---

## 13. Esquema fixo de AD&D 2ª Edição

### 13.1 Princípio de modelagem

O Livro dos Monstros utiliza expressões como `3+1`, `5 (10)`, `1-8/1-8/3-24`, `17-13`, `Variável`, `Ver abaixo` e combinações de armas. Por isso, as estatísticas de AD&D devem ser armazenadas predominantemente como texto validado por tamanho, não como números forçados.

Um monstro pode possuir múltiplas colunas, formas, castas ou variações. O aplicativo representará isso por múltiplos **perfis**, cada um contendo o bloco estatístico completo. Para um monstro simples, haverá um único perfil chamado `Padrão`.

### 13.2 Identidade do monstro AD&D

| ID JSON | Rótulo | Tipo | Obrigatório | Limite/validação |
|---|---|---|---:|---|
| `name` | Nome | Texto curto | Sim | 1–120 caracteres |
| `editorialCategory` | Família/categoria editorial | Texto curto | Não | Até 160 |
| `image` | Imagem | Imagem | Não | Regras da seção 23 |
| `narratives` | Seções narrativas | Objeto | Sim | Ver 13.5 |
| `sources` | Referências | Lista estruturada | Não | Até 10 referências |
| `auxiliaryTables` | Tabelas complementares | Lista estruturada | Não | Até 10 tabelas |

### 13.3 Campos comuns de cada perfil AD&D

| ID JSON | Rótulo | Tipo | Obrigatório |
|---|---|---|---:|
| `label` | Nome do perfil | Texto curto | Sim |
| `kind` | Tipo do perfil | Seleção | Sim |
| `climates` | Clima | Seleção múltipla | Sim |
| `terrains` | Terreno | Seleção múltipla | Sim |
| `climateTerrainNotes` | Complemento de Clima/Terreno | Texto curto | Não |
| `frequency` | Frequência | Seleção controlada | Sim |
| `frequencyOther` | Outra frequência | Texto curto | Condicional |
| `organization` | Organização | Texto curto | Sim |
| `activityPeriods` | Período de atividade | Seleção múltipla | Sim |
| `activityNotes` | Complemento de atividade | Texto curto | Condicional |
| `diet` | Dieta | Texto curto | Sim |
| `treasure` | Tesouro | Texto curto | Sim |
| `quantityEncounter` | Quantidade/Encontro | Texto curto | Sim |
| `size` | Tamanho | Texto curto | Sim |
| `morale` | Moral | Texto curto | Sim |
| `profileNotes` | Observações do perfil | Markdown limitado | Não |

Limites recomendados: 120 caracteres para campos curtos, 240 para Movimento e Dano/Ataque, 3.000 para observações.

### 13.4 Estatísticas de cada perfil AD&D

| ID JSON | Rótulo | Tipo | Obrigatório | Exemplo |
|---|---|---|---:|---|
| `intelligence` | Inteligência | Texto curto | Sim | `Baixa a Média (5-10)` |
| `alignment` | Tendência | Texto curto | Sim | `Cruel` |
| `armorClass` | CA | Texto curto | Sim | `5 (10)` |
| `movement` | Movimento | Texto curto | Sim | `9` ou `9, Vn 30 (C), Ev 4` |
| `hitDice` | Dados de Vida | Texto curto | Sim | `3+1` |
| `thac0` | TAC0 | Texto curto | Sim | `17` ou `15 (6 DV); 13 (7-8 DV)` |
| `attacksPerRound` | Nº de Ataques | Texto curto | Sim | `1` ou `3 + especial` |
| `damagePerAttack` | Dano/Ataque | Texto curto | Sim | `2-8 (2d4) ou com arma` |
| `specialAttacks` | Ataques Especiais | Texto longo curto | Sim | `Surpresa, +2 no dano` |
| `specialDefenses` | Defesas Especiais | Texto longo curto | Sim | `Nula` |
| `magicResistance` | Proteção à Magia | Texto curto | Sim | `20%` ou `Variável` |
| `experienceValue` | Valor em XP | Texto curto | Sim | `120` ou `Variável` |
| `psionics` | Psiônicos | Objeto opcional | Não | Ver 13.6 |

A aplicação não deve interpretar, recalcular ou corrigir essas expressões.

### 13.5 Seções narrativas AD&D

| ID JSON | Rótulo | Tipo | Obrigatório |
|---|---|---|---:|
| `description` | Descrição | Markdown limitado | Sim |
| `combat` | Combate | Markdown limitado | Sim |
| `habitatSociety` | Habitat/Sociedade | Markdown limitado | Sim |
| `ecology` | Ecologia | Markdown limitado | Sim |
| `variations` | Variações | Markdown limitado | Não |
| `additionalNotes` | Notas adicionais | Markdown limitado | Não |

Cada campo aceita até 50.000 caracteres. O Markdown permitido está definido na seção 22.

### 13.6 Psiônicos AD&D

O bloco opcional deve possuir:

| ID JSON | Rótulo | Tipo |
|---|---|---|
| `level` | Nível | Texto curto |
| `disciplinesSciencesDevotions` | Dis/Cien/Dev | Texto curto |
| `attackDefenseModes` | Ataque/Defesa | Texto curto |
| `powerScore` | Número de Poder | Texto curto |
| `psps` | PPPs | Texto curto |
| `powers` | Poderes por disciplina | Markdown limitado |

O bloco só aparece na ficha quando habilitado.

### 13.7 Tabelas complementares AD&D

Tabelas complementares atendem casos como:

- categorias etárias de dragões;
- feições de Yuan-ti;
- progressões por forma;
- múltiplas castas;
- resultados de mutação;
- tabelas próprias de um verbete.

Cada tabela possui:

```text
id, title, columns[], rows[], notes, sortOrder
```

Regras:

- até 20 colunas;
- até 200 linhas;
- cabeçalho de 1 a 80 caracteres;
- célula de até 500 caracteres;
- alinhamento por coluna: esquerda, centro ou direita;
- nenhum HTML;
- preservação da ordem das colunas e linhas;
- rolagem horizontal restrita ao contêiner da tabela na ficha.

### 13.8 Layout somente leitura de AD&D

A ficha deve preservar a estrutura semântica do Livro dos Monstros, sem copiar ornamentação, marcas ou tipografia proprietária:

1. título e categoria editorial;
2. imagem;
3. matriz de estatísticas;
4. perfis em colunas quando houver espaço;
5. seletor de perfil em telas estreitas;
6. bloco de Psiônicos quando existir;
7. tabelas complementares;
8. seções Descrição, Combate, Habitat/Sociedade e Ecologia;
9. referências.

A identidade visual geral deve permanecer coerente com a aplicação e com o Bestiário Shadowlords: fundo claro, títulos em azul-escuro, linhas discretas e alta legibilidade.


## 14. Esquema fixo de Shadowlords Mini System 3E

### 14.1 Princípio de modelagem

A ficha de Shadowlords deve armazenar valores operacionais finais, não cálculos de conversão de AD&D. Tendência, TAC0, CA, Dados de Vida e Valor em XP não fazem parte do bloco final de Shadowlords.

O modelo deve suportar:

- atributos FOR, AGI, SAÚ, INT, SAB e PER;
- PV;
- Defesa Natural, bônus externos e Defesa Final;
- múltiplas Reduções de Dano;
- múltiplos ataques;
- Defesa Ativa;
- Habilidades;
- movimento;
- traços, imunidades, resistências, fraquezas, sentidos, táticas e magia;
- perfis adicionais para líderes, chefes, xamãs, formas e castas;
- exatamente cinco perfis etários quando o módulo dracônico estiver habilitado.

### 14.2 Identidade do monstro Shadowlords

| ID JSON | Rótulo | Tipo | Obrigatório | Regra |
|---|---|---|---:|---|
| `name` | Nome | Texto curto | Sim | 1–120 caracteres |
| `descriptors` | Descritores | Lista de textos | Não | 0–6 itens, até 80 caracteres cada |
| `image` | Imagem | Imagem | Não | Seção 23 |
| `narratives` | Seções narrativas | Objeto | Sim | Ver 14.8 |
| `sources` | Referências | Lista estruturada | Não | Até 10 |
| `dragonModuleEnabled` | Módulo dracônico | Booleano | Sim | Padrão `false` |

Os descritores aparecem abaixo do nome, separados por ponto médio, como no modelo do Bugbear.

### 14.3 Campos gerais de cada perfil Shadowlords

| ID JSON | Rótulo | Tipo | Obrigatório |
|---|---|---|---:|
| `label` | Nome do perfil | Texto curto | Sim |
| `kind` | Tipo do perfil | Seleção | Sim |
| `climates` | Clima | Seleção múltipla | Sim |
| `terrains` | Terreno | Seleção múltipla | Sim |
| `climateTerrainNotes` | Complemento de Clima/Terreno | Texto curto | Não |
| `frequency` | Frequência | Seleção controlada | Sim |
| `frequencyOther` | Outra frequência | Texto curto | Condicional |
| `organization` | Organização | Texto curto | Sim |
| `activityPeriods` | Período de atividade | Seleção múltipla | Sim |
| `activityNotes` | Complemento de atividade | Texto curto | Condicional |
| `diet` | Dieta | Texto curto | Sim |
| `quantityEncounter` | Quantidade/Encontro | Texto curto | Sim |
| `size` | Tamanho | Texto curto | Sim |
| `morale` | Moral | Texto curto | Sim |
| `treasure` | Tesouro | Texto curto | Sim |
| `specialDefensesSummary` | Defesas Especiais | Texto curto/Markdown limitado | Sim |
| `magicProtectionSummary` | Proteção à Magia | Texto curto/Markdown limitado | Sim |
| `profileNotes` | Observações do perfil | Markdown limitado | Não |

Valores inexistentes devem ser registrados explicitamente como `Nenhuma`, `Nenhum` ou equivalente editorial, em vez de deixar o campo obrigatório em branco.

### 14.4 Atributos

```json
{
  "for": 2,
  "agi": 1,
  "sau": 1,
  "int": 0,
  "sab": 0,
  "per": -1
}
```

Regras:

- cada valor é inteiro;
- intervalo normal permitido: `-1` a `+3`;
- o formulário deve exibir sinal positivo;
- valores fora do intervalo devem ser rejeitados no MVP;
- o rótulo `SAÚ` deve ser apresentado com acento, mas a chave JSON será `sau`.

### 14.5 PV e Defesa

#### PV

- inteiro obrigatório;
- mínimo 1;
- máximo técnico 9.999;
- nenhuma fórmula de DV será armazenada no esquema Shadowlords.

#### Defesa

```json
{
  "natural": 11,
  "armorBonus": 2,
  "shieldBonus": 0,
  "magicBonus": 0,
  "otherBonus": 0,
  "otherDescription": "",
  "final": 13
}
```

Regras:

1. `natural` deve estar entre 1 e 15;
2. `armorBonus`, `shieldBonus`, `magicBonus` e `otherBonus` são inteiros entre -10 e +20;
3. `final` é calculado e somente leitura;
4. `final = natural + armorBonus + shieldBonus + magicBonus + otherBonus`;
5. o importador deve rejeitar um pacote cujo `final` não corresponda à soma;
6. bônus externos podem elevar a Defesa Final acima de 15;
7. a ficha deve apresentar a decomposição, não somente o total.

### 14.6 Redução de Dano

Cada perfil pode ter zero ou mais entradas:

```json
{
  "id": "uuid",
  "source": "Cota de malha",
  "value": 4,
  "damageTypes": ["slashing", "piercing"],
  "usesMode": "limited",
  "uses": 6,
  "notes": ""
}
```

Campos:

| Campo | Tipo | Regra |
|---|---|---|
| `source` | Texto curto | Obrigatório, até 120 |
| `value` | Inteiro | 1–99 |
| `damageTypes` | Seleção múltipla | Pelo menos um tipo |
| `usesMode` | Enum | `limited`, `unlimited`, `special` |
| `uses` | Inteiro ou nulo | Obrigatório quando `limited` |
| `notes` | Texto curto | Até 500 |

Tipos iniciais de dano:

- `slashing`: cortante;
- `piercing`: perfurante;
- `bludgeoning`: contundente;
- `fire`: fogo;
- `cold`: frio;
- `electricity`: eletricidade;
- `acid`: ácido;
- `poison`: veneno;
- `magic`: mágico;
- `physical`: físico;
- `all`: todos;
- `other`: outro.

`other` exige complemento em `notes`.

### 14.7 Ataques, Defesa Ativa, Habilidades, Traços e Magias

#### Ataques

Cada ataque possui:

```json
{
  "id": "uuid",
  "name": "Maça pesada",
  "attackFormula": "3d6+3",
  "attackNotes": "FOR +2; Combate +1",
  "damageFormula": "2d6+2",
  "damageTypes": ["bludgeoning"],
  "range": "Corpo a corpo",
  "maxUsesPerRound": 1,
  "notes": "Emboscada: +2 no dano",
  "sortOrder": 0
}
```

Regras:

- ao menos um ataque no perfil principal, salvo criaturas explicitamente não combatentes;
- fórmulas são texto de até 80 caracteres;
- `maxUsesPerRound` aceita inteiro de 0 a 10 ou nulo quando especial;
- a aplicação não rola dados nem calcula dano;
- ataques podem ser reordenados.

#### Defesa Ativa

```json
{
  "enabled": true,
  "formula": "3d6+2",
  "cost": "Próxima ação de movimento",
  "restrictions": "Não se aplica a surpresa, áreas ou alvo impedido de se mover.",
  "notes": "Combate +1; AGI +1"
}
```

O formulário não deve inferir automaticamente a regra a partir das Habilidades, pois monstros podem possuir exceções. `enabled=false` oculta os demais campos.

#### Habilidades

```json
{
  "id": "uuid",
  "name": "Furtividade",
  "modifier": 2,
  "notes": "",
  "sortOrder": 0
}
```

- nome: 1–120;
- modificador: inteiro entre -5 e +10;
- o valor deve ser exibido com sinal;
- duplicatas são permitidas apenas quando as notas distinguem contextos; o formulário deve avisar, mas não bloquear.

#### Traços

Categorias:

- `special` — especial;
- `sense` — sentido;
- `immunity` — imunidade;
- `resistance` — resistência;
- `weakness` — fraqueza/contrajogo;
- `innate_power` — poder inato;
- `tactic` — tática;
- `reaction` — reação;
- `aura` — aura;
- `other` — outro.

Estrutura:

```json
{
  "id": "uuid",
  "name": "Emboscada",
  "category": "special",
  "summary": "+2 no dano contra alvo surpreendido.",
  "details": "Texto em Markdown limitado.",
  "uses": "À vontade",
  "recharge": "",
  "sortOrder": 0
}
```

#### Magias e poderes semelhantes

```json
{
  "id": "uuid",
  "name": "Cura",
  "mode": "spell",
  "castingSkill": "Religião",
  "pvCost": 2,
  "uses": "",
  "recharge": "",
  "notes": "Cura 2d6 PV.",
  "sortOrder": 0
}
```

`mode` aceita:

- `spell`: magia com custo/teste;
- `innate`: poder inato;
- `item`: poder proveniente de item;
- `special`: resolução especial.

`pvCost` é obrigatório apenas para `spell` quando a ficha informar custo.

### 14.8 Seções narrativas Shadowlords

| ID JSON | Rótulo | Tipo | Obrigatório |
|---|---|---|---:|
| `description` | Descrição | Markdown limitado | Sim |
| `combat` | Combate | Markdown limitado | Sim |
| `habitatSociety` | Habitat e Sociedade | Markdown limitado | Sim |
| `ecology` | Ecologia | Markdown limitado | Sim |
| `tactics` | Táticas | Markdown limitado | Não |
| `variations` | Variações | Markdown limitado | Não |
| `additionalNotes` | Notas adicionais | Markdown limitado | Não |

Até 50.000 caracteres por seção.

### 14.9 Perfis adicionais e variações

O Bugbear demonstra variantes de líder, chefe e xamã. Em vez de uma única célula rica, cada variante será um perfil completo, podendo omitir visualmente dados idênticos na tabela comparativa.

Regras:

- o formulário deve permitir **Duplicar perfil principal**;
- a cópia recebe novo UUID;
- o usuário ajusta somente os valores divergentes;
- a ficha comparativa exibe Nome do perfil, PV, Defesa, ataques, dano, RD e resumo de traços;
- ao selecionar a variante, a ficha completa do perfil deve ser apresentada;
- variantes não possuem narrativa própria no MVP; notas específicas ficam em `profileNotes`.

### 14.10 Módulo dracônico

Quando `dragonModuleEnabled=true`:

1. devem existir exatamente cinco perfis com `kind=age`;
2. devem existir exatamente os códigos:
   - `hatchling` — Filhote;
   - `young` — Jovem;
   - `adult` — Adulto;
   - `old` — Antigo;
   - `ancient` — Ancião;
3. não podem existir categorias etárias adicionais;
4. cada perfil etário deve conter o objeto `dragon`;
5. perfis não etários adicionais são permitidos apenas como variantes excepcionais, sem substituir as cinco idades.

Estrutura do objeto `dragon`:

```json
{
  "ageCategory": "adult",
  "breath": {
    "name": "Sopro elétrico",
    "shape": "line",
    "element": "Eletricidade",
    "damage": "4d6+2",
    "area": "Linha de 30 × 1,5 m",
    "saveAttribute": "AGI",
    "difficulty": 14,
    "successEffect": "Metade do dano",
    "activeDefenseAllowed": false,
    "frequency": "Uma vez a cada três rodadas",
    "actionRestrictions": "Substitui todas as demais ações ofensivas da rodada."
  },
  "maxPhysicalAttacksPerRound": 2,
  "maxBitesPerRound": 1,
  "airbornePhysicalAttackLimit": 1,
  "notes": ""
}
```

Validações normativas:

- `maxPhysicalAttacksPerRound` não pode exceder 2;
- `maxBitesPerRound` não pode exceder 1;
- se `shape=line`, a aplicação não deve calcular dano; apenas armazenar o valor final informado;
- a dificuldade, frequência, elemento, área e demais particularidades não devem ser generalizadas entre espécies;
- o módulo não gera poderes ou progressões automaticamente;
- Defesa Natural continua limitada a 15;
- Tendência e XP não aparecem.

### 14.11 Layout somente leitura de Shadowlords

A composição visual deve seguir o modelo definitivo do Bugbear:

1. nome em destaque e descritores abaixo;
2. bloco geral com linhas alternadas e imagem ao lado em telas largas;
3. título `ESTATÍSTICAS`;
4. faixa horizontal de seis atributos;
5. linhas para PV, Defesa, RD, Ataques, Dano, Defesa Ativa, Habilidades, Movimento e Especiais;
6. página contínua responsiva, sem simular paginação A4;
7. narrativas em duas colunas quando houver largura mínima de 1100 px e em uma coluna abaixo disso;
8. quadro de Liderança e Variações;
9. referência ao final;
10. rodapé visual discreto opcional, sem numeração de página.

Para múltiplos ataques, RD, Habilidades ou traços, as linhas podem conter listas empilhadas. Para dragões, a ficha deve oferecer abas por idade e uma tabela comparativa com as cinco categorias.

---

## 15. Referências de fonte do monstro

Cada monstro pode possuir até dez referências:

```json
{
  "id": "uuid",
  "title": "Advanced Dungeons & Dragons, 2ª Edição, Livro dos Monstros",
  "entry": "Bugbear",
  "page": "38",
  "notes": "",
  "sortOrder": 0
}
```

Regras:

- `title` obrigatório, até 300 caracteres;
- `entry`, `page` e `notes` opcionais;
- nenhuma URL externa será aberta automaticamente;
- a ficha deve exibir as referências em texto simples.

---

## 16. Arquitetura de software

### 16.1 Stack normativa

Baseline validado em 23 de novembro de 2026:

| Camada | Tecnologia |
|---|---|
| Contêiner nativo | Tauri 2.x |
| Interface | React 19.3 |
| Linguagem frontend | TypeScript 7.x |
| Build frontend | Vite 8.1 |
| Runtime de desenvolvimento | Node.js 26 LTS |
| Gerenciador de pacotes | pnpm, com lockfile versionado |
| Núcleo nativo | Rust estável, mínimo compatível com Tauri/plugins; no baseline, Rust 1.90 ou superior |
| Banco | SQLite 3.x, embarcado |
| Acesso ao banco | Rust com `sqlx`, sem API SQL genérica exposta ao WebView |
| Validação de intercâmbio | JSON Schema Draft 2020-12 |
| Testes frontend | Vitest + Testing Library |
| Testes E2E | WebdriverIO/Tauri WebDriver ou solução equivalente suportada pelo Tauri |
| Estilo | CSS moderno com design tokens; biblioteca headless apenas para acessibilidade de componentes complexos |
| Ícones | Conjunto local e vetorial, sem carregamento remoto |

As versões exatas devem ser fixadas no `package.json`, `pnpm-lock.yaml`, `Cargo.lock` e `rust-toolchain.toml`. Atualizações de versão durante o desenvolvimento exigem testes completos e ADR quando houver mudança de major.

### 16.2 Por que Tauri e não navegador puro

A interface continuará sendo uma aplicação web comum e poderá ser executada em navegador durante desenvolvimento com adaptadores simulados. A distribuição de produção usará Tauri porque o produto precisa de:

- SQLite privado e confiável;
- acesso controlado a arquivos ZIP e imagens;
- gravação no diretório privado da aplicação;
- importação e exportação grandes sem carregar tudo na memória do navegador;
- transações coordenadas entre banco e arquivos;
- instalador Windows;
- caminho de evolução para macOS, Linux e Android.

Não será criada uma PWA de produção no MVP.

### 16.3 Camadas

```text
┌──────────────────────────────────────────────────────────────┐
│ Interface React                                             │
│ telas, componentes, formulários, tema, acessibilidade       │
├──────────────────────────────────────────────────────────────┤
│ Aplicação TypeScript                                        │
│ casos de uso, view models, validação de formulário          │
├──────────────────────────────────────────────────────────────┤
│ Porta IPC tipada                                            │
│ comandos Tauri, DTOs e tratamento de erros                  │
├──────────────────────────────────────────────────────────────┤
│ Núcleo Rust                                                 │
│ domínio, serviços, importação/exportação, imagens, segurança│
├──────────────────────────────────────────────────────────────┤
│ Infraestrutura                                              │
│ SQLite, sistema de arquivos, ZIP, hashes, logs              │
└──────────────────────────────────────────────────────────────┘
```

### 16.4 Regra de dependência

- componentes visuais não acessam banco, arquivos ou APIs Tauri diretamente;
- telas chamam casos de uso;
- casos de uso dependem de interfaces de serviço;
- o adaptador Tauri implementa essas interfaces;
- regras de domínio não importam React;
- o núcleo Rust não conhece componentes visuais;
- contratos IPC são versionados e tipados.

### 16.5 Organização recomendada do repositório

```text
biblioteca-monstros-digital/
├── docs/
│   ├── specification/
│   └── adr/
├── schemas/
│   ├── exchange/v1/
│   ├── add2e/v1/
│   └── shadowlords3e/v1/
├── fixtures/
│   ├── add2e/
│   ├── shadowlords3e/
│   ├── imports-valid/
│   └── imports-invalid/
├── src/
│   ├── app/
│   ├── routes/
│   ├── features/
│   │   ├── libraries/
│   │   ├── monsters/
│   │   ├── import-export/
│   │   ├── trash/
│   │   └── image-viewer/
│   ├── domain/
│   ├── application/
│   ├── infrastructure/
│   │   ├── tauri/
│   │   └── browser-mock/
│   ├── components/
│   ├── styles/
│   └── generated/
├── src-tauri/
│   ├── capabilities/
│   ├── migrations/
│   ├── src/
│   │   ├── commands/
│   │   ├── domain/
│   │   ├── persistence/
│   │   ├── import_export/
│   │   ├── images/
│   │   ├── security/
│   │   ├── logging/
│   │   └── error.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── tests/
├── package.json
├── pnpm-lock.yaml
└── README.md
```

### 16.6 Comandos IPC mínimos

Os nomes são referenciais; os contratos são obrigatórios.

```text
app_initialize
app_get_info
library_list
library_get
library_create
library_update
library_move_to_trash
library_restore
library_delete_permanently
monster_list
monster_get
monster_create
monster_update
monster_archive
monster_unarchive
monster_move_to_trash
monster_restore
monster_delete_permanently
image_select_and_import
image_remove
package_inspect
package_import_library
package_import_monster
package_export_library
package_export_monster
trash_list
trash_purge_expired
preferences_get
preferences_update
```

Cada comando deve:

- aceitar DTO tipado;
- validar entradas;
- retornar erro estruturado;
- não expor caminhos internos desnecessários;
- registrar falhas técnicas sem registrar conteúdo narrativo completo.


## 17. Persistência e modelo de dados

### 17.1 Diretórios da aplicação

Usar os diretórios fornecidos pela plataforma, nunca caminhos relativos ao executável.

Estrutura lógica:

```text
<AppData>/BibliotecaMonstrosDigital/
├── data/
│   ├── library.db
│   └── library.db.backup-before-migration
├── images/
│   ├── libraries/<library-uuid>/cover.webp
│   └── monsters/<monster-uuid>/
│       ├── main.webp
│       └── thumb.webp
├── staging/
│   ├── imports/<operation-uuid>/
│   └── exports/<operation-uuid>/
├── backups/
│   └── import-journals/
└── logs/
```

Caminhos persistidos no banco devem ser relativos à raiz privada da aplicação e usar `/` como separador lógico.

### 17.2 Modelo híbrido

O núcleo relacional serve para:

- identidade;
- relacionamentos;
- estados;
- datas;
- pesquisa e filtros;
- preferências;
- integridade;
- controle de versões.

Dados específicos de cada sistema ficam em JSON validado por esquema, reduzindo migrações de banco para futuras versões do formulário. O JSON não é livre: deve obedecer ao esquema versionado.

### 17.3 Tabelas obrigatórias

#### `app_meta`

| Coluna | Tipo | Regra |
|---|---|---|
| `key` | TEXT PK | Chave estável |
| `value` | TEXT | Valor |

Chaves iniciais: `database_schema_version`, `last_purge_at`, `installation_id`.

#### `systems`

| Coluna | Tipo | Regra |
|---|---|---|
| `code` | TEXT PK | `add2e`, `shadowlords3e` |
| `display_name` | TEXT | Nome apresentado |
| `schema_key` | TEXT | `add2e.monster`, `shadowlords3e.monster` |
| `schema_version` | INTEGER | Inicial 1 |
| `enabled` | INTEGER | 1 no MVP |

#### `libraries`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `system_code` | TEXT FK | Imutável após primeiro monstro |
| `name` | TEXT | 1–120 |
| `sort_name` | TEXT | Nome normalizado |
| `image_path` | TEXT NULL | Caminho relativo |
| `image_hash` | TEXT NULL | SHA-256 hexadecimal |
| `image_width` | INTEGER NULL | Pixels |
| `image_height` | INTEGER NULL | Pixels |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |
| `deleted_at` | TEXT NULL | Lixeira |
| `purge_after` | TEXT NULL | 30 dias após remoção |
| `row_version` | INTEGER | Otimista, inicia 1 |

Índices: `sort_name`, `system_code`, `deleted_at`.

#### `monsters`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `library_id` | TEXT FK | `ON DELETE CASCADE` |
| `name` | TEXT | 1–120 |
| `sort_name` | TEXT | Nome normalizado |
| `status` | TEXT | `active`, `archived`, `trashed` |
| `previous_status` | TEXT NULL | Estado anterior à lixeira |
| `schema_key` | TEXT | Igual ao sistema |
| `schema_version` | INTEGER | Inicial 1 |
| `document_json` | TEXT | JSON validado do monstro |
| `image_path` | TEXT NULL | Imagem principal |
| `thumbnail_path` | TEXT NULL | Miniatura |
| `image_hash` | TEXT NULL | SHA-256 |
| `image_width` | INTEGER NULL | Pixels |
| `image_height` | INTEGER NULL | Pixels |
| `content_hash` | TEXT | Hash canônico do conteúdo |
| `created_at` | TEXT | UTC |
| `updated_at` | TEXT | UTC |
| `archived_at` | TEXT NULL | UTC |
| `deleted_at` | TEXT NULL | UTC |
| `purge_after` | TEXT NULL | UTC |
| `row_version` | INTEGER | Inicia 1 |

Restrições:

- `status` por `CHECK`;
- `document_json` deve ser JSON válido;
- `library_id` deve existir;
- o sistema do documento deve corresponder ao da biblioteca.

Índices: `(library_id, status, sort_name)`, `(library_id, updated_at)`, `purge_after`.

#### `monster_profiles`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | TEXT PK | UUID v4 |
| `monster_id` | TEXT FK | `ON DELETE CASCADE` |
| `label` | TEXT | 1–120 |
| `kind` | TEXT | Vocabulário controlado |
| `is_primary` | INTEGER | 0/1 |
| `sort_order` | INTEGER | >= 0 |
| `frequency_code` | TEXT | Vocabulário |
| `frequency_other` | TEXT NULL | Condicional |
| `organization` | TEXT | Campo comum |
| `diet` | TEXT | Campo comum |
| `quantity_encounter` | TEXT | Campo comum |
| `size_text` | TEXT | Campo comum |
| `morale_text` | TEXT | Campo comum |
| `treasure_text` | TEXT | Campo comum |
| `climate_terrain_notes` | TEXT NULL | Campo comum |
| `activity_notes` | TEXT NULL | Campo comum |
| `special_defenses_summary` | TEXT NULL | Campo comum |
| `magic_protection_summary` | TEXT NULL | Campo comum |
| `stats_json` | TEXT | JSON do sistema |
| `content_hash` | TEXT | Hash canônico do perfil |

Restrições:

- pelo menos um perfil por monstro;
- índice único parcial garantindo um único `is_primary=1` por monstro;
- `stats_json` validado pelo esquema do sistema.

#### `profile_climates`

`profile_id`, `code`, `other_text`; PK composta.  
#### `profile_terrains`

`profile_id`, `code`, `other_text`; PK composta.  
#### `profile_activity_periods`

`profile_id`, `code`, `other_text`; PK composta.

Essas tabelas são projeções pesquisáveis e devem ser atualizadas na mesma transação do perfil.

#### `library_view_preferences`

| Coluna | Tipo |
|---|---|
| `library_id` | TEXT PK/FK |
| `view_mode` | TEXT: `list` ou `grid` |
| `sort_direction` | TEXT: `asc` ou `desc` |
| `updated_at` | TEXT |

#### `import_journal`

| Coluna | Tipo | Uso |
|---|---|---|
| `operation_id` | TEXT PK | UUID |
| `kind` | TEXT | `library`, `monster` |
| `state` | TEXT | `staging`, `db_pending`, `files_swapped`, `committed`, `rolled_back` |
| `source_path_hash` | TEXT | Não armazenar caminho completo em log comum |
| `payload_json` | TEXT | Dados mínimos de recuperação |
| `created_at` | TEXT | UTC |
| `updated_at` | TEXT | UTC |

O aplicativo deve recuperar ou reverter operações incompletas na inicialização.

### 17.4 Integridade e transações

- todas as chaves estrangeiras devem estar habilitadas;
- `journal_mode=WAL` é recomendado;
- `busy_timeout` deve ser configurado;
- gravações de entidade e projeções devem ocorrer na mesma transação;
- arquivos de imagem devem ser escritos primeiro em staging;
- substituições usam rename atômico no mesmo volume;
- falha antes do commit não pode alterar a visão persistida;
- falha depois de troca de arquivos deve ser resolvida pelo `import_journal` na próxima inicialização.

### 17.5 Normalização para pesquisa

`sort_name` deve ser gerado pelo núcleo Rust:

1. normalização Unicode NFD;
2. remoção de marcas diacríticas;
3. conversão para minúsculas;
4. remoção de espaços nas extremidades;
5. colapso de espaços consecutivos;
6. preservação de letras, números e espaços úteis.

A busca usa a mesma normalização.

### 17.6 Concorrência e versão de linha

Mesmo sendo uma aplicação de usuário único, atualizações devem informar `expectedRowVersion`. Se o valor persistido divergir, retornar `CONFLICT_ROW_VERSION` e pedir recarga. Isso protege contra duas janelas e operações de importação simultâneas.

---

## 18. Contratos JSON internos

### 18.1 Fonte única de verdade

Os arquivos de JSON Schema em `schemas/` são normativos para:

- formulários;
- persistência de `document_json` e `stats_json`;
- importação;
- exportação;
- geração de tipos TypeScript;
- fixtures e testes.

Usar JSON Schema Draft 2020-12. O pipeline deve gerar tipos TypeScript em `src/generated/` e falhar no CI quando os tipos gerados estiverem desatualizados.

O núcleo Rust deve validar documentos importados contra os mesmos schemas antes de desserializar ou persistir.

### 18.2 Chaves e valores ausentes

- objetos opcionais ausentes devem ser omitidos ou `null` conforme o schema;
- listas devem ser `[]`, nunca `null`;
- texto opcional vazio deve ser normalizado para `null`, exceto quando a distinção entre vazio e ausente for relevante;
- números nunca devem ser serializados como texto em Shadowlords;
- expressões de AD&D permanecem texto;
- ordem de listas deve ser preservada por `sortOrder` e pela ordem do array.

### 18.3 Datas

Todas as datas de intercâmbio usam ISO 8601 UTC com `Z`, por exemplo:

```text
2026-11-23T21:45:30.123Z
```

### 18.4 UUID

- UUID v4 em minúsculas;
- relações usam UUID;
- nomes e slugs não definem identidade;
- importar como cópia gera novos UUIDs para a entidade e todos os filhos internos.

### 18.5 Hash de conteúdo

Usar SHA-256 sobre JSON canônico:

1. codificação UTF-8;
2. chaves ordenadas lexicograficamente;
3. sem espaços insignificantes;
4. strings normalizadas em NFC;
5. excluir `contentHash`, `updatedAt`, `rowVersion` e caminhos locais;
6. incluir metadados editoriais e todos os dados de ficha;
7. imagens possuem hash próprio do arquivo normalizado.

O mesmo conteúdo deve produzir o mesmo hash em instalações diferentes.

---

## 19. Formato de intercâmbio

### 19.1 Convenções gerais

- extensão externa: `.zip`;
- codificação dos JSONs: UTF-8 sem BOM;
- separador de caminho no pacote: `/`;
- compressão: Deflate;
- nenhum caminho absoluto;
- nenhum segmento `..`;
- nenhum link simbólico;
- nomes de arquivos de imagem incluem UUID e slug legível;
- JSONs não contêm imagem em Base64;
- miniaturas não são exportadas; são regeneradas na importação.

### 19.2 Pacote de biblioteca

```text
biblioteca-<slug>-<data>.zip
├── manifest.json
├── library.json
├── monsters.json
└── assets/
    ├── library/
    │   └── <library-uuid>__<slug>.webp
    └── monsters/
        ├── <monster-uuid>__<slug>.webp
        └── ...
```

### 19.3 Pacote de monstro

```text
monstro-<slug>-<data>.zip
├── manifest.json
├── monster.json
└── assets/
    └── monsters/
        └── <monster-uuid>__<slug>.webp
```

### 19.4 `manifest.json`

Exemplo:

```json
{
  "format": "biblioteca-de-monstros-digital",
  "formatVersion": 1,
  "exportKind": "library",
  "appVersion": "1.0.0",
  "exportedAt": "2026-11-23T21:45:30.123Z",
  "library": {
    "id": "2eb3f2af-bf15-4bec-92ca-8e1285220eb1",
    "systemCode": "shadowlords3e",
    "schemaKey": "shadowlords3e.monster",
    "schemaVersion": 1,
    "monsterCount": 37
  },
  "files": [
    {
      "path": "library.json",
      "mediaType": "application/json",
      "size": 1234,
      "sha256": "..."
    },
    {
      "path": "monsters.json",
      "mediaType": "application/json",
      "size": 45678,
      "sha256": "..."
    },
    {
      "path": "assets/monsters/uuid__bugbear.webp",
      "mediaType": "image/webp",
      "size": 345678,
      "sha256": "...",
      "entityType": "monster",
      "entityId": "uuid"
    }
  ]
}
```

Regras:

- `format` deve ser exato;
- `formatVersion` inicial é 1;
- `exportKind` é `library` ou `monster`;
- cada arquivo, exceto o próprio manifesto, deve ser listado;
- nenhum arquivo extra é aceito sem aviso; arquivos executáveis são rejeitados;
- o importador verifica tamanho e SHA-256 antes de processar os JSONs.

### 19.5 `library.json`

```json
{
  "id": "2eb3f2af-bf15-4bec-92ca-8e1285220eb1",
  "name": "Bestiário Shadowlords",
  "system": {
    "code": "shadowlords3e",
    "schemaKey": "shadowlords3e.monster",
    "schemaVersion": 1
  },
  "image": {
    "path": "assets/library/2eb3f2af-bf15-4bec-92ca-8e1285220eb1__bestiario-shadowlords.webp",
    "mediaType": "image/webp",
    "width": 1024,
    "height": 1024,
    "sha256": "..."
  },
  "createdAt": "2026-11-20T10:00:00.000Z",
  "updatedAt": "2026-11-23T20:00:00.000Z"
}
```

`image` pode ser `null`.

### 19.6 `monsters.json`

```json
{
  "libraryId": "2eb3f2af-bf15-4bec-92ca-8e1285220eb1",
  "systemCode": "shadowlords3e",
  "schemaKey": "shadowlords3e.monster",
  "schemaVersion": 1,
  "monsters": []
}
```

Cada item de `monsters` segue a união discriminada descrita nas seções 20 e 21.

### 19.7 Compatibilidade de versões

- versão igual: importar normalmente;
- versão anterior com migrador explícito: migrar em staging e mostrar relatório;
- versão anterior sem migrador: rejeitar com instrução clara;
- versão futura: rejeitar sem descartar dados;
- campos desconhecidos não devem ser silenciosamente removidos;
- o aplicativo deve preservar o ZIP original quando a importação falhar, sem alterá-lo.


## 20. Exemplo canônico de monstro AD&D exportado

O exemplo é estrutural e não pretende reproduzir integralmente um verbete publicado.

```json
{
  "id": "b0a1174e-92ad-4dc8-8ecb-b0ec097f743e",
  "libraryId": "3aecc5b5-4b4a-4d32-a737-36cb2815fcc3",
  "systemCode": "add2e",
  "schemaKey": "add2e.monster",
  "schemaVersion": 1,
  "name": "Bugbear",
  "editorialCategory": null,
  "status": "active",
  "image": {
    "path": "assets/monsters/b0a1174e-92ad-4dc8-8ecb-b0ec097f743e__bugbear.webp",
    "mediaType": "image/webp",
    "width": 1536,
    "height": 2048,
    "sha256": "..."
  },
  "narratives": {
    "description": "Texto em Markdown limitado.",
    "combat": "Texto em Markdown limitado.",
    "habitatSociety": "Texto em Markdown limitado.",
    "ecology": "Texto em Markdown limitado.",
    "variations": null,
    "additionalNotes": null
  },
  "profiles": [
    {
      "id": "0dcbeb52-e1ff-4dc8-a283-f0568b2e675f",
      "label": "Padrão",
      "kind": "primary",
      "isPrimary": true,
      "sortOrder": 0,
      "climates": [{"code": "any", "other": null}],
      "terrains": [{"code": "underground", "other": null}],
      "climateTerrainNotes": "Qualquer subterrâneo",
      "frequency": {"code": "uncommon", "other": null},
      "organization": "Tribal",
      "activityPeriods": [{"code": "any", "other": null}],
      "activityNotes": null,
      "diet": "Carnívora",
      "treasure": "Individual: J, K, L, M; covil: B",
      "quantityEncounter": "2-8 (2d4)",
      "size": "G (2 m de altura)",
      "morale": "Resoluto a Elite (11-13)",
      "profileNotes": null,
      "statistics": {
        "type": "add2e",
        "intelligence": "Baixa a Média (5-10)",
        "alignment": "Cruel",
        "armorClass": "5 (10)",
        "movement": "9",
        "hitDice": "3+1",
        "thac0": "17",
        "attacksPerRound": "1",
        "damagePerAttack": "2-8 (2d4) ou com arma",
        "specialAttacks": "Surpresa, +2 no dano",
        "specialDefenses": "Nula",
        "magicResistance": "Nula",
        "experienceValue": "120",
        "psionics": null
      }
    }
  ],
  "auxiliaryTables": [],
  "sources": [
    {
      "id": "07d70494-6453-47d2-bf65-c7925e873adf",
      "title": "Advanced Dungeons & Dragons, 2ª Edição, Livro dos Monstros",
      "entry": "Bugbear",
      "page": "38",
      "notes": null,
      "sortOrder": 0
    }
  ],
  "contentHash": "...",
  "createdAt": "2026-11-23T10:00:00.000Z",
  "updatedAt": "2026-11-23T10:00:00.000Z"
}
```

---

## 21. Exemplo canônico de monstro Shadowlords exportado

```json
{
  "id": "5dc96658-53b4-49ae-8c87-e8ad409de52b",
  "libraryId": "2eb3f2af-bf15-4bec-92ca-8e1285220eb1",
  "systemCode": "shadowlords3e",
  "schemaKey": "shadowlords3e.monster",
  "schemaVersion": 1,
  "name": "Bugbear",
  "descriptors": [
    "Humanoide monstruoso",
    "guerreiro tribal",
    "caçador de emboscadas"
  ],
  "dragonModuleEnabled": false,
  "status": "active",
  "image": {
    "path": "assets/monsters/5dc96658-53b4-49ae-8c87-e8ad409de52b__bugbear.webp",
    "mediaType": "image/webp",
    "width": 1536,
    "height": 2048,
    "sha256": "..."
  },
  "narratives": {
    "description": "Texto em Markdown limitado.",
    "combat": "Texto em Markdown limitado.",
    "habitatSociety": "Texto em Markdown limitado.",
    "ecology": "Texto em Markdown limitado.",
    "tactics": null,
    "variations": null,
    "additionalNotes": null
  },
  "profiles": [
    {
      "id": "4930b572-acb8-4552-bb85-a88d4e26d0a1",
      "label": "Bugbear comum",
      "kind": "primary",
      "isPrimary": true,
      "sortOrder": 0,
      "climates": [{"code": "any", "other": null}],
      "terrains": [{"code": "underground", "other": null}],
      "climateTerrainNotes": "Qualquer ambiente subterrâneo",
      "frequency": {"code": "uncommon", "other": null},
      "organization": "Tribal",
      "activityPeriods": [{"code": "any", "other": null}],
      "activityNotes": null,
      "diet": "Carnívora",
      "treasure": "Individual: J, K, L, M; covil: B",
      "quantityEncounter": "2d4 (2 a 8)",
      "size": "Grande, cerca de 2 m",
      "morale": "Resoluto a elite (+1)",
      "specialDefensesSummary": "Nenhuma",
      "magicProtectionSummary": "Nenhuma",
      "profileNotes": null,
      "statistics": {
        "type": "shadowlords3e",
        "attributes": {
          "for": 2,
          "agi": 1,
          "sau": 1,
          "int": 0,
          "sab": 0,
          "per": -1
        },
        "hitPoints": 15,
        "defense": {
          "natural": 11,
          "armorBonus": 2,
          "shieldBonus": 0,
          "magicBonus": 0,
          "otherBonus": 0,
          "otherDescription": null,
          "final": 13
        },
        "damageReductions": [
          {
            "id": "ef1c5893-ffdd-47ca-8d87-caf6d37bf10f",
            "source": "Cota de malha",
            "value": 4,
            "damageTypes": ["slashing", "piercing"],
            "usesMode": "limited",
            "uses": 6,
            "notes": null,
            "sortOrder": 0
          }
        ],
        "attacks": [
          {
            "id": "3d98b127-5922-45f5-8886-3bfc147cdf0e",
            "name": "Maça pesada",
            "attackFormula": "3d6+3",
            "attackNotes": "FOR +2; Combate +1",
            "damageFormula": "2d6+2",
            "damageTypes": ["bludgeoning"],
            "range": "Corpo a corpo",
            "maxUsesPerRound": 1,
            "notes": "Emboscada: +2 no dano",
            "sortOrder": 0
          }
        ],
        "activeDefense": {
          "enabled": true,
          "formula": "3d6+2",
          "cost": "Próxima ação de movimento",
          "restrictions": "Não se aplica a surpresa, áreas ou impedimento de movimento.",
          "notes": "Combate +1; AGI +1"
        },
        "skills": [
          {"id": "...", "name": "Combate", "modifier": 1, "notes": null, "sortOrder": 0},
          {"id": "...", "name": "Furtividade", "modifier": 2, "notes": null, "sortOrder": 1},
          {"id": "...", "name": "Observação", "modifier": 1, "notes": null, "sortOrder": 2}
        ],
        "movement": "Normal para humanoide grande",
        "traits": [
          {
            "id": "...",
            "name": "Emboscada",
            "category": "special",
            "summary": "+2 no dano de ataques corpo a corpo contra alvo surpreendido.",
            "details": "A vítima não pode empregar Defesa Ativa.",
            "uses": "À vontade",
            "recharge": null,
            "sortOrder": 0
          },
          {
            "id": "...",
            "name": "Infravisão",
            "category": "sense",
            "summary": "Alcance de 20 m.",
            "details": null,
            "uses": null,
            "recharge": null,
            "sortOrder": 1
          }
        ],
        "spells": [],
        "specialsSummary": "Emboscada; infravisão 20 m; audição e olfato apurados",
        "dragon": null
      }
    }
  ],
  "sources": [
    {
      "id": "...",
      "title": "Advanced Dungeons & Dragons, 2ª Edição, Livro dos Monstros",
      "entry": "Bugbear",
      "page": "38",
      "notes": null,
      "sortOrder": 0
    }
  ],
  "contentHash": "...",
  "createdAt": "2026-11-23T10:00:00.000Z",
  "updatedAt": "2026-11-23T10:00:00.000Z"
}
```

---

## 22. Markdown limitado

### 22.1 Elementos permitidos

- parágrafos;
- quebras de linha;
- negrito;
- itálico;
- listas com marcadores;
- listas numeradas;
- títulos de nível 3 a 5;
- citações;
- separador horizontal.

### 22.2 Elementos proibidos

- HTML bruto;
- JavaScript;
- CSS inline;
- imagens incorporadas;
- iframes;
- vídeo e áudio;
- links com esquemas não seguros;
- formulários;
- código executável;
- tabelas Markdown, pois tabelas de dados devem usar o componente estruturado.

### 22.3 Armazenamento e renderização

- armazenar o Markdown original;
- renderizar com HTML escapado;
- `skipHtml=true` ou equivalente;
- links, se futuramente permitidos, devem exigir confirmação e abrir externamente; no MVP, a barra de edição não oferecerá links;
- o editor deve oferecer uma barra simples para negrito, itálico, listas e títulos;
- o usuário também pode digitar Markdown diretamente;
- a prévia deve usar exatamente o mesmo renderizador da ficha.

---

## 23. Imagens

### 23.1 Formatos e limites

Aceitar:

- JPEG;
- PNG;
- WebP.

Rejeitar:

- SVG;
- GIF animado;
- arquivos cujo conteúdo real não corresponda ao tipo detectado;
- arquivos executáveis ou poliglotas suspeitos.

Limites:

- arquivo de entrada: até 10 MiB;
- quantidade de pixels de entrada: até 40 megapixels;
- dimensão armazenada: no máximo 2048 × 2048 px, preservando proporção;
- miniatura de monstro: exatamente 128 × 128 px, com `object-fit: cover` e recorte central configurável no momento da seleção;
- miniatura/capa de biblioteca: 256 × 256 px para listagem;
- transparência permitida;
- metadados EXIF e localização devem ser removidos.

### 23.2 Pipeline

1. o usuário seleciona o arquivo por diálogo nativo;
2. o núcleo valida assinatura, tamanho e dimensões antes da decodificação completa;
3. corrige orientação EXIF;
4. converte o espaço de cor para sRGB;
5. redimensiona sem ampliar imagens menores;
6. gera WebP normalizado;
7. gera miniatura;
8. calcula SHA-256;
9. grava em staging;
10. atualiza banco e arquivos atomicamente.

### 23.3 Nomes e caminhos

```text
images/libraries/<library-uuid>/cover.webp
images/monsters/<monster-uuid>/main.webp
images/monsters/<monster-uuid>/thumb.webp
```

O nome original do arquivo não é persistido como caminho. Pode ser mantido apenas como metadado informativo opcional.

### 23.4 Visualizador em tela cheia

Deve oferecer:

- fundo neutro escuro;
- ocultação completa da ficha e estatísticas;
- zoom por roda do mouse;
- botões Ampliar, Reduzir, Ajustar e Tamanho real;
- arrastar para deslocar;
- duplo clique para alternar Ajustar/Tamanho real;
- zoom mínimo 25%;
- zoom máximo 800%;
- tecla `Esc` para fechar;
- foco preso no diálogo;
- botão Fechar claramente identificável;
- nenhuma ação administrativa na tela cheia.

---

## 24. Importação de pacotes

### 24.1 Inspeção antes de importar

O comando `package_inspect` deve:

1. abrir o ZIP sem extrair caminhos arbitrários;
2. validar limite de tamanho;
3. localizar `manifest.json` na raiz;
4. validar o manifesto;
5. verificar a lista de arquivos;
6. validar hashes e tamanhos;
7. identificar tipo, sistema, esquema, versão, UUID e contagens;
8. comparar com a base local;
9. retornar uma prévia sem alterar dados.

A prévia deve informar:

- nome e sistema;
- quantidade de monstros;
- ativos e arquivados;
- quantidade de imagens;
- tamanho total;
- biblioteca nova ou já existente;
- registros idênticos, divergentes, novos e apenas locais;
- incompatibilidades;
- avisos não bloqueadores.

### 24.2 Limites de segurança do pacote

Valores iniciais:

- ZIP comprimido: até 2 GiB;
- conteúdo descompactado: até 4 GiB;
- até 20.000 entradas;
- até 10.000 monstros por biblioteca;
- até 10 tabelas auxiliares por monstro;
- taxa de expansão suspeita deve interromper a importação;
- extração deve ser streaming;
- nenhuma entrada pode sair do diretório de staging;
- arquivos desconhecidos devem gerar aviso e ser ignorados somente se forem inertes; executáveis sempre bloqueiam.

### 24.3 Biblioteca com UUID inexistente

- criar nova biblioteca;
- preservar UUIDs, datas, estados ativos/arquivados e hashes;
- gerar miniaturas;
- validar todos os registros antes do commit;
- se qualquer registro obrigatório falhar, não importar nada.

### 24.4 Biblioteca com UUID já existente

A caixa de diálogo obrigatória deve apresentar:

#### Opção A — Importar todo o conteúdo

O pacote torna-se a fonte de verdade:

- metadados e imagem da biblioteca são substituídos;
- monstros com mesmo UUID são substituídos;
- monstros novos são adicionados;
- monstros locais ausentes do pacote são movidos para a lixeira por 30 dias;
- imagens são substituídas conforme o pacote;
- estados ativo/arquivado do pacote prevalecem;
- nenhuma exclusão é definitiva durante a operação.

#### Opção B — Importar apenas itens divergentes

- registros com mesmo UUID e mesmo hash são ignorados;
- registros com mesmo UUID e hash diferente são substituídos pela versão do pacote;
- registros novos são adicionados;
- registros apenas locais são preservados;
- metadados de biblioteca divergentes são atualizados pela versão do pacote após confirmação explícita no resumo;
- imagens divergentes são substituídas;
- não existe mesclagem campo a campo.

#### Opção C — Cancelar

Nenhum dado ou arquivo é alterado.

### 24.5 Mesmo nome com UUID diferente

Bibliotecas ou monstros com mesmo nome e UUID diferente são entidades distintas. O aplicativo pode exibir aviso informativo, mas não deve bloquear.

### 24.6 Importação de monstro individual

1. o usuário seleciona o ZIP;
2. a aplicação identifica o sistema;
3. o usuário escolhe uma biblioteca compatível;
4. se não houver, pode criar uma biblioteca do mesmo sistema;
5. se o UUID não existir, importar;
6. se o UUID existir, oferecer:
   - Substituir;
   - Importar como cópia;
   - Cancelar.

Ao importar como cópia:

- gerar novo UUID para o monstro;
- gerar novos UUIDs para perfis, ataques, RD, Habilidades, traços, magias, tabelas e referências;
- manter nome, acrescentando ` (cópia)` somente se o usuário aceitar o nome sugerido;
- copiar a imagem para o novo diretório.

### 24.7 Atomicidade e recuperação

Fluxo obrigatório:

```text
Selecionar ZIP
→ Inspecionar e validar
→ Extrair para staging seguro
→ Validar JSON Schemas
→ Validar imagens e hashes
→ Criar plano de importação
→ Registrar import_journal
→ Preparar novos diretórios de imagem
→ Iniciar transação SQLite
→ Aplicar inserts/updates/lixeira
→ Trocar diretórios por rename atômico
→ Commit SQLite
→ Marcar journal como committed
→ Remover backups e staging
```

Em falha:

- rollback do banco;
- restauração dos diretórios anteriores;
- journal marcado como `rolled_back`;
- staging removido quando seguro;
- relatório de erro apresentado;
- nenhuma importação parcial visível.

Em interrupção abrupta, a inicialização deve consultar o journal e completar o commit ou restaurar o estado anterior.

### 24.8 Relatório de importação

Ao concluir, exibir:

- adicionados;
- atualizados;
- ignorados por identidade;
- movidos para lixeira;
- imagens processadas;
- avisos;
- duração;
- botão Abrir biblioteca ou Abrir monstro.

---

## 25. Exportação de pacotes

### 25.1 Biblioteca

A exportação deve incluir:

- metadados da biblioteca;
- imagem da biblioteca, quando houver;
- monstros ativos;
- monstros arquivados;
- imagens principais dos monstros;
- manifesto e hashes.

Não incluir:

- lixeira;
- miniaturas;
- arquivos temporários;
- logs;
- caminhos locais absolutos;
- preferências visuais do usuário;
- banco SQLite.

### 25.2 Monstro

O ZIP individual inclui o registro completo, todos os perfis, tabelas, referências e imagem principal.

### 25.3 Procedimento

1. montar snapshot consistente em transação de leitura;
2. validar documentos internos antes de exportar;
3. copiar imagens por streaming;
4. criar JSONs em staging;
5. calcular hashes;
6. criar manifesto;
7. gerar ZIP temporário;
8. validar o ZIP recém-criado;
9. mover atomicamente para o destino escolhido;
10. remover staging.

A exportação não deve bloquear a interface. Deve apresentar progresso e permitir cancelamento até antes da movimentação final.

### 25.4 Nome sugerido

```text
biblioteca-<slug>-YYYYMMDD-HHmmss.zip
monstro-<slug>-YYYYMMDD-HHmmss.zip
```

Caracteres inválidos do Windows devem ser removidos do slug. O UUID não precisa aparecer no nome externo, pois está no manifesto.

---

## 26. Lixeira e exclusão

### 26.1 Prazo

- `purge_after = deleted_at + 30 dias`;
- o prazo usa UTC;
- a interface apresenta dias restantes arredondados para cima;
- a purga é executada na inicialização e, no máximo, uma vez a cada 24 horas.

### 26.2 Tela da lixeira

Deve possuir abas:

- Bibliotecas;
- Monstros.

Monstros pertencentes a bibliotecas na lixeira não devem ser listados separadamente.

Ações:

- Restaurar;
- Excluir definitivamente.

### 26.3 Purga automática

- excluir primeiro registros dependentes;
- remover arquivos associados;
- se a exclusão de arquivo falhar, registrar tarefa de limpeza e não recriar o registro;
- arquivos órfãos devem ser varridos de maneira conservadora, apenas quando não referenciados e mais antigos que sete dias;
- purga nunca deve tocar em staging ativo.

---

## 27. Arquitetura da interface

### 27.1 Navegação

Rotas lógicas:

```text
/
/libraries/new
/libraries/:libraryId
/libraries/:libraryId/edit
/libraries/:libraryId/monsters/new
/libraries/:libraryId/monsters/:monsterId
/libraries/:libraryId/monsters/:monsterId/edit
/trash
/settings
```

Rotas inválidas devem mostrar página de erro com retorno seguro à página inicial.

### 27.2 Shell desktop

- barra lateral em largura >= 1200 px;
- barra lateral recolhível entre 768 e 1199 px;
- navegação compacta abaixo de 768 px para permitir janelas estreitas, embora o alvo do MVP seja Windows;
- barra superior com título da página e ações contextuais;
- área principal com largura máxima generosa, sem prender a ficha a um A4.

### 27.3 Larguras e janela

- tamanho inicial recomendado: 1280 × 800;
- mínimo funcional: 800 × 600;
- a aplicação deve lembrar tamanho, posição e estado maximizado;
- não restaurar janela fora dos monitores disponíveis.

### 27.4 Telas

#### Página inicial

- título Biblioteca de Monstros Digital;
- botão Nova biblioteca;
- cartões de bibliotecas;
- estado vazio;
- acesso à lixeira.

#### Biblioteca

- cabeçalho com capa, nome e sistema;
- ações;
- busca e filtros;
- alternância lista/grade;
- listagem;
- contadores;
- estado vazio e estado sem resultados.

#### Formulário de biblioteca

- Nome;
- Sistema;
- Imagem;
- prévia;
- Salvar/Cancelar.

#### Formulário de monstro AD&D

Seções recolhíveis:

1. Identificação e imagem;
2. Perfis estatísticos;
3. Psiônicos;
4. Tabelas complementares;
5. Descrição;
6. Combate;
7. Habitat/Sociedade;
8. Ecologia;
9. Variações e notas;
10. Referências.

#### Formulário de monstro Shadowlords

1. Identificação, descritores e imagem;
2. Dados gerais do perfil;
3. Atributos;
4. PV e Defesa;
5. Reduções de Dano;
6. Ataques;
7. Defesa Ativa;
8. Habilidades;
9. Traços;
10. Magias e poderes;
11. Movimento e especiais;
12. Perfis adicionais;
13. Módulo dracônico quando habilitado;
14. Narrativas;
15. Referências.

#### Ficha somente leitura

- identidade visual própria do sistema;
- ações no cabeçalho;
- perfil selecionável;
- imagem ampliável;
- seções sem controles de edição.

#### Lixeira

- abas;
- prazo restante;
- restauração e exclusão definitiva.

### 27.5 Componentes obrigatórios

- `AppShell`;
- `LibraryCard`;
- `MonsterCard`;
- `MonsterListRow`;
- `SearchAndFilters`;
- `ImagePicker`;
- `ImageViewer`;
- `ProfileTabs`;
- `ProfileEditor`;
- `MarkdownEditor`;
- `StructuredTableEditor`;
- `ConfirmDialog`;
- `ImportPreviewDialog`;
- `ImportConflictDialog`;
- `ProgressDialog`;
- `TrashItemRow`;
- `ErrorSummary`;
- `EmptyState`;
- `Skeleton`;
- `ToastRegion`.

### 27.6 Design visual

Tokens iniciais inspirados na ficha do Bugbear:

```css
--color-ink: #17394a;
--color-text: #263b46;
--color-muted: #6f8290;
--color-surface: #ffffff;
--color-surface-alt: #eaf1f4;
--color-border: #b8cbd4;
--color-focus: #0b6e99;
--color-danger: #b42318;
--color-warning: #9a6700;
--color-success: #247a47;
```

Regras:

- fonte padrão do sistema: `Segoe UI`, com fallback sans-serif;
- títulos fortes e claros;
- rótulos estatísticos em caixa alta;
- escala de espaçamento baseada em 4 px;
- raio discreto de 4 a 8 px;
- zebra suave em tabelas;
- contraste mínimo WCAG AA;
- foco visível;
- animações curtas e respeitando `prefers-reduced-motion`;
- nenhum recurso remoto.

---

## 28. Validações e mensagens

### 28.1 Princípios

- validar durante o preenchimento sem interromper a digitação;
- validar integralmente ao salvar;
- apresentar mensagem junto ao campo e resumo no topo;
- focar o primeiro erro ao tentar salvar;
- mensagens em português claro;
- nunca mostrar stack trace ao usuário;
- preservar código técnico para logs.

### 28.2 Exemplos

| Código | Mensagem ao usuário |
|---|---|
| `VALIDATION_REQUIRED` | Preencha este campo. |
| `VALIDATION_MAX_LENGTH` | O texto ultrapassa o limite permitido. |
| `VALIDATION_SYSTEM_MISMATCH` | Este monstro pertence a outro sistema de RPG. |
| `VALIDATION_DEFENSE_SUM` | A Defesa Final não corresponde à soma dos componentes. |
| `VALIDATION_DRAGON_AGES` | Dragões de Shadowlords devem possuir exatamente cinco categorias etárias. |
| `IMPORT_INVALID_MANIFEST` | O arquivo não é um pacote válido da Biblioteca de Monstros Digital. |
| `IMPORT_HASH_MISMATCH` | Um arquivo do pacote está corrompido ou foi alterado. |
| `IMPORT_UNSUPPORTED_VERSION` | Esta versão do pacote não é compatível com o aplicativo instalado. |
| `IMPORT_PATH_TRAVERSAL` | O pacote contém um caminho de arquivo inseguro. |
| `IMAGE_TOO_LARGE` | A imagem excede o limite de tamanho ou resolução. |
| `IMAGE_UNSUPPORTED_TYPE` | Use uma imagem JPEG, PNG ou WebP. |
| `CONFLICT_ROW_VERSION` | O registro foi alterado em outra janela. Recarregue antes de salvar. |
| `DISK_FULL` | Não há espaço suficiente no dispositivo para concluir a operação. |
| `DATABASE_ERROR` | Não foi possível concluir a operação no banco local. |

---

## 29. Segurança

### 29.1 Princípio de menor privilégio

- não habilitar plugin de shell;
- não permitir execução de comandos externos;
- não expor acesso genérico ao sistema de arquivos ao frontend;
- não expor SQL ao WebView;
- capabilities do Tauri devem conceder somente os comandos e diálogos necessários;
- nenhuma capability para origens remotas;
- nenhuma navegação externa dentro do WebView.

### 29.2 Política de conteúdo

Configurar CSP restritiva. Diretriz:

```text
default-src 'self';
img-src 'self' asset: data:;
style-src 'self' 'unsafe-inline';
script-src 'self';
connect-src 'self' ipc: http://ipc.localhost;
font-src 'self';
object-src 'none';
frame-src 'none';
base-uri 'none';
form-action 'self';
```

A configuração final deve seguir a sintaxe suportada pela versão do Tauri e não deve liberar `http:` ou `https:` genericamente.

### 29.3 Pacotes não confiáveis

- proteção contra Zip Slip;
- limite de tamanho e entradas;
- verificação de hash;
- detecção de tipo por conteúdo;
- rejeição de executáveis;
- rejeição de links simbólicos;
- validação JSON Schema;
- nenhuma avaliação de código;
- Markdown sem HTML;
- SQL parametrizado;
- nomes não utilizados diretamente como caminhos.

### 29.4 Dados locais

Criptografia está fora do MVP. Ainda assim:

- banco e imagens ficam no diretório privado do usuário;
- permissões de arquivo devem seguir o padrão restritivo do sistema operacional;
- logs não devem conter narrativas completas nem imagens;
- o aplicativo não transmite dados;
- nenhuma telemetria é permitida.

---

## 30. Requisitos não funcionais

### 30.1 Desempenho

Ambiente de referência: Windows 11, CPU de quatro núcleos, 8 GiB de RAM, SSD.

| Métrica | Meta |
|---|---|
| Abertura fria do aplicativo | <= 3 s até a tela utilizável, sem contar primeira migração pesada |
| Abertura de biblioteca com 5.000 monstros | <= 1 s para o primeiro lote visual |
| Busca/filtro após debounce | <= 300 ms para 10.000 monstros |
| Salvamento de monstro sem imagem | <= 500 ms |
| Troca lista/grade | <= 200 ms percebidos |
| Abertura de ficha | <= 500 ms, sem contar decodificação inicial da imagem |
| Uso típico de memória | alvo <= 350 MiB |

Importações grandes devem apresentar progresso e manter a interface responsiva; não há meta fixa de duração por depender do disco e do tamanho das imagens.

### 30.2 Capacidade

- 20 bibliotecas sem degradação relevante;
- 10.000 monstros totais;
- 5.000 monstros em uma biblioteca como cenário de teste obrigatório;
- até 10 MiB por imagem de entrada;
- até 2 GiB por ZIP de entrada.

### 30.3 Acessibilidade

- WCAG 2.2 AA como meta;
- navegação completa por teclado;
- ordem de foco lógica;
- diálogos com foco preso e retorno ao acionador;
- rótulos associados a campos;
- ícones com nome acessível;
- contraste adequado;
- suporte a escala de texto do Windows;
- não depender apenas de cor;
- mensagens anunciadas por região `aria-live`.

### 30.4 Confiabilidade

- migrações transacionais;
- importações atômicas;
- hash de conteúdo;
- recuperação por journal;
- nenhuma perda silenciosa de dados;
- testes de round-trip;
- logs rotativos;
- fechamento seguro da conexão.

### 30.5 Manutenibilidade

- cobertura mínima de 80% nas regras de domínio e importação/exportação;
- funções pequenas e tipadas;
- ESLint e formatação automáticos;
- nenhuma ocorrência de `any` sem justificativa;
- erros de compilação e lint bloqueiam CI;
- schema e tipos gerados sincronizados;
- ADRs para decisões de arquitetura.

### 30.6 Localização

- idioma único `pt-BR` no MVP;
- strings não devem ficar espalhadas em componentes;
- utilizar catálogo central para permitir futura tradução;
- datas apresentadas em `pt-BR`, mas persistidas em UTC;
- ordenação com `Intl.Collator('pt-BR', { sensitivity: 'base' })` na interface quando necessário.

---

## 31. Logs e diagnóstico

- log local em arquivo rotativo;
- cinco arquivos de até 2 MiB cada;
- níveis: `error`, `warn`, `info`; `debug` apenas em desenvolvimento;
- cada operação longa recebe `operationId`;
- nunca registrar conteúdo completo de fichas ou binários;
- pode registrar UUID, nome curto, contagens, códigos de erro e tempos;
- caminhos externos devem ser reduzidos ao nome de arquivo ou hash;
- erros mostrados ao usuário devem incluir um código de correlação copiável.

---

## 32. Migrações e versionamento

### 32.1 Versões distintas

- versão do aplicativo: SemVer;
- versão do banco: inteiro crescente;
- versão do formato ZIP: inteiro crescente;
- versão do esquema AD&D: inteiro crescente;
- versão do esquema Shadowlords: inteiro crescente.

Essas versões não devem ser confundidas.

### 32.2 Migração do banco

- arquivos SQL numerados;
- aplicados em ordem;
- cada migração em transação;
- fazer cópia de segurança do banco antes de migração destrutiva;
- migrações devem ser idempotentes quando tecnicamente possível;
- testes devem abrir bases de todas as versões suportadas e verificar o estado final.

### 32.3 Migração de documentos JSON

- nunca editar JSON persistido sem migrador explícito;
- migrador recebe versão anterior e produz versão seguinte;
- validar antes e depois;
- recalcular projeções e hashes;
- manter relatório de mudanças;
- em falha, reverter toda a migração.

---

## 33. Empacotamento e distribuição Windows

### 33.1 Alvo

- Windows 10 e 11 x64;
- instalador NSIS por usuário;
- sem exigir privilégios administrativos para o uso normal;
- dados em AppData do usuário;
- atualizações manuais por novo instalador no MVP.

### 33.2 WebView2

A aplicação usa WebView2 do sistema. O instalador deve verificar a presença do runtime. O artefato padrão pode usar o bootstrapper; um instalador offline poderá ser gerado como artefato adicional se a distribuição exigir instalação sem internet.

### 33.3 Identidade sugerida

```text
productName: Biblioteca de Monstros Digital
identifier: br.com.bibliotecademonstros.digital
```

O identificador final deve ser congelado antes da primeira distribuição para evitar mudança do diretório de dados.

### 33.4 Desinstalação

- atualização não deve remover dados;
- desinstalação não deve apagar dados silenciosamente;
- se o instalador oferecer remoção de dados, a opção deve ser explícita e desmarcada por padrão;
- o aplicativo deve lembrar ao usuário que exportações são as cópias de segurança oficiais.

---

## 34. Testes

### 34.1 Pirâmide de testes

#### Unitários frontend

- normalização de nomes;
- view models;
- validações de formulário;
- filtros combinados;
- formatação de valores;
- componentes acessíveis.

#### Unitários Rust

- validação de caminhos;
- canonicalização JSON;
- hashes;
- processamento de imagem;
- regras de conflito;
- cálculo de `purge_after`;
- regras do módulo dracônico;
- validação de Defesa Final.

#### Integração

- repositórios SQLite;
- migrações;
- transações;
- CRUD completo;
- arquivo + banco;
- lixeira;
- import journal.

#### Round-trip

Obrigatório:

```text
criar dados
→ exportar
→ importar em base vazia
→ exportar novamente
→ comparar conteúdo canônico e hashes
```

Executar para:

- biblioteca AD&D;
- biblioteca Shadowlords;
- monstro simples;
- monstro com múltiplos perfis;
- dragão de cinco idades;
- monstro com Psiônicos;
- monstro com tabela complementar;
- biblioteca com imagens e sem imagens;
- monstros ativos e arquivados.

#### Segurança

Fixtures inválidas:

- Zip Slip;
- ZIP bomb simulado;
- hash incorreto;
- arquivo executável renomeado como imagem;
- SVG malicioso;
- JSON com versão futura;
- UUID duplicado no mesmo pacote;
- Defesa Final inconsistente;
- dragão com quatro ou seis idades;
- imagem ausente;
- caminho absoluto;
- arquivo extra não listado;
- JSON excessivamente profundo;
- texto acima do limite.

#### E2E

Fluxos mínimos:

1. criar biblioteca AD&D;
2. cadastrar Bugbear AD&D;
3. pesquisar e filtrar;
4. editar e salvar;
5. arquivar e restaurar;
6. exportar e importar biblioteca;
7. criar biblioteca Shadowlords;
8. cadastrar Bugbear Shadowlords;
9. abrir imagem em tela cheia;
10. remover, restaurar e excluir definitivamente;
11. importar novamente a mesma biblioteca com as três opções de conflito;
12. fechar e reabrir, verificando persistência.

### 34.2 Fixtures normativas

Criar dados de teste inspirados estruturalmente em:

- Bugbear AD&D;
- Bugbear Shadowlords;
- Dragão Azul AD&D com tabela etária;
- Dragão Shadowlords com cinco idades;
- Yuan-ti com Psiônicos, múltiplas formas e tabela de feições.

Não é necessário distribuir textos integrais protegidos; usar conteúdo reduzido ou fictício preservando a estrutura.

### 34.3 Testes visuais

- screenshots das principais telas em 800×600, 1280×800 e 1920×1080;
- comparação com tolerância para renderização;
- verificar sobreposição, truncamento, contraste, rolagem e responsividade;
- a ficha Shadowlords deve ser comparada visualmente à hierarquia do modelo Bugbear, não pixel a pixel com o PDF.

---

## 35. Critérios de aceite por épico

### 35.1 Fundação

- aplicativo inicia offline;
- banco e diretórios são criados;
- sistemas padrão existem;
- migrações passam;
- nenhuma requisição externa ocorre;
- instalador Windows é gerado.

### 35.2 Bibliotecas

- CRUD funcional;
- imagem normalizada;
- sistema bloqueado após primeiro monstro;
- remoção reversível;
- exclusão definitiva limpa arquivos;
- nomes duplicados permitidos.

### 35.3 Monstros AD&D

- todos os campos da seção 13 disponíveis;
- múltiplos perfis;
- Psiônicos opcional;
- tabelas complementares;
- ficha somente leitura adequada;
- exportação e importação sem perda.

### 35.4 Monstros Shadowlords

- todos os campos da seção 14;
- Defesa Final calculada;
- atributos validados;
- listas de RD, ataques, Habilidades, traços e magias;
- variantes;
- ficha com identidade do Bugbear;
- módulo dracônico validado.

### 35.5 Pesquisa e listagem

- nome sem acento/caixa;
- filtros combinados;
- ordenação;
- lista/grade persistidas;
- desempenho em fixture de 5.000 monstros.

### 35.6 Importação/exportação

- ZIP conforme contrato;
- hashes validados;
- imagens relacionadas por UUID;
- round-trip idêntico;
- conflito de biblioteca com três opções;
- rollback completo em falha;
- segurança contra caminhos maliciosos.

### 35.7 Lixeira

- bibliotecas e monstros recuperáveis por 30 dias;
- restauração correta;
- purga automática;
- exclusão definitiva;
- itens da lixeira ausentes das exportações normais.

### 35.8 Qualidade

- lint, compilação e testes verdes;
- sem erros críticos de acessibilidade;
- sem dados remotos;
- sem segredos no repositório;
- documentação de build reproduzível;
- código assinado quando houver certificado disponível para distribuição.

---

## 36. Plano de implementação recomendado

### Fase 1 — Fundação

- criar repositório;
- configurar Tauri, React, TypeScript e Vite;
- definir tokens visuais;
- configurar CI;
- criar schemas iniciais;
- configurar migrações e logging;
- implementar adaptador browser-mock.

**Gate:** aplicativo vazio inicia no navegador de desenvolvimento e no Tauri.

### Fase 2 — Persistência e bibliotecas

- tabelas centrais;
- sistemas semeados;
- CRUD de biblioteca;
- imagens de biblioteca;
- página inicial;
- lixeira de biblioteca.

**Gate:** biblioteca sobrevive a reinicialização e restauração.

### Fase 3 — Monstro AD&D

- schemas;
- formulário;
- perfis;
- narrativas;
- Psiônicos;
- tabelas complementares;
- ficha somente leitura.

**Gate:** fixture AD&D completa passa no round-trip interno.

### Fase 4 — Monstro Shadowlords

- schemas;
- formulário;
- Defesa;
- RD;
- ataques;
- habilidades;
- traços e magias;
- variantes;
- ficha visual.

**Gate:** fixture Bugbear Shadowlords corresponde à estrutura visual esperada.

### Fase 5 — Listagens e pesquisa

- lista/grade;
- miniaturas;
- busca;
- filtros;
- ordenação;
- preferências.

**Gate:** testes com 5.000 registros atendem metas.

### Fase 6 — Imagem em tela cheia

- visualizador;
- zoom;
- pan;
- teclado;
- acessibilidade.

### Fase 7 — Importação e exportação

- schemas de pacote;
- manifesto;
- hashes;
- ZIP;
- staging;
- journal;
- conflitos;
- relatórios.

**Gate:** todos os testes de round-trip e segurança passam.

### Fase 8 — Módulo dracônico

- cinco idades;
- campos de sopro;
- validações;
- tabela comparativa;
- fixtures.

### Fase 9 — Hardening e release

- E2E;
- acessibilidade;
- testes visuais;
- instalador;
- documentação;
- limpeza de logs e staging;
- checklist de entrega.

---

## 37. Definição de pronto

Uma funcionalidade só está pronta quando:

- requisitos e critérios de aceite foram atendidos;
- código foi revisado;
- testes unitários e de integração existem;
- mensagens estão em português;
- acessibilidade foi verificada;
- erros foram tratados;
- logs não expõem conteúdo indevido;
- schema e tipos estão sincronizados;
- documentação foi atualizada;
- nenhuma funcionalidade fora do escopo foi introduzida;
- build Windows foi validado quando a mudança afetar a camada nativa.

---

## 38. Regras para evitar retrabalho futuro

1. UI depende de portas, não diretamente de Tauri.
2. Caminhos são sempre relativos e abstraídos.
3. Código de sistema é estável e não depende do rótulo traduzido.
4. Formatos exportados têm versão própria.
5. Dados específicos de sistema ficam em documentos versionados.
6. Campos filtráveis possuem projeções relacionais.
7. Nenhuma regra assume separador de caminho do Windows no contrato de pacote.
8. Componentes não assumem mouse; devem aceitar teclado e toque futuramente.
9. Layout não usa largura fixa A4.
10. Imagem e ZIP são processados no núcleo nativo, permitindo adaptadores futuros para URIs de Android.
11. Configurações específicas de plataforma ficam em arquivos Tauri próprios.
12. Textos de interface são centralizados.
13. Não usar APIs exclusivas do Windows na camada de domínio.
14. Não armazenar caminhos absolutos no banco ou JSON exportado.
15. Não acoplar o esquema AD&D ao esquema Shadowlords.

---

## 39. Decisões que exigiriam nova versão desta especificação

- inclusão de outro sistema;
- campos personalizados;
- conversão automática;
- PDF;
- sincronização;
- contas;
- criptografia;
- colaboração;
- alteração do prazo da lixeira;
- mesclagem campo a campo;
- importação de pacotes diferenciais;
- distribuição Android;
- armazenamento em nuvem;
- alteração dos cinco estágios dracônicos;
- mudança do formato ZIP ou dos schemas v1.

---

## 40. Referências técnicas oficiais

As seguintes referências orientam a implementação e devem ser consultadas na versão correspondente ao lockfile:

- Tauri 2 — documentação principal: `https://v2.tauri.app/`
- Tauri — SQL e migrações: `https://v2.tauri.app/plugin/sql/`
- Tauri — diálogos: `https://v2.tauri.app/plugin/dialog/`
- Tauri — sistema de arquivos e diretórios: `https://v2.tauri.app/plugin/file-system/`
- Tauri — capabilities e permissões: `https://v2.tauri.app/security/capabilities/`
- Tauri — instalador Windows: `https://v2.tauri.app/distribute/windows-installer/`
- Tauri — testes: `https://v2.tauri.app/develop/tests/`
- React: `https://react.dev/`
- Vite: `https://vite.dev/`
- TypeScript: `https://www.typescriptlang.org/docs/`
- Node.js LTS: `https://nodejs.org/en/about/previous-releases`
- SQLite: `https://sqlite.org/`
- JSON Schema 2020-12: `https://json-schema.org/draft/2020-12`

---

# APÊNDICE A — Fluxos principais

## A.1 Criar biblioteca

```text
Página inicial
→ Nova biblioteca
→ Informar nome
→ Selecionar sistema
→ Selecionar imagem opcional
→ Salvar
→ Criar UUID, processar imagem e persistir
→ Abrir biblioteca vazia
```

## A.2 Criar monstro

```text
Biblioteca
→ Novo monstro
→ Abrir formulário correspondente ao sistema
→ Informar identidade
→ Preencher perfil principal
→ Adicionar perfis opcionais
→ Preencher narrativas e referências
→ Salvar
→ Validar schema completo
→ Persistir em transação
→ Abrir ficha somente leitura
```

## A.3 Arquivar

```text
Ficha
→ Arquivar
→ Confirmar
→ status=archived
→ Remover da lista ativa
→ Disponibilizar na área Arquivados
```

## A.4 Remover e restaurar

```text
Ficha
→ Remover
→ Confirmar
→ status=trashed, previous_status salvo, purge_after em 30 dias
→ Lixeira
→ Restaurar
→ Recuperar previous_status
```

## A.5 Importar biblioteca repetida

```text
Selecionar ZIP
→ Inspecionar
→ Detectar mesmo libraryId
→ Exibir resumo de diferenças
→ Escolher:
   [Importar todo] [Somente divergentes] [Cancelar]
→ Executar plano atômico
→ Exibir relatório
```

---

# APÊNDICE B — Pseudocódigo de reconciliação

```text
function reconcileLibrary(local, incoming, mode):
    assert local.id == incoming.id
    assert local.system == incoming.system
    assert schemasCompatible(local, incoming)

    incomingById = map(incoming.monsters by id)
    localById = map(local.monsters by id)

    for each incomingMonster in incoming.monsters:
        localMonster = localById[incomingMonster.id]

        if localMonster does not exist:
            plan.add(incomingMonster)
        else if localMonster.contentHash == incomingMonster.contentHash
             and localMonster.imageHash == incomingMonster.imageHash:
            plan.skip(incomingMonster)
        else:
            plan.replace(localMonster, incomingMonster)

    if mode == FULL:
        for each localMonster not in incomingById:
            plan.moveToTrash(localMonster)

    if mode == DIVERGENT_ONLY:
        preserve all local-only monsters

    return plan
```

---

# APÊNDICE C — Checklist de segurança da importação

- [ ] Manifesto está na raiz.
- [ ] Formato e versão são reconhecidos.
- [ ] Contagens estão dentro dos limites.
- [ ] Nenhum caminho é absoluto.
- [ ] Nenhum caminho contém `..`.
- [ ] Nenhum link simbólico.
- [ ] Nenhum executável.
- [ ] Todos os arquivos obrigatórios existem.
- [ ] Todos os hashes correspondem.
- [ ] JSONs obedecem aos schemas.
- [ ] UUIDs internos são únicos.
- [ ] Sistema e esquema são coerentes.
- [ ] Imagens têm tipo real permitido.
- [ ] Defesa Final é consistente.
- [ ] Dragões têm cinco idades.
- [ ] Nenhuma alteração ocorreu antes da confirmação.
- [ ] Staging e journal foram criados.
- [ ] Rollback foi testado.

---

# APÊNDICE D — Checklist visual da ficha Shadowlords

- [ ] Nome em destaque.
- [ ] Descritores logo abaixo.
- [ ] Imagem sem distorção.
- [ ] Dados gerais em linhas alternadas.
- [ ] Seis atributos em faixa uniforme.
- [ ] PV e Defesa legíveis.
- [ ] Defesa mostra componentes e total.
- [ ] Todas as RD aparecem.
- [ ] Ataques e danos não são truncados.
- [ ] Defesa Ativa e Habilidades aparecem quando aplicáveis.
- [ ] Narrativas usam uma ou duas colunas conforme largura.
- [ ] Variações têm tabela clara.
- [ ] Referência está ao final.
- [ ] Não aparecem Tendência ou XP.
- [ ] Foco e contraste atendem acessibilidade.

---

# APÊNDICE E — Checklist visual da ficha AD&D

- [ ] Nome e categoria editorial.
- [ ] Imagem preserva proporção.
- [ ] Clima/Terreno, Frequência, Organização, Atividade, Dieta, Inteligência, Tesouro e Tendência.
- [ ] Quantidade/Encontro, CA, Movimento, DV, TAC0, ataques, dano, especiais, proteção, tamanho, moral e XP.
- [ ] Múltiplos perfis legíveis.
- [ ] Psiônicos exibidos somente quando presentes.
- [ ] Tabelas complementares mantêm cabeçalho e ordem.
- [ ] Descrição, Combate, Habitat/Sociedade e Ecologia.
- [ ] Referências ao final.
- [ ] Nenhum valor foi reinterpretado automaticamente.

---

# APÊNDICE F — Catálogo mínimo de erros técnicos

| Código | Categoria | Recuperável |
|---|---|---:|
| `APP_ALREADY_RUNNING` | Aplicação | Sim |
| `DB_MIGRATION_FAILED` | Banco | Não em escrita |
| `DB_CONSTRAINT_FAILED` | Banco | Sim |
| `DB_BUSY` | Banco | Sim |
| `ROW_VERSION_CONFLICT` | Concorrência | Sim |
| `FILE_NOT_FOUND` | Arquivo | Sim |
| `FILE_PERMISSION_DENIED` | Arquivo | Sim |
| `DISK_FULL` | Arquivo | Sim |
| `IMAGE_INVALID` | Imagem | Sim |
| `IMAGE_TOO_LARGE` | Imagem | Sim |
| `PACKAGE_INVALID` | Intercâmbio | Sim |
| `PACKAGE_VERSION_UNSUPPORTED` | Intercâmbio | Sim |
| `PACKAGE_HASH_MISMATCH` | Intercâmbio | Sim |
| `PACKAGE_UNSAFE_PATH` | Segurança | Sim |
| `PACKAGE_LIMIT_EXCEEDED` | Segurança | Sim |
| `SCHEMA_VALIDATION_FAILED` | Dados | Sim |
| `SYSTEM_MISMATCH` | Dados | Sim |
| `IMPORT_ROLLBACK_FAILED` | Integridade | Exige recuperação na inicialização |
| `EXPORT_FAILED` | Intercâmbio | Sim |
| `UNKNOWN_ERROR` | Geral | Sim, com log |

---

# APÊNDICE G — Entregáveis do agente

O agente deve entregar:

1. código-fonte completo;
2. schemas JSON v1;
3. migrações SQLite;
4. fixtures válidas e inválidas;
5. testes automatizados;
6. instalador Windows de teste;
7. instruções de build;
8. instruções de execução de testes;
9. ADRs produzidos;
10. lista de dependências e licenças;
11. relatório de critérios de aceite;
12. arquivo de exemplo exportado de cada sistema;
13. nenhum dado protegido integral de livros comerciais dentro das fixtures públicas.

---

# Fim da especificação

A Biblioteca de Monstros Digital v1 deve priorizar integridade, clareza editorial e interoperabilidade local. O MVP não deve tentar ser uma plataforma genérica; sua qualidade será medida pela fidelidade aos dois esquemas definidos, pela segurança do intercâmbio e pela confiabilidade com que preserva a coleção do usuário.
