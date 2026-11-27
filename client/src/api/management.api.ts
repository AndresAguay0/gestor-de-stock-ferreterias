import { apiRequest } from './client'

export type Role = 'owner' | 'manager' | 'employee'

export type Unit =
  | 'un'
  | 'par'
  | 'caja'
  | 'bolsa'
  | 'rollo'
  | 'm'
  | 'm2'
  | 'kg'
  | 'l'

export interface StoreRecord {
  id: number
  name: string
  address: string
  isActive: boolean
}

export interface UserRecord {
  id: number
  email: string
  role: Role
  isActive: boolean
  stores: StoreRecord[]
}

export interface ProductRecord {
  id: number
  name: string
  description: string | null
  category: string
  unit: Unit
  priceCents: number
  sku: string | null
  barcode: string | null
  isActive: boolean
}

export interface Page<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

export interface InventoryRow {
  product: ProductRecord
  stores: Array<{
    storeId: number
    storeName: string
    quantity: number
    minQuantity: number
    belowMinimum: boolean
    reserved?: number
    available?: number
  }>
}

export interface MovementRecord {
  id: number
  productId: number
  storeId: number
  userId: number
  type: 'in' | 'out' | 'adjustment'
  reason: string
  quantity: number
  resultingQuantity: number
  note: string | null
  clientRef: string | null
  createdAt: string
  product?: { id: number; name: string; unit: Unit } | null
  store?: { id: number; name: string } | null
  user?: { id: number; email: string } | null
}

export interface ReservationRecord {
  id: number
  productId: number
  storeId: number
  quantity: number
  status: string
  customerNote: string | null
  expiresAt: string
  createdAt: string
  product?: { id: number; name: string; unit: Unit } | null
  store?: { id: number; name: string } | null
}

export interface NotificationRecord {
  id: number
  type: string
  productId: number
  storeId: number
  quantity: number
  minQuantity: number
  createdAt: string
  readAt: string | null
  product?: { id: number; name: string; unit: Unit } | null
  store?: { id: number; name: string } | null
}

export interface SettingsRecord {
  businessName: string | null
  reservationDefaultMinutes: number
}

function requestOptions(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
}

function queryString(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value))
    }
  })

  const result = query.toString()
  return result ? `?${result}` : ''
}

export const managementApi = {
  // Sucursales
  stores: (includeInactive = false) =>
    apiRequest<StoreRecord[]>(
      `/stores${queryString({ includeInactive })}`,
    ),

  createStore: (input: { name: string; address: string }) =>
    apiRequest<StoreRecord>('/stores', requestOptions('POST', input)),

  updateStore: (
    id: number,
    input: Partial<Pick<StoreRecord, 'name' | 'address' | 'isActive'>>,
  ) =>
    apiRequest<StoreRecord>(
      `/stores/${id}`,
      requestOptions('PATCH', input),
    ),

  // Empleados y gerentes
  users: (includeInactive = false) =>
    apiRequest<UserRecord[]>(
      `/users${queryString({ includeInactive })}`,
    ),

  createUser: (input: {
    email: string
    password: string
    role: 'manager' | 'employee'
    storeIds: number[]
  }) =>
    apiRequest<UserRecord>('/users', requestOptions('POST', input)),

  updateUser: (
    id: number,
    input: {
      email?: string
      role?: 'manager' | 'employee'
      isActive?: boolean
      storeIds?: number[]
    },
  ) =>
    apiRequest<UserRecord>(
      `/users/${id}`,
      requestOptions('PATCH', input),
    ),

  reassignUserStores: (id: number, storeIds: number[]) =>
    apiRequest<UserRecord>(
      `/users/${id}/stores`,
      requestOptions('PATCH', { storeIds }),
    ),

  resetUserPassword: (id: number, newPassword: string) =>
    apiRequest<void>(
      `/users/${id}/password`,
      requestOptions('PUT', { newPassword }),
    ),

  // Productos
  products: (params: {
    search?: string
    includeInactive?: boolean
    limit?: number
    offset?: number
  } = {}) =>
    apiRequest<Page<ProductRecord>>(
      `/products${queryString({
        search: params.search,
        includeInactive: params.includeInactive,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      })}`,
    ),

  createProduct: (input: {
    name: string
    description?: string
    category: string
    unit: Unit
    priceCents: number
    sku?: string
    barcode?: string
  }) =>
    apiRequest<ProductRecord>('/products', requestOptions('POST', input)),

  updateProduct: (
    id: number,
    input: Partial<
      Pick<
        ProductRecord,
        | 'name'
        | 'description'
        | 'category'
        | 'priceCents'
        | 'sku'
        | 'barcode'
        | 'isActive'
      >
    >,
  ) =>
    apiRequest<ProductRecord>(
      `/products/${id}`,
      requestOptions('PATCH', input),
    ),

  // Inventario
  inventory: (params: {
    search?: string
    limit?: number
    offset?: number
  } = {}) =>
    apiRequest<Page<InventoryRow>>(
      `/inventory${queryString({
        search: params.search,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      })}`,
    ),

  setMinimum: (
    productId: number,
    storeId: number,
    minQuantity: number,
  ) =>
    apiRequest<InventoryRow>(
      `/inventory/${productId}/stores/${storeId}`,
      requestOptions('PATCH', { minQuantity }),
    ),

  // Movimientos de stock
  movements: (params: {
    productId?: number
    storeId?: number
    limit?: number
    offset?: number
  } = {}) =>
    apiRequest<Page<MovementRecord>>(
      `/movements${queryString(params)}`,
    ),

  createMovement: (input: {
    productId: number
    storeId: number
    type: 'in' | 'out' | 'adjustment'
    reason: string
    quantity?: number
    countedQuantity?: number
    note?: string
    clientRef?: string
  }) =>
    apiRequest<{ movement: MovementRecord; stock: unknown }>(
      '/movements',
      requestOptions('POST', input),
    ),

  // Reservas
  reservations: (params: {
    status?: string
    storeId?: number
    productId?: number
    limit?: number
    offset?: number
  } = {}) =>
    apiRequest<Page<ReservationRecord>>(
      `/reservations${queryString(params)}`,
    ),

  createReservation: (input: {
    productId: number
    storeId: number
    quantity: number
    minutes?: number
    originStoreId?: number
    customerNote?: string
  }) =>
    apiRequest<ReservationRecord>(
      '/reservations',
      requestOptions('POST', input),
    ),

  pickupReservation: (id: number) =>
    apiRequest<unknown>(
      `/reservations/${id}/pickup`,
      requestOptions('POST'),
    ),

  cancelReservation: (id: number) =>
    apiRequest<ReservationRecord>(
      `/reservations/${id}/cancel`,
      requestOptions('POST'),
    ),

  // Notificaciones
  notifications: (params: {
    limit?: number
    offset?: number
  } = {}) =>
    apiRequest<Page<NotificationRecord>>(
      `/notifications${queryString(params)}`,
    ),

  unreadNotificationCount: () =>
    apiRequest<{ count: number }>('/notifications/unread-count'),

  markNotificationRead: (id: number) =>
    apiRequest<NotificationRecord>(
      `/notifications/${id}/read`,
      requestOptions('POST'),
    ),

  markAllNotificationsRead: () =>
    apiRequest<unknown>(
      '/notifications/read-all',
      requestOptions('POST'),
    ),

  // Configuración general
  settings: () => apiRequest<SettingsRecord>('/settings'),

  updateSettings: (input: Partial<SettingsRecord>) =>
    apiRequest<SettingsRecord>(
      '/settings',
      requestOptions('PATCH', input),
    ),
}