import React from 'react';
import { Infinity, CreditCard, Clock, CalendarClock, RefreshCw, DollarSign, Plus, ArrowRightLeft, XCircle, CheckCircle, Shield } from 'lucide-react';

interface SubscriptionOverviewProps {
  onBack?: () => void;
}

const SubscriptionOverview: React.FC<SubscriptionOverviewProps> = ({ onBack }) => {
  return (
    <div style={{background:'var(--n-0)',color:'var(--n-900)'}}>
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-6" style={{background:'linear-gradient(135deg, var(--accent), var(--accent-dark))'}}>
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',backgroundSize:'40px 40px'}} />
        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3" style={{background:'rgba(255,255,255,0.2)',backdropFilter:'blur(8px)'}}>
            <Infinity size={32} style={{color:'#fff'}} />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1">Plano Premium</h2>
          <p className="text-sm font-medium" style={{color:'rgba(255,255,255,0.8)'}}>Clientes ilimitados · Todos os recursos</p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{background:'rgba(255,255,255,0.2)',color:'#fff'}}>
            <CheckCircle size={12} />
            Assinatura ativa
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-4 py-5 space-y-3">
        <div className="rounded-xl overflow-hidden" style={{border:'1px solid var(--n-200)'}}>
          {[
            { icon: CreditCard, label: 'Meio de pagamento', value: 'Pix', valueColor: 'var(--accent)' },
            { icon: CalendarClock, label: 'Próximo pagamento', value: '17/03/2026', valueColor: 'var(--n-900)' },
            { icon: RefreshCw, label: 'Renovação', value: 'Manual', valueColor: 'var(--n-900)' },
            { icon: DollarSign, label: 'Valor mensal', value: 'R$ 24,99', valueColor: 'var(--accent)', bold: true },
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
            Adicionar tempo
          </button>
          <button className="btn btn-secondary w-full py-3 text-sm font-semibold gap-2">
            <ArrowRightLeft size={16} />
            Alterar forma de pagamento
          </button>
          <button
            className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{color:'var(--n-400)',border:'1px solid var(--n-200)',background:'var(--n-50)'}}
            disabled
          >
            <XCircle size={14} />
            Cancelar assinatura
          </button>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-2 pb-2">
          <div className="flex items-center gap-1.5 text-xs" style={{color:'var(--n-400)'}}>
            <Clock size={12} />
            <span>Atualizado: 23/02/2026</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{color:'var(--n-400)'}}>
            <Shield size={12} />
            <span>Pagamento seguro</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOverview;
