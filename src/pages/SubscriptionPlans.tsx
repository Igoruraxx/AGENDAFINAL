import React, { useState } from 'react';
import { Tag, Check, Sparkles, Users, TrendingUp, DollarSign, Calendar, Download } from 'lucide-react';

const plans = [
  { id: '1m', label: '1 mês', price: 'R$ 24,99', perMonth: 'R$ 24,99/mês', note: 'Cobrança mensal', desc: 'Ideal para começar' },
  { id: '3m', label: '3 meses', price: 'R$ 69,90', perMonth: 'R$ 23,30/mês', note: 'ou 3x R$ 23,30', desc: 'Mais popular' },
  { id: '6m', label: '6 meses', price: 'R$ 129,90', perMonth: 'R$ 21,65/mês', note: 'À vista', desc: 'Melhor custo-benefício', tag: '13% OFF', old: 'R$ 149,94', recommended: true },
  { id: '12m', label: '12 meses', price: 'R$ 239,90', perMonth: 'R$ 19,99/mês', note: 'À vista', desc: 'Máxima economia', tag: '20% OFF', old: 'R$ 299,88' },
];

const features = [
  { icon: Users, label: 'Clientes ilimitados' },
  { icon: Calendar, label: 'Agenda avançada' },
  { icon: TrendingUp, label: 'Módulo de evolução' },
  { icon: DollarSign, label: 'Módulo financeiro' },
  { icon: Download, label: 'Exportar dados' },
];

const SubscriptionPlans: React.FC = () => {
  const [selected, setSelected] = useState('6m');

  return (
    <div style={{background:'var(--n-0)',color:'var(--n-900)'}}>
      {/* Header */}
      <div className="px-5 pt-6 pb-5 text-center" style={{background:'var(--n-50)',borderBottom:'1px solid var(--n-200)'}}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3" style={{background:'var(--accent-light)',color:'var(--accent)'}}>
          <Sparkles size={12} />
          Clientes Ilimitados
        </div>
        <h2 className="text-xl font-extrabold mb-1" style={{color:'var(--n-900)'}}>Escolha seu plano</h2>
        <p className="text-sm" style={{color:'var(--n-500)'}}>Todos os planos incluem acesso completo</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Plan Cards */}
        <div className="space-y-2.5">
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                className="w-full rounded-xl p-4 text-left transition-all relative overflow-hidden"
                style={{
                  background: isSelected ? 'var(--accent-light)' : 'var(--n-0)',
                  border: isSelected ? '2px solid var(--accent)' : '1.5px solid var(--n-200)',
                  boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                }}
              >
                {plan.recommended && (
                  <div className="absolute top-0 right-0 px-2.5 py-0.5 text-[10px] font-bold rounded-bl-lg" style={{background:'var(--accent)',color:'#fff'}}>
                    RECOMENDADO
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Radio indicator */}
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        border: isSelected ? '2px solid var(--accent)' : '2px solid var(--n-300)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                      }}
                    >
                      {isSelected && <Check size={12} style={{color:'#fff'}} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{color:'var(--n-900)'}}>{plan.label}</span>
                        {plan.tag && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5" style={{background:'var(--success-light)',color:'var(--success)'}}>
                            <Tag size={9} /> {plan.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>{plan.desc} · {plan.perMonth}</div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {plan.old && <div className="text-[10px] line-through" style={{color:'var(--n-400)'}}>{plan.old}</div>}
                    <div className="text-lg font-extrabold" style={{color: isSelected ? 'var(--accent)' : 'var(--n-900)'}}>{plan.price}</div>
                    <div className="text-[10px]" style={{color:'var(--n-500)'}}>{plan.note}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Features included */}
        <div className="rounded-xl p-4" style={{background:'var(--n-50)',border:'1px solid var(--n-200)'}}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:'var(--n-500)'}}>Incluso em todos os planos</p>
          <div className="grid grid-cols-2 gap-2">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.label} className="flex items-center gap-2">
                  <Check size={14} style={{color:'var(--success)'}} />
                  <span className="text-xs font-medium" style={{color:'var(--n-700)'}}>{feat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <button className="btn btn-primary w-full py-3.5 text-sm font-extrabold">
          Assinar agora
        </button>
        <p className="text-center text-[11px]" style={{color:'var(--n-400)'}}>
          Pagamento seguro · Cancele quando quiser
        </p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
