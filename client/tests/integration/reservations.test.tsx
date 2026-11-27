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

import Reservations from '../../src/pages/Reservations'
import { managementApi } from '../../src/api/management.api'

vi.mock('../../src/api/management.api', () => ({
    managementApi: {
        reservations: vi.fn(),
        products: vi.fn(),
        createReservation: vi.fn(),
        cancelReservation: vi.fn(),
        pickupReservation: vi.fn(),
    },
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
    unit: 'un',
    isActive: true,
}

const reservation = {
    id: 100,
    storeId: 1,
    productId: 10,
    quantity: 2,
    status: 'active',
    expiresAt: '2026-11-28T12:00:00.000Z',
    customerNote: 'Retira por la tarde',
    product: {
        name: 'Martillo',
        unit: 'un',
    },
    store: {
        name: 'Sucursal Centro',
    },
}

function mockReservationData() {
    vi.mocked(
        managementApi.reservations,
    ).mockResolvedValue({
        items: [reservation],
    } as never)

    vi.mocked(
        managementApi.products,
    ).mockResolvedValue({
        items: [product],
    } as never)
}

describe('Integración de Reservations', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockReservationData()
    })

    it('carga y muestra las reservas existentes', async () => {
        render(<Reservations stores={stores} />)

        expect(
            await screen.findByText('Reserva #100'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Martillo'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Sucursal Centro'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Retira por la tarde'),
        ).toBeInTheDocument()

        expect(
            managementApi.reservations,
        ).toHaveBeenCalled()

        expect(
            managementApi.products,
        ).toHaveBeenCalled()
    })

    it('crea una reserva con los datos ingresados', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.createReservation,
        ).mockResolvedValue({} as never)

        render(<Reservations stores={stores} />)

        await screen.findByText('Reserva #100')

        const selects = screen.getAllByRole('combobox')

        // El primer selector corresponde a la sucursal del formulario.
        await user.selectOptions(selects[0], '1')

        // El segundo selector corresponde al producto.
        await user.selectOptions(selects[1], '10')

        const quantityInput = screen.getByDisplayValue('1')
        await user.clear(quantityInput)
        await user.type(quantityInput, '3')

        const minutesInput = screen.getByDisplayValue('30')
        await user.clear(minutesInput)
        await user.type(minutesInput, '45')

        const noteInput = screen.getByRole('textbox')
        await user.type(noteInput, 'Preparar para retirar')

        await user.click(
            screen.getByRole('button', {
                name: 'Crear reserva',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.createReservation,
            ).toHaveBeenCalledWith({
                storeId: 1,
                productId: 10,
                quantity: 3,
                minutes: 45,
                customerNote: 'Preparar para retirar',
            })
        })

        expect(
            await screen.findByText(
                'Reserva creada correctamente.',
            ),
        ).toBeInTheDocument()
    })

    it('rechaza una cantidad decimal al crear una reserva', async () => {
        const user = userEvent.setup()

        render(<Reservations stores={stores} />)

        await screen.findByText('Reserva #100')

        const selects = screen.getAllByRole('combobox')

        await user.selectOptions(selects[0], '1')
        await user.selectOptions(selects[1], '10')

        const quantityInput = screen.getByDisplayValue('1')
        await user.clear(quantityInput)
        await user.type(quantityInput, '1.5')

        await user.click(
            screen.getByRole('button', {
                name: 'Crear reserva',
            }),
        )

        expect(
            await screen.findByText(
                'Seleccioná sucursal y producto, e ingresá una cantidad entera mayor que cero.',
            ),
        ).toBeInTheDocument()

        expect(
            managementApi.createReservation,
        ).not.toHaveBeenCalled()
    })

    it('cancela una reserva activa', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.cancelReservation,
        ).mockResolvedValue({} as never)

        render(<Reservations stores={stores} />)

        await screen.findByText('Reserva #100')

        await user.click(
            screen.getByRole('button', {
                name: 'Cancelar',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.cancelReservation,
            ).toHaveBeenCalledWith(100)
        })

        expect(
            await screen.findByText('Reserva cancelada.'),
        ).toBeInTheDocument()
    })

    it('registra el retiro de una reserva activa', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.pickupReservation,
        ).mockResolvedValue({} as never)

        render(<Reservations stores={stores} />)

        await screen.findByText('Reserva #100')

        await user.click(
            screen.getByRole('button', {
                name: 'Marcar retirada',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.pickupReservation,
            ).toHaveBeenCalledWith(100)
        })

        expect(
            await screen.findByText('Reserva retirada.'),
        ).toBeInTheDocument()
    })

    it('muestra un error cuando falla la carga de reservas', async () => {
        vi.mocked(
            managementApi.reservations,
        ).mockRejectedValue(
            new Error('No se pudieron consultar las reservas'),
        )

        render(<Reservations stores={stores} />)

        expect(
            await screen.findByText(
                'No se pudieron consultar las reservas',
            ),
        ).toBeInTheDocument()
    })
})