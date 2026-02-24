import React, { useState } from 'react';
import { Lock, Crown } from 'lucide-react';
import PricingPlans from './PricingPlans';

interface FeatureGateProps {
  allowed: boolean;
  feature: 'finance' | 'evolution' | 'students' | 'schedule' | 'export';
  title: string;
  description: string;
  children: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  allowed,
  feature,
  title,
  description,
  children,
}) => {
  const [showPricing, setShowPricing] = useState(false);

  if (allowed) return <>{children}</>;

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-10 text-center animate-fade-in-up">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{background:'var(--n-100)',border:'1px solid var(--n-200)'}}>
          <Lock size={32} style={{color:'var(--n-400)'}} />
        </div>
        <h2 className="text-xl font-extrabold mb-2" style={{color:'var(--n-900)'}}>{title}</h2>
        <p className="text-sm mb-6 max-w-xs leading-relaxed" style={{color:'var(--n-500)'}}>
          {description}
        </p>
        <button
          onClick={() => setShowPricing(true)}
          className="btn btn-primary px-6 py-3 text-sm font-bold"
        >
          <Crown size={16} />
          Ver planos Premium
        </button>
        <p className="text-xs mt-3" style={{color:'var(--n-400)'}}>
          7 dias grátis · Cancele quando quiser
        </p>
      </div>

      {showPricing && (
        <PricingPlans
          onClose={() => setShowPricing(false)}
          highlightFeature={feature}
        />
      )}
    </>
  );
};

export default FeatureGate;
