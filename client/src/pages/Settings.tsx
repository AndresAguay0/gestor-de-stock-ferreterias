import { useEffect, useState, type FormEvent } from 'react'
import { managementApi, type SettingsRecord } from '../api/management.api'

export default function Settings() {
  const [businessName,setBusinessName]=useState('')
  const [minutes,setMinutes]=useState('30')
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  useEffect(()=>{
    let cancelled=false
    managementApi.settings().then(data=>{
      if(cancelled)return
      setBusinessName(data.businessName??'')
      setMinutes(String(data.reservationDefaultMinutes))
    }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'No se pudo cargar la configuración.')})
      .finally(()=>{if(!cancelled)setLoading(false)})
    return()=>{cancelled=true}
  },[])
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    const parsed=Number(minutes)
    if(!Number.isInteger(parsed)||parsed<1){setError('La duración debe ser un entero mayor que cero.');return}
    setSaving(true);setError('');setSuccess('')
    try{
      const updated:SettingsRecord=await managementApi.updateSettings({businessName:businessName.trim()||null,reservationDefaultMinutes:parsed})
      setBusinessName(updated.businessName??'');setMinutes(String(updated.reservationDefaultMinutes));setSuccess('Configuración guardada.')
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la configuración.')}
    finally{setSaving(false)}
  }
  return <section className="management-section">
    <div className="section-heading"><div><h3>Configuración general</h3><p>Configuración del negocio y valores predeterminados.</p></div></div>
    {error&&<p className="notice notice-error">{error}</p>}{success&&<p className="notice notice-success">{success}</p>}
    {loading?<p className="empty-state">Cargando configuración…</p>:<form className="management-form" onSubmit={save}>
      <label>Nombre del negocio</label><input value={businessName} onChange={e=>setBusinessName(e.target.value)} maxLength={150}/>
      <label>Duración predeterminada de reservas (minutos)</label><input type="number" min="1" step="1" value={minutes} onChange={e=>setMinutes(e.target.value)} required/>
      <button type="submit" disabled={saving}>{saving?'Guardando…':'Guardar configuración'}</button>
    </form>}
  </section>
}
