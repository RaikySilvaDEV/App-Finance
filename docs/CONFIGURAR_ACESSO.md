# Ativar Google e bancos no FinPulse

O código está preparado. Ainda faltam as credenciais Google e a habilitação da aplicação Pluggy para atender vários usuários. O login por senha continua disponível.

## Google

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e crie um projeto para o FinPulse.
2. Em **Google Auth Platform**, configure o nome, e-mail de suporte e público externo. Durante os testes, adicione seus e-mails em **Público / usuários de teste**.
3. Em **Clientes**, crie um cliente OAuth do tipo **Aplicativo da Web**. Cadastre exatamente estes URIs de redirecionamento:
   - `http://127.0.0.1:3000/api/auth/google/callback`
   - `https://app-finance-ruby-one.vercel.app/api/auth/google/callback`
4. Salve o ID e o segredo nas variáveis do servidor, nunca no chat ou Git.

No `.env` local:

```dotenv
GOOGLE_CLIENT_ID=seu_id
GOOGLE_CLIENT_SECRET=seu_segredo
GOOGLE_REDIRECT_URI=http://127.0.0.1:3000/api/auth/google/callback
```

Na Vercel, configure as mesmas credenciais em **Production**, alterando o retorno:

```dotenv
GOOGLE_REDIRECT_URI=https://app-finance-ruby-one.vercel.app/api/auth/google/callback
```

Reinicie o servidor local e faça novo deploy após configurar. Acesse pelo endereço exato configurado: localhost e 127.0.0.1 são origens diferentes. O aplicativo solicita apenas identidade, e-mail e perfil. Para disponibilizar ao público, conclua a publicação da tela de consentimento solicitada pelo Google.

**Se já tem cadastro:** entre com sua senha e abra **Minha conta → Vincular minha conta Google**, usando o mesmo e-mail. Os dados ficam no mesmo cadastro. O sistema não vincula contas automaticamente apenas por coincidência de e-mail.

## Pluggy para vários usuários

### Uso pessoal com dados reais

Em **Conexões → Adicionar conexão**, o responsável encontra duas etapas: autorizar o banco no Meu Pluggy e abrir o conector MeuPluggy dentro do FinPulse. O widget pessoal oferece apenas esse conector, sem bancos Sandbox. A disponibilidade desse widget depende das permissões da sua aplicação.

Se a Pluggy restringir sua aplicação ao fluxo pelo Dashboard, use **Importar conexão pessoal existente**: abra Applications → sua aplicação → Demo, conecte **MeuPluggy**, copie o itemId e importe no FinPulse. Em seleção personalizada, habilite MeuPluggy em Customization → Connectors, grupo Personal, aba Direct Connectors.

A autorização de um banco novo continua sendo feita no Meu Pluggy, conforme o guia oficial de uso pessoal. O widget aqui vincula os dados autorizados; não remove essa etapa. O serviço pessoal tem até cinco conexões e atualização a cada 24 horas. Sandbox contém dados simulados e não é usado neste fluxo.

### Produto para outras pessoas

Solicite à Pluggy a habilitação da aplicação para seu produto com múltiplos usuários e confirme plano, produtos de dados e bancos disponíveis. O MeuPluggy pessoal permite consultar seus próprios dados; não substitui essa habilitação.

Prefira habilitar a aplicação existente para manter suas conexões. Se for necessária outra aplicação, combine a migração com a Pluggy antes de substituir as chaves: itens não são transferidos automaticamente entre aplicações.

Depois da liberação, configure no servidor local e na Vercel:

```dotenv
PLUGGY_CLIENT_ID=id_da_aplicacao_habilitada
PLUGGY_CLIENT_SECRET=segredo_da_aplicacao_habilitada
PLUGGY_CONNECTION_MODE=business
PLUGGY_BUSINESS_ENABLED=true
FINPULSE_OWNER_EMAIL=seu_email_de_administrador
```

Essas variáveis liberam o fluxo no FinPulse; não contratam um plano nem concedem permissões na Pluggy. Até a liberação, mantenha `personal` e `false`. A importação pessoal fica restrita ao responsável. Se FINPULSE_OWNER_EMAIL estiver vazio, o único proprietário das conexões existentes é preservado como responsável.

Após reiniciar/reimplantar, cada pessoa entra no FinPulse e seleciona **Conexões → Conectar banco → Escolher meu banco**. O widget oficial abre a autorização bancária. Não é necessário criar conta pessoal MeuPluggy nem copiar identificadores.

O servidor cria o token com o usuário autenticado e verifica a propriedade na Pluggy antes de salvar a conexão. As chaves ficam no servidor. O fluxo consulta dados e não inicia pagamentos. Produtos como empréstimos e investimentos e a frequência de atualização dependem do banco, conector e plano.

A atualização automática exige o webhook na mesma aplicação Pluggy. A ativação existente pelo responsável continua em Conexões. Não cadastre uma URL alternativa sem a autenticação correspondente.

## Referências

- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect)
- [Widget Pluggy](https://docs.pluggy.ai/pt/docs/connect-widget/introduction)
- [Tokens do widget](https://docs.pluggy.ai/pt/docs/connect-widget/authentication)
- [MeuPluggy pessoal](https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use)
