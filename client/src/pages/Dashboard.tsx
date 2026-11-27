import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  managementApi,
  type StoreRecord,
  type UserRecord,
} from '../api/management.api'
import StockManagement from './StockManagement'
import Reservations from './Reservations'
import Notifications from './Notifications'
import Settings from './Settings'

interface DashboardProps {
  onLogout: () => void
}

type Section = 'stores' | 'employees' | 'stock' | 'reservations' | 'notifications' | 'settings'

const roleNames = {
  owner: 'Dueño',
  manager: 'Gerente',
  employee: 'Empleado',
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const { user } = useAuth()

  const [section, setSection] = useState<Section>('stores')
  const [stores, setStores] = useState<StoreRecord[]>([])
  const [employees, setEmployees] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [storeName, setStoreName] = useState('')
  const [storeAddress, setStoreAddress] = useState('')

  const [employeeEmail, setEmployeeEmail] = useState('')
  const [employeePassword, setEmployeePassword] = useState('')
  const [employeeRole, setEmployeeRole] = useState<'manager' | 'employee'>(
    'employee',
  )
  const [employeeStoreIds, setEmployeeStoreIds] = useState<number[]>([])

  const isOwner = user?.role === 'owner'
  const canManageEmployees =
    user?.role === 'owner' || user?.role === 'manager'

  const loadData = useCallback(async () => {
    try {
      const storesData = await managementApi.stores(isOwner)
      setStores(storesData)

      if (canManageEmployees) {
        const usersData = await managementApi.users(isOwner)
        setEmployees(usersData)
      } else {
        setEmployees([])
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los datos.',
      )
    } finally {
      setLoading(false)
    }
  }, [isOwner, canManageEmployees])

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const storesData = await managementApi.stores(isOwner)
        if (cancelled) return

        setStores(storesData)

        if (canManageEmployees) {
          const usersData = await managementApi.users(isOwner)
          if (cancelled) return

          setEmployees(usersData)
        } else {
          setEmployees([])
        }
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los datos.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      cancelled = true
    }
  }, [isOwner, canManageEmployees])

  function toggleStoreAssignment(storeId: number) {
    setEmployeeStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId],
    )
  }

  async function handleCreateStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await managementApi.createStore({
        name: storeName.trim(),
        address: storeAddress.trim(),
      })

      setStoreName('')
      setStoreAddress('')
      setSuccess('La sucursal se creó correctamente.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear la sucursal.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (employeeStoreIds.length === 0) {
      setError('Seleccioná al menos una sucursal para el usuario.')
      return
    }

    if (employeeRole === 'employee' && employeeStoreIds.length !== 1) {
      setError('Un empleado debe estar asignado a una sola sucursal.')
      return
    }

    setSaving(true)

    try {
      await managementApi.createUser({
        email: employeeEmail.trim(),
        password: employeePassword,
        role: employeeRole,
        storeIds: employeeStoreIds,
      })

      setEmployeeEmail('')
      setEmployeePassword('')
      setEmployeeRole('employee')
      setEmployeeStoreIds([])
      setSuccess('El usuario se creó correctamente.')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el usuario.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStore(store: StoreRecord) {
    setError('')
    setSuccess('')

    try {
      await managementApi.updateStore(store.id, {
        isActive: !store.isActive,
      })

      setSuccess(
        store.isActive
          ? 'La sucursal se desactivó.'
          : 'La sucursal se activó.',
      )

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la sucursal.',
      )
    }
  }

  async function handleToggleEmployee(employee: UserRecord) {
    setError('')
    setSuccess('')

    try {
      await managementApi.updateUser(employee.id, {
        isActive: !employee.isActive,
      })

      setSuccess(
        employee.isActive
          ? 'El usuario se desactivó.'
          : 'El usuario se activó.',
      )

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el usuario.',
      )
    }
  }

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

        <div className="dashboard-user">
          <span>{user.email}</span>
          <span className="role-badge">{roleNames[user.role]}</span>
          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="dashboard-content">
        <p className="eyebrow">PANEL PRINCIPAL</p>
        <h2>Gestión del negocio</h2>
        <p className="dashboard-description">
          Administrá las sucursales y las personas que trabajan en ellas.
        </p>

        {error && <p className="notice notice-error">{error}</p>}
        {success && <p className="notice notice-success">{success}</p>}

        <nav className="dashboard-tabs" aria-label="Secciones">
          <button
            type="button"
            className={section === 'stock' ? 'tab-active' : ''}
            onClick={() => {
              setSection('stock')
              setError('')
              setSuccess('')
            }}
          >
            Stock
          </button>

          <button type="button" className={section === 'reservations' ? 'tab-active' : ''} onClick={() => setSection('reservations')}>Reservas</button>
          <button type="button" className={section === 'notifications' ? 'tab-active' : ''} onClick={() => setSection('notifications')}>Notificaciones</button>
          {user.role === 'owner' && <button type="button" className={section === 'settings' ? 'tab-active' : ''} onClick={() => setSection('settings')}>Configuración</button>}

          <button
            type="button"
            className={section === 'stores' ? 'tab-active' : ''}
            onClick={() => {
              setSection('stores')
              setError('')
              setSuccess('')
            }}
          >
            Sucursales
          </button>

          {canManageEmployees && (
            <button
              type="button"
              className={section === 'employees' ? 'tab-active' : ''}
              onClick={() => {
                setSection('employees')
                setError('')
                setSuccess('')
              }}
            >
              Empleados y gerentes
            </button>
          )}
        </nav>

        {loading ? (
          <p className="empty-state">Cargando información...</p>
        ) : (
          <>
            {section === 'stock' && <StockManagement stores={stores} />}
            {section === 'reservations' && <Reservations stores={stores} />}
            {section === 'notifications' && <Notifications />}
            {section === 'settings' && user.role === 'owner' && <Settings />}

            {section === 'stores' && (
              <section className="management-section">
                <div className="section-heading">
                  <div>
                    <h3>Sucursales</h3>
                    <p>Locales disponibles para operar en el sistema.</p>
                  </div>
                </div>

                {isOwner && (
                  <form
                    className="management-form"
                    onSubmit={handleCreateStore}
                  >
                    <h4>Agregar sucursal</h4>

                    <label htmlFor="store-name">Nombre</label>
                    <input
                      id="store-name"
                      value={storeName}
                      onChange={(event) => setStoreName(event.target.value)}
                      placeholder="Ej.: Sucursal Centro"
                      required
                      maxLength={100}
                    />

                    <label htmlFor="store-address">Dirección</label>
                    <input
                      id="store-address"
                      value={storeAddress}
                      onChange={(event) =>
                        setStoreAddress(event.target.value)
                      }
                      placeholder="Calle y número"
                      required
                      maxLength={255}
                    />

                    <button type="submit" disabled={saving}>
                      {saving ? 'Guardando...' : 'Crear sucursal'}
                    </button>
                  </form>
                )}

                {stores.length === 0 ? (
                  <p className="empty-state">
                    No hay sucursales para mostrar.
                  </p>
                ) : (
                  <div className="management-grid">
                    {stores.map((store) => (
                      <article className="management-card" key={store.id}>
                        <div className="management-card-heading">
                          <h4>{store.name}</h4>
                          <span
                            className={
                              store.isActive
                                ? 'status-active'
                                : 'status-inactive'
                            }
                          >
                            {store.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>

                        <p>{store.address}</p>

                        {isOwner && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void handleToggleStore(store)}
                          >
                            {store.isActive ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {section === 'employees' && canManageEmployees && (
              <section className="management-section">
                <div className="section-heading">
                  <div>
                    <h3>Empleados y gerentes</h3>
                    <p>
                      Creá usuarios y asignales las sucursales donde pueden
                      trabajar.
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <form
                    className="management-form"
                    onSubmit={handleCreateEmployee}
                  >
                    <h4>Agregar usuario</h4>

                    <label htmlFor="employee-email">Email</label>
                    <input
                      id="employee-email"
                      type="email"
                      value={employeeEmail}
                      onChange={(event) =>
                        setEmployeeEmail(event.target.value)
                      }
                      placeholder="persona@ejemplo.com"
                      required
                    />

                    <label htmlFor="employee-password">
                      Contraseña inicial
                    </label>
                    <input
                      id="employee-password"
                      type="password"
                      value={employeePassword}
                      onChange={(event) =>
                        setEmployeePassword(event.target.value)
                      }
                      minLength={8}
                      maxLength={72}
                      required
                    />

                    <label htmlFor="employee-role">Rol</label>
                    <select
                      id="employee-role"
                      value={employeeRole}
                      onChange={(event) =>
                        setEmployeeRole(
                          event.target.value as 'manager' | 'employee',
                        )
                      }
                    >
                      <option value="employee">Empleado</option>
                      <option value="manager">Gerente</option>
                    </select>

                    <fieldset className="store-assignment">
                      <legend>Sucursales asignadas</legend>

                      {stores.filter((store) => store.isActive).length ===
                      0 ? (
                        <p>No hay sucursales activas para asignar.</p>
                      ) : (
                        stores
                          .filter((store) => store.isActive)
                          .map((store) => (
                            <label
                              key={store.id}
                              className="checkbox-label"
                            >
                              <input
                                type="checkbox"
                                checked={employeeStoreIds.includes(store.id)}
                                onChange={() =>
                                  toggleStoreAssignment(store.id)
                                }
                              />
                              {store.name}
                            </label>
                          ))
                      )}
                    </fieldset>

                    <p className="form-help">
                      Un empleado debe tener exactamente una sucursal
                      asignada. Un gerente puede tener más de una.
                    </p>

                    <button type="submit" disabled={saving}>
                      {saving ? 'Guardando...' : 'Crear usuario'}
                    </button>
                  </form>
                )}

                {employees.length === 0 ? (
                  <p className="empty-state">
                    No hay usuarios para mostrar.
                  </p>
                ) : (
                  <div className="management-grid">
                    {employees.map((employee) => (
                      <article
                        className="management-card"
                        key={employee.id}
                      >
                        <div className="management-card-heading">
                          <h4>{employee.email}</h4>
                          <span
                            className={
                              employee.isActive
                                ? 'status-active'
                                : 'status-inactive'
                            }
                          >
                            {employee.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>

                        <p>Rol: {roleNames[employee.role]}</p>

                        <p>
                          Sucursales:{' '}
                          {employee.stores
                            ?.map((store) => store.name)
                            .join(', ') || 'Sin sucursales'}
                        </p>

                        {isOwner && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              void handleToggleEmployee(employee)
                            }
                          >
                            {employee.isActive
                              ? 'Desactivar usuario'
                              : 'Activar usuario'}
                          </button>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </main>
  )
}