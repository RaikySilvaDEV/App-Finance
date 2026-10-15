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

O gráfico **Evolução estimada do saldo** usa o saldo atual e o extrato confirmado disponível. Ele é uma reconstrução, não um histórico de saldos certificado pelo banco. A seção **Conexões** mostra status e produtos suportados; as autorizações e a revogação bancária continuam no Meu Pluggy.

## Login e dados salvos

Crie uma conta com e-mail e senha na tela inicial. Quando houver dados antigos neste navegador, use **Importar meus dados** depois de entrar. A importação salva as conexões Pluggy e posições manuais na conta, preservando o cadastro anterior caso falhe.

Ao entrar com a mesma conta em outro navegador, o sistema carrega os dados do servidor. As alterações em posições manuais, conexões e perfil são salvas automaticamente. O saldo, extrato e investimentos conectados são consultados novamente na Pluggy.

O banco SQLite fica em `data/finance.sqlite`. Preserve a pasta `data` para manter usuários, sessões e dados; ela é ignorada pelo Git. As senhas usam scrypt com salt e as sessões usam cookies HttpOnly. Para backup, pare o servidor e copie a pasta `data` inteira. O cadastro é local: não há envio de e-mail de recuperação de senha. Usar em outro dispositivo exige acesso ao mesmo servidor; o login não publica o sistema na internet.

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
