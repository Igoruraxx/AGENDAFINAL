import React, { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

const ForgotPassword: React.FC = () => {
  const { forgotPassword, setAuthScreen } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Informe seu e-mail.');
      return;
    }
    
    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (error) {
      console.error('Forgot password error:', error);
      setError('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        {/* Back button */}
        <button
          onClick={() => setAuthScreen('login')}
          className="flex items-center gap-1.5 transition-colors text-sm font-medium touch-manipulation -mb-1"
          style={{color:'var(--n-500)'}}
        >
          <ArrowLeft size={15} />
          Voltar para login
        </button>

        {sent ? (
          /* Success state */
          <div className="flex flex-col items-center text-center py-6 gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:'var(--success-light)',border:'1px solid var(--success)'}}>
              <CheckCircle2 size={28} style={{color:'var(--success)'}} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2" style={{color:'var(--n-900)'}}>E-mail enviado!</h2>
              <p className="text-sm leading-relaxed" style={{color:'var(--n-500)'}}>
                Enviamos as instruções de recuperação para{' '}
                <span className="font-medium" style={{color:'var(--accent)'}}>{email}</span>.
                Verifique sua caixa de entrada e spam.
              </p>
            </div>
            <button
              onClick={() => setAuthScreen('login')}
              className="btn btn-primary w-full py-3 text-sm font-bold mt-2"
            >
              Voltar para login
            </button>
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="text-sm transition-colors touch-manipulation"
              style={{color:'var(--n-400)'}}
            >
              Reenviar e-mail
            </button>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'var(--accent-light)',border:'1px solid var(--n-200)'}}>
                <Mail size={26} style={{color:'var(--accent)'}} />
              </div>
              <h2 className="text-xl font-bold" style={{color:'var(--n-900)'}}>Esqueci minha senha</h2>
              <p className="text-sm mt-1.5 leading-relaxed" style={{color:'var(--n-500)'}}>
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{color:'var(--n-500)'}}>E-mail cadastrado</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{color:'var(--n-400)'}} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className="input-base w-full pl-10 pr-4"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg px-4 py-2.5" style={{background:'var(--error-light)',border:'1px solid var(--error)'}}>
                  <p className="text-xs font-medium" style={{color:'var(--error)'}}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3 text-sm font-bold disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'Enviar link de recuperação'
                )}
              </button>
            </form>

            {/* Register link */}
            <p className="text-center text-sm" style={{color:'var(--n-500)'}}>
              Não tem uma conta?{' '}
              <button
                onClick={() => setAuthScreen('register')}
                className="font-semibold transition-colors touch-manipulation"
                style={{color:'var(--accent)'}}
              >
                Criar conta grátis
              </button>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
