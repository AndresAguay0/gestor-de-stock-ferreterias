import { useCallback, useEffect, useState } from 'react'
import { managementApi, type NotificationRecord } from '../api/management.api'

export default function Notifications() {
  const [items,setItems]=useState<NotificationRecord[]>([])
  const [unread,setUnread]=useState(0)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [saving,setSaving]=useState(false)
  const load=useCallback(async()=>{
    setLoading(true)
    try {
      const [page,count]=await Promise.all([managementApi.notifications({limit:100}),managementApi.unreadNotificationCount()])
      setItems(page.items);setUnread(count.count);setError('')
    } catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar las notificaciones.')}
    finally{setLoading(false)}
  },[])
  useEffect(()=>{ void Promise.resolve().then(load) },[load])
  async function mark(id:number){
    setSaving(true);setError('')
    try{await managementApi.markNotificationRead(id);await load()}
    catch(e){setError(e instanceof Error?e.message:'No se pudo marcar como leída.')}
    finally{setSaving(false)}
  }
  async function markAll(){
    setSaving(true);setError('')
    try{await managementApi.markAllNotificationsRead();await load()}
    catch(e){setError(e instanceof Error?e.message:'No se pudieron marcar como leídas.')}
    finally{setSaving(false)}
  }
  return <section className="management-section">
    <div className="section-heading"><div><h3>Notificaciones</h3><p>{unread} sin leer</p></div><button type="button" className="secondary-button" disabled={saving||unread===0} onClick={()=>void markAll()}>Marcar todas como leídas</button></div>
    {error&&<p className="notice notice-error">{error}</p>}
    {loading?<p className="empty-state">Cargando notificaciones…</p>:items.length===0?<p className="empty-state">No hay notificaciones.</p>:
      <div className="management-grid">{items.map(n=><article className="management-card" key={n.id}>
        <div className="management-card-heading"><h4>{n.product?.name??`Producto #${n.productId}`}</h4><span className={n.readAt?'status-inactive':'status-active'}>{n.readAt?'Leída':'Sin leer'}</span></div>
        <p>{n.store?.name??`Sucursal #${n.storeId}`}</p><p>Stock: {n.quantity} {n.product?.unit??''} · Mínimo: {n.minQuantity}</p><p>{new Date(n.createdAt).toLocaleString()}</p>
        {!n.readAt&&<button type="button" className="secondary-button" disabled={saving} onClick={()=>void mark(n.id)}>Marcar como leída</button>}
      </article>)}</div>}
  </section>
}
