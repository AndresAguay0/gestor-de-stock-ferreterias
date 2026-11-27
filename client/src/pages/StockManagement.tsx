import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  managementApi,
  type InventoryRow,
  type MovementRecord,
  type ProductRecord,
  type StoreRecord,
  type Unit,
} from '../api/management.api'

interface Props {
  stores: StoreRecord[]
}

const units: { value: Unit; label: string }[] = [
  { value: 'un', label: 'Unidad' },
  { value: 'par', label: 'Par' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'm', label: 'Metro' },
  { value: 'm2', label: 'Metro cuadrado' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'l', label: 'Litro' },
]

export default function StockManagement({ stores }: Props) {
  const { user } = useAuth()
  const canAdjustStock = user?.role === 'owner' || user?.role === 'manager'
  const isEmployee = user?.role === 'employee'
  const activeStores = stores.filter((store) => store.isActive)

  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [movementHistory, setMovementHistory] = useState<MovementRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [allProducts, setAllProducts] = useState<ProductRecord[]>([])
  const [selectedStore, setSelectedStore] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Si la sucursal seleccionada deja de estar activa, no se usa como destino.
  const validSelectedStore = activeStores.some(
    (store) => String(store.id) === selectedStore,
  )
    ? selectedStore
    : ''

  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [sku, setSku] = useState('')
  const [unit, setUnit] = useState<Unit>('un')
  const [price, setPrice] = useState('0')

  const [movementProduct, setMovementProduct] = useState('')
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [countedQuantity, setCountedQuantity] = useState('0')
  const [minimumDrafts, setMinimumDrafts] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('purchase')
  const [movementNote, setMovementNote] = useState('')

  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [editingProductName, setEditingProductName] = useState('')

  const selectedProduct = products.find(
    (product) => product.id === Number(movementProduct),
  )
  const quantityStep = selectedProduct && ['m', 'm2'].includes(selectedProduct.unit)
    ? '0.01'
    : ['kg', 'l'].includes(selectedProduct?.unit ?? '')
      ? '0.001'
      : '1'

  const loadData = useCallback(async () => {
    try {
      const [inventoryData, productData] = await Promise.all([
        managementApi.inventory({ search: search.trim() || undefined, limit: 100 }),
        managementApi.products({ search: search.trim() || undefined, includeInactive: !isEmployee, limit: 100 }),
      ])
      const movementData = isEmployee ? null : await managementApi.movements({
        storeId: validSelectedStore ? Number(validSelectedStore) : undefined, limit: 50, offset: 0,
      })
      setInventory(inventoryData.items)
      setMovementHistory(movementData?.items ?? [])
      setAllProducts(productData.items)
      setProducts(productData.items.filter((product) => product.isActive))

      setMovementProduct((current) => {
        if (current && productData.items.some((product) => product.id === Number(current) && product.isActive)) {
          return current
        }

        const firstActive = productData.items.find((product) => product.isActive)
        return firstActive ? String(firstActive.id) : ''
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el inventario.',
      )
    } finally {
      setLoading(false)
    }
  }, [
    search,
    validSelectedStore,
    isEmployee,
    setLoading,
    setError,
    setInventory,
    setProducts,
    setAllProducts,
    setMovementProduct,
    setMovementHistory,
  ])

  useEffect(() => {
    // Ejecuta la carga después de que termine el cuerpo sincrónico del efecto.
    void Promise.resolve().then(loadData)
  }, [loadData])

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const parsedPrice = Number(price)

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('El precio debe ser un número igual o mayor que cero.')
      return
    }

    setSaving(true)

    try {
      await managementApi.createProduct({
        name: productName.trim(),
        category: category.trim(),
        unit,
        priceCents: Math.round(parsedPrice * 100),
        ...(sku.trim() ? { sku: sku.trim() } : {}),
      })

      setProductName('')
      setCategory('')
      setSku('')
      setPrice('0')
      setSuccess('Producto creado. Registrá un ingreso para agregarle stock.')

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el producto.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function registerMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const productId = Number(movementProduct)
    const storeId = Number(validSelectedStore)
    const amount = Number(quantity)

    if (!Number.isInteger(productId) || productId <= 0) {
      setError('Seleccioná un producto.')
      return
    }

    if (!Number.isInteger(storeId) || storeId <= 0) {
      setError('Seleccioná una sucursal.')
      return
    }

    if (movementType !== 'adjustment' && (!Number.isFinite(amount) || amount <= 0)) {
      setError('La cantidad debe ser mayor que cero.')
      return
    }

    const decimals = (quantity.split('.')[1] ?? '').length
    const allowedDecimals = Number(quantityStep.split('.')[1]?.length ?? 0)
    if (decimals > allowedDecimals) {
      setError(`La cantidad admite como máximo ${allowedDecimals} decimales para esta unidad.`)
      return
    }

    if (reason === 'other' && !movementNote.trim()) {
      setError('Agregá una observación cuando el motivo es “Otro”.')
      return
    }

    const productRow = inventory.find(
      (row) => row.product.id === productId,
    )

    const storeStock = productRow?.stores.find(
      (store) => store.storeId === storeId,
    )

    if (movementType === 'out' && amount > (storeStock?.quantity ?? 0)) {
      setError(
        `No hay stock suficiente. Existencia: ${storeStock?.quantity ?? 0}.`,
      )
      return
    }

    setSaving(true)

    try {
      const counted = Number(countedQuantity)
      if (movementType === 'adjustment' && (!Number.isFinite(counted) || counted < 0)) {
        setError('El stock contado debe ser cero o mayor.')
        return
      }
      if (movementType === 'adjustment' && !movementNote.trim()) {
        setError('Agregá una observación para justificar el ajuste.')
        return
      }
      await managementApi.createMovement({
        productId, storeId, type: movementType, reason,
        ...(movementType === 'adjustment' ? { countedQuantity: counted } : { quantity: amount }),
        ...(movementNote.trim() ? { note: movementNote.trim() } : {}),
      })

      setQuantity('1')
      setMovementNote('')
      setSuccess(
        movementType === 'in'
          ? 'Ingreso registrado correctamente.'
          : movementType === 'out'
            ? 'Egreso registrado correctamente.'
            : 'Ajuste de inventario registrado correctamente.',
      )

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el movimiento.',
      )
    } finally {
      setSaving(false)
    }
  }

  function beginRenameProduct(product: ProductRecord) {
    setEditingProductId(product.id)
    setEditingProductName(product.name)
    setError('')
    setSuccess('')
  }

  function cancelRenameProduct() {
    setEditingProductId(null)
    setEditingProductName('')
  }

  async function renameProduct(event: FormEvent<HTMLFormElement>, product: ProductRecord) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const name = editingProductName.trim()
    if (!name) {
      setError('El nombre del producto no puede estar vacío.')
      return
    }
    if (name.length > 150) {
      setError('El nombre no puede superar los 150 caracteres.')
      return
    }
    if (name === product.name) {
      cancelRenameProduct()
      return
    }

    setSaving(true)
    try {
      const updatedProduct = await managementApi.updateProduct(product.id, { name })

      setAllProducts((current) =>
        current.map((item) => item.id === product.id ? updatedProduct : item),
      )
      setProducts((current) =>
        current.map((item) => item.id === product.id ? updatedProduct : item),
      )
      setInventory((current) =>
        current.map((row) =>
          row.product.id === product.id
            ? { ...row, product: updatedProduct }
            : row,
        ),
      )
      setEditingProductId(null)
      setEditingProductName('')
      setSuccess(`El producto se renombró a "${updatedProduct.name}".`)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el nombre del producto.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleProductStatus(product: ProductRecord) {
    const nextIsActive = !product.isActive
    const action = nextIsActive ? 'activar' : 'desactivar'

    const confirmed = window.confirm(
      `¿Querés ${action} el producto "${product.name}" en todo el sistema?`,
    )
    if (!confirmed) return

    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await managementApi.updateProduct(product.id, {
        isActive: nextIsActive,
      })

      setSuccess(
        nextIsActive
          ? `El producto "${product.name}" fue activado.`
          : `El producto "${product.name}" fue desactivado en todo el sistema.`,
      )
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `No se pudo ${action} el producto.`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function saveMinimum(productId: number, storeId: number) {
    const key = `${productId}-${storeId}`
    const rawValue = minimumDrafts[key]
    const minQuantity = Number(rawValue)

    if (rawValue === undefined || rawValue.trim() === '' || !Number.isFinite(minQuantity) || minQuantity < 0) {
      setError('El stock mínimo debe ser un número igual o mayor que cero.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await managementApi.setMinimum(productId, storeId, minQuantity)
      setSuccess('Stock mínimo actualizado correctamente.')
      setMinimumDrafts((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el stock mínimo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="management-section">
      <div className="section-heading">
        <div>
          <h3>Stock e inventario</h3>
          <p>
            Consultá existencias por sucursal, creá productos y registrá
            ingresos o egresos.
          </p>
        </div>
      </div>

      {error && <p className="notice notice-error">{error}</p>}
      {success && <p className="notice notice-success">{success}</p>}

      <div className="stock-toolbar">
        <label>
          Sucursal
          <select
            value={validSelectedStore}
            onChange={(event) => setSelectedStore(event.target.value)}
            required
          >
            <option value="">Seleccioná una sucursal</option>
            {activeStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Buscar producto
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre o código"
          />
        </label>
      </div>

      {activeStores.length === 0 && (
        <p className="empty-state">
          No hay sucursales activas. Creá o activá una sucursal antes de operar.
        </p>
      )}

      <div className="stock-forms">
        {!isEmployee && <form className="management-form" onSubmit={createProduct}>
          <h4>Agregar producto</h4>

          <label>Nombre</label>
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            maxLength={150}
            required
          />

          <label>Categoría</label>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={100}
            required
          />

          <label>Unidad</label>
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as Unit)}
          >
            {units.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label>Precio unitario ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />

          <label>SKU (opcional)</label>
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            maxLength={64}
          />

          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear producto'}
          </button>
        </form>}

        <form className="management-form" onSubmit={registerMovement}>
          <h4>Registrar movimiento</h4>

          <label>Producto</label>
          <select
            value={movementProduct}
            onChange={(event) => setMovementProduct(event.target.value)}
            required
          >
            <option value="">Seleccioná un producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>

          <label>Operación</label>
          <select
            value={movementType}
            onChange={(event) => {
              const type = event.target.value as 'in' | 'out' | 'adjustment'
              setMovementType(type)
              setReason(type === 'in' ? 'purchase' : type === 'out' ? 'sale' : 'correction')
            }}
          >
            <option value="in">Ingreso</option>
            <option value="out">Egreso</option>
            {canAdjustStock && <option value="adjustment">Ajuste de inventario</option>}
          </select>

          <label>Motivo</label>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          >
            {movementType === 'in' ? (
              <><option value="purchase">Compra</option><option value="customer_return">Devolución de cliente</option><option value="other">Otro</option></>
            ) : movementType === 'out' ? (
              <><option value="sale">Venta</option><option value="damage">Rotura</option><option value="loss">Pérdida</option><option value="other">Otro</option></>
            ) : (
              <><option value="count">Conteo físico</option><option value="correction">Corrección de inventario</option></>
            )}
          </select>

          {movementType === 'adjustment' ? <>
            <label>Stock contado ({selectedProduct?.unit ?? 'unidad'})</label>
            <input type="number" min="0" step={quantityStep} value={countedQuantity} onChange={event => setCountedQuantity(event.target.value)} required />
          </> : <>
            <label>Cantidad ({selectedProduct?.unit ?? 'unidad'})</label>
            <input type="number" min={quantityStep} step={quantityStep} value={quantity} onChange={event => setQuantity(event.target.value)} required />
          </>}

          {(reason === 'other' || reason === 'correction' || movementType === 'adjustment') && (
            <>
              <label htmlFor="movement-note">Observación</label>
              <textarea
                id="movement-note"
                value={movementNote}
                onChange={(event) => setMovementNote(event.target.value)}
                maxLength={255}
                rows={3}
                required
                placeholder="Describí el motivo del movimiento"
              />
            </>
          )}

          <p className="form-help">
            Existencia en esta sucursal:{' '}
            <strong>{productRowQuantity(inventory, movementProduct, validSelectedStore)}</strong>
          </p>

          <button
            type="submit"
            disabled={saving || !validSelectedStore || !movementProduct}
          >
            {saving ? 'Registrando...' : 'Registrar movimiento'}
          </button>
        </form>
      </div>

      <div className="stock-table-wrap">
        <h4>Existencias por sucursal</h4>

        {loading ? (
          <p className="empty-state">Cargando stock...</p>
        ) : inventory.length === 0 ? (
          <p className="empty-state">No hay productos para mostrar.</p>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Código</th>
                <th>Sucursal</th>
                <th>Stock</th>
                <th>Mínimo</th>
              </tr>
            </thead>

            <tbody>
              {inventory.flatMap((row) =>
                row.stores
                  .filter(
                    (store) =>
                      !validSelectedStore || String(store.storeId) === validSelectedStore,
                  )
                  .map((store) => (
                    <tr key={`${row.product.id}-${store.storeId}`}>
                      <td>{row.product.name}</td>
                      <td>{row.product.sku || row.product.barcode || '—'}</td>
                      <td>{store.storeName}</td>
                      <td>
                        {store.quantity} {row.product.unit}
                      </td>
                      <td><div className="minimum-editor">
                        <input aria-label={`Mínimo de ${row.product.name} en ${store.storeName}`} type="number" min="0" step="0.001" value={minimumDrafts[`${row.product.id}-${store.storeId}`] ?? String(store.minQuantity)} onChange={event => setMinimumDrafts(current => ({ ...current, [`${row.product.id}-${store.storeId}`]: event.target.value }))} />
                        <button type="button" className="secondary-button" disabled={saving} onClick={() => void saveMinimum(row.product.id, store.storeId)}>Guardar</button>
                      </div></td>
                    </tr>
                  )),
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="stock-table-wrap">
        <h4>Historial de movimientos</h4>
        <p className="form-help">
          Últimos 50 movimientos{validSelectedStore ? ' de la sucursal seleccionada' : ' de todas las sucursales'}.
        </p>

        {loading ? (
          <p className="empty-state">Cargando movimientos...</p>
        ) : movementHistory.length === 0 ? (
          <p className="empty-state">No hay movimientos para mostrar.</p>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Sucursal</th>
                <th>Tipo</th>
                <th>Motivo</th>
                <th>Cantidad</th>
                <th>Stock resultante</th>
                <th>Usuario</th>
                <th>Observación</th>
              </tr>
            </thead>
            <tbody>
              {movementHistory.map((movement) => (
                <tr key={movement.id}>
                  <td>{formatMovementDate(movement.createdAt)}</td>
                  <td>{movement.product?.name ?? `Producto #${movement.productId}`}</td>
                  <td>{movement.store?.name ?? `Sucursal #${movement.storeId}`}</td>
                  <td>{movement.type === 'in' ? 'Ingreso' : movement.type === 'out' ? 'Egreso' : 'Ajuste'}</td>
                  <td>{formatMovementReason(movement.reason)}</td>
                  <td>{movement.quantity} {movement.product?.unit ?? ''}</td>
                  <td>{movement.resultingQuantity} {movement.product?.unit ?? ''}</td>
                  <td>{movement.user?.email ?? `Usuario #${movement.userId}`}</td>
                  <td>{movement.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isEmployee && <div className="stock-table-wrap">
        <h4>Administrar productos</h4>
        {allProducts.length === 0 ? (
          <p className="empty-state">No hay productos para administrar.</p>
        ) : (
          <table className="stock-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Renombrar</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((product) => (
                <tr key={product.id}>
                  <td>
                    {editingProductId === product.id ? (
                      <form onSubmit={(event) => void renameProduct(event, product)}>
                        <input
                          aria-label={`Nuevo nombre para ${product.name}`}
                          value={editingProductName}
                          onChange={(event) => setEditingProductName(event.target.value)}
                          maxLength={150}
                          required
                          autoFocus
                        />
                        <button type="submit" disabled={saving}>
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button type="button" disabled={saving} onClick={cancelRenameProduct}>
                          Cancelar
                        </button>
                      </form>
                    ) : (
                      product.name
                    )}
                  </td>
                  <td>{product.category}</td>
                  <td>
                    {editingProductId !== product.id && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => beginRenameProduct(product)}
                      >
                        Renombrar
                      </button>
                    )}
                  </td>
                  <td>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                    {' '}
                    <button
                      type="button"
                      disabled={saving || editingProductId === product.id}
                      onClick={() => void toggleProductStatus(product)}
                    >
                      {product.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>}
    </section>
  )
}

function productRowQuantity(
  inventory: InventoryRow[],
  productId: string,
  storeId: string,
): string {
  const row = inventory.find((item) => item.product.id === Number(productId))
  const store = row?.stores.find((item) => String(item.storeId) === storeId)

  return store ? `${store.quantity} ${row?.product.unit ?? ''}` : '0'
}
function formatMovementDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatMovementReason(reason: string): string {
  const labels: Record<string, string> = {
    purchase: 'Compra',
    customer_return: 'Devolución de cliente',
    sale: 'Venta',
    damage: 'Rotura',
    loss: 'Pérdida',
    other: 'Otro',
  }
  return labels[reason] ?? reason
}
