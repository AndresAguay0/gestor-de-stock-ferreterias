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

import Settings from '../../src/pages/Settings'
import { managementApi } from '../../src/api/management.api'

vi.mock('../../src/api/management.api', () => ({
    managementApi: {
        settings: vi.fn(),
        updateSettings: vi.fn(),
    },
}))

const settingsData = {
    businessName: 'Ferretería Central',
    reservationDefaultMinutes: 30,
}

describe('Integración de Settings', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(
            managementApi.settings,
        ).mockResolvedValue(settingsData as never)
    })

    it('carga y muestra la configuración existente', async () => {
        render(<Settings />)

        expect(
            await screen.findByDisplayValue(
                'Ferretería Central',
            ),
        ).toBeInTheDocument()

        expect(
            screen.getByDisplayValue('30'),
        ).toBeInTheDocument()

        expect(
            managementApi.settings,
        ).toHaveBeenCalledTimes(1)
    })

    it('guarda los cambios de configuración correctamente', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.updateSettings,
        ).mockResolvedValue({
            businessName: 'Ferretería Norte',
            reservationDefaultMinutes: 45,
        } as never)

        render(<Settings />)

        const nameInput =
            await screen.findByDisplayValue(
                'Ferretería Central',
            )

        await user.clear(nameInput)
        await user.type(nameInput, 'Ferretería Norte')

        const minutesInput =
            screen.getByDisplayValue('30')

        await user.clear(minutesInput)
        await user.type(minutesInput, '45')

        await user.click(
            screen.getByRole('button', {
                name: 'Guardar configuración',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.updateSettings,
            ).toHaveBeenCalledWith({
                businessName: 'Ferretería Norte',
                reservationDefaultMinutes: 45,
            })
        })

        expect(
            await screen.findByText(
                'Configuración guardada.',
            ),
        ).toBeInTheDocument()
    })

    it('envía null cuando el nombre del negocio queda vacío', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.updateSettings,
        ).mockResolvedValue({
            businessName: null,
            reservationDefaultMinutes: 30,
        } as never)

        render(<Settings />)

        const nameInput =
            await screen.findByDisplayValue(
                'Ferretería Central',
            )

        await user.clear(nameInput)

        await user.click(
            screen.getByRole('button', {
                name: 'Guardar configuración',
            }),
        )

        await waitFor(() => {
            expect(
                managementApi.updateSettings,
            ).toHaveBeenCalledWith({
                businessName: null,
                reservationDefaultMinutes: 30,
            })
        })
    })

    it('muestra un error si falla la carga de configuración', async () => {
        vi.mocked(
            managementApi.settings,
        ).mockRejectedValue(
            new Error('No se pudo consultar la configuración'),
        )

        render(<Settings />)

        expect(
            await screen.findByText(
                'No se pudo consultar la configuración',
            ),
        ).toBeInTheDocument()
    })

    it('muestra un error si falla el guardado', async () => {
        const user = userEvent.setup()

        vi.mocked(
            managementApi.updateSettings,
        ).mockRejectedValue(
            new Error('No se pudo guardar'),
        )

        render(<Settings />)

        await screen.findByDisplayValue(
            'Ferretería Central',
        )

        await user.click(
            screen.getByRole('button', {
                name: 'Guardar configuración',
            }),
        )

        expect(
            await screen.findByText('No se pudo guardar'),
        ).toBeInTheDocument()
    })
})