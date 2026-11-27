
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../../src/pages/Dashboard'
import { useAuth } from '../../src/auth/AuthContext'
import { managementApi } from '../../src/api/management.api'

vi.mock('../../src/auth/AuthContext', () => ({
    useAuth: vi.fn(),
}))

vi.mock('../../src/api/management.api', () => ({
    managementApi: {
        stores: vi.fn(),
        users: vi.fn(),
        createStore: vi.fn(),
        createUser: vi.fn(),
        updateStore: vi.fn(),
        updateUser: vi.fn(),
    },
}))

// Simulamos los componentes hijos para probar Dashboard de forma aislada.
vi.mock('../../src/pages/StockManagement', () => ({
    default: () => <div>StockManagement mock</div>,
}))

vi.mock('../../src/pages/Reservations', () => ({
    default: () => <div>Reservations mock</div>,
}))

vi.mock('../../src/pages/Notifications', () => ({
    default: () => <div>Notifications mock</div>,
}))

vi.mock('../../src/pages/Settings', () => ({
    default: () => <div>Settings mock</div>,
}))

const storesFixture = [
    {
        id: 1,
        name: 'Sucursal Centro',
        address: 'Av. Principal 123',
        isActive: true,
    },
    {
        id: 2,
        name: 'Sucursal Norte',
        address: 'Calle Norte 456',
        isActive: false,
    },
] as never

const employeesFixture = [
    {
        id: 10,
        email: 'empleado@test.com',
        role: 'employee',
        isActive: true,
        stores: [{ id: 1, name: 'Sucursal Centro' }],
    },
] as never

const owner = {
    id: 1,
    email: 'dueno@test.com',
    role: 'owner',
} as never

const manager = {
    id: 2,
    email: 'gerente@test.com',
    role: 'manager',
} as never

const employee = {
    id: 3,
    email: 'empleado@test.com',
    role: 'employee',
} as never

function renderDashboard(user = owner) {
    return render(<Dashboard onLogout={vi.fn()} />)
}

async function openEmployeesSection() {
    await userEvent.click(
        screen.getByRole('button', { name: 'Empleados y gerentes' }),
    )
}

