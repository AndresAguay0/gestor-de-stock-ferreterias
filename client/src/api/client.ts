
const API_BASE_URL = '/api'

export interface ApiErrorResponse {
  msg?: string
  errors?: Array<{
    field: string
    message: string
  }>
}

export class ApiError extends Error {
  status: number
  details?: ApiErrorResponse['errors']

  constructor(
    message: string,
    status: number,
    details?: ApiErrorResponse['errors'],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = sessionStorage.getItem('auth_token')
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null

    throw new ApiError(
      errorData?.msg ??
        'Ocurrió un error al comunicarse con el servidor',
      response.status,
      errorData?.errors,
    )
  }

  return data as T
}
