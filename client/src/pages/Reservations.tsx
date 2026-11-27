import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { managementApi, type ReservationRecord, type StoreRecord, type ProductRecord } from '../api/management.api'

interface Props { stores: StoreRecord[] }

export default function Reservations({ stores }: Props) {
  const activeStores = stores.filter(s => s.isActive)
  const [items, setItems] = useState<ReservationRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [storeId, setStoreId] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [minutes, setMinutes] = useState('30')
  const [customerNote, setCustomerNote] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reservations, productPage] = await Promise.all([
        managementApi.reservations({ storeId: storeId ? Number(storeId) : undefined, status: status || undefined, limit: 100 }),
        managementApi.products({ limit: 100 }),
      ])
      setItems(reservations.items)
      setProducts(productPage.items.filter(p => p.isActive))
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las reservas.') }
    finally { setLoading(false) }
  }, [storeId, status])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = Number(quantity), m = Number(minutes)
    if (!storeId || !productId || !Number.isFinite(q) || q <= 0 || !Number.isInteger(q)) {
      setError('Seleccioná sucursal y producto, e ingresá una cantidad entera mayor que cero.')
      return
    }
    if (!Number.isInteger(m) || m < 1) { setError('La duración debe ser un número entero mayor que cero.'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      await managementApi.createReservation({ storeId: Number(storeId), productId: Number(productId), quantity: q, minutes: m, ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {}) })
      setQuantity('1'); setCustomerNote('')
      setSuccess('Reserva creada correctamente.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la reserva.') }
    finally { setSaving(false) }
  }

  async function update(id: number, action: 'cancel' | 'pickup') {
    setSaving(true); setError(''); setSuccess('')
    try {
      if (action === 'cancel') await managementApi.cancelReservation(id)
      else await managementApi.pickupReservation(id)
      setSuccess(action === 'cancel' ? 'Reserva cancelada.' : 'Reserva retirada.')
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo actualizar la reserva.') }
    finally { setSaving(false) }
  }

  return <section className="management-section">
    <div className="section-heading"><div><h3>Reservas</h3><p>Creá, consultá, cancelá y registrá el retiro de reservas.</p></div></div>
    {error && <p className="notice notice-error">{error}</p>}{success && <p className="notice notice-success">{success}</p>}
    <form className="management-form" onSubmit={create}>
      <h4>Nueva reserva</h4>
      <label>Sucursal</label><select value={storeId} onChange={e=>setStoreId(e.target.value)} required><option value="">Seleccioná sucursal</option>{activeStores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <label>Producto</label><select value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">Seleccioná producto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <label>Cantidad</label><input type="number" min="1" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)} required/>
      <label>Duración (minutos)</label><input type="number" min="1" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)} required/>
      <label>Nota del cliente (opcional)</label><textarea value={customerNote} onChange={e=>setCustomerNote(e.target.value)} maxLength={255}/>
      <button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear reserva'}</button>
    </form>
    <div className="stock-toolbar">
      <label>Sucursal <select value={storeId} onChange={e=>setStoreId(e.target.value)}><option value="">Todas</option>{activeStores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Estado <select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{['active','cancelled','picked_up','expired'].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    </div>
    {loading ? <p className="empty-state">Cargando reservas…</p> : items.length===0 ? <p className="empty-state">No hay reservas para mostrar.</p> :
      <div className="management-grid">{items.map(r=><article className="management-card" key={r.id}>
        <div className="management-card-heading"><h4>Reserva #{r.id}</h4><span className="role-badge">{r.status}</span></div>
        <p><strong>Producto:</strong> {r.product?.name ?? `#${r.productId}`}</p><p><strong>Sucursal:</strong> {r.store?.name ?? `#${r.storeId}`}</p>
        <p><strong>Cantidad:</strong> {r.quantity} {r.product?.unit ?? ''}</p><p><strong>Vence:</strong> {new Date(r.expiresAt).toLocaleString()}</p>{r.customerNote && <p>{r.customerNote}</p>}
        {r.status === 'active' && <div><button type="button" className="secondary-button" disabled={saving} onClick={()=>void update(r.id,'pickup')}>Marcar retirada</button> <button type="button" className="secondary-button" disabled={saving} onClick={()=>void update(r.id,'cancel')}>Cancelar</button></div>}
      </article>)}</div>}
  </section>
}