describe('Dashboard - integración', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(useAuth).mockReturnValue({ user: owner } as never)

        vi.mocked(managementApi.stores).mockResolvedValue(storesFixture)
        vi.mocked(managementApi.users).mockResolvedValue(employeesFixture)

        vi.mocked(managementApi.createStore).mockResolvedValue({} as never)
        vi.mocked(managementApi.createUser).mockResolvedValue({} as never)
        vi.mocked(managementApi.updateStore).mockResolvedValue({} as never)
        vi.mocked(managementApi.updateUser).mockResolvedValue({} as never)
    })

    it('carga y muestra las sucursales del usuario', async () => {
        renderDashboard()

        expect(
            await screen.findByText('Sucursal Centro'),
        ).toBeInTheDocument()

        expect(screen.getByText('Sucursal Norte')).toBeInTheDocument()

        expect(managementApi.stores).toHaveBeenCalledWith(true)
        expect(managementApi.users).toHaveBeenCalledWith(true)
    })

    it('permite al dueño crear una sucursal', async () => {
        const user = userEvent.setup()

        renderDashboard()

        await screen.findByText('Sucursal Centro')

        await user.type(
            screen.getByLabelText('Nombre'),
            '  Sucursal Sur  ',
        )

        await user.type(
            screen.getByLabelText('Dirección'),
            '  Calle Sur 789  ',
        )

        await user.click(
            screen.getByRole('button', { name: 'Crear sucursal' }),
        )

        await waitFor(() => {
            expect(managementApi.createStore).toHaveBeenCalledWith({
                name: 'Sucursal Sur',
                address: 'Calle Sur 789',
            })
        })

        expect(
            await screen.findByText('La sucursal se creó correctamente.'),
        ).toBeInTheDocument()

        expect(managementApi.stores).toHaveBeenCalledTimes(2)
    })

    it('permite al dueño activar o desactivar una sucursal', async () => {
        const user = userEvent.setup()

        renderDashboard()

        await screen.findByText('Sucursal Centro')

        await user.click(
            screen.getByRole('button', { name: 'Desactivar' }),
        )

        await waitFor(() => {
            expect(managementApi.updateStore).toHaveBeenCalledWith(1, {
                isActive: false,
            })
        })

        expect(
            await screen.findByText('La sucursal se desactivó.'),
        ).toBeInTheDocument()
    })

    it('permite al dueño crear un empleado asignado a una sucursal', async () => {
        const user = userEvent.setup()

        renderDashboard()

        await screen.findByText('Sucursal Centro')
        await openEmployeesSection()

        await user.type(
            screen.getByLabelText('Email'),
            'nuevo@test.com',
        )

        await user.type(
            screen.getByLabelText('Contraseña inicial'),
            'password123',
        )

        await user.click(
            screen.getByLabelText('Sucursal Centro'),
        )

        await user.click(
            screen.getByRole('button', { name: 'Crear usuario' }),
        )

        await waitFor(() => {
            expect(managementApi.createUser).toHaveBeenCalledWith({
                email: 'nuevo@test.com',
                password: 'password123',
                role: 'employee',
                storeIds: [1],
            })
        })

        expect(
            await screen.findByText('El usuario se creó correctamente.'),
        ).toBeInTheDocument()
    })

    it('impide crear un empleado sin sucursal asignada', async () => {
        const user = userEvent.setup()

        renderDashboard()

        await screen.findByText('Sucursal Centro')
        await openEmployeesSection()

        await user.type(
            screen.getByLabelText('Email'),
            'nuevo@test.com',
        )

        await user.type(
            screen.getByLabelText('Contraseña inicial'),
            'password123',
        )

        await user.click(
            screen.getByRole('button', { name: 'Crear usuario' }),
        )

        expect(
            await screen.findByText(
                'Seleccioná al menos una sucursal para el usuario.',
            ),
        ).toBeInTheDocument()

        expect(managementApi.createUser).not.toHaveBeenCalled()
    })

    it('impide asignar más de una sucursal a un empleado', async () => {
        const user = userEvent.setup()

        vi.mocked(managementApi.stores).mockResolvedValue([
            {
                id: 1,
                name: 'Sucursal Centro',
                address: 'Av. Principal 123',
                isActive: true,
            },
            {
                id: 2,
                name: 'Sucursal Norte',
                address: 'Calle Norte 456',
                isActive: true,
            },
        ] as never)

        renderDashboard()

        await screen.findByText('Sucursal Centro')
        await openEmployeesSection()

        await user.type(
            screen.getByLabelText('Email'),
            'nuevo@test.com',
        )

        await user.type(
            screen.getByLabelText('Contraseña inicial'),
            'password123',
        )

        await user.click(screen.getByLabelText('Sucursal Centro'))
        await user.click(screen.getByLabelText('Sucursal Norte'))

        await user.click(
            screen.getByRole('button', { name: 'Crear usuario' }),
        )

        expect(
            await screen.findByText(
                'Un empleado debe estar asignado a una sola sucursal.',
            ),
        ).toBeInTheDocument()

        expect(managementApi.createUser).not.toHaveBeenCalled()
    })

    it('permite al gerente consultar empleados, pero no crear sucursales ni usuarios', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: manager } as never)

        renderDashboard()

        await screen.findByText('Sucursal Centro')

        expect(managementApi.stores).toHaveBeenCalledWith(false)
        expect(managementApi.users).toHaveBeenCalledWith(false)

        expect(
            screen.queryByRole('button', { name: 'Crear sucursal' }),
        ).not.toBeInTheDocument()

        await openEmployeesSection()

        expect(
            await screen.findByText('empleado@test.com'),
        ).toBeInTheDocument()

        expect(
            screen.queryByRole('button', { name: 'Crear usuario' }),
        ).not.toBeInTheDocument()
    })

    it('no permite al empleado acceder a la gestión de usuarios ni configuración', async () => {
        vi.mocked(useAuth).mockReturnValue({ user: employee } as never)

        renderDashboard()

        await screen.findByText('Sucursal Centro')

        expect(managementApi.stores).toHaveBeenCalledWith(false)
        expect(managementApi.users).not.toHaveBeenCalled()

        expect(
            screen.queryByRole('button', { name: 'Empleados y gerentes' }),
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('button', { name: 'Configuración' }),
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('button', { name: 'Crear sucursal' }),
        ).not.toBeInTheDocument()
    })

    it('ejecuta la función de cierre de sesión al presionar el botón', async () => {
        const user = userEvent.setup()
        const onLogout = vi.fn()

        render(<Dashboard onLogout={onLogout} />)

        await screen.findByText('Sucursal Centro')

        await user.click(
            screen.getByRole('button', { name: 'Cerrar sesión' }),
        )

        expect(onLogout).toHaveBeenCalledTimes(1)
    })
})
