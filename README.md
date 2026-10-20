# FinPulse Finance

Painel financeiro com contas manuais, importação de extratos, consulta pessoal somente leitura por Open Finance via Pluggy, indicadores do Banco Central, cotações de mercado e diagnóstico por IA local com Ollama ou OpenAI.

## Cartões manuais e evolução de recorrências

Em **Contas e cartões → Cartões**, é possível cadastrar cartões manuais sem conexão comercial, com banco, nome, últimos quatro dígitos opcionais, dias de fechamento/vencimento e limites informados pelo usuário. O sistema não solicita número completo, senha ou CVV. Os limites podem permanecer desconhecidos; não são calculados a partir das compras nem somados ao dinheiro disponível. É possível editar o cartão ou desativá-lo para novas compras sem apagar parcelas e histórico.

Cada compra registra o valor **por parcela**, a quantidade e o primeiro vencimento confirmado pelo usuário. As parcelas são compromissos compartilhados com **Planejamento → Contas**, não transações novas: não alteram saldos nem duplicam movimentos do extrato. A central projeta seis meses, permite filtrar por cartão e informar/desmarcar pagamentos. A projeção usa o dia do primeiro vencimento, com ajuste para meses curtos; fechamento e vencimento do cadastro não decidem automaticamente o ciclo. A projeção não inclui compras não cadastradas, juros ou taxas e não substitui a fatura oficial. Evite cadastrar a mesma obrigação como compra e como fatura manual. Se houver pagamentos marcados, confira-os antes de alterar datas/valores da compra.

Os cartões e faturas retornados pela Pluggy continuam separados e disponíveis. Esta implementação não chama novos produtos da Pluggy nem habilita pagamentos ou conexões comerciais.

Em **Planejamento → Mais opções → Recorrências**, os padrões identificados mostram média, último valor, projeção de 12 meses baseada no último valor e possível variação em relação ao lançamento anterior. O detector continua exigindo três ocorrências mensais: os valores anteriores devem permanecer próximos da média (10%), e o último pode variar até 50%. Transferências, compras parceladas, padrões antigos ou histórico insuficiente não viram sugestões. A variação é um indício para revisão, não prova de assinatura ou reajuste. Moedas são mantidas separadas, sem conversão implícita. Padrões confirmados podem ser acompanhados em uma seção própria. O cadastro só acontece após revisão e cria um vínculo que impede cadastrar novamente a mesma recorrência por esse fluxo.

Persistência: `manualCards` é um campo opcional no planejamento existente; compras usam `bills.cardId`, e recorrências confirmadas usam `bills.recurrenceId`. Dados legados sem esses campos continuam válidos. Quando um cliente antigo omite os novos campos ao editar, o servidor preserva os cartões e vínculos já salvos daquele usuário. A validação no servidor controla formato, referências, quantidade e centavos, retendo apenas os campos permitidos para cartões. Permanecem os limites técnicos de 500 compromissos; cartões manuais têm limite técnico de 50 e compras de cartão até 120 parcelas. Não há alteração de preço/plano nem nova cobrança.

`npm test` cobre calendário, projeções, pagamento, desativação sem perda de histórico, recorrências e persistência/isolamento por usuário. `npm run test:cards` executa quatro cenários no Chromium com APIs simuladas: cartões em 320/390/1440 px e revisão de recorrências, sem tocar em bancos reais. A persistência de integração é validada em SQLite temporário; a execução no Neon deve ser homologada antes de liberar esta etapa em produção.

## Navbar e avisos

O topo mantém uma única navbar com menu lateral, marca, sincronização, privacidade e perfil. O menu de perfil reúne e-mail, conexões e sua quantidade, preferências de Google/lembretes e saída. Pode ser fechado por Escape, clique fora ou ao mover o foco para fora; links e ações existentes continuam disponíveis.

O sino só é renderizado quando há avisos financeiros reais produzidos por `dailyAlerts`, deduplicados pelo identificador. O modal nunca é renderizado vazio e protege os detalhes no modo de privacidade. Selecionar um aviso abre o planejamento. O diálogo contém o foco por teclado, bloqueia a rolagem da página atrás e permite rolar listas longas dentro dele.

