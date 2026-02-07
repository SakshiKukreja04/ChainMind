import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Boxes, 
  Brain, 
  Shield, 
  TrendingUp, 
  Users, 
  BarChart3, 
  Zap,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Predictive analytics for demand forecasting, stock optimization, and cost-saving opportunities.'
  },
  {
    icon: Shield,
    title: 'Blockchain Trust',
    description: 'Every transaction verified and immutable. Build supply chain trust with transparent audit trails.'
  },
  {
    icon: TrendingUp,
    title: 'Smart Reordering',
    description: 'Automated reorder suggestions based on sales velocity, lead times, and market trends.'
  },
  {
    icon: Users,
    title: 'Multi-Role Access',
    description: 'Tailored dashboards for SME owners, inventory managers, and vendors with role-based permissions.'
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Live inventory health, sales trends, and vendor performance metrics at your fingertips.'
  },
  {
    icon: Zap,
    title: 'Cooperative Buying',
    description: 'Join forces with other businesses for bulk discounts and better vendor negotiations.'
  },
];

const benefits = [
  'Reduce stockouts by 40% with AI predictions',
  'Save 20% on procurement through cooperative buying',
  'Complete supply chain transparency',
  'Streamlined vendor management',
  'Real-time inventory visibility',
  'Automated compliance tracking',
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(224,76%,10%)] via-[hsl(224,60%,18%)] to-[hsl(170,60%,12%)] text-white">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 w-[600px] h-[600px] rounded-full bg-[hsl(224,76%,40%)] opacity-20 blur-[120px] animate-pulse" />
          <div className="absolute -bottom-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(170,82%,35%)] opacity-20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[hsl(200,80%,45%)] opacity-10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="container py-24 md:py-36 relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium mb-6 border border-white/10">
              <Boxes className="h-4 w-4" />
              <span>AI-Powered Inventory Management</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Smarter Inventory,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[hsl(170,82%,55%)] to-[hsl(200,90%,65%)]">
                Trusted Supply Chain
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              ChainMind combines AI-driven insights with blockchain verification to help 
              SMEs optimize inventory, reduce costs, and build trusted vendor relationships.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="xl" variant="hero" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link to="/features">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Manage Inventory
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From AI predictions to blockchain audits, ChainMind provides a complete 
              toolkit for modern inventory management.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={feature.title}
                className="card-dashboard group cursor-pointer"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Built for Growing Businesses
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Whether you're a pharmacy, retail store, or FMCG distributor, ChainMind 
                adapts to your industry needs and scales with your business.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-success/10">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl gradient-hero opacity-10 absolute inset-0" />
              <div className="relative p-8">
                <div className="bg-card rounded-xl shadow-xl border border-border p-6 mb-4 animate-slide-up">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Brain className="h-5 w-5 text-warning" />
                    </div>
                    <span className="font-semibold text-foreground">AI Insight</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Stock-out risk detected for <span className="font-medium text-foreground">Vitamin D3</span>. 
                    Recommended reorder: 200 units.
                  </p>
                </div>
                <div className="bg-card rounded-xl shadow-xl border border-border p-6 ml-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-success/10">
                      <TrendingUp className="h-5 w-5 text-success" />
                    </div>
                    <span className="font-semibold text-foreground">Cost Saving</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cooperative buy opportunity: Save <span className="font-medium text-success">$450/month</span> 
                    {' '}on bulk Paracetamol orders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-[hsl(224,76%,10%)] via-[hsl(224,60%,18%)] to-[hsl(170,60%,12%)] text-white relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="container text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Inventory Management?
          </h2>
          <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
            Join thousands of SMEs who trust ChainMind for smarter, 
            more efficient supply chain operations.
          </p>
          <Button size="xl" variant="hero" asChild>
            <Link to="/signup">
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
