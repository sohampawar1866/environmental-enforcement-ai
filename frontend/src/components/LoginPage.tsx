import { useState, type FormEvent } from 'react';
import { signIn, signUp } from '../lib/auth-client';
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff, Building2, AlertCircle, ArrowRight, ArrowLeft, Radio } from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  onBackToHome?: () => void;
}

export function LoginPage({ onSuccess, onBackToHome }: LoginPageProps) {
  const isMobileInitial = typeof window !== 'undefined' && (
    window.innerWidth <= 768 ||
    new URLSearchParams(window.location.search).get('role') === 'warden' ||
    /Mobi|Android|iPhone/i.test(navigator.userAgent)
  );

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [loginPersona, setLoginPersona] = useState<'adjudicator' | 'warden'>(
    isMobileInitial ? 'warden' : 'adjudicator'
  );
  const [email, setEmail] = useState(
    isMobileInitial ? 'warden@civicclean.gov' : 'adjudicator@civicclean.gov'
  );
  const [password, setPassword] = useState(
    isMobileInitial ? 'Warden2026!' : 'Adjudicator2026!'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'adjudicator' | 'warden'>('adjudicator');
  const [badgeId, setBadgeId] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPersona = (p: 'adjudicator' | 'warden') => {
    setLoginPersona(p);
    setError(null);
    if (p === 'adjudicator') {
      setEmail('adjudicator@civicclean.gov');
      setPassword('Adjudicator2026!');
    } else {
      setEmail('warden@civicclean.gov');
      setPassword('Warden2026!');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn.email({
          email: email.trim(),
          password,
        });

        if (res.error) {
          setError(res.error.message || 'Authentication failed. Please verify credentials.');
        } else {
          onSuccess?.();
        }
      } else {
        const rank = role === 'adjudicator' ? 'Sworn Adjudication Inspector' : 'Senior Patrol Warden';
        const res = await signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
          // Custom fields configured in Better Auth
          // @ts-expect-error better-auth custom fields
          role,
          badge_id: badgeId.trim() || (role === 'adjudicator' ? 'MCE-9042' : 'FP-108'),
          rank,
          jurisdiction: jurisdiction.trim() || 'Central Municipal Operations',
        });

        if (res.error) {
          setError(res.error.message || 'Registration failed. Officer email may already exist.');
        } else {
          onSuccess?.();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected network error occurred.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginContainer">
      <div className="loginCard">
        {onBackToHome && (
          <button
            type="button"
            className="loginBackHomeBtn"
            onClick={onBackToHome}
            title="Return to CivicClean Overview / Home"
          >
            <ArrowLeft size={15} />
            <span>Back to CivicClean Overview</span>
          </button>
        )}

        <div className="loginHeader">
          <div className="loginSeal">
            <ShieldCheck size={32} />
          </div>
          <div className="loginEyebrow">CITY ENVIRONMENTAL ENFORCEMENT DIVISION</div>
          <h1>CivicClean Enforcement Portal</h1>
          <p>Local-first deterministic adjudication & rapid field interception network</p>
        </div>

        <div className="loginModeTabs">
          <button
            type="button"
            className={`loginTab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(null); }}
          >
            Sworn Officer Sign In
          </button>
          <button
            type="button"
            className={`loginTab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
              setEmail('');
              setPassword('');
            }}
          >
            Register New Officer
          </button>
        </div>

        {mode === 'signin' && (
          <div className="loginPersonaSwitch">
            <button
              type="button"
              className={`personaChip ${loginPersona === 'adjudicator' ? 'active' : ''}`}
              onClick={() => selectPersona('adjudicator')}
              title="Control Room Adjudicator Terminal"
            >
              <ShieldCheck size={14} />
              <span>Adjudicator (PC)</span>
            </button>
            <button
              type="button"
              className={`personaChip ${loginPersona === 'warden' ? 'active' : ''}`}
              onClick={() => selectPersona('warden')}
              title="Field Enforcement Warden Mobile Terminal"
            >
              <Radio size={14} />
              <span>Field Warden (Mobile)</span>
            </button>
          </div>
        )}

        {error && (
          <div className="loginErrorBanner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form className="loginForm" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="formGroup">
                <label htmlFor="reg-name">OFFICER FULL NAME</label>
                <div className="inputWrap">
                  <User size={16} className="inputIcon" />
                  <input
                    id="reg-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Inspector Sarah Chen"
                  />
                </div>
              </div>

              <div className="formGroup">
                <label htmlFor="reg-role">OPERATIONAL DUTY ROLE</label>
                <div className="inputWrap">
                  <Building2 size={16} className="inputIcon" />
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'adjudicator' | 'warden')}
                  >
                    <option value="adjudicator">Control Room Adjudicator (Desktop Terminal)</option>
                    <option value="warden">Field Enforcement Warden (Mobile PWA Terminal)</option>
                  </select>
                </div>
              </div>

              <div className="formRow">
                <div className="formGroup">
                  <label htmlFor="reg-badge">BADGE NUMBER</label>
                  <input
                    id="reg-badge"
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    placeholder="e.g. MCE-9042"
                  />
                </div>
                <div className="formGroup">
                  <label htmlFor="reg-jurisdiction">SECTOR / JURISDICTION</label>
                  <input
                    id="reg-jurisdiction"
                    type="text"
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    placeholder="e.g. Downtown Sector 7"
                  />
                </div>
              </div>
            </>
          )}

          <div className="formGroup">
            <label htmlFor="login-email">MUNICIPAL EMAIL ADDRESS</label>
            <div className="inputWrap">
              <Mail size={16} className="inputIcon" />
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@civicclean.gov"
              />
            </div>
          </div>

          <div className="formGroup">
            <label htmlFor="login-password">SECURE ACCESS PASSWORD</label>
            <div className="inputWrap">
              <Lock size={16} className="inputIcon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                className="passwordToggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="loginSubmitBtn" disabled={loading}>
            {loading ? (
              <span>Authenticating Credentials...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Authenticate & Enter Terminal' : 'Register Sworn Officer'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="loginFooterLegal">
          OFFICIAL LAW ENFORCEMENT & CODE ADJUDICATION TERMINAL · RESTRICTED ACCESS · AIR-GAPPED PRIVACY MANDATE ·
          CIVIL CODE §14-8 COMPLIANCE
        </div>
      </div>
    </div>
  );
}
