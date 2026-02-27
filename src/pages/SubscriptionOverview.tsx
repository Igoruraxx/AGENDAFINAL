import React from 'react';
import { Infinity, CreditCard, Clock, CalendarClock, RefreshCw, DollarSign, Plus, ArrowRightLeft, XCircle, CheckCircle, Shield, Gift, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionOverviewProps {
  onBack?: () => void;
}

const SubscriptionOverview: React.FC<SubscriptionOverviewProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const sub = currentUser.subscription;
  const isPremium = currentUser.plan === 'premium';
  
  const fmt = (d: string) => {
    if (!d) return '—';
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  const daysRemaining = (endDate: string): number => {
    if (!endDate) return 0;
    const end = new Date(endDate + 'T12:00:00');
    const now = new Date();
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const remaining = sub.endDate ? daysRemaining(sub.endDate) : 0;

  return (
    <div style={{background:'var(--n-0)',color:'var(--n-900)'}}>
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-6" style={{background: isPremium ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'linear-gradient(135deg, var(--n-400), var(--n-600))'}}>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',backgroundSize:'40px 40px'}} />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{background:'rgba(255,255,255,0.2)',backdropFilter:'blur(8px)'}}>
            {isPremium ? <Crown size={32} style={{color:'#fff'}} /> : <Infinity size={32} style={{color:'#fff'}} />}
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1">Plano {isPremium ? 'Premium' : 'Gratuito'}</h2>
          <p className="text-sm font-medium" style={{color:'rgba(255,255,255,0.8)'}}>
            {isPremium ? 'Recursos ilimitados ativos' : 'Limites do plano gratuito ativos'}
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.2)', color:'#fff'}}>
            {sub.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {sub.status === 'active' ? 'Assinatura ativa' : 'Assinatura expirada'}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-5 space-y-3">
        <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--n-200)'}}>
          {[
            { 
              icon: sub.origin === 'paid' ? CreditCard : (sub.origin === 'trial' ? Clock : Gift), 
              label: 'Origem do acesso', 
              value: sub.origin === 'trial' ? 'Período de Teste (Trial)' : sub.origin === 'courtesy' ? 'Cortesia Admin' : 'Assinatura Paga',
              valueColor: 'var(--n-900)' 
            },
            { 
              icon: CalendarClock, 
              label: isPremium ? 'Vencimento' : 'Data de Expiração', 
              value: sub.endDate ? `${fmt(sub.endDate)} (${remaining} dias rest.)` : '—', 
              valueColor: remaining < 5 ? 'var(--error)' : 'var(--n-900)' 
            },
            { icon: RefreshCw, label: 'Renovação', value: sub.origin === 'paid' ? 'Automática' : 'Manual', valueColor: 'var(--n-900)' },
            { 
              icon: DollarSign, 
              label: 'Investimento mensal', 
              value: sub.origin === 'trial' ? 'R$ 0,00' : 'R$ 24,99', 
              valueColor: 'var(--accent)', 
              bold: true 
            },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  background: 'var(--n-0)',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--n-100)' : 'none',
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--n-100)'}}>
                  <Icon size={16} style={{color:'var(--n-500)'}} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{color:'var(--n-500)'}}>{item.label}</div>
                  <div className={`text-sm ${item.bold ? 'font-extrabold' : 'font-semibold'}`} style={{color: item.valueColor}}>{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button className="btn btn-primary w-full py-3 text-sm font-bold gap-2">
            <Plus size={16} />
            {sub.origin === 'trial' ? 'Assinar plano Premium' : 'Adicionar tempo'}
          </button>
          {sub.origin === 'paid' && (
            <button className="btn btn-secondary w-full py-3 text-sm font-semibold gap-2">
              <ArrowRightLeft size={16} />
              Gerenciar Cartão
            </button>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 pb-2">
          <div className="flex items-center gap-1.5 text-xs" style={{color:'var(--n-400)'}}>
            <Clock size={12} />
            <span>Assinatura desde: {fmt(sub.startDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{color:'var(--n-400)'}}>
            <Shield size={12} />
            <span>Portal Seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOverview;
