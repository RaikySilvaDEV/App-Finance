# Ativar brapi e Resend

As integrações estão implementadas. O envio de e-mails depende de uma conta Resend e domínio verificado; o acesso da brapi depende da chave e das permissões do plano.

## brapi: cotações, histórico e proventos

1. Crie sua conta em https://brapi.dev/login.
2. Copie a chave no Dashboard e configure `BRAPI_API_KEY` no `.env` e nas variáveis Production da Vercel.
3. Reinicie o servidor local e faça novo deploy após atualizar as variáveis.

A aplicação usa os endpoints v2 com autenticação no servidor. Cotações e gráficos tentam a brapi e mantêm Yahoo Finance como alternativa, identificando a fonte. Proventos ficam em Mercado → Consultar proventos de um ativo; escolha Ação ou FII. Nem todo ticker terminado em 11 é um FII.

Sem chave, a documentação oferece acesso limitado a PETR4, MGLU3, VALE3 e ITUB4; para proventos de FIIs, MXRF11 e HGLG11 estão documentados como consultas públicas. Isso não libera todo o mercado. Outros dados exigem a chave/plano correspondente. A implementação não contrata planos nem amplia cotas. As consultas têm cache de cinco minutos; falhas ficam retidas brevemente para evitar repetição excessiva.

Datas e valores refletem os dados disponíveis no provedor. Campos ausentes não são apresentados como rendimento zero. Proventos divulgados não comprovam recebimento na sua conta; algumas datas de FIIs são referências dos informes mensais. A carteira bancária continua vindo da Pluggy.

## Resend: recuperação de senha e lembretes

1. Crie uma conta em https://resend.com/.
2. Adicione seu domínio em Domains e configure os registros DNS que o Resend solicitar. Aguarde a verificação.
3. Crie uma chave de envio para esse domínio e configure:

```dotenv
RESEND_API_KEY=sua_chave
RESEND_FROM=FinPulse <avisos@seu-dominio.com>
APP_URL=https://app-finance-ruby-one.vercel.app
CRON_SECRET=seu_segredo_aleatorio_longo
```

Use um segredo aleatório com pelo menos 32 caracteres para CRON_SECRET. Gere no seu terminal, por exemplo:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Guarde as variáveis no `.env` e na Vercel Production, sem publicar valores no Git ou no chat. Localmente use `APP_URL=http://127.0.0.1:3000`. O endereço público exige HTTPS. APP_URL controla os links enviados, não é recebido do navegador.

### Recuperar senha

Na tela de entrada, selecione Esqueci minha senha. O link expira em 30 minutos, só pode ser usado uma vez e é armazenado no servidor como hash. A troca invalida as sessões existentes e os outros links de recuperação desse cadastro. O e-mail pode levar algum tempo; confira spam. A resposta da solicitação é genérica para não revelar quais e-mails têm cadastro. Confirme entregas e eventuais erros no painel do Resend.

### Lembretes

Abra Minha conta → Lembretes por e-mail e selecione Ativar e confirmar e-mail. Abra o link recebido e confirme no FinPulse. A opção começa desativada. Desativar em Minha conta cancela também uma confirmação pendente.

A Vercel executa `/api/notifications/daily` diariamente às 12:00 UTC, usando CRON_SECRET no cabeçalho de autorização. O domínio e o remetente precisam estar verificados, e as variáveis devem estar na implantação atual. Reinicie/reimplante depois de configurá-las. A página local não agenda e-mails por si só.

Os avisos usam as contas/parcelas e empréstimos manuais cadastrados, com vencimentos entre sete dias atrás e três dias à frente. Não confirmam atraso bancário e não enviam extratos ou saldos. Cada usuário recebe no máximo um lembrete por dia, com idempotência no Resend e registro no banco. Falhas não têm nova tentativa automática pela Vercel; consulte os logs e execute novamente pelo painel, se necessário. O processamento inicial atende até 30 usuários por execução; para volumes maiores, use fila e agendamento compatíveis com seu plano.

## Documentação

- https://brapi.dev/docs/acoes/cotacao
- https://brapi.dev/docs/acoes/historico
- https://brapi.dev/docs/acoes/dividendos
- https://brapi.dev/docs/fiis/dividendos
- https://resend.com/docs/send-with-nodejs
- https://resend.com/docs/api-reference/emails/send-email
