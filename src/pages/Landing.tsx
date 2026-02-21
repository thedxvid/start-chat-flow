
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MessageCircle, Zap, Star, Crown, ArrowRight, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  const handleCheckout = () => {
    window.open('https://pay.kiwify.com.br/PQxnaPy', '_blank');
  };

  const handleLogin = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Sistema Start</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleLogin}
                variant="ghost"
                className="text-foreground hover:text-primary"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Entrar
              </Button>
              <Button onClick={handleCheckout} className="bg-gradient-primary hover:bg-primary-hover">
                Começar Agora
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20">
            ✨ Sistema Start — by Nathalia Ouro
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Sua mentora expert para <span className="text-primary">criar e vender</span> produtos digitais
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A Nathi é sua mentora IA do Sistema Start. Ela te guia passo a passo para criar e-books, cursos, mentorias
            e estratégias de marketing que realmente vendem.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              onClick={handleCheckout}
              size="lg"
              className="bg-gradient-primary hover:bg-primary-hover text-lg px-8 py-6 shadow-elegant"
            >
              Começar Agora <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">✨ Acesso imediato após o pagamento</p>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-sm">Mais de 500+ profissionais já criaram seus produtos digitais</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Por que escolher o Sistema Start?
            </h2>
            <p className="text-muted-foreground text-lg">
              A Nathi, sua mentora IA, está disponível 24/7 para acelerar seus resultados
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <MessageCircle className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Conversas Ilimitadas</CardTitle>
                <CardDescription>
                  Tire todas suas dúvidas sem limitações. Converse com a Nathi quanto precisar para criar seu produto digital.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Respostas Detalhadas</CardTitle>
                <CardDescription>
                  Receba estratégias completas, passo a passo, com exemplos práticos para implementar imediatamente.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <Crown className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Expertise Profissional</CardTitle>
                <CardDescription>
                  Conhecimento da Nathalia Ouro em marketing digital, produtos digitais e vendas online.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              O que você vai conseguir:
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              'Criar e-books, cursos e mentorias do zero',
              'Estruturar funis de vendas que convertem',
              'Dominar tráfego pago (Facebook e Google Ads)',
              'Estratégias de copy persuasiva',
              'Lançar seu produto digital com confiança',
              'Precificar e posicionar seus produtos',
              'Construir audiência e autoridade',
              'Estratégias de marketing e vendas online'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-2xl">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-primary-foreground">Oferta Especial</Badge>
            </div>

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Acesso Completo</CardTitle>
              <CardDescription className="text-lg">
                Mentoria expert by Nathalia Ouro
              </CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold text-primary">R$ 297</span>
                <span className="text-muted-foreground">/único</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {[
                'Conversas ilimitadas com a mentora',
                'Respostas detalhadas e personalizadas',
                'Estratégias práticas e acionáveis',
                'Suporte 24/7',
                'Atualizações constantes',
                'Garantia de 7 dias'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}

              <Button
                onClick={handleCheckout}
                className="w-full mt-6 bg-gradient-primary hover:bg-primary-hover text-lg py-6"
                size="lg"
              >
                Começar Agora - R$ 297
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                🔒 Pagamento 100% seguro via Kiwify
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/40">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">
            © 2025 Sistema Start by Nathalia Ouro · Mentoria Expert em Marketing Digital
          </p>
        </div>
      </footer>
    </div>
  );
}
