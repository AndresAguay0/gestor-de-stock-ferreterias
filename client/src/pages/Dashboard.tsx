import { useAuth } from '../auth/AuthContext'

interface DashboardProps {
    onLogout: () => void
}

const roleNames = {
    owner: 'Dueño',
    manager: 'Gerente',
    employee: 'Empleado',
}

export default function Dashboard({ onLogout }: DashboardProps) {
    const { user } = useAuth()

    if (!user) return null

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <div className="brand-icon">FS</div>

                    <div>
                        <h1>StockControl</h1>
                        <p>Gestión de stock</p>
                    </div>
                </div>

                <button
                    type="button"
                    className="logout-button"
                    onClick={onLogout}
                >
                    Cerrar sesión
                </button>
            </header>

            <section className="dashboard-content">
                <p className="eyebrow">PANEL PRINCIPAL</p>

                <h2>¡Bienvenido!</h2>

                <p className="dashboard-description">
                    La conexión con el backend está funcionando.
                </p>

                <article className="welcome-card">
                    <div>
                        <span className="card-label">
                            Usuario autenticado
                        </span>

                        <h3>{user.email}</h3>

                        <span className="role-badge">
                            {roleNames[user.role]}
                        </span>
                    </div>

                    <div className="user-avatar" aria-hidden="true">
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                </article>

                <section className="stores-section">
                    <h3>Mis locales</h3>

                    {user.stores.length === 0 ? (
                        <p className="empty-state">
                            No tenés locales asignados.
                        </p>
                    ) : (
                        <div className="stores-grid">
                            {user.stores.map((store) => (
                                <article
                                    className="store-card"
                                    key={store.id}
                                >
                                    <span className="store-label">LOCAL</span>

                                    <h4>{store.name}</h4>

                                    <p>{store.address}</p>

                                    <span
                                        className={
                                            store.isActive
                                                ? 'status-active'
                                                : 'status-inactive'
                                        }
                                    >
                                        {store.isActive ? 'Activo' : 'Inactivo'}
                                    </span>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </main>
    )
}