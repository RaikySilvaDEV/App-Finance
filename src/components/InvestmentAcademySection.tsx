import React, { useState } from 'react';
import { 
  X, 
  GraduationCap, 
  BookOpen, 
  Calculator, 
  ShieldCheck, 
  TrendingUp, 
  Coins, 
  Building2, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight, 
  AlertCircle,
  Lightbulb,
  Sparkles,
  ChevronRight,
  PieChart,
  Percent,
  Clock,
  Layers,
  Award,
  RotateCcw,
  Search,
  ArrowLeft
} from 'lucide-react';

interface InvestmentAcademySectionProps {
  selicRateAnnual?: number;
  cdiRateAnnual?: number;
}

export const InvestmentAcademySection: React.FC<InvestmentAcademySectionProps> = ({
  selicRateAnnual,
  cdiRateAnnual,
}) => {
  const [activeTab, setActiveTab] = useState<'trilha' | 'simulador' | 'glossario' | 'quiz'>('trilha');
  const [selectedModule, setSelectedModule] = useState<number>(0);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [quizStep, setQuizStep] = useState(0);
  // Simulator State
  const [initialAmount, setInitialAmount] = useState<number>(1000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(300);
  const [months, setMonths] = useState<number>(36);
  const [assetType, setAssetType] = useState<'cdi100' | 'cdi115' | 'tesouro_ipca' | 'poupanca'>('cdi100');

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);


  const formatBrl = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Educational Modules
  const modules = [
    {
      id: 0,
      title: 'Módulo 1: O Primeiro Passo — Saindo do Zero',
      subtitle: 'Por que o dinheiro na conta corrente ou na poupança perde valor todos os dias?',
      icon: Lightbulb,
      tag: 'Fundamento',
      color: 'emerald',
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
              <span className="text-emerald-400">💡 O conceito mais importante:</span> A Inflação (IPCA)
            </h4>
            <p className="text-xs text-slate-300">
              Se uma cesta de compras custava R$ 100 ano passado e hoje custa R$ 104,50, a inflação foi de 4,5%. 
              Se o seu dinheiro ficar parado na conta corrente rendendo <strong>0%</strong>, você consegue comprar cada vez menos coisas. Investir não é para ficar rico da noite para o dia, é para <strong>proteger seu poder de compra e multiplicar seu patrimônio</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-900/90 border border-rose-500/30 p-3.5 rounded-xl">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs mb-1">
                <AlertCircle className="w-4 h-4" />
                <span>Poupança Antiga (Rendimento Baixo)</span>
              </div>
              <p className="text-xs text-slate-400">
                Pela lei do Banco Central, quando a Selic está acima de 8,5% ao ano, a poupança rende fixos <strong>0,5% ao mês + TR</strong> (cerca de 6,17% a 7% ao ano). 
                Isso significa que você ganha <strong>menos da metade</strong> do que o governo ou grandes bancos pagam em títulos seguros!
              </p>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 p-3.5 rounded-xl">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>100% do CDI (O Padrão Inteligente)</span>
              </div>
              <p className="text-xs text-slate-400">
                Acompanha a taxa básica de juros (Selic). Hoje rende aproximadamente <strong>{cdiRateAnnual?.toFixed(2) ?? '—'}% ao ano</strong>.
                Mesmo após descontar o imposto de renda, rende consideravelmente mais que a poupança, com a mesma segurança e liquidez imediata.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
            <h5 className="font-bold text-white text-xs mb-2">Primeiro Objetivo do Iniciante: A Reserva de Emergência</h5>
            <p className="text-xs text-slate-400">
              Antes de pensar em ações ou bolsa de valores, guarde de <strong>3 a 6 meses do seu custo de vida</strong> em um investimento que você possa sacar a qualquer momento (Liquidez Diária / D+0), como Tesouro Selic ou CDB 100% CDI de bancos sólidos (Inter, Itaú, Nubank, etc.).
            </p>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: 'Módulo 2: Renda Fixa Descomplicada',
      subtitle: 'Entenda Tesouro Direto, CDBs, LCIs e a garantia de R$ 250.000 do FGC',
      icon: ShieldCheck,
      tag: 'Segurança Total',
      color: 'cyan',
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <p className="text-xs text-slate-300">
            Renda Fixa significa que as regras de remuneração são <strong>combinadas no momento do investimento</strong>. Você sabe exatamente como seu dinheiro vai render (por exemplo: 100% do CDI, 12% fixo ao ano, ou IPCA + 6%).
          </p>

          <div className="space-y-2.5">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-cyan-400 text-xs font-bold">1. Tesouro Direto (Tesouro Nacional)</strong>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold">Risco Soberano (Mais seguro do país)</span>
              </div>
              <p className="text-xs text-slate-400">
                Você empresta dinheiro diretamente para o Governo Federal do Brasil.
                <br />• <strong>Tesouro Selic:</strong> Ideal para reserva de emergência; não perde valor se resgatado antes do vencimento.
                <br />• <strong>Tesouro IPCA+:</strong> Protege contra a inflação e garante um juro real acima dela (ótimo para aposentadoria).
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-emerald-400 text-xs font-bold">2. CDB (Certificado de Depósito Bancário)</strong>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Garantido pelo FGC</span>
              </div>
              <p className="text-xs text-slate-400">
                Você empresta dinheiro ao banco (ex: Inter, Itaú, Santander, PagBank). Em troca, o banco devolve com juros (ex: 100% a 115% do CDI).
                Tem a garantia do <strong>Fundo Garantidor de Créditos (FGC)</strong> de até R$ 250.000 por CPF e por instituição bancária.
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <strong className="text-amber-400 text-xs font-bold">3. LCI e LCA (Imobiliário e Agronegócio)</strong>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">100% Isento de IR para Pessoa Física</span>
              </div>
              <p className="text-xs text-slate-400">
                Títulos emitidos para financiar casas ou o campo brasileiro. Pela Lei nº 11.033, você <strong>não paga nenhum centavo de Imposto de Renda</strong> sobre o rendimento. Um LCI de 90% do CDI muitas vezes rende mais que um CDB de 105% do CDI!
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            <span className="text-white font-bold block mb-1">⚖️ Tabela Regressiva Oficial do Imposto de Renda (CDB e Tesouro):</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-[11px] mt-1">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Até 180 dias</span>
                <strong className="text-rose-400">22,5% sobre o lucro</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">181 a 360 dias</span>
                <strong className="text-amber-400">20,0% sobre o lucro</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">361 a 720 dias</span>
                <strong className="text-cyan-400">17,5% sobre o lucro</strong>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">&gt; 720 dias (2 anos)</span>
                <strong className="text-emerald-400">15,0% (Mínimo)</strong>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              *Nota importante: O imposto incide <strong>apenas sobre o que rendeu</strong>, nunca sobre o dinheiro que você guardou do seu bolso!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: 'Módulo 3: Fundos Imobiliários (FIIs)',
      subtitle: 'Receba aluguéis mensais isentos de Imposto de Renda na sua conta bancária',
      icon: Building2,
      tag: 'Renda Mensal Passiva',
      color: 'violet',
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <p className="text-xs text-slate-300">
            Imagine comprar um galpão logístico de R$ 50 milhões alugado para o Mercado Livre ou Magazine Luiza. Para uma pessoa comum isso é impossível, mas através de um <strong>Fundo Imobiliário (FII)</strong> na Bolsa brasileira (B3), você pode comprar uma única cota por cerca de <strong>R$ 10 a R$ 100</strong>!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-violet-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                <Building2 className="w-4 h-4" />
                FIIs de Tijolo (Ex: HGLG11, KNRI11)
              </span>
              <p className="text-xs text-slate-400">
                Donos de prédios físicos reais: galpões de distribuição, hospitais, shopping centers e lajes corporativas. O fundo recolhe o aluguel dos inquilinos e repassa para você todo mês.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 mb-1">
                <Coins className="w-4 h-4" />
                FIIs de Papel / CRIs (Ex: MXRF11, CPTS11)
              </span>
              <p className="text-xs text-slate-400">
                Investem em dívidas imobiliárias (CRIs) indexadas à inflação ou ao CDI. Costumam ter cotas acessíveis (na faixa de R$ 10) e pagam dividendos mensais constantes.
              </p>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h5 className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Por que os brasileiros amam FIIs?
            </h5>
            <ul className="text-xs text-slate-300 space-y-1 mt-1 list-disc list-inside">
              <li><strong>Rendimento Mensal:</strong> O dinheiro do dividendo cai diretamente na sua conta corrente todos os meses (entre o 10º e 15º dia útil).</li>
              <li><strong>Zero Imposto nos Aluguéis:</strong> Pela Lei 8.668/93, os rendimentos distribuídos para pessoas físicas são <strong>100% isentos de Imposto de Renda</strong>!</li>
              <li><strong>Efeito Bola de Neve:</strong> Quando seus dividendos mensais forem suficientes para comprar uma nova cota de graça sem usar o seu salário, você atinge o ponto de inflexão financeiro.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: 'Módulo 4: Ações e Dividendos — Seja Sócio das Maiores Empresas',
      subtitle: 'Compre frações de empresas como Itaú, Vale, Petrobras e Banco do Brasil',
      icon: TrendingUp,
      tag: 'Crescimento Longo Prazo',
      color: 'amber',
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <p className="text-xs text-slate-300">
            Uma ação é a <strong>menor fração do capital de uma empresa</strong>. Ao comprar uma ação do Banco do Brasil (BBAS3) ou da Itaúsa (ITSA4), você se torna literalmente <strong>sócio</strong> daquele negócio, tendo direito a receber parte dos lucros líquidos distribuídos (Dividendos e JCP).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-amber-400 font-bold text-xs block mb-1">Como você ganha dinheiro com ações:</span>
              <ul className="text-xs text-slate-400 space-y-1.5">
                <li>• <strong>Dividendos:</strong> O lucro da empresa depositado na sua conta sem nenhum trabalho.</li>
                <li>• <strong>Valorização da cota:</strong> Se a empresa fatura mais e cresce com os anos, as ações tendem a acompanhar esse crescimento.</li>
              </ul>
            </div>

            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-rose-400 font-bold text-xs block mb-1">O maior erro do iniciante:</span>
              <p className="text-xs text-slate-400">
                Achar que a bolsa é cassino ou tentar fazer apostas de curto prazo (Day Trade). Estudos da FGV mostram que 97% dos que tentam Day Trade perdem dinheiro. O investidor de sucesso compra boas empresas pagadoras de dividendos e segura por anos.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-white font-bold text-xs block mb-1">Regra de ouro da alocação por perfil:</span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block">Conservador</span>
                <span className="text-[10px] text-slate-400">80% Renda Fixa<br />15% FIIs<br />5% Ações</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-cyan-400 font-bold block">Moderado</span>
                <span className="text-[10px] text-slate-400">50% Renda Fixa<br />30% FIIs<br />20% Ações</span>
              </div>
              <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-violet-400 font-bold block">Arrojado</span>
                <span className="text-[10px] text-slate-400">30% Renda Fixa<br />35% FIIs<br />35% Ações/Global</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: 'Módulo 5: Open Finance & Seus Bancos',
      subtitle: 'Como funciona a autorização oficial regulada pelo Banco Central do Brasil',
      icon: ShieldCheck,
      tag: 'Regulação BACEN',
      color: 'cyan',
      content: (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl">
            <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              O que é o Open Finance Brasil?
            </h4>
            <p className="text-xs text-slate-300">
              Criado pelo <strong>Banco Central do Brasil (Resolução BCB nº 1/2020)</strong>, o Open Finance estabelece que <strong>os dados bancários pertencem a você</strong>, e não à instituição financeira. Você tem o poder de autorizar o compartilhamento de saldos, extratos e posições entre seus bancos (Inter, Itaú, Nubank, Santander, etc.) por meio do fluxo autorizado da instituição e da Pluggy.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-bold text-white">Como acontece a autorização passo a passo:</h5>
            <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <li><strong>Solicitação de Consentimento:</strong> Você escolhe o banco e confirma os dados do seu titular (Nome e CPF).</li>
              <li><strong>Autorização no seu Banco:</strong> O banco recebe uma chamada segura e solicita sua confirmação (biometria ou token no aplicativo oficial).</li>
              <li><strong>Sincronização Automática:</strong> Uma vez autorizado, o FinPulse conecta aos dados do seu banco para consultar os dados liberados. Este aplicativo não movimenta dinheiro nem executa investimentos.</li>
              <li><strong>Revogação a qualquer momento:</strong> Você tem o direito regulatório de cancelar o compartilhamento a qualquer instante.</li>
            </ol>
          </div>
        </div>
      )
    }
  ];

  // Illustrative compound interest calculation
  const calculateRealSimulation = () => {
    let annualRate = (cdiRateAnnual || 0) / 100; // taxa oficial atual, sem projetar variação futura
    let isTaxFree = false;

    if (assetType === 'cdi115') {
      annualRate = (cdiRateAnnual || 0) * 0.01 * 1.15;
    } else if (assetType === 'tesouro_ipca') {
      annualRate = 0; // taxa IPCA+ varia por título e vencimento; sem cotação atual, não estimar
    } else if (assetType === 'poupanca') {
      annualRate = selicRateAnnual && selicRateAnnual > 8.5 ? 0.06 : 0; // aproximação 0,5% a.m.; TR não incluída
      isTaxFree = true;
    }

    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    let balance = initialAmount;
    let totalInvestedFromPocket = initialAmount;

    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + monthlyContribution;
      totalInvestedFromPocket += monthlyContribution;
    }

    const grossProfit = Math.max(0, balance - totalInvestedFromPocket);

    // Official Regressive Income Tax Table
    const totalDays = months * 30;
    let irRate = 0.15;
    if (totalDays <= 180) {
      irRate = 0.225;
    } else if (totalDays <= 360) {
      irRate = 0.20;
    } else if (totalDays <= 720) {
      irRate = 0.175;
    } else {
      irRate = 0.15;
    }

    const irAmount = isTaxFree ? 0 : grossProfit * irRate;
    const netFinal = balance - irAmount;
    const netProfit = netFinal - totalInvestedFromPocket;

    const passiveMonthlyIncome = netFinal * monthlyRate;

    // Compare with Traditional Poupança
    const poupancaMonthlyRate = selicRateAnnual && selicRateAnnual > 8.5 ? Math.pow(1 + 0.06, 1 / 12) - 1 : 0;
    let poupancaBalance = initialAmount;
    for (let m = 1; m <= months; m++) {
      poupancaBalance = poupancaBalance * (1 + poupancaMonthlyRate) + monthlyContribution;
    }
    const diffVsPoupanca = netFinal - poupancaBalance;

    return {
      totalInvestedFromPocket,
      grossFinal: balance,
      grossProfit,
      irRate: isTaxFree ? 0 : irRate,
      irAmount,
      netFinal,
      netProfit,
      passiveMonthlyIncome,
      poupancaBalance,
      diffVsPoupanca
    };
  };

  const simResult = calculateRealSimulation();

  // Beginner Quiz Questions
  const quizQuestions = [
    {
      id: 1,
      question: 'Onde um investidor iniciante deve guardar a sua Reserva de Emergência?',
      options: [
        'Em ações de empresas de alto risco para dobrar o dinheiro rápido',
        'No Tesouro Selic ou CDB com liquidez diária e garantia do FGC',
        'Debaixo do colchão em dinheiro vivo',
        'Em criptomoedas voláteis'
      ],
      correctIndex: 1,
      explanation: 'Exato! A reserva de emergência exige segurança e liquidez imediata (D+0). Tesouro Selic e CDB com liquidez diária são os locais ideais.'
    },
    {
      id: 2,
      question: 'Os rendimentos mensais distribuídos por Fundos Imobiliários (FIIs) para pessoas físicas possuem qual tributação?',
      options: [
        'Tributados em 27,5% na fonte todo mês',
        '100% Isentos de Imposto de Renda (conforme Lei nº 8.668/93)',
        'Tributados pela tabela regressiva de 22,5%',
        'Devem ser pagos via DARF manual mensalmente'
      ],
      correctIndex: 1,
      explanation: 'Correto! Os dividendos de FIIs pagos a pessoas físicas são legalmente isentos de Imposto de Renda no Brasil.'
    },
    {
      id: 3,
      question: 'Qual é o valor máximo coberto pelo FGC (Fundo Garantidor de Créditos) por CPF e instituição financeira?',
      options: [
        'Até R$ 50.000',
        'Até R$ 250.000',
        'Até R$ 1.000.000',
        'Não há limite de cobertura'
      ],
      correctIndex: 1,
      explanation: 'Perfeito! O FGC cobre até R$ 250 mil por CPF em cada instituição financeira ou conglomerado financeiro.'
    },
    {
      id: 4,
      question: 'Qual a principal vantagem de investir a 100% do CDI em relação à poupança tradicional com a Selic acima de 8,5% a.a.?',
      options: [
        'A poupança rende o dobro do CDI',
        'O CDI rende aproximadamente o dobro da poupança, com liquidez e segurança similares',
        'Não há diferença, ambos rendem exatamente o mesmo valor',
        'O CDI só pode ser sacado após 10 anos'
      ],
      correctIndex: 1,
      explanation: 'Exato! Com a Selic a dois dígitos, a poupança fica travada em cerca de 6,17% a.a., enquanto 100% do CDI entrega rentabilidade muito superior.'
    }
  ];

  const handleSelectQuizOption = (qId: number, optIdx: number) => {
    setQuizAnswers(prev => ({ ...prev, [qId]: optIdx }));
  };

  const getScore = () => {
    let score = 0;
    quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctIndex) score++;
    });
    return score;
  };

  const glossary = [
    { term: 'CDI (Certificado de Depósito Interbancário)', desc: 'Taxa pela qual os bancos emprestam dinheiro entre si diariamente. É o principal benchmark da Renda Fixa brasileira.' },
    { term: 'Taxa Selic', desc: 'A taxa básica de juros da economia brasileira, definida a cada 45 dias pelo Copom (Comitê de Política Monetária do Banco Central).' },
    { term: 'IPCA (Índice de Preços ao Consumidor Amplo)', desc: 'A medida oficial da inflação no Brasil calculada pelo IBGE. Mostra a perda do poder de compra do dinheiro.' },
    { term: 'Dividend Yield (DY)', desc: 'Indicador que mede a rentabilidade dos dividendos pagos por uma ação ou FII em relação ao preço atual da cota nos últimos 12 meses.' },
    { term: 'FGC (Fundo Garantidor de Créditos)', desc: 'Entidade privada que protege o dinheiro de correntistas e investidores em caso de falência de bancos (até R$ 250 mil).' },
    { term: 'Liquidez Diária (D+0 ou D+1)', desc: 'A velocidade com que você consegue transformar seu investimento de volta em dinheiro na conta bancária disponível para saque ou Pix.' },
    { term: 'Open Finance', desc: 'Sistema regulado pelo Banco Central que permite que você compartilhe seus dados e ordens de pagamento de forma segura entre seus bancos.' },
    { term: 'B3 (Brasil, Bolsa, Balcão)', desc: 'A bolsa oficial de valores do Brasil, sediada em São Paulo, onde são negociadas ações, FIIs, BDRs e ETFs.' },
  ];

  const lessonTitles = ['Comece pelo essencial', 'Entenda a renda fixa', 'Fundos imobiliários', 'Ações e dividendos', 'Conecte seus bancos'];
  const lessonDescriptions = ['Inflação e organização do dinheiro', 'Produtos, prazos e proteção', 'Como funcionam os FIIs', 'Participação em empresas', 'Consentimento e compartilhamento'];
  const searchTerm = glossarySearch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const filteredGlossary = glossary.filter((item) => (item.term + ' ' + item.desc).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(searchTerm));
  return (
    <section aria-label="Conteúdo de Aprender" className="academy-section min-w-0 space-y-5">
        <nav aria-label="Conteúdos de Aprender" className="grid grid-cols-4 gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-2 sm:flex">
          {([{ id: 'trilha', label: 'Aulas', Icon: BookOpen }, { id: 'simulador', label: 'Simulador', Icon: Calculator }, { id: 'quiz', label: 'Quiz', Icon: HelpCircle }, { id: 'glossario', label: 'Glossário', Icon: Layers }] as const).map(({ id, label, Icon }) => <button key={id} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] font-medium transition-colors sm:px-4 sm:text-xs ${activeTab === id ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-300'}`}><Icon className={`hidden h-3.5 w-3.5 min-[360px]:block ${activeTab === id ? 'text-rose-300' : ''}`}/>{label}</button>)}
        </nav>
        <div className="min-w-0">
          {/* TAB 1: TRILHA DE APRENDIZADO */}
          {activeTab === 'trilha' && <div className="grid min-w-0 gap-5 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="min-w-0"><div className="mb-4 flex items-center justify-between px-1"><h3 className="text-xs font-medium text-slate-400">Sua trilha</h3><span className="text-[10px] text-slate-500">{modules.length} aulas</span></div>
              <div className="flex gap-2 overflow-x-auto pb-2 md:flex-col" aria-label="Aulas disponíveis">{modules.map((module, index) => { const selected = selectedModule === module.id; return <button key={module.id} onClick={() => setSelectedModule(module.id)} aria-current={selected ? 'step' : undefined} className={`flex w-52 shrink-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors md:w-full ${selected ? 'border-rose-400/25 bg-rose-500/[0.06]' : 'border-transparent hover:bg-white/[0.025]'}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-medium ${selected ? 'bg-rose-500/10 text-rose-300' : 'bg-white/[0.035] text-slate-500'}`}>{String(index + 1).padStart(2, '0')}</span><span className="min-w-0"><span className={`block text-xs font-medium ${selected ? 'text-white' : 'text-slate-400'}`}>{lessonTitles[index]}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-500">{lessonDescriptions[index]}</span></span></button>; })}</div>
              <div className="mt-5 hidden border-t border-slate-800 px-1 pt-4 md:block"><p className="text-[11px] leading-relaxed text-slate-500">Explore uma aula por vez. Use o simulador para praticar e o glossário para tirar dúvidas.</p></div>
            </aside>
            <article className="min-w-0 rounded-xl border border-slate-800 bg-[#121214] p-4 sm:p-6"><div className="mb-6 border-b border-slate-800 pb-5"><p className="text-[10px] font-medium uppercase tracking-[0.12em] text-rose-300">Aula {selectedModule + 1} de {modules.length}</p><h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{lessonTitles[selectedModule]}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">{lessonDescriptions[selectedModule]}</p></div>
              <div className="academy-reading">{modules[selectedModule].content}</div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5"><button onClick={() => setSelectedModule(Math.max(0, selectedModule - 1))} disabled={selectedModule === 0} className="inline-flex items-center gap-2 rounded-lg px-2 py-2.5 text-xs text-slate-400 hover:text-white disabled:opacity-30"><ArrowLeft className="h-3.5 w-3.5"/>Anterior</button><button onClick={() => selectedModule < modules.length - 1 ? setSelectedModule(selectedModule + 1) : setActiveTab('quiz')} className="inline-flex items-center gap-2 rounded-lg bg-rose-400 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-500">{selectedModule < modules.length - 1 ? 'Próxima aula' : 'Praticar no quiz'}<ArrowRight className="h-3.5 w-3.5"/></button></div>
            </article>
          </div>}

          {/* TAB 2: SIMULADOR REAL DE JUROS COMPOSTOS & IR */}
          {activeTab === 'simulador' && (
            <div className="space-y-6">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    Simulador didático com hipóteses simplificadas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Veja na prática o poder do tempo e dos aportes mensais. Estimativa didática: mantém uma taxa constante e aplica IR simplificado ao prazo total. Não reproduz cada aporte, produto, tarifa ou regra fiscal individual; não é previsão de retorno.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Inputs Controls */}
                <div className="lg:col-span-5 space-y-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Aporte Inicial (R$):
                      </label>
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {formatBrl(initialAmount)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="50000"
                      step="100"
                      value={initialAmount}
                      onChange={(e) => setInitialAmount(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>R$ 100</span>
                      <span>R$ 25.000</span>
                      <span>R$ 50.000</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Aporte Mensal Todo Mês (R$):
                      </label>
                      <span className="text-xs font-bold font-mono text-cyan-400">
                        {formatBrl(monthlyContribution)}/mês
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="10000"
                      step="50"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>R$ 50/mês</span>
                      <span>R$ 5.000/mês</span>
                      <span>R$ 10.000/mês</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        Prazo de Investimento:
                      </label>
                      <span className="text-xs font-bold font-mono text-violet-400">
                        {months} meses ({(months / 12).toFixed(1)} anos)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="6"
                      max="120"
                      step="6"
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                      <span>6 meses</span>
                      <span>5 anos (60m)</span>
                      <span>10 anos (120m)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Tipo de Investimento Simulado:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        onClick={() => setAssetType('cdi100')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          assetType === 'cdi100'
                            ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">100% do CDI</div>
                        <span className="text-[10px] text-slate-500 font-mono">{cdiRateAnnual?.toFixed(2) ?? '—'}% a.a.</span>
                      </button>

                      <button
                        onClick={() => setAssetType('cdi115')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          assetType === 'cdi115'
                            ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">115% do CDI</div>
                        <span className="text-[10px] text-slate-500 font-mono">{cdiRateAnnual ? (cdiRateAnnual * 1.15).toFixed(2) : '—'}% a.a.</span>
                      </button>

                      <button
                        onClick={() => setAssetType('tesouro_ipca')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          assetType === 'tesouro_ipca'
                            ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Tesouro IPCA+</div>
                        <span className="text-[10px] text-slate-500 font-mono">Sem cotação atual</span>
                      </button>

                      <button
                        onClick={() => setAssetType('poupanca')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          assetType === 'poupanca'
                            ? 'bg-emerald-500/10 border-emerald-500 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">Poupança Antiga</div>
                        <span className="text-[10px] text-slate-500 font-mono">Taxa estimada; TR omitida</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulation Output Card */}
                <div className="lg:col-span-7 bg-gradient-to-b from-slate-900 to-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-5">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Resultado estimado (hipótese simplificada de IR)
                    </span>
                    <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono mt-1">
                      {formatBrl(simResult.netFinal)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Você terá acumulado <strong>{formatBrl(simResult.netFinal)}</strong> líquidos prontos para resgate na sua conta.
                    </p>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Do seu bolso</span>
                      <strong className="text-sm font-bold text-slate-200 font-mono">
                        {formatBrl(simResult.totalInvestedFromPocket)}
                      </strong>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Juros Ganhos (Bruto)</span>
                      <strong className="text-sm font-bold text-cyan-400 font-mono">
                        +{formatBrl(simResult.grossProfit)}
                      </strong>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">
                        Imposto de Renda ({(simResult.irRate * 100).toFixed(1)}%)
                      </span>
                      <strong className="text-sm font-bold text-rose-400 font-mono">
                        -{formatBrl(simResult.irAmount)}
                      </strong>
                    </div>
                  </div>

                  {/* Comparison vs Poupança Box */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Ganho Extra vs Deixar na Poupança:
                      </span>
                      <span className="text-sm font-extrabold text-emerald-400 font-mono">
                        +{formatBrl(Math.max(0, simResult.diffVsPoupanca))}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Se você deixasse esse mesmo dinheiro na poupança, você teria <strong>{formatBrl(simResult.poupancaBalance)}</strong>. 
                      Investindo no CDI você ganha <strong>{formatBrl(Math.max(0, simResult.diffVsPoupanca))} a mais</strong> sem correr riscos desnecessários!
                    </p>
                  </div>

                  {/* Passive Income Generation */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Renda Passiva Mensal Estimada ao final:</span>
                      <span className="text-xs text-slate-500">Se você parar de colocar dinheiro e só viver dos juros</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-violet-400 font-mono">
                        ~{formatBrl(simResult.passiveMonthlyIncome)}/mês
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: QUIZ DE CERTIFICAÇÃO */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    Pratique o que aprendeu
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Uma pergunta por vez, com a explicação de cada resposta.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Progresso: {Object.keys(quizAnswers).length} de {quizQuestions.length}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {quizQuestions.slice(quizStep, quizStep + 1).map((q) => {
                  const userAnswer = quizAnswers[q.id];
                  const hasAnswered = userAnswer !== undefined;
                  const isCorrect = userAnswer === q.correctIndex;

                  return (
                    <div 
                      key={q.id}
                      className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-start space-x-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {quizStep + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {q.question}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                        {q.options.map((opt, optIdx) => {
                          const isOptionSelected = userAnswer === optIdx;
                          let btnStyle = 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700';

                          if (quizSubmitted || hasAnswered) {
                            if (optIdx === q.correctIndex) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                            } else if (isOptionSelected && !isCorrect) {
                              btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectQuizOption(q.id, optIdx)}
                              className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${btnStyle}`}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-slate-500 text-[10px]">
                                  {String.fromCharCode(65 + optIdx)})
                                </span>
                                <span>{opt}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && (
                        <div className={`p-3 rounded-xl text-xs ml-8 ${isCorrect ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                          <strong>{isCorrect ? '✓ Correto!' : '✗ Incorreto:'}</strong> {q.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3"><button disabled={quizStep === 0} onClick={() => setQuizStep((step) => Math.max(0, step - 1))} className="rounded-lg px-3 py-2 text-xs text-slate-400 disabled:opacity-30">Anterior</button><span className="text-xs text-slate-500">Questão {quizStep + 1} de {quizQuestions.length}</span><button disabled={quizStep === quizQuestions.length - 1} onClick={() => setQuizStep((step) => Math.min(quizQuestions.length - 1, step + 1))} className="rounded-lg px-3 py-2 text-xs text-rose-300 disabled:opacity-30">Próxima</button></div>
              {/* Quiz Submit & Results */}
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {Object.keys(quizAnswers).length === quizQuestions.length
                      ? getScore() === 4
                        ? 'Você acertou todas as perguntas!'
                        : `Você acertou ${getScore()} de ${quizQuestions.length} questões.`
                      : 'Continue pelas perguntas para ver seu resultado.'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Revise os módulos da Trilha se tiver qualquer dúvida sobre títulos públicos, FIIs ou prazos.
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); setQuizStep(0); }}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white cursor-pointer"
                    title="Recomeçar Quiz"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>


                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GLOSSÁRIO */}
          {activeTab === 'glossario' && <div className="mx-auto max-w-2xl space-y-5"><div><h3 className="text-lg font-semibold text-white">Termos sem complicação</h3><p className="mt-2 text-xs text-slate-500">Encontre uma palavra e abra sua explicação.</p></div><label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3"><Search className="h-4 w-4 shrink-0 text-slate-500"/><input aria-label="Buscar no glossário" type="search" value={glossarySearch} onChange={(event) => setGlossarySearch(event.target.value)} placeholder="Buscar termo…" className="w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"/></label><div className="divide-y divide-slate-800 rounded-xl border border-slate-800">{filteredGlossary.map((item) => <details key={item.term} name="academy-glossary" className="group p-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-200">{item.term}<ChevronRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-90"/></summary><p className="mt-3 text-sm leading-relaxed text-slate-400">{item.desc}</p></details>)}{!filteredGlossary.length && <p role="status" className="p-5 text-sm text-slate-500">Nenhum termo encontrado. Tente outra palavra.</p>}</div></div>}
        </div>

    </section>
  );
};