Cada montagem da área autenticada avalia os avisos uma vez. Pendências já conhecidas aparecem imediatamente; uma entrada inicialmente sem avisos espera o carregamento inicial terminar antes de decidir. Atualizações por foco/polling não repetem uma janela já dispensada. Um novo login ou uma reabertura que monte novamente a área autenticada faz uma nova avaliação. O aplicativo não possui um fluxo próprio de WebAuthn/biometria: autenticação com senha preenchida por biometria/gerenciador segue a mesma entrada; apenas desbloquear o sistema operacional com a interface ainda aberta não informa um novo login ao site.

Para reproduzir a verificação de interface, instale o navegador de teste com `npx playwright install chromium` e execute `npm run test:ux`. A suíte serve o build em um servidor local e intercepta todas as APIs com fixtures isoladas, sem usar contas reais, Neon ou Pluggy. Cobre 320, 375, 390, 768 e 1440 px, modo standalone emulado, avisos vazios/pendentes, privacidade, navegação, foco e reentrada. `FINPULSE_UX_SCREENSHOTS=/caminho/temporario npm run test:ux` grava capturas opcionais para revisão. Esses testes não substituem a conferência em um Android físico.

## Instalar como aplicativo (PWA)

Após publicar esta versão em HTTPS, abra o FinPulse no Chrome do Android e use **Instalar app** na faixa superior. Quando o navegador disponibilizar o convite de instalação, o botão abre o convite nativo. Caso contrário, mostra instruções para o menu do navegador. No iPhone, use Compartilhar → Adicionar à Tela de Início. Após a instalação, abra pelo ícone FinPulse na tela inicial; o manifesto solicita uma janela independente (`standalone`). A disponibilidade da instalação é controlada pelo navegador.

O login continua usando a sessão segura do aplicativo. O PWA não inclui APK, publicação na Play Store ou notificações push. Login, consultas financeiras e importações exigem internet. Se a conexão cair durante o uso, uma faixa avisa que os dados podem estar desatualizados; ao tentar reabrir sem rede, uma tela pública oferece tentar novamente. A tela offline só fica disponível após ao menos uma visita online com instalação bem-sucedida do service worker.

O service worker é registrado apenas no build de produção (`npm run build` e `npm start`, com `NODE_ENV=production`, ou na Vercel). Em desenvolvimento, não é registrado. Seu cache tem uma lista fechada de recursos públicos: tela offline, manifesto e ícones. Não guarda HTML do aplicativo, respostas da API, tokens de retorno OAuth, arquivos de extratos ou dados financeiros. Navegações usam rede com `cache: no-store`; requisições `/api`, métodos diferentes de GET e outros domínios não são interceptados. As regras existentes de autenticação e separação por usuário continuam no backend.

Na Vercel, `/sw.js` e o manifesto são arquivos estáticos de `dist`; as rotas `/api` mantêm o encaminhamento existente. O worker recebe cabeçalhos para evitar versões desatualizadas. Ao mudar a tela offline ou os ícones, incremente `VERSION` em `public/sw.js`. A atualização do worker não força recarregamento de formulários abertos.

Validação: `npm test` inclui manifesto, dimensões dos ícones, isolamento de cache, rotas excluídas e resposta offline, além dos testes financeiros. Para homologar no celular: publique a branch em HTTPS, instale pelo Chrome, abra pelo ícone, confira o login, ative modo avião e reabra o app. Deve aparecer a tela sem conexão, sem dados financeiros. Volte à internet e confirme que login e importação continuam funcionando. A instalação efetiva no Android depende dessa verificação em dispositivo.

## Contas manuais e importação OFX/CSV

Em **Contas e cartões → Contas**, cadastre uma conta manual, informe o saldo e selecione o extrato. Confira a prévia, desmarque linhas indesejadas e confirme. As movimentações ficam em **Fluxo de caixa** e no planejamento. Nome, número e saldo informado podem ser corrigidos em **Editar conta e saldo**. Cada usuário acessa somente suas contas, prévias e histórico.

