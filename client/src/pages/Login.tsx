import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

interface LoginProps {
  onLoginSuccess: () => void
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError('')
    setIsSubmitting(true)

    try {
      await login({
        email: email.trim(),
        password,
      })

      onLoginSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError(
          'No se pudo conectar con el servidor. Intentá nuevamente.',
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-icon">FS</div>

          <p className="eyebrow">GESTIÓN DE FERRETERÍA</p>

          <h1>StockControl</h1>

          <p className="login-description">
            Administrá tus productos, inventario y movimientos
            desde un solo lugar.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-heading">
            <h2>Iniciar sesión</h2>
            <p>Ingresá tus datos para continuar.</p>
          </div>

          <label htmlFor="email">Correo electrónico</label>

          <input
            id="email"
            type="email"
            name="email"
            autoComplete="username"
            placeholder="usuario@ferreteria.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password">Contraseña</label>

          <input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Ingresá tu contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="login-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="login-footer">
          Sistema de gestión de stock para ferreterías
        </p>
      </section>
    </main>
  )
}
