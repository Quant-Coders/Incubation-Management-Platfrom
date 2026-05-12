/**
 * Landing Page — Public homepage for IncuBase
 * Showcases platform features and drives signups/logins.
 */
import React from 'react';
import {
  Hexagon, ArrowRight, Zap, Shield, BarChart3,
  BrainCircuit, Users, Building2, ChevronRight,
  Sparkles, Rocket, Star
} from 'lucide-react';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Hexagon className="w-6 h-6 text-on-primary fill-on-primary/20" />
            </div>
            <span className="font-headline text-2xl font-bold text-primary">IncuBase</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-on-surface-variant">
            <a href="#features" className="hover:text-on-surface transition-colors">Features</a>
            <a href="#ai" className="hover:text-on-surface transition-colors">AI Agents</a>
            <a href="#stats" className="hover:text-on-surface transition-colors">Impact</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('/login')} className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
              Sign In
            </button>
            <button onClick={() => onNavigate('/login')} className="gradient-btn px-5 py-2.5 rounded-xl text-sm font-bold">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 hero-mesh relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold text-primary mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Powered by Gemini AI
          </div>

          <h1 className="font-headline text-5xl md:text-7xl font-bold leading-tight mb-6">
            <span className="text-gradient">Incubation</span> Management
            <br />
            <span className="text-on-surface">Reimagined</span>
          </h1>

          <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The all-in-one platform for incubation centers. Manage programs, evaluate startups,
            allocate co-working spaces, and get AI-powered insights — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => onNavigate('/login')} className="gradient-btn px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 group">
              Launch Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => onNavigate('/login')} className="px-8 py-4 rounded-2xl text-base font-medium border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2">
              <Rocket className="w-5 h-5 text-secondary" />
              Try Demo
            </button>
          </div>
        </div>

        {/* Floating decorations */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 px-6 border-y border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '500+', label: 'Startups Incubated' },
            { value: '50+', label: 'Programs Managed' },
            { value: '₹120Cr', label: 'Funding Raised' },
            { value: '95%', label: 'Occupancy Rate' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="font-headline text-4xl font-bold text-gradient mb-2">{stat.value}</p>
              <p className="text-on-surface-variant text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl font-bold mb-4">
              Everything You Need to <span className="text-gradient">Run an Incubator</span>
            </h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              7 integrated modules designed for India's innovation ecosystem
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Rocket, title: 'Program Management', desc: 'Create cohorts, set timelines, and manage evaluations with dynamic form builders.' },
              { icon: Star, title: 'Application Evaluation', desc: 'Weighted scorecards, multi-round reviews, and blind evaluation support.' },
              { icon: Users, title: 'Lifecycle Tracking', desc: 'Monitor milestones, mentorship sessions, and startup progress in real-time.' },
              { icon: Building2, title: 'Space Allocation', desc: 'Manage seats, cabins, and meeting rooms with drag-and-drop floor plans.' },
              { icon: BarChart3, title: 'Facility Analytics', desc: 'Occupancy heatmaps, booking patterns, and capacity planning dashboards.' },
              { icon: Shield, title: 'Compliance & Audit', desc: 'Immutable audit trails, RBAC, and government reporting compliance.' },
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 group hover:shadow-[0_0_30px_rgba(79,70,229,0.15)] transition-all duration-300 hover:-translate-y-1">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-headline text-lg font-bold mb-3">{feature.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section id="ai" className="py-24 px-6 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-1.5 text-xs font-bold text-secondary mb-6">
              <BrainCircuit className="w-3.5 h-3.5" />
              Gemini AI Powered
            </div>
            <h2 className="font-headline text-4xl font-bold mb-4">
              5 AI Agents, <span className="text-gradient">Zero Bias</span>
            </h2>
            <p className="text-on-surface-variant max-w-xl mx-auto">
              Human-in-the-loop AI that recommends — never decides. Every insight is auditable.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'Application Summarizer', desc: 'Instantly distills business plans into structured key insights for reviewers.', tag: 'Agent 1' },
              { title: 'Pre-Screener', desc: 'AI-ranked shortlists with per-criterion confidence scores.', tag: 'Agent 2' },
              { title: 'Mentor Matcher', desc: 'Profile-based matching with compatibility rationale.', tag: 'Agent 3' },
              { title: 'Facility Predictor', desc: 'Demand forecasts and peak usage predictions.', tag: 'Agent 4' },
              { title: 'Progress Insights', desc: 'Early risk detection and milestone health analysis.', tag: 'Agent 5' },
            ].map((agent, i) => (
              <div key={i} className="glass-card p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-xs font-bold bg-secondary/10 text-secondary px-2 py-1 rounded-full">
                  {agent.tag}
                </div>
                <BrainCircuit className="w-8 h-8 text-secondary mb-4" />
                <h3 className="font-headline text-lg font-bold mb-3">{agent.title}</h3>
                <p className="text-on-surface-variant text-sm leading-relaxed">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center glass-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
          <div className="relative z-10">
            <h2 className="font-headline text-4xl font-bold mb-4">
              Ready to <span className="text-gradient">Transform</span> Your Incubator?
            </h2>
            <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
              Join 50+ incubation centers using IncuBase to streamline operations and accelerate startups.
            </p>
            <button onClick={() => onNavigate('/login')} className="gradient-btn px-8 py-4 rounded-2xl text-base font-bold inline-flex items-center gap-2 group">
              Start Free Trial
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Hexagon className="w-5 h-5 text-primary" />
            <span className="font-headline text-sm font-bold text-on-surface-variant">IncuBase</span>
          </div>
          <p className="text-xs text-on-surface-variant/60">
            © 2026 IncuBase. Built for India's innovation ecosystem.
          </p>
        </div>
      </footer>
    </div>
  );
};
