import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '../../src/api/client'

describe('apiRequest', () => {
    beforeEach(() => {
        sessionStorage.clear()
        vi.stubGlobal('fetch', vi.fn())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('devuelve los datos cuando la petición es exitosa', async () => {
        const responseData = { id: 1, name: 'Producto de prueba' }

        vi.mocked(fetch).mockResolvedValue({
            status: 200,
            ok: true,
            json: vi.fn().mockResolvedValue(responseData),
        } as unknown as Response)

        const result = await apiRequest<typeof responseData>('/productos')

        expect(result).toEqual(responseData)
        expect(fetch).toHaveBeenCalledWith(
            '/api/productos',
            expect.objectContaining({
                headers: expect.any(Headers),
            }),
        )
    })

    it('incluye el token de autenticación cuando existe', async () => {
        sessionStorage.setItem('auth_token', 'token-de-prueba')

        vi.mocked(fetch).mockResolvedValue({
            status: 200,
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true }),
        } as unknown as Response)

        await apiRequest('/productos')

        const options = vi.mocked(fetch).mock.calls[0][1]
        const headers = options?.headers as Headers

        expect(headers.get('Authorization')).toBe('Bearer token-de-prueba')
    })

    it('agrega Content-Type JSON cuando la petición tiene un body', async () => {
        vi.mocked(fetch).mockResolvedValue({
            status: 200,
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true }),
        } as unknown as Response)

        await apiRequest('/productos', {
            method: 'POST',
            body: JSON.stringify({ name: 'Producto' }),
        })

        const options = vi.mocked(fetch).mock.calls[0][1]
        const headers = options?.headers as Headers

        expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('no fuerza Content-Type JSON cuando el body es FormData', async () => {
        vi.mocked(fetch).mockResolvedValue({
            status: 200,
            ok: true,
            json: vi.fn().mockResolvedValue({ success: true }),
        } as unknown as Response)

        const formData = new FormData()
        formData.append('file', 'contenido')

        await apiRequest('/productos', {
            method: 'POST',
            body: formData,
        })

        const options = vi.mocked(fetch).mock.calls[0][1]
        const headers = options?.headers as Headers

        expect(headers.has('Content-Type')).toBe(false)
    })

    it('devuelve undefined cuando el servidor responde 204', async () => {
        const json = vi.fn()

        vi.mocked(fetch).mockResolvedValue({
            status: 204,
            ok: true,
            json,
        } as unknown as Response)

        const result = await apiRequest('/productos/1')

        expect(result).toBeUndefined()
        expect(json).not.toHaveBeenCalled()
    })

    it('lanza ApiError con el mensaje y status del servidor', async () => {
        vi.mocked(fetch).mockResolvedValue({
            status: 404,
            ok: false,
            json: vi.fn().mockResolvedValue({
                msg: 'Producto no encontrado',
            }),
        } as unknown as Response)

        await expect(apiRequest('/productos/999')).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Producto no encontrado',
            status: 404,
        })
    })

    it('utiliza un mensaje genérico cuando el error no contiene JSON válido', async () => {
        vi.mocked(fetch).mockResolvedValue({
            status: 500,
            ok: false,
            json: vi.fn().mockRejectedValue(new Error('JSON inválido')),
        } as unknown as Response)

        await expect(apiRequest('/productos')).rejects.toThrow(
            'Ocurrió un error al comunicarse con el servidor',
        )
    })

    it('conserva los detalles de validación enviados por el servidor', async () => {
        const errors = [
            {
                field: 'name',
                message: 'El nombre es obligatorio',
            },
        ]

        vi.mocked(fetch).mockResolvedValue({
            status: 400,
            ok: false,
            json: vi.fn().mockResolvedValue({
                msg: 'Datos inválidos',
                errors,
            }),
        } as unknown as Response)

        try {
            await apiRequest('/productos', {
                method: 'POST',
                body: JSON.stringify({ name: '' }),
            })

            throw new Error('Se esperaba que la petición fallara')
        } catch (error) {
            expect(error).toBeInstanceOf(ApiError)

            const apiError = error as ApiError

            expect(apiError.status).toBe(400)
            expect(apiError.message).toBe('Datos inválidos')
            expect(apiError.details).toEqual(errors)
        }
    })
})