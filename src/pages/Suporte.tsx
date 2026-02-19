import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
    ArrowLeft,
    Search,
    Send,
    Loader2,
    MessageCircle,
    ExternalLink,
    Bot,
    ChevronRight,
    Phone,
    Lock,
    Brain,
    Trophy,
    Columns,
    X,
    BookOpen,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Target,
} from 'lucide-react';
import { useNathiChat } from '@/hooks/useNathiChat';
import type { Message } from '@/types/chat';

// ──────────────────────────────────────────────
// Markdown formatter
// ──────────────────────────────────────────────
function formatMessage(text: string): React.ReactNode[] {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    lines.forEach((line, lineIndex) => {
        if (line.trim() === '') {
            result.push(<br key={`br-${lineIndex}`} />);
            return;
        }
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
            const [, num, content] = numberedMatch;
            result.push(
                <div key={`line-${lineIndex}`} className="flex gap-2 mt-1 first:mt-0">
                    <span className="font-bold text-primary flex-shrink-0">{num}.</span>
                    <span>{parseBold(content)}</span>
                </div>
            );
            return;
        }
        result.push(
            <span key={`line-${lineIndex}`} className="block leading-relaxed">
                {parseBold(line)}
            </span>
        );
    });
    return result;
}

function parseBold(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
    });
}

// ──────────────────────────────────────────────
// Knowledge base — todos os 16 módulos
// ──────────────────────────────────────────────
interface Module {
    id: number;
    title: string;
    phase: string;
    description: string;
    whenToRecommend: string;
    contents: string[];
    tags: string[];
    emoji: string;
}

