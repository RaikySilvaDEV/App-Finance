# FinPulse Finance

Painel financeiro pessoal com consulta somente leitura por Open Finance via Pluggy, indicadores do Banco Central, cotações de mercado e diagnóstico por IA local com Ollama ou OpenAI.

## Executar localmente

1. Use Node.js com suporte ao módulo `node:sqlite` (o ambiente atual usa Node.js 26) e npm.
2. Na pasta do projeto, instale as dependências e inicie o servidor:

   ```powershell
   npm install
   npm run dev
   ```

3. Abra [http://127.0.0.1:3001](http://127.0.0.1:3001), conforme a porta configurada no `.env`.

## Diagnóstico com OpenAI

Preencha `OPENAI_API_KEY` no `.env` local e, opcionalmente, `OPENAI_MODEL` (padrão: `gpt-4.1-mini`). Reinicie o servidor. A chave fica apenas no servidor e não é exposta ao navegador. Diagnóstico financeiro e análise de ativos usam a Responses API com resposta estruturada e `store: false`. O diagnóstico envia totais resumidos, sem nomes de titulares, números de contas ou detalhes dos lançamentos. O uso depende do acesso ao modelo e da cota da chave na plataforma da OpenAI; não utiliza automaticamente sua sessão do ChatGPT.

## IA local e pesquisa

O Ollama foi instalado neste computador com o modelo `qwen3:4b`. O `.env` usa `AI_PROVIDER=ollama` e `OLLAMA_MODEL=qwen3:4b`, portanto o diagnóstico financeiro é processado localmente sem enviar os totais à OpenAI. Mantenha o Ollama iniciado; a primeira consulta pode demorar enquanto o modelo é carregado. Para usar OpenAI novamente, altere `AI_PROVIDER=openai` e reinicie o servidor.

Em **Diagnóstico com IA → Pesquisar na internet**, o buscador recebe somente a pergunta digitada. O sistema seleciona fontes oficiais e a IA local usa os trechos dos resultados para elaborar uma resposta, exibindo os links e a data de consulta. Não é uma leitura integral das páginas nem uma cotação de mercado em tempo real. Resultados da internet não têm permissão para executar comandos ou operações bancárias.

O gráfico **Evolução do saldo** usa consultas diárias salvas quando há pelo menos duas datas no período. Caso contrário, estima o histórico com o saldo atual e o extrato confirmado disponível. Ele é uma reconstrução, não um histórico de saldos certificado pelo banco. A seção **Conexões** mostra status e produtos suportados; as autorizações e a revogação bancária continuam no Meu Pluggy.

## Planejamento e classificação

- **Planejamento → Orçamento**: limites por categoria e mês, comparados ao consumo confirmado em reais. Reembolsos são separados; o orçamento mostra consumo bruto.
- **Contas e parcelas**: cadastro manual, vencimentos mensais, valores por parcela e marcação manual de pagamento. Meses curtos usam o último dia válido; nenhum pagamento é executado pelo aplicativo.
- **Metas**: valor desejado, valor reservado e data opcional. Os valores são informados pelo usuário e não aumentam o saldo bancário.
- **Regras**: comparação de trecho da descrição com banco opcional. A primeira regra compatível é aplicada; uma correção individual tem prioridade. Abra um lançamento no extrato para corrigir categoria e natureza ou criar uma regra.
- **Empréstimos**: contratos retornados pela Pluggy e registros manuais separados. Marque o cadastro manual como também conectado se representar o mesmo contrato, para não somá-lo novamente no diagnóstico. Após pagar uma parcela, atualize os valores manuais.
- **Histórico**: movimentações são guardadas por identificador, e a última consulta completa de cada dia gera um registro de saldos. O extrato combina o arquivo com as consultas recentes, sem duplicar identificadores. A tabela mostra as últimas 180 datas consultadas, sem apagar os registros anteriores. Com pelo menos duas datas salvas no período, o gráfico usa esses saldos consultados; enquanto isso, continua identificado como estimativa.

O consumo exclui transferências identificadas, pagamentos de fatura, aplicações, resgates e empréstimos. Um PIX sem identificação fica como transferência a revisar: confirme se é compra ou transferência própria. A identificação automática de pares é uma sugestão baseada em descrição, moeda, data e valor; verifique antes de usar como conciliação definitiva. Dados brutos do provedor são preservados no histórico; correções ficam separadas no planejamento.

O histórico é guardado na tabela `financial_history`, isolado por usuário, no mesmo SQLite/PostgreSQL da conta. Após ativar as notificações, o servidor salva atualizações recebidas da Pluggy mesmo com o aplicativo fechado. Falhas parciais de sincronização são informadas e não geram um retrato completo fictício do dia.

### Controle diário e sincronização

- **Visão geral**: saldo em contas, compromissos manuais até o fim do mês e diferença estimada. Investimentos, cartões e contratos conectados continuam separados. A diferença é parcial; não representa automaticamente dinheiro livre para investir.
- **Planejamento → Avisos**: vencimentos em até sete dias, pagamentos manuais ainda não confirmados, orçamento em 90% ou acima do limite e conexões sem atualização há mais de 48 horas. Os avisos são exibidos no aplicativo, sem envio de e-mail ou notificações push.
- **Recorrências**: detecção local sobre o histórico, sem contratar uma API de inteligência. Exige ao menos três ocorrências, uma por mês, intervalos de 25 a 35 dias e valores com variação de até 10% da média. Compras parceladas são excluídas. A próxima data é uma estimativa; o usuário confirma valor, vencimento e quantidade de meses antes de cadastrar uma conta. Confirmações e sugestões ignoradas são salvas na conta.
- **Parcelas do cartão**: mostra número da parcela e total quando a instituição retorna `creditCardMetadata`. Datas são as dos lançamentos; não se inventam vencimentos nem parcelas ausentes. Lançamento confirmado não comprova pagamento.
- **Contas e cartões → Faturas**: consulta `/bills` por cartão, com vencimento, total, mínimo, encargos e pagamentos conforme fornecidos. Ausência de dados ou falta de cobertura não significa dívida zero. Pagamentos registrados podem se referir ao ciclo anterior.

Para ativar notificações: publique primeiro o código na Vercel, usando o mesmo banco Neon e as mesmas credenciais Pluggy. Em **Conexões**, use **Ativar atualização automática**, ou execute `npm run sync:activate` no ambiente autorizado com esse mesmo banco. O comando registra um webhook para `https://app-finance-ruby-one.vercel.app/api/integrations/pluggy` e faz a sincronização inicial. Se mudar de domínio, ajuste a constante `publicUrl` em `sync.ts` antes de registrar novamente. A URL precisa ser pública, HTTPS e acessível sem proteção de implantação.

Um segredo aleatório é guardado no banco e enviado apenas no cabeçalho personalizado cadastrado na Pluggy. Eventos sem o segredo são rejeitados; itens não associados a usuários são ignorados. As entregas usam identificador de evento e uma reserva persistente para repetição segura. O servidor só confirma após salvar; falhas retornam HTTP 503 para permitir reenvio pela Pluggy. Se as tentativas do provedor forem esgotadas, é necessário investigar a conexão e sincronizar novamente. Exclusões informadas pelo provedor geram registros de remoção, impedindo que um navegador antigo restaure a transação. A ausência em uma consulta não é tratada como exclusão, pois o banco pode limitar o histórico.

O MeuPluggy pessoal continua limitado à atualização diária do provedor. A integração recebe alterações; não força uma atualização bancária fora desse ciclo.

### Dados dos empréstimos Pluggy

O mapeamento preserva os campos originais e acrescenta `outstandingBalance` a partir de `payments.contractOutstandingBalance`, além de `interestRate`, sua base e periodicidade quando houver uma taxa simples, e `interestRateTerms` com todos os componentes convertidos de fração para percentual. Taxas compostas ou múltiplas não são reduzidas a um único número. `nextDueDate` só é preenchido se o provedor informar explicitamente essa data: vencimento final e primeira parcela não são usados como substitutos. Os avisos consideram a próxima data informada e a contagem de parcelas em atraso do banco; uma data passada pede conferência, sem afirmar pagamento pendente como fato confirmado.

A interface apresenta os campos documentados que a conexão fornecer: contrato/IPOC, modalidade, datas, valor contratado e saldo para quitação, CET, amortização, juros e indexadores, tarifas, encargos, garantias, prazo, parcelas, pagamentos e cobranças adicionais. Campos ausentes são indicados. A primeira parcela e o vencimento final não são tratados como a próxima parcela. As taxas pré e pós-fixadas seguem a convenção documentada `1 = 100%`; o CET e demais taxas percentuais são mostrados conforme retornados. Consulte a [documentação de empréstimos](https://docs.pluggy.ai/pt/docs/products/loans).

### Renda fixa conectada

A área **Ativos** tem abas de Carteira, Distribuição, Vencimentos e Movimentações. Busca por produto/emissor, filtros por instituição e moeda e ordenação afetam os resumos e o CSV exportado. Os resumos mostram saldo líquido, valor bruto, lucro informado e valor para resgate; totais com campos faltantes são identificados como parciais. Moedas nunca são somadas entre si. Lucro não é estimado pela taxa contratada. A distribuição usa somente os saldos informados no filtro. Vencimentos e fim da carência permanecem separados; nenhuma liquidez ou rentabilidade futura é presumida. Datas sem informação não são criadas. As movimentações são consultadas por investimento e sinalizam paginação parcial. Exportar exige desativar o modo privacidade e baixa o CSV apenas no navegador.

A interface prioriza leitura rápida: saldo e produtos ficam em primeiro plano; lucro aparece quando informado e diferente de zero. Filtros, exportação e resumo complementar ficam recolhidos. Cada produto abre os detalhes essenciais, com uma segunda expansão para dados técnicos. Campos ausentes e impostos zerados não ocupam espaço nos detalhes. Preserve esse padrão de apresentação nas próximas melhorias para evitar excesso de informações na tela inicial.

Em **Ativos**, o filtro inicial seleciona `FIXED_INCOME` em reais com subtipo elegível ao FGC (CDB, RDB, LCI, LCA, LC, LCD, LH) ou `TREASURY` identificado como Tesouro Selic/LFT pelo nome. CRI, CRA, debêntures, LF, LIG, COE e fundos não entram nessa seleção. Outros filtros permitem consultar toda a renda fixa ou a carteira inteira, preservando os totais gerais. Elegibilidade de produto não confirma associação do emissor, cobertura individual, limites disponíveis, liquidez ou ausência de risco.

O campo `balance_amount` representa `balance`, o saldo líquido atual informado. `yield_rate` representa `rate` com `yield_rate_basis` indicando o indexador; na ausência de `rate`, usa `fixedAnnualRate` como percentual anual. O adicional anual fica em `yield_fixed_annual_rate`. A interface mostra os dois componentes quando existirem (ex.: `100% de CDI + 5% ao ano`), sem tratar 100% do CDI como retorno anual de 100%. Dados ausentes permanecem nulos. A API aceita os filtros opcionais `type=FIXED_INCOME` e `focus=conservative`.

## Login e dados salvos

Crie uma conta com e-mail e senha na tela inicial. Quando houver dados antigos neste navegador, use **Importar meus dados** depois de entrar. A importação salva as conexões Pluggy e posições manuais na conta, preservando o cadastro anterior caso falhe.

Ao entrar com a mesma conta em outro navegador, o sistema carrega os dados do servidor. As alterações em posições manuais, conexões e perfil são salvas automaticamente. O saldo, extrato e investimentos conectados são consultados novamente na Pluggy.

O banco SQLite fica em `data/finance.sqlite`. Preserve a pasta `data` para manter usuários, sessões e dados; ela é ignorada pelo Git. As senhas usam scrypt com salt e as sessões usam cookies HttpOnly. Para backup, pare o servidor e copie a pasta `data` inteira. O cadastro é local: não há envio de e-mail de recuperação de senha. Usar em outro dispositivo exige acesso ao mesmo servidor; o login não publica o sistema na internet.

## Publicar na Vercel

O repositório inclui uma função serverless para as rotas da API. Como o sistema de arquivos da Vercel não é persistente, a implantação usa Neon PostgreSQL em vez do SQLite local:

1. Crie um projeto PostgreSQL no [Neon](https://neon.tech/) e copie a string de conexão pooled (`DATABASE_URL`).
2. Em **Vercel → Project → Settings → Environment Variables**, configure `DATABASE_URL` no ambiente **Production**. O nome alternativo `DATABASE_URL_POOLED` também é aceito. Alterações de variáveis só são aplicadas a um novo deploy.
3. Para diagnósticos e pesquisa com IA, configure `AI_PROVIDER=openai` e `OPENAI_API_KEY`. `OPENAI_MODEL` é opcional e usa `gpt-4.1-mini` por padrão. Ollama só funciona no computador local.
4. Para Open Finance, configure também `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` com as credenciais da aplicação Pluggy.
5. Habilite as variáveis nos ambientes desejados e faça um novo deploy.

As tabelas de usuários e sessões são criadas automaticamente no Neon. Contas e dados armazenados no SQLite local não são copiados para a Vercel; crie uma conta na implantação e adicione/import seus dados nela. Configure as chaves apenas nas variáveis da Vercel, nunca no código ou em arquivos versionados. A senha da conta, cookie e dados do usuário continuam no backend; a chave OpenAI e as credenciais Pluggy não são enviadas ao navegador. Os limites de execução das funções e as cotas dos serviços externos se aplicam.

## Configurar Open Finance pessoal (Meu Pluggy)

Este aplicativo é para uma única pessoa consultar as próprias contas. Use o conector pessoal MeuPluggy; não conecte os bancos diretamente pelo conector comercial.

1. Crie sua conta em [Meu Pluggy](https://meu.pluggy.ai/) e autorize suas instituições financeiras por lá. A conta pessoal permite até cinco conexões e atualiza os dados diariamente.
2. Entre no [Dashboard da Pluggy](https://dashboard.pluggy.ai/) com a mesma conta e abra a aplicação demo.
3. Conecte o conector `MeuPluggy` (não o conector direto do banco) e copie o `itemId` gerado para cada instituição.
4. Obtenha o `CLIENT_ID` e `CLIENT_SECRET` da aplicação demo e preencha no arquivo `.env` local:

   ```dotenv
   PLUGGY_CLIENT_ID=seu_client_id
   PLUGGY_CLIENT_SECRET=seu_client_secret
   ```

5. Reinicie `npm run dev` depois de alterar o `.env`.
6. No FinPulse, escolha **Conectar banco (somente leitura)**, cole o `itemId` e adicione a conexão ao painel.

As credenciais ficam no servidor. O consentimento bancário é gerenciado no Meu Pluggy; este painel consulta contas, transações e investimentos por meio do item pessoal. Remover uma conexão do painel não revoga o consentimento: para isso, desconecte a instituição no Meu Pluggy. A versão atual não inicia Pix, pagamentos ou compras de ativos.

Leia o [guia oficial da API do Meu Pluggy](https://meu.pluggy.ai/api-guide) e a [documentação Pluggy para uso pessoal](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use).

## Configurações opcionais

- `AI_PROVIDER` e `OLLAMA_MODEL`: selecionam a IA local e o modelo instalado.
- `OPENAI_API_KEY` e `OPENAI_MODEL`: usados quando `AI_PROVIDER=openai`.
- `HOST` e `PORT`: definem o endereço e a porta do servidor local.

Não adicione `.env` ao Git nem compartilhe `PLUGGY_CLIENT_SECRET` ou `OPENAI_API_KEY` em mensagens. `.env.example` lista os nomes das variáveis sem credenciais.
