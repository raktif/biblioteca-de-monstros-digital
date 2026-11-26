# Modelos de importação e exportação — versão 1.0.0

Este conjunto contém pacotes de exemplo prontos para importar e arquivos JSON de referência para AD&D 2ª Edição e Shadowlords Mini System 3E.

## Importar uma biblioteca de exemplo

1. Abra o aplicativo e, na tela **Bibliotecas**, escolha **Importar biblioteca**.
2. Selecione `add2e-library-reference.zip` ou `shadowlords3e-library-reference.zip`.
3. Escolha **Inspecionar pacote**, confira o sistema e o conteúdo e então escolha **Importar**.

## Importar um monstro de exemplo

1. Abra uma biblioteca do sistema correspondente.
2. Escolha **Importar monstro** e selecione `add2e-monster-reference.zip` ou `shadowlords3e-monster-reference.zip`.
3. Escolha **Inspecionar pacote**, confira o nome e então escolha **Importar**.

Um pacote AD&D só pode ser importado em uma biblioteca AD&D; um pacote Shadowlords só pode ser importado em uma biblioteca Shadowlords.

## Exportar seus dados

- Para exportar uma biblioteca, abra-a e escolha **Exportar biblioteca**. O aplicativo salva um arquivo `.library.zip`.
- Para exportar um monstro, use **Exportar** na lista ou na ficha. O aplicativo salva um arquivo `.monster.zip`.
- Guarde o ZIP completo. O aplicativo importa pacotes ZIP; não importa os JSONs isoladamente.

## Usar os arquivos como modelo

Os ZIPs de referência podem ser importados diretamente. Para produzir novos pacotes, o fluxo recomendado é criar ou importar uma ficha no aplicativo e depois exportá-la. Os JSONs em `fontes-de-referencia` mostram os dados e manifestos correspondentes para consulta técnica.

Editar manualmente qualquer arquivo dentro de um ZIP altera seu tamanho ou hash SHA-256 registrado em `manifest.json`. O aplicativo valida esses dados e pode rejeitar o pacote alterado. Portanto, use os JSONs como referência de estrutura; para importar fichas próprias, prefira exportá-las pelo aplicativo.

## Arquivos incluídos

- `add2e-monster-reference.zip`: pacote de um monstro AD&D.
- `add2e-library-reference.zip`: pacote de biblioteca AD&D com monstro de exemplo.
- `shadowlords3e-monster-reference.zip`: pacote de um monstro Shadowlords.
- `shadowlords3e-library-reference.zip`: pacote de biblioteca Shadowlords com monstro de exemplo.
- `fontes-de-referencia/`: JSONs de monstro, biblioteca e manifestos para consulta.
- `SHA256SUMS.txt` e `VALIDATION_REPORT.md`: integridade e validação dos modelos.
