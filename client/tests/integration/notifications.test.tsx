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

import Notifications from '../../src/pages/Notifications'
import { managementApi } from '../../src/api/management.api'

vi.mock('../../src/api/management.api', () => ({
    managementApi: {
        notifications: vi.fn(),
        unreadNotificationCount: vi.fn(),
        markNotificationRead: vi.fn(),
        markAllNotificationsRead: vi.fn(),
    },
}))

const notification = {
    id: 1,
    productId: 10,
    storeId: 2,
    quantity: 3,
    minQuantity: 5,
    createdAt: '2026-11-27T10:00:00.000Z',
    readAt: null,
    product: {
        name: 'Martillo',
        unit: 'un',
    },
    store: {
        name: 'Sucursal Centro',
    },
}

function mockNotifications() {
    vi.mocked(managementApi.notifications).mockResolvedValue({
        items: [notification],
    } as never)

    vi.mocked(
        managementApi.unreadNotificationCount,
    ).mockResolvedValue({
        count: 1,
    } as never)
}

describe('Integración de Notifications', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockNotifications()
    })

    it('carga y muestra las notificaciones y la cantidad sin leer', async () => {
        render(<Notifications />)

        expect(
            await screen.findByText('Martillo'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('1 sin leer'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Sucursal Centro'),
        ).toBeInTheDocument()

        expect(
            screen.getByText('Sin leer'),
        ).toBeInTheDocument()

        expect(
            managementApi.notifications,
        ).toHaveBeenCalledWith({ limit: 100 })

        expect(
            managementApi.unreadNotificationCount,
        ).toHaveBeenCalled()
    })

    it('marca una notificación individual como leída', async () => {
        const user = userEvent.setup()

        render(<Notifications />)

        await screen.findByText('Martillo')

        await user.click(
            screen.getByRole('button', {
                name: 'Marcar como leída',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.markNotificationRead,
            ).toHaveBeenCalledWith(1)
        })

        // Después de marcarla, el componente vuelve a cargar los datos.
        expect(
            managementApi.notifications,
        ).toHaveBeenCalledTimes(2)
    })

    it('marca todas las notificaciones como leídas', async () => {
        const user = userEvent.setup()

        render(<Notifications />)

        await screen.findByText('Martillo')

        await user.click(
            screen.getByRole('button', {
                name: 'Marcar todas como leídas',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.markAllNotificationsRead,
            ).toHaveBeenCalledTimes(1)
        })

        expect(
            managementApi.notifications,
        ).toHaveBeenCalledTimes(2)
    })

    it('muestra un mensaje cuando falla la carga de notificaciones', async () => {
        vi.mocked(
            managementApi.notifications,
        ).mockRejectedValue(
            new Error('Error al consultar notificaciones'),
        )

        render(<Notifications />)

        expect(
            await screen.findByText(
                'Error al consultar notificaciones',
            ),
        ).toBeInTheDocument()
    })

    it('muestra un mensaje cuando falla el marcado individual', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.markNotificationRead,
        ).mockRejectedValue(
            new Error('No se pudo actualizar la notificación'),
        )

        render(<Notifications />)

        await screen.findByText('Martillo')

        await user.click(
            screen.getByRole('button', {
                name: 'Marcar como leída',
            }),
        )

        expect(
            await screen.findByText(
                'No se pudo actualizar la notificación',
            ),
        ).toBeInTheDocument()
    })
})