- OFX bancário em BRL, uma conta por arquivo, com `FITID`. Não aceita extratos de cartão, múltiplas contas, XML com entidades ou movimentações incompletas.
- CSV com cabeçalhos `data;descricao;valor;id` (`id` opcional). Datas `DD/MM/AAAA` ou `AAAA-MM-DD`; saídas negativas e entradas positivas. Há seleção de delimitador e decimal, suporte a campos entre aspas e leitura UTF-8/Windows-1252. Outros layouts precisam ser convertidos para essas colunas antes do envio.
- Até 1 MB e 2.000 movimentações por arquivo. PDF e XLSX não são suportados nesta versão.
- A prévia é calculada no servidor e expira após 30 minutos. Confirmar não confia em valores reenviados pelo navegador: usa os registros guardados para o usuário e a conta selecionados. Prévias vencidas são removidas na próxima preparação de importação daquele usuário.
- A confirmação é atômica e ignora identificadores já salvos, inclusive em requisições simultâneas. Sem ID, a chave usa data, descrição, valor e ocorrência. Esse reconhecimento é aproximado: confira lançamentos iguais e não alterne OFX/CSV para o mesmo período, pois os IDs podem divergir.
- Importar não altera o saldo informado nem comprova pagamento. O horário não é inventado: o lançamento guarda a data do extrato. Transferências são marcadas para revisão, aproveitando as correções e regras do planejamento. Contas manuais não são usadas na reconstrução automática de saldos históricos.

O Free permite **1 conta manual e até 2 posições manuais de investimento**. As verificações são feitas no servidor; alocação de vagas de contas é protegida contra concorrência. Posições legadas acima do limite continuam visíveis e editáveis sem novas posições. A estrutura `finance_entitlements` reserva `premium_until` para concessões confiáveis do backend, mas não existe checkout nem endpoint público que ative Premium. O preço planejado é **R$ 39,90/mês**, sem plano anual; a contratação permanece indisponível. O limite técnico atual de contas manuais no Premium é 100, não uma promessa de acesso ilimitado. Ao expirar o benefício, dados existentes são preservados e novas adições acima do Free são bloqueadas.

A integração pessoal existente foi preservada. Mantenha `PLUGGY_CONNECTION_MODE=personal`, `PLUGGY_BUSINESS_ENABLED=false` e configure `FINPULSE_OWNER_EMAIL` com seu e-mail. Sem acesso comercial, os demais usuários são direcionados ao cadastro manual e à importação; não recebem autorização de conectar bancos. Ter Premium não libera o acesso comercial da Pluggy.

Validação local: `npm test`, `npm run lint` e `npm run build`. Os testes usam SQLite temporário e usuários fictícios; cobrem isolamento, duplicatas, confirmações simultâneas, limites, downgrade e arquivos inválidos. A execução contra Neon e bancos reais deve ser validada em homologação antes de liberar em produção.

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

Esse padrão também se aplica às demais seções: Contas, Cartões e Faturas usam abas próprias; conexões priorizam banco e status; Planejamento destaca Avisos, Contas e Orçamento e reúne as demais ferramentas em Mais opções; extrato mantém mês, banco, direção e valores visíveis, com filtros avançados e categorias recolhidos; posições manuais abrem detalhes e ações por ativo. Erros, consultas parciais, vencimentos e identificações de dados estimados continuam explícitos. Faturas exibem banco e final do cartão, e representam valores registrados pelo provedor, sem presumir dívida pendente ou quitação.

**Histórico de faturas** abre em **Não pagas**, com abas de **Pagas** e **Sem confirmação**. A quitação pode ser reconciliada quando os pagamentos do ciclo imediatamente seguinte correspondem ao total anterior acrescido dos encargos, na mesma conta e moeda e sem paginação parcial, conforme a documentação Pluggy. Falta de pagamentos ou vencimento passado não comprovam falta de quitação: esses casos ficam sem confirmação. O usuário pode confirmar a situação depois de verificá-la no banco; o registro é salvo isoladamente na sua conta e aparece como **Informado por você**. Remover a confirmação volta a usar os dados disponíveis da conexão. Esse registro não realiza pagamento e não modifica os dados bancários.

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