const MODULES: Module[] = [
    {
        id: 1,
        title: 'O Cofre de Ouro',
        phase: 'Fase 1 – Fundamentos',
        description: 'Módulo de boas-vindas que apresenta a oportunidade do curso e o que o aluno pode alcançar. Serve como motivação inicial e visão geral do programa.',
        whenToRecommend: 'Quando você acabou de entrar no curso e quer entender do que se trata, ou precisa de motivação.',
        contents: ['Oportunidade', 'Linha de chegada'],
        tags: ['boas-vindas', 'introdução', 'começar', 'início', 'motivação', 'visão geral', 'cofre', 'ouro', 'oportunidade'],
        emoji: '🏆',
    },
    {
        id: 2,
        title: 'Plano de Ação',
        phase: 'Fase 1 – Fundamentos',
        description: 'Define o plano estratégico que o aluno deve seguir. Inclui a introdução ao método, os passos práticos e o mecanismo de recompensa para manter o engajamento.',
        whenToRecommend: 'Quando você não sabe por onde começar ou precisa de um direcionamento claro.',
        contents: ['O que você vai aprender aqui', 'Acesse o seu presente', 'Introdução', 'Plano de Ação 1', 'Plano de Ação 2', 'Mecanismo de recompensa'],
        tags: ['plano', 'ação', 'estratégia', 'direcionamento', 'começar', 'método', 'passos', 'recompensa'],
        emoji: '📋',
    },
    {
        id: 3,
        title: 'Seção 1 – Mapeamento',
        phase: 'Fase 1 – Fundamentos',
        description: 'Módulo onde o aluno recebe suporte e é apresentado ao Gold Safe. Funciona como um mapeamento inicial do caminho a ser percorrido.',
        whenToRecommend: 'Quando você precisa de suporte ou quer entender o que é o Gold Safe.',
        contents: ['Receba meu suporte', 'Gold Safe'],
        tags: ['mapeamento', 'suporte', 'gold safe', 'caminho', 'trilha', 'ajuda'],
        emoji: '🗺️',
    },
    {
        id: 4,
        title: 'Seção 1 – Destravando o Gold Safe',
        phase: 'Fase 1 – Fundamentos',
        description: 'Explica o que é o programa Gold Safe, como funciona a liberação progressiva das aulas e os checklists de progresso.',
        whenToRecommend: 'Quando você tem dúvidas sobre o Gold Safe, liberação de aulas ou como acompanhar seu progresso.',
        contents: ['O que é o Gold Safe', 'Liberação das aulas', 'Checklist 1 e 2'],
        tags: ['gold safe', 'liberação', 'aulas', 'checklist', 'progresso', 'acesso', 'destravar', 'travado'],
        emoji: '🔓',
    },
    {
        id: 5,
        title: '🔥 Renda de 5 Mil por Dia',
        phase: 'Fase 1 – Fundamentos',
        description: 'Aula especial onde Nathália mostra o método prático que utiliza para gerar R$5.000 por dia. Conteúdo motivacional e estratégico com prova de resultados.',
        whenToRecommend: 'Quando você quer ver resultados reais ou precisa de motivação com prova de resultados.',
        contents: ['É assim que eu faço 5 mil reais por dia'],
        tags: ['5 mil', 'renda', 'resultado', 'motivação', 'prova', 'dinheiro', 'ganhar', 'dia', 'método', 'nathália'],
        emoji: '🔥',
    },
    {
        id: 6,
        title: 'Seção 1 – Alicerce',
        phase: 'Fase 2 – Construção',
        description: 'Módulo fundamental que ensina toda a base do negócio digital: criação de VSL, hospedagem, área de membros, checkout, afiliados, suporte pós-venda e fidelização. O módulo mais completo e extenso.',
        whenToRecommend: 'Quando você precisa montar a estrutura completa do produto digital, configurar área de membros, checkout, afiliados, ou tem dúvidas sobre qualquer etapa da criação do produto.',
        contents: ['Diretriz', 'Video Sales Letter (VSL)', 'Modelos e/ou formatos', 'Estrutura', 'Criação', 'História', 'Oferta', 'Hospedagem', 'Cadastro', 'Postagem', 'Geral', 'Área de membros', 'Configurações', 'Checkout', 'Co-produção', 'Afiliados', 'Links', 'Suporte pós-venda', 'Fidelização', 'Modelo de contrato', 'Checklist'],
        tags: ['alicerce', 'vsl', 'video sales letter', 'hospedagem', 'área de membros', 'checkout', 'co-produção', 'afiliados', 'pós-venda', 'fidelização', 'produto digital', 'estrutura', 'criar', 'base'],
        emoji: '🏗️',
    },
    {
        id: 7,
        title: 'Seção 1 – Compilado Gold',
        phase: 'Fase 4 – Escala',
        description: 'Módulo avançado que ensina captação e prospecção de clientes, uso de plataformas específicas, criação de portfólio e novos projetos. Inclui modelos de contrato e sistemas de trabalho.',
        whenToRecommend: 'Quando você já tem a base e quer aprender a captar clientes, montar portfólio ou fechar contratos.',
        contents: ['O que é o compilado', 'Hack', 'Captação e prospecção', 'Sistema', 'Plataforma 1 e 2', 'Cadastro', 'Novos projetos', 'Portfólio', 'Modelo de contrato', 'Sistema 2 e 3', 'Considerações', 'Checklist'],
        tags: ['compilado', 'gold', 'captação', 'prospecção', 'clientes', 'portfólio', 'contrato', 'plataforma', 'projetos', 'sistema'],
        emoji: '⚙️',
    },
    {
        id: 8,
        title: 'Seção 1 – Vertente Bronze',
        phase: 'Fase 3 – Monetização',
        description: 'Apresenta 4 vertentes de monetização de nível inicial. Cobre precificação, visão de mercado, plataformas de indicações, pesquisa de links, definição de nicho e habilidades necessárias.',
        whenToRecommend: 'Quando você está começando e quer modelos de monetização mais acessíveis ou precisa definir nicho e precificação.',
        contents: ['Diretriz', 'Vertente 1 + Precificação', 'Vertente 2 (Visão de Mercado, Vantagens/Desvantagens, Plataformas, Pesquisa, Como Vender)', 'Vertente 3 + Precificação', 'Vertente 4 (Nicho, Precificação, Habilidades, Inspiracional)'],
        tags: ['bronze', 'monetização', 'nicho', 'precificação', 'mercado', 'plataformas', 'indicações', 'iniciante', 'começando', 'vender'],
        emoji: '🥉',
    },
    {
        id: 9,
        title: 'Seção 1 – Vertente Silver',
        phase: 'Fase 3 – Monetização',
        description: 'Vertente intermediária com foco em demandas de mercado, expertise, pilares essenciais de vendas (AIDA), prospecção e precificação mais avançada.',
        whenToRecommend: 'Quando você já passou pela Vertente Bronze e quer evoluir para estratégias intermediárias de prospecção e vendas.',
        contents: ['Diretriz', 'Vertente 1 + Demandas 1, 2 e 3', 'Vertente 2 (Expertise, Pilares Essenciais, AIDA, Precificação)', 'Vertente 3 + Prospecção, Precificação', 'Considerações', 'Checklist'],
        tags: ['silver', 'aida', 'prospecção', 'vendas', 'expertise', 'intermediário', 'estratégia', 'precificação', 'técnicas de vendas'],
        emoji: '🥈',
    },
    {
        id: 10,
        title: 'Seção 1 – Vertente Gold',
        phase: 'Fase 3 – Monetização',
        description: 'Vertente avançada que ensina a encontrar especialistas, definir percentuais, trabalhar com entregáveis, saturação, modelagem, mecanismo de vendas e os três pilares do sucesso.',
        whenToRecommend: 'Quando você já domina Bronze e Silver e quer estratégias avançadas de parceria com especialistas e modelagem de negócio.',
        contents: ['Diretriz', 'Vertente 1 (Encontrando Especialista, Definindo %)', 'Vertente 2 (Entregáveis, Saturação, Modelagem, Mecanismo, Pesquisa, Estruturação Interna, Três Pilares)', 'Considerações', 'Checklist', 'GO! 🎯'],
        tags: ['gold', 'especialista', 'modelagem', 'parcerias', 'avançado', 'saturação', 'mecanismo', 'entregáveis', 'porcentagem'],
        emoji: '🥇',
    },
    {
        id: 11,
        title: 'ALICERCE (prático)',
        phase: 'Fase 2 – Construção',
        description: 'Aula prática sobre hospedagem de ebook, complementando o módulo Seção 1 – Alicerce.',
        whenToRecommend: 'Quando você precisa hospedar um ebook como material do seu produto digital.',
        contents: ['Hospedagem de Ebook'],
        tags: ['ebook', 'hospedagem', 'alicerce', 'prático', 'material', 'produto'],
        emoji: '📖',
    },
    {
        id: 12,
        title: 'Estrutura',
        phase: 'Fase 2 – Construção',
        description: 'Módulo prático que ensina a configurar domínio, página de vendas e usar o VTurb para hospedagem de vídeos.',
        whenToRecommend: 'Quando você precisa criar sua página de vendas, configurar domínio ou hospedar vídeos no VTurb.',
        contents: ['O que você vai aprender aqui', 'Configurando Domínio e Página de Vendas', 'VTurb', 'Criando a página de Vendas'],
        tags: ['domínio', 'página de vendas', 'vturb', 'vídeo', 'hospedagem', 'estrutura', 'configuração', 'página'],
        emoji: '🌐',
    },
    {
        id: 13,
        title: 'Estrutura Ativa',
        phase: 'Fase 4 – Escala',
        description: 'Módulo completo de tráfego pago. Ensina desde o aquecimento de conta até a criação de campanhas no Facebook/Instagram, incluindo Business Manager, Pixel, públicos e funil de tráfego.',
        whenToRecommend: 'Quando você quer aprender tráfego pago, configurar anúncios no Facebook/Instagram, criar pixel, públicos ou subir campanhas.',
        contents: ['Tráfego Direto', 'Estrutura de Tráfego', 'Metodologia do ROI', 'Aquecimento de Conta', 'Criando Fanpage e Instagram para Anúncios', 'Configurando a cobrança na Conta de Anúncios', 'Criando o Business Manager', 'Criando e configurando o Pixel', 'Criando Públicos', 'Subindo a Campanha', 'Aumentando os lucros com funil de tráfego'],
        tags: ['tráfego pago', 'facebook ads', 'instagram ads', 'anúncios', 'pixel', 'business manager', 'campanha', 'públicos', 'roi', 'funil', 'aquecimento', 'fanpage'],
        emoji: '📣',
    },
    {
        id: 14,
        title: 'COMPILADO GOLD (prático)',
        phase: 'Fase 4 – Escala',
        description: 'Aulas práticas sobre tráfego orgânico com guia prático incluso. Complementa o módulo Seção 1 – Compilado Gold.',
        whenToRecommend: 'Quando você quer aprender a gerar tráfego sem investir em anúncios (orgânico).',
        contents: ['Tráfego Orgânico', 'Guia Prático'],
        tags: ['tráfego orgânico', 'orgânico', 'sem anúncios', 'guia', 'prático', 'compilado'],
        emoji: '🌱',
    },
    {
        id: 15,
        title: 'VERTENTE BRONZE (prático)',
        phase: 'Fase 3 – Monetização',
        description: 'Guia prático complementar que mostra como fazer R$5.000 em 30 dias sem criar um produto próprio.',
        whenToRecommend: 'Quando você quer resultados rápidos sem precisar criar um produto do zero.',
        contents: ['Guia Prático R$5000 em 30 Dias sem criar o seu produto'],
        tags: ['5000', 'r$5000', '30 dias', 'resultado rápido', 'sem produto', 'bronze', 'prático', 'guia'],
        emoji: '⚡',
    },
    {
        id: 16,
        title: 'VERTENTE GOLD (prático)',
        phase: 'Fase 3 – Monetização',
        description: 'Aulas práticas avançadas sobre criação de criativos que vendem, criação de produto digital, pesquisa de mercado e precificação.',
        whenToRecommend: 'Quando você precisa criar criativos para anúncios, desenvolver um produto digital ou fazer pesquisa de mercado.',
        contents: ['A Estrutura de um Criativo que vende', 'Criação de um produto digital', 'Pesquisa de mercado', 'Precificação'],
        tags: ['criativo', 'produto digital', 'pesquisa de mercado', 'precificação', 'gold', 'prático', 'anúncio', 'criação'],
        emoji: '🎨',
    },
];

