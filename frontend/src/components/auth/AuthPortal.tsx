import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowRight, Code2, Eye, EyeOff, LockKeyhole,
  Mail, UserRound, ShieldCheck, Sparkles
} from 'lucide-react'
import { authService } from '../../services/authService'
import type { UserProfile } from '../../types/auth.types'
import './AuthPortal.css'

type AuthPortalProps = {
  onPreview: () => void
  onAuthenticated: (user: UserProfile) => void
}

export function AuthPortal({ onPreview, onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')

    if (mode === 'signup' && password !== confirmPassword) {
      setNotice('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'forgot') {
        const response = await authService.requestPasswordReset({ email })
        setNotice(response.message || 'If an account exists for that email, recovery instructions will be sent.')
        return
      }

      if (mode === 'signup') {
        const response = await authService.register({
          fullName: name.trim(),
          email: email.trim(),
          username: username.trim(),
          password,
        })
        onAuthenticated(response.user)
        return
      }

      const response = await authService.login({
        identifier: identifier.trim(),
        password,
        rememberMe,
      })
      onAuthenticated(response.user)
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function changeMode(next: 'login' | 'signup' | 'forgot') {
    setMode(next)
    setNotice('')
    setShowPassword(false)
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <span className="auth-brand-icon"><Code2 size={23} /></span>
          <span>CodeKnit</span>
        </div>

        <div className="auth-brand-content">
          <span className="auth-overline">A BETTER WAY TO BUILD TOGETHER</span>
          <h1>Your ideas.<br />Your code.<br /><span>Your workspace.</span></h1>
          <p>A focused coding environment designed for individuals and teams to create, collaborate and build.</p>
        </div>

        <div className="auth-brand-bottom">
          <ShieldCheck size={16} />
          <span>Designed with account security in mind</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="auth-brand-icon"><Code2 size={21} /></span>
            <strong>CodeKnit</strong>
          </div>

          <div className="auth-heading">
            <span className="auth-overline">
              {mode === 'login' ? 'WELCOME BACK' : mode === 'signup' ? 'GET STARTED' : 'ACCOUNT RECOVERY'}
            </span>
            <h2>
              {mode === 'login' ? 'Sign in to CodeKnit' : mode === 'signup' ? 'Create your account' : 'Reset your password'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Enter your account details to continue.'
                : mode === 'signup'
                  ? 'Create an account to get your own workspace.'
                  : 'Enter your email to begin account recovery.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <>
                <label htmlFor="auth-name">Full name</label>
                <div className="auth-input-wrap">
                  <UserRound size={17} />
                  <input id="auth-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required autoComplete="name" />
                </div>

                <label htmlFor="auth-username">Username</label>
                <div className="auth-input-wrap">
                  <span className="auth-at">@</span>
                  <input id="auth-username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" required autoComplete="username" />
                </div>
              </>
            )}

            {mode !== 'login' && mode !== 'signup' ? (
              <>
                <label htmlFor="auth-recovery-email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={17} />
                  <input id="auth-recovery-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                </div>
              </>
            ) : mode === 'signup' ? (
              <>
                <label htmlFor="auth-email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={17} />
                  <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                </div>
              </>
            ) : (
              <>
                <label htmlFor="auth-identifier">Email or username</label>
                <div className="auth-input-wrap">
                  <Mail size={17} />
                  <input id="auth-identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="Enter email or username" required autoComplete="username" />
                </div>
              </>
            )}

            {mode !== 'forgot' && (
              <>
                <label htmlFor="auth-password">Password</label>
                <div className="auth-input-wrap">
                  <LockKeyhole size={17} />
                  <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                  <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <>
                <label htmlFor="auth-confirm">Confirm password</label>
                <div className="auth-input-wrap">
                  <LockKeyhole size={17} />
                  <input id="auth-confirm" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required minLength={8} autoComplete="new-password" />
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <span className="auth-validation">Passwords do not match.</span>
                )}
                <p className="auth-id-note"><ShieldCheck size={15} /> A unique CodeKnit User ID will be assigned by the server after registration.</p>
              </>
            )}

            {mode === 'login' && (
              <div className="auth-options">
                <label className="auth-remember">
                  <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  Remember me
                </label>
                <button type="button" className="auth-text-button" onClick={() => changeMode('forgot')}>Forgot password?</button>
              </div>
            )}

            {notice && <div className="auth-notice" role="status">{notice}</div>}

            <button
              className="auth-submit"
              type="submit"
              disabled={isSubmitting || (mode === 'signup' && password !== confirmPassword)}
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Continue'}
              {!isSubmitting && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="auth-switch">
            {mode === 'login' ? (
              <>New to CodeKnit? <button onClick={() => changeMode('signup')}>Create an account</button></>
            ) : (
              <>Already have an account? <button onClick={() => changeMode('login')}>Sign in</button></>
            )}
          </div>

          <div className="auth-preview">
            <button type="button" onClick={onPreview}>
              <Sparkles size={15} /> Preview the interface (development only)
            </button>
            <small>This preview bypasses authentication. It does not create or sign in to an account.</small>
          </div>

          <div className="auth-legal">CodeKnit Â· Collaborative Coding Workspace</div>
        </div>
      </section>
    </main>
  )
}