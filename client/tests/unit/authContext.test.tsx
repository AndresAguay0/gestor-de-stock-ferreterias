import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest'
import {
    render,
    screen,
    waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    AuthProvider,
    useAuth,
} from '../../src/auth/AuthContext'

import {
    login as loginRequest,
    getCurrentUser,
    type AuthUser,
} from '../../src/api/auth.api'

import { ApiError } from '../../src/api/client'

// Simulamos las funciones que se comunican con el backend.
vi.mock('../../src/api/auth.api', () => ({
    login: vi.fn(),
    getCurrentUser: vi.fn(),
    changePassword: vi.fn(),
}))

// Usuario ficticio para las pruebas.
const mockUser = {
    id: 1,
    email: 'admin@ferreteria.com',
    role: 'owner',
} as AuthUser

// Credenciales ficticias.
const credentials = {
    email: 'admin@ferreteria.com',
    password: 'password123',
}

// Componente auxiliar para observar y utilizar el contexto.
function AuthProbe() {
    const {
        user,
        isLoading,
        login,
        logout,
    } = useAuth()

    return (
        <div>
            <p>
                {isLoading
                    ? 'Cargando sesión...'
                    : 'Sesión cargada'}
            </p>

            <p>
                Usuario: {user?.email ?? 'Sin usuario'}
            </p>

            <button
                type="button"
                onClick={() => {
                    void login(credentials)
                }}
            >
                Iniciar sesión
            </button>

            <button
                type="button"
                onClick={logout}
            >
                Cerrar sesión
            </button>
        </div>
    )
}

// Renderizamos el componente dentro del proveedor.
function renderAuthProvider() {
    return render(
        <AuthProvider>
            <AuthProbe />
        </AuthProvider>,
    )
}

describe('AuthContext', () => {
    beforeEach(() => {
        sessionStorage.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('no intenta recuperar la sesión cuando no existe un token', async () => {
        renderAuthProvider()

        await waitFor(() => {
            expect(
                screen.getByText('Sesión cargada'),
            ).toBeInTheDocument()
        })

        expect(
            screen.getByText('Usuario: Sin usuario'),
        ).toBeInTheDocument()

        expect(getCurrentUser).not.toHaveBeenCalled()
    })

    it('recupera el usuario cuando existe un token válido', async () => {
        sessionStorage.setItem(
            'auth_token',
            'token-valido',
        )

        vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

        renderAuthProvider()

        expect(
            await screen.findByText(
                'Usuario: admin@ferreteria.com',
            ),
        ).toBeInTheDocument()

        expect(getCurrentUser).toHaveBeenCalledTimes(1)

        expect(
            screen.getByText('Sesión cargada'),
        ).toBeInTheDocument()
    })

    it('guarda el token y establece el usuario al iniciar sesión', async () => {
        const user = userEvent.setup()

        vi.mocked(loginRequest).mockResolvedValue({
            token: 'nuevo-token',
            user: mockUser,
        })

        renderAuthProvider()

        await user.click(
            screen.getByRole('button', {
                name: 'Iniciar sesión',
            }),
        )

        await waitFor(() => {
            expect(
                screen.getByText(
                    'Usuario: admin@ferreteria.com',
                ),
            ).toBeInTheDocument()
        })

        expect(loginRequest).toHaveBeenCalledWith(credentials)

        expect(
            sessionStorage.getItem('auth_token'),
        ).toBe('nuevo-token')
    })

    it('elimina el token y limpia el usuario al cerrar sesión', async () => {
        const user = userEvent.setup()

        sessionStorage.setItem(
            'auth_token',
            'token-valido',
        )

        vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

        renderAuthProvider()

        expect(
            await screen.findByText(
                'Usuario: admin@ferreteria.com',
            ),
        ).toBeInTheDocument()

        await user.click(
            screen.getByRole('button', {
                name: 'Cerrar sesión',
            }),
        )

        expect(
            screen.getByText('Usuario: Sin usuario'),
        ).toBeInTheDocument()

        expect(
            sessionStorage.getItem('auth_token'),
        ).toBeNull()
    })

    it('elimina el token cuando el servidor responde 401', async () => {
        sessionStorage.setItem(
            'auth_token',
            'token-expirado',
        )

        vi.mocked(getCurrentUser).mockRejectedValue(
            new ApiError('No autorizado', 401),
        )

        renderAuthProvider()

        await waitFor(() => {
            expect(
                screen.getByText('Sesión cargada'),
            ).toBeInTheDocument()
        })

        expect(
            screen.getByText('Usuario: Sin usuario'),
        ).toBeInTheDocument()

        expect(
            sessionStorage.getItem('auth_token'),
        ).toBeNull()
    })

    it('elimina el token y registra el error cuando ocurre un error distinto de 401', async () => {
        sessionStorage.setItem(
            'auth_token',
            'token-valido',
        )

        const consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => { })

        vi.mocked(getCurrentUser).mockRejectedValue(
            new ApiError('Error interno del servidor', 500),
        )

        renderAuthProvider()

        await waitFor(() => {
            expect(
                screen.getByText('Sesión cargada'),
            ).toBeInTheDocument()
        })

        expect(
            screen.getByText('Usuario: Sin usuario'),
        ).toBeInTheDocument()

        expect(
            sessionStorage.getItem('auth_token'),
        ).toBeNull()

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'Error al recuperar la sesión:',
            'Error interno del servidor',
        )
    })
})