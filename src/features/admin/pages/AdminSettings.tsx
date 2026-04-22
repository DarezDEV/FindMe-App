import AdminSidebar from '../components/Adminsidebar'
import { Shield, Users, FileSearch, Database, Globe, Lock, Bell, Info } from 'lucide-react'

const SYSTEM_INFO = [
  { label: 'Nombre del sistema', value: 'FindMe System' },
  { label: 'Versión', value: '1.0.0' },
  { label: 'Entorno', value: 'Producción' },
  { label: 'Base de datos', value: 'Supabase (PostgreSQL)' },
  { label: 'Autenticación', value: 'Supabase Auth con OTP por correo' },
  { label: 'Almacenamiento', value: 'Supabase Storage (casos-media, avatars)' },
]

const ROLES_INFO = [
  {
    icon: Users,
    name: 'Usuario',
    color: 'text-info bg-info/10 border-info/20',
    desc: 'Puede registrarse, publicar casos de personas desaparecidas, enviar avistamientos y gestionar sus propios reportes.',
    permisos: ['Crear y ver sus casos', 'Enviar avistamientos', 'Descargar poster del caso', 'Reportar contenido inapropiado'],
  },
  {
    icon: Shield,
    name: 'Autoridad',
    color: 'text-warning bg-warning/10 border-warning/20',
    desc: 'Revisa y valida casos antes de publicarlos, gestiona avistamientos y puede actualizar el estado de los casos.',
    permisos: ['Aprobar o rechazar casos', 'Validar avistamientos', 'Cerrar y resolver casos', 'Ver datos de contacto privados'],
  },
  {
    icon: Lock,
    name: 'Administrador',
    color: 'text-primary bg-primary-soft border-primary/20',
    desc: 'Control total de la plataforma: gestión de usuarios, roles, supervisión de todos los casos y configuración del sistema.',
    permisos: ['Crear y gestionar usuarios', 'Asignar y modificar roles', 'Supervisar todos los casos', 'Acceso a panel de revisión'],
  },
]

const SECURITY_INFO = [
  { icon: Lock, title: 'Autenticación segura', desc: 'Login con email + contraseña y verificación OTP de 6 dígitos al registrarse. Recuperación de contraseña con flujo PKCE.' },
  { icon: Shield, title: 'Row Level Security', desc: 'Cada tabla en Supabase tiene políticas RLS activas. Los usuarios solo acceden a sus propios datos.' },
  { icon: Database, title: 'Moderación de casos', desc: 'Ningún caso se publica sin revisión de una autoridad. Workflow: pendiente → aprobado / rechazado → encontrado / cerrado.' },
  { icon: Globe, title: 'Edge Functions seguras', desc: 'La creación de usuarios con roles especiales se procesa en servidor mediante Supabase Edge Functions, nunca desde el cliente.' },
]

export default function AdminSettings() {
  return (
    <AdminSidebar>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          <div>
            <h1 className="text-2xl font-bold text-text-primary">Configuración del sistema</h1>
            <p className="text-sm text-text-secondary mt-1">
              Información general, roles y políticas de seguridad de FindMe System.
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-text-primary">Información del sistema</h2>
            </div>
            <div className="divide-y divide-border">
              {SYSTEM_INFO.map(({ label, value }) => (
                <div key={label} className="flex justify-between py-3 text-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className="text-text-primary font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-text-primary">Roles del sistema</h2>
            </div>
            <div className="space-y-4">
              {ROLES_INFO.map(({ icon: Icon, name, color, desc, permisos }) => (
                <div key={name} className="border border-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
                      <Icon size={12} />
                      {name}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3">{desc}</p>
                  <ul className="grid grid-cols-2 gap-1">
                    {permisos.map((p) => (
                      <li key={p} className="text-xs text-text-secondary flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-text-primary">Seguridad y políticas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SECURITY_INFO.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3 p-4 bg-background rounded-xl border border-border">
                  <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-text-primary mb-1">{title}</div>
                    <div className="text-xs text-text-secondary leading-relaxed">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileSearch size={18} className="text-primary" />
              <h2 className="text-base font-semibold text-text-primary">Flujo de estados de un caso</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                { label: 'Pendiente', color: 'bg-warning/10 text-warning border-warning/20' },
                { arrow: true },
                { label: 'Aprobado', color: 'bg-info/10 text-info border-info/20' },
                { arrow: true },
                { label: 'Encontrado', color: 'bg-success/10 text-success border-success/20' },
                { arrow: true },
                { label: 'Cerrado', color: 'bg-border text-text-secondary border-border' },
              ].map((item, i) =>
                'arrow' in item ? (
                  <span key={i} className="text-text-secondary">→</span>
                ) : (
                  <span key={i} className={`px-3 py-1 rounded-full text-xs font-semibold border ${item.color}`}>
                    {item.label}
                  </span>
                )
              )}
              <span className="text-text-secondary mx-1">|</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-error/10 text-error border-error/20">
                Rechazado
              </span>
              <span className="text-xs text-text-secondary">(desde Pendiente)</span>
            </div>
            <p className="text-xs text-text-secondary mt-3">
              Los casos inician como <strong>Pendiente</strong> y solo son visibles al público una vez que una autoridad los <strong>Aprueba</strong>. El estado <strong>Rechazado</strong> permite al usuario corregir el reporte y volver a enviarlo.
            </p>
          </div>

          <div className="card p-6 opacity-60">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={18} className="text-text-secondary" />
              <h2 className="text-base font-semibold text-text-primary">Notificaciones del sistema</h2>
              <span className="text-xs px-2 py-0.5 bg-border rounded-full text-text-secondary ml-auto">Próximamente</span>
            </div>
            <p className="text-sm text-text-secondary">
              Configuración de alertas automáticas por correo para autoridades cuando hay nuevos casos pendientes de revisión.
            </p>
          </div>

        </div>
      </div>
    </AdminSidebar>
  )
}

