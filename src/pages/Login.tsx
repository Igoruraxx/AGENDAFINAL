import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

const Login: React.FC = () => {
  const { login, setAuthScreen } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Preencha todos os campos.');
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
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
      setError('E-mail ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold" style={{color:'var(--n-900)'}}>Bem-vindo de volta</h2>
          <p className="text-sm mt-1" style={{color:'var(--n-500)'}}>Entre na sua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{color:'var(--n-500)'}}>E-mail</label>
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

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{color:'var(--n-500)'}}>Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{color:'var(--n-400)'}} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="input-base w-full pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors touch-manipulation"
                style={{color:'var(--n-400)'}}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Forgot password */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setAuthScreen('forgot')}
              className="text-xs font-medium transition-colors touch-manipulation"
              style={{color:'var(--accent)'}}
            >
              Esqueci minha senha
            </button>
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
            className="btn btn-primary w-full py-3 text-sm font-bold mt-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Entrar
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px" style={{background:'var(--n-200)'}} />
          <span className="text-xs" style={{color:'var(--n-400)'}}>ou</span>
          <div className="flex-1 h-px" style={{background:'var(--n-200)'}} />
        </div>

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
      </div>
    </AuthLayout>
  );
};

export default Login;