// ──────────────────────────────────────────────
// Search function
// ──────────────────────────────────────────────
function searchModules(query: string): Module[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return MODULES.filter(mod => {
        const haystack = [
            mod.title,
            mod.description,
            mod.whenToRecommend,
            mod.phase,
            ...mod.contents,
            ...mod.tags,
        ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return haystack.includes(q);
    });
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface SupportMessage {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

const categories = [
    { icon: Lock, title: 'ACESSO', description: 'Liberação de aulas e materiais complementares.', iconColor: 'text-gold', iconBg: 'bg-gold/10', query: 'acesso liberação aulas' },
    { icon: Brain, title: 'NÍVEL 1', description: 'Fundamentos e mentalidade do Sistema Start.', iconColor: 'text-gold', iconBg: 'bg-gold/10', query: 'fundamentos cofre ouro plano ação' },
    { icon: Trophy, title: 'NÍVEL 2', description: 'Estratégias avançadas e escala de resultados.', iconColor: 'text-gold', iconBg: 'bg-gold/10', query: 'vertente gold silver advanced' },
    { icon: Columns, title: 'NÍVEL 3', description: 'Estruturação ativa e tráfego pago completo.', iconColor: 'text-gold', iconBg: 'bg-gold/10', query: 'tráfego pago estrutura ativa anúncios' },
];

const recursos = [
    { label: 'Cronograma do Curso', href: '#' },
    { label: 'Grupo de Networking', href: 'https://chat.whatsapp.com/GXn1tt0V4TlCiDhjN5Rohn?mode=gi_t' },
    { label: 'Políticas de Suporte', href: '#' },
];

// ──────────────────────────────────────────────
// ModuleCard component
// ──────────────────────────────────────────────
function ModuleCard({ mod, onAsk }: { mod: Module; onAsk: (mod: Module) => void }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            {/* Header */}
            <div className="p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0 text-2xl">
                    {mod.emoji}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-gold uppercase tracking-widest">{mod.phase}</span>
                        <span className="text-[10px] text-muted-foreground">• Módulo {mod.id}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{mod.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2">{mod.description}</p>
                </div>
            </div>

            {/* Expandable content */}
            {expanded && (
                <div className="px-5 pb-4 space-y-4 border-t border-border/30 pt-4 animate-fade-in">
                    {/* When to recommend */}
                    <div className="flex gap-2 bg-amber-50 rounded-xl p-3">
                        <Target className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-amber-700 mb-0.5 uppercase tracking-wide">Quando estudar este módulo</p>
                            <p className="text-xs text-amber-900 leading-relaxed">{mod.whenToRecommend}</p>
                        </div>
                    </div>

                    {/* Contents */}
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> Conteúdos
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                            {mod.contents.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-slate-600 py-1 border-b border-dashed border-border/30 last:border-0">
                                    <span className="w-4 h-4 rounded-full bg-gold/20 text-gold flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                                    {c}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border/30 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 bg-slate-50/50">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expanded ? 'Ocultar detalhes' : 'Ver conteúdos'}
                </button>
                <button
                    onClick={() => onAsk(mod)}
                    className="text-xs font-bold text-gold hover:text-gold/80 flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                    <Sparkles className="h-3 w-3 flex-shrink-0" />
                    Tirar dúvida com Aurora
                    <ChevronRight className="h-3 w-3 flex-shrink-0" />
                </button>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export function Suporte() {
    const navigate = useNavigate();
    const { sendMessage, isLoading } = useNathiChat();
    const [searchQuery, setSearchQuery] = useState('');
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<SupportMessage[]>([
        {
            id: '0',
            content: 'Olá! Sou a Aurora, assistente de suporte do Sistema Start. Posso te ajudar com dúvidas sobre as aulas, materiais ou configurações técnicas. O que você precisa hoje?',
            sender: 'ai',
            timestamp: new Date(),
        },
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const searchResults = searchModules(searchQuery);
    const showResults = searchQuery.trim().length > 0;

    // Auto-scroll chat
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    const handleSendChat = async (overrideInput?: string) => {
        const text = overrideInput ?? chatInput;
        if (!text.trim() || isLoading) return;

        const userMsg: SupportMessage = {
            id: Date.now().toString(),
            content: text.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        setChatMessages(prev => [...prev, userMsg]);
        if (!overrideInput) setChatInput('');

        const history: Message[] = chatMessages.map(m => ({
            id: m.id,
            content: m.content,
            sender: m.sender,
            timestamp: m.timestamp,
        }));
        history.push({ id: userMsg.id, content: userMsg.content, sender: 'user', timestamp: userMsg.timestamp });

        const aiResponse = await sendMessage(history, 'suporte');
        if (aiResponse) {
            setChatMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    content: aiResponse,
                    sender: 'ai',
                    timestamp: new Date(),
                },
            ]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendChat();
        }
    };

    const handleAskAboutModule = (mod: Module) => {
        const prompt = `Quero tirar dúvidas sobre o Módulo ${mod.id}: "${mod.title}". Pode me explicar o que vou aprender nesse módulo e por onde devo começar?`;
        setChatInput(prompt);
        // Scroll chat into view and send
        setTimeout(() => {
            handleSendChat(prompt);
            chatScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    };

    const handleCategoryClick = (query: string) => {
        setSearchQuery(query.split(' ')[0]);
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
            {/* ── Header ── */}
            <div className="border-b border-border/50 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/')}
                            className="text-muted-foreground hover:text-foreground gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Voltar</span>
                        </Button>
                        <div className="w-px h-5 bg-border/50" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                                <MessageCircle className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-foreground leading-none">Central de Suporte</h1>
                                <p className="text-xs text-muted-foreground">Aurora Suporte 24h • Expert em documentação</p>
                            </div>
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white gap-2 shadow-sm"
                        onClick={() => window.open('http://wa.me/553195033895', '_blank')}
                    >
                        <Phone className="h-4 w-4" />
                        <span className="hidden sm:inline">Suporte direto com a Nathi</span>
                    </Button>
                </div>
            </div>

            {/* ── Main ── */}
            <div className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-8">

                {/* ── Hero + Search ── */}
                <div className="text-center space-y-5 py-2 sm:py-4">
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter uppercase italic leading-tight">
                        O que você está{' '}
                        <span className="text-gold not-italic">buscando</span> hoje?
                    </h2>

                    <div className="max-w-2xl mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Pesquisar por tópico, aula ou ferramenta..."
                            className="pl-12 pr-10 h-12 text-sm rounded-2xl border-border/60 bg-white shadow-sm focus:ring-2 focus:ring-gold/30"
                            autoComplete="off"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Search hint */}
                    {!showResults && (
                        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            <span>Tente:</span>
                            {['tráfego pago', 'VSL', 'produto digital', 'afiliados', 'checkout'].map(term => (
                                <span
                                    key={term}
                                    className="cursor-pointer underline underline-offset-2 hover:text-gold transition-colors"
                                    onClick={() => setSearchQuery(term)}
                                >
                                    {term}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Search Results ── */}
                {showResults && (
                    <div className="space-y-4">
                        <div className="flex items-start sm:items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-gold flex-shrink-0" />
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                                    {searchResults.length === 0
                                        ? 'Nenhum módulo encontrado'
                                        : `${searchResults.length} módulo${searchResults.length > 1 ? 's' : ''} encontrado${searchResults.length > 1 ? 's' : ''}`}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 ml-auto"
                            >
                                <X className="h-3 w-3" /> Limpar
                            </button>
                        </div>

                        {searchResults.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-border/50">
                                <div className="text-4xl mb-3">🔍</div>
                                <p className="text-slate-600 font-medium mb-1">Nenhum resultado encontrado</p>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Tente palavras como "tráfego", "VSL", "checkout", "afiliados"...
                                </p>
                                <button
                                    onClick={() => {
                                        setChatInput(`Tenho uma dúvida sobre: ${searchQuery}`);
                                        setSearchQuery('');
                                        chatScrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="text-sm font-bold text-gold flex items-center gap-1 mx-auto hover:underline"
                                >
                                    <Bot className="h-4 w-4" />
                                    Perguntar à Aurora sobre isso
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {searchResults.map(mod => (
                                    <ModuleCard key={mod.id} mod={mod} onAsk={handleAskAboutModule} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Categories (only when not searching) ── */}
                {!showResults && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                        {categories.map(cat => (
                            <button
                                key={cat.title}
                                onClick={() => handleCategoryClick(cat.query)}
                                className="group text-left p-4 sm:p-6 rounded-2xl bg-white h-full hover:shadow-[0_0_30px_rgba(253,185,49,0.2)] hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-border/50"
                            >
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${cat.iconBg} flex items-center justify-center mb-3 sm:mb-5`}>
                                    <cat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${cat.iconColor}`} />
                                </div>
                                <h3 className="font-bold text-black text-base sm:text-xl mb-1 sm:mb-2 tracking-tight">{cat.title}</h3>
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4 hidden sm:block">{cat.description}</p>
                                <span className="text-xs font-bold text-gold flex items-center gap-1 group-hover:gap-2 transition-all">
                                    BUSCAR <ChevronRight className="h-3 w-3" />
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Bottom Grid: Chat + Recursos ── */}
                <div ref={chatScrollRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── Busca Rápida (mobile: aparece antes do chat) ── */}
                    <div className="lg:hidden rounded-2xl border border-border/50 bg-white p-4 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-3 text-xs uppercase tracking-widest text-gold">Busca Rápida</h3>
                        <div className="flex flex-wrap gap-2">
                            {['Tráfego pago', 'VSL', 'Afiliados', 'Produto digital', 'Checkout', 'Orgânico', 'Criativo', 'Nicho', 'Prospecção', 'Pixel'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setSearchQuery(tag)}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-gold/10 text-gold hover:bg-gold hover:text-white transition-all duration-200 border border-gold/20 hover:border-gold active:scale-95"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat de Suporte IA */}
                    <div className="lg:col-span-2 rounded-2xl border border-border/50 bg-white flex flex-col overflow-hidden shadow-sm">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border/50 bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gold/10">
                                    <Bot className="h-5 w-5 text-gold" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Aurora — Suporte IA</span>
                                    <span className="text-[10px] text-gold font-bold uppercase tracking-widest">Suporte 24h Ativo</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 h-64 sm:h-72 overflow-y-auto p-3 sm:p-4 space-y-3">
                            {chatMessages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    {msg.sender === 'ai' && (
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                            style={{ background: 'var(--gradient-gold)' }}
                                        >
                                            <Bot className="h-3.5 w-3.5" style={{ color: 'hsl(var(--gold-foreground))' }} />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm ${msg.sender === 'user'
                                            ? 'bg-gradient-to-br from-primary to-primary/90 text-white rounded-br-md'
                                            : 'bg-muted/60 text-foreground rounded-bl-md'
                                            }`}
                                    >
                                        {msg.sender === 'ai' ? (
                                            <div className="leading-relaxed">{formatMessage(msg.content)}</div>
                                        ) : (
                                            <span className="whitespace-pre-wrap">{msg.content}</span>
                                        )}
                                        <p className={`text-xs mt-1.5 ${msg.sender === 'user' ? 'text-white/70 text-right' : 'text-muted-foreground'}`}>
                                            {formatTime(msg.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-2">
                                    <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                                        <Bot className="h-3.5 w-3.5 text-white" />
                                    </div>
                                    <div className="bg-muted/60 px-4 py-3 rounded-2xl rounded-bl-md">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 sm:p-4 border-t border-border/50 bg-slate-50/50">
                            <div className="flex gap-2 items-end">
                                <Textarea
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Digite sua dúvida aqui..."
                                    rows={1}
                                    disabled={isLoading}
                                    className="flex-1 resize-none min-h-[42px] max-h-[100px] text-sm rounded-xl border-border/50 bg-white text-foreground placeholder:text-slate-400 focus:border-gold/50 focus:ring-0 shadow-sm"
                                />
                                <Button
                                    onClick={() => handleSendChat()}
                                    disabled={!chatInput.trim() || isLoading}
                                    size="sm"
                                    className="h-[42px] w-[42px] rounded-xl p-0 flex-shrink-0 shadow-md transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
                                    style={{
                                        background: chatInput.trim() && !isLoading ? 'var(--gradient-gold-shine)' : '#f3f4f6',
                                        color: chatInput.trim() && !isLoading ? 'hsl(var(--gold-foreground))' : '#9ca3af',
                                    }}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Recursos + Dica + Busca Rápida (desktop) */}
                    <div className="space-y-4">
                        {/* Recursos Úteis */}
                        <div className="rounded-2xl border border-border/50 bg-white p-5 sm:p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 sm:mb-5 text-xs sm:text-sm uppercase tracking-widest text-gold">Recursos Úteis</h3>
                            <div className="space-y-1">
                                {recursos.map(r => (
                                    <a
                                        key={r.label}
                                        href={r.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 active:bg-slate-100 transition-colors group border border-transparent hover:border-border/30"
                                    >
                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{r.label}</span>
                                        <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-gold transition-colors flex-shrink-0" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Dica da Aurora */}
                        <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/5 to-transparent p-5 sm:p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-3">
                                <Bot className="h-5 w-5 text-gold" />
                                <h3 className="font-bold text-slate-900 text-xs sm:text-sm uppercase tracking-widest">Dica da Aurora</h3>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed italic">
                                "Siga o cronograma na ordem numérica para garantir o melhor aproveitamento do seu aprendizado."
                            </p>
                        </div>

                        {/* Busca Rápida — só desktop */}
                        <div className="hidden lg:block rounded-2xl border border-border/50 bg-white p-5 sm:p-6 shadow-sm">
                            <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-widest text-gold">Busca Rápida</h3>
                            <div className="flex flex-wrap gap-2">
                                {['Tráfego pago', 'VSL', 'Afiliados', 'Produto digital', 'Checkout', 'Orgânico', 'Criativo', 'Nicho', 'Prospecção', 'Pixel'].map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSearchQuery(tag)}
                                        className="px-3 py-1 rounded-full text-xs font-medium bg-gold/10 text-gold hover:bg-gold hover:text-white transition-all duration-200 border border-gold/20 hover:border-gold"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
