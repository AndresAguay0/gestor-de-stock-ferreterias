import {
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

import StockManagement from '../../src/pages/StockManagement'
import { managementApi } from '../../src/api/management.api'
import { useAuth } from '../../src/auth/AuthContext'

vi.mock('../../src/api/management.api', () => ({
    managementApi: {
        inventory: vi.fn(),
        products: vi.fn(),
        movements: vi.fn(),
        createProduct: vi.fn(),
        createMovement: vi.fn(),
        updateProduct: vi.fn(),
        setMinimum: vi.fn(),
    },
}))

vi.mock('../../src/auth/AuthContext', () => ({
    useAuth: vi.fn(),
}))

const stores = [
    {
        id: 1,
        name: 'Sucursal Centro',
        isActive: true,
    },
    {
        id: 2,
        name: 'Sucursal Norte',
        isActive: false,
    },
] as never

const product = {
    id: 10,
    name: 'Martillo',
    category: 'Herramientas',
    unit: 'un',
    priceCents: 250000,
    isActive: true,
}

function mockStockData() {
    vi.mocked(
        managementApi.inventory,
    ).mockResolvedValue({
        items: [],
    } as never)

    vi.mocked(
        managementApi.products,
    ).mockResolvedValue({
        items: [product],
    } as never)

    vi.mocked(
        managementApi.movements,
    ).mockResolvedValue({
        items: [],
    } as never)
}

describe('Integración de StockManagement', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(useAuth).mockReturnValue({
            user: {
                id: 1,
                email: 'admin@ferreteria.com',
                role: 'owner',
            },
        } as never)

        mockStockData()
    })

    it('carga el inventario, los productos y el historial', async () => {
        render(<StockManagement stores={stores} />)

        expect(
            await screen.findByText('Martillo'),
        ).toBeInTheDocument()

        expect(
            managementApi.inventory,
        ).toHaveBeenCalled()

        expect(
            managementApi.products,
        ).toHaveBeenCalled()

        expect(
            managementApi.movements,
        ).toHaveBeenCalled()
    })

    it('muestra solamente las sucursales activas', async () => {
        render(<StockManagement stores={stores} />)

        await screen.findByText('Martillo')

        expect(
            screen.getByRole('option', {
                name: 'Sucursal Centro',
            }),
        ).toBeInTheDocument()

        expect(
            screen.queryByRole('option', {
                name: 'Sucursal Norte',
            }),
        ).not.toBeInTheDocument()
    })

    it('oculta la administración de productos y el historial para empleados', async () => {
        vi.mocked(useAuth).mockReturnValue({
            user: {
                id: 3,
                email: 'empleado@ferreteria.com',
                role: 'employee',
            },
        } as never)

        render(<StockManagement stores={stores} />)

        await screen.findByText('Martillo')

        expect(
            screen.queryByRole('heading', {
                name: 'Agregar producto',
            }),
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('heading', {
                name: 'Administrar productos',
            }),
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('heading', {
                name: 'Historial de movimientos',
            }),
        ).not.toBeInTheDocument()

        expect(
            managementApi.movements,
        ).not.toHaveBeenCalled()
    })

    it('permite crear un producto y convierte su precio a centavos', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.createProduct,
        ).mockResolvedValue(product as never)

        render(<StockManagement stores={stores} />)

        await screen.findByText('Martillo')

        const nameInput = screen.getByLabelText('Nombre')
        const categoryInput = screen.getByLabelText('Categoría')
        const priceInput = screen.getByLabelText('Precio unitario ($)')

        await user.clear(nameInput)
        await user.type(nameInput, 'Taladro')

        await user.clear(categoryInput)
        await user.type(categoryInput, 'Máquinas')

        await user.clear(priceInput)
        await user.type(priceInput, '1250.50')

        await user.click(
            screen.getByRole('button', {
                name: 'Crear producto',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.createProduct,
            ).toHaveBeenCalledWith({
                name: 'Taladro',
                category: 'Máquinas',
                unit: 'un',
                priceCents: 125050,
            })
        })

        expect(
            await screen.findByText(
                'Producto creado. Registrá un ingreso para agregarle stock.',
            ),
        ).toBeInTheDocument()
    })

    it('no permite registrar un movimiento sin seleccionar una sucursal', async () => {
        const user = userEvent.setup()

        render(<StockManagement stores={stores} />)

        await screen.findByText('Martillo')

        const registerButton = screen.getByRole('button', {
            name: 'Registrar movimiento',
        })

        expect(registerButton).toBeDisabled()

        // Sin sucursal seleccionada, no debe enviarse ningún movimiento.
        expect(
            managementApi.createMovement,
        ).not.toHaveBeenCalled()

        // Se verifica también que el botón se habilite al elegir una sucursal.
        await user.selectOptions(
            screen.getAllByRole('combobox')[0],
            '1',
        )

        expect(registerButton).toBeEnabled()
    })

    it('registra un ingreso de stock correctamente', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.createMovement,
        ).mockResolvedValue({} as never)

        render(<StockManagement stores={stores} />)

        await screen.findByText('Martillo')

        await user.selectOptions(
            screen.getAllByRole('combobox')[0],
            '1',
        )

        await user.click(
            screen.getByRole('button', {
                name: 'Registrar movimiento',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.createMovement,
            ).toHaveBeenCalledWith({
                productId: 10,
                storeId: 1,
                type: 'in',
                reason: 'purchase',
                quantity: 1,
            })
        })

        expect(
            await screen.findByText(
                'Ingreso registrado correctamente.',
            ),
        ).toBeInTheDocument()
    })
})