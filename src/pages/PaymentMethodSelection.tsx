import React, { useState } from 'react';
import { PlusCircle, CreditCard, WalletCards, QrCode, CheckCircle, Shield, ChevronRight } from 'lucide-react';

type PaymentMethod = 'pix' | 'wallet' | null;

const PaymentMethodSelection: React.FC = () => {
  const [selected, setSelected] = useState<PaymentMethod>('pix');

  return (
    <div style={{background:'var(--n-0)',color:'var(--n-900)'}}>
      {/* Header */}
      <div className="px-5 pt-6 pb-5" style={{background:'var(--n-50)',borderBottom:'1px solid var(--n-200)'}}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:'var(--accent-light)'}}>
            <CreditCard size={18} style={{color:'var(--accent)'}} />
          </div>
          <h2 className="text-lg font-extrabold" style={{color:'var(--n-900)'}}>Forma de pagamento</h2>
        </div>
        <p className="text-xs" style={{color:'var(--n-500)'}}>Selecione como deseja pagar sua assinatura</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Payment Methods */}
        <div className="space-y-2.5">
          {/* Pix */}
          <button
            onClick={() => setSelected('pix')}
            className="w-full rounded-xl p-4 text-left transition-all"
            style={{
              background: selected === 'pix' ? 'var(--accent-light)' : 'var(--n-0)',
              border: selected === 'pix' ? '2px solid var(--accent)' : '1.5px solid var(--n-200)',
              boxShadow: selected === 'pix' ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: selected === 'pix' ? 'var(--accent)' : 'var(--n-100)'}}>
                <QrCode size={20} style={{color: selected === 'pix' ? '#fff' : 'var(--n-500)'}} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{color:'var(--n-900)'}}>Pix</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'var(--success-light)',color:'var(--success)'}}>
                    Instantâneo
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>Aprovação imediata · Sem taxas</div>
              </div>
              {selected === 'pix' && (
                <CheckCircle size={20} style={{color:'var(--accent)'}} className="flex-shrink-0" />
              )}
            </div>
          </button>

          {/* Wallet */}
          <button
            onClick={() => setSelected('wallet')}
            className="w-full rounded-xl p-4 text-left transition-all"
            style={{
              background: selected === 'wallet' ? 'var(--accent-light)' : 'var(--n-0)',
              border: selected === 'wallet' ? '2px solid var(--accent)' : '1.5px solid var(--n-200)',
              boxShadow: selected === 'wallet' ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: selected === 'wallet' ? 'var(--accent)' : 'var(--n-100)'}}>
                <WalletCards size={20} style={{color: selected === 'wallet' ? '#fff' : 'var(--n-500)'}} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold" style={{color:'var(--n-900)'}}>Carteira FitPro</div>
                <div className="text-xs mt-0.5" style={{color:'var(--n-500)'}}>Saldo disponível: <strong style={{color:'var(--accent)'}}>R$ 0,00</strong></div>
              </div>
              {selected === 'wallet' && (
                <CheckCircle size={20} style={{color:'var(--accent)'}} className="flex-shrink-0" />
              )}
            </div>
          </button>
        </div>

        {/* Add card */}
        <button
          className="w-full rounded-xl p-3.5 flex items-center justify-between transition-all"
          style={{background:'var(--n-0)',border:'1.5px dashed var(--n-300)'}}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:'var(--n-100)'}}>
              <PlusCircle size={20} style={{color:'var(--n-400)'}} />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold" style={{color:'var(--n-700)'}}>Adicionar cartão de crédito</div>
              <div className="text-xs" style={{color:'var(--n-400)'}}>Visa, Mastercard, Elo</div>
            </div>
          </div>
          <ChevronRight size={16} style={{color:'var(--n-400)'}} />
        </button>

        {/* CTA */}
        <button
          className="btn btn-primary w-full py-3.5 text-sm font-extrabold"
          disabled={!selected}
        >
          Confirmar pagamento
        </button>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 pt-1 pb-2">
          <Shield size={12} style={{color:'var(--n-400)'}} />
          <span className="text-[11px]" style={{color:'var(--n-400)'}}>Pagamento 100% seguro e criptografado</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelection;
