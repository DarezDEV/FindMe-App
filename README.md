# FindMe System

Plataforma web full-stack para reportar, gestionar y dar seguimiento a casos de personas desaparecidas. Desarrollada como proyecto final de curso.

---

## Descripción

FindMe conecta a ciudadanos, autoridades y administradores en un sistema estructurado donde cada caso pasa por un flujo de revisión y moderación antes de ser publicado. El objetivo es reemplazar el caos de grupos de WhatsApp y publicaciones desordenadas en redes sociales con una plataforma trazable y segura.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| Estilos | Tailwind CSS v4 |
| Backend / DB | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (OTP por correo, PKCE) |
| Storage | Supabase Storage |
| Serverless | Supabase Edge Functions (Deno) |
| Íconos | Lucide React |
| Estado servidor | TanStack React Query |
| PDF / Póster | jsPDF + html2canvas |

---

## Roles del sistema

### 👤 Usuario (ciudadano)
- Registrarse con verificación OTP por correo
- Publicar reportes de personas desaparecidas (formulario multi-paso)
- Ver y gestionar sus propios casos
- Enviar avistamientos sobre casos activos
- Descargar póster del caso en PDF
- Reportar contenido inapropiado

### 👮 Autoridad
- Revisar y aprobar/rechazar casos pendientes
- Gestionar avistamientos (validar o rechazar)
- Actualizar el estado de los casos (encontrado, cerrado)
- Ver datos de contacto privados de los reportantes

### 🛠 Administrador
- Crear y gestionar usuarios del sistema
- Asignar y modificar roles
- Supervisar todos los casos desde un panel centralizado
- Ver estadísticas generales del sistema

---

## Flujo de un caso

```
Usuario publica → [Pendiente] → Autoridad revisa
                                    ↓              ↓
                               [Aprobado]      [Rechazado]
                               (visible al público)
                                    ↓
                              [Encontrado]
                                    ↓
                               [Cerrado]
```

---

## Arquitectura del proyecto

```
src/
├── app/
│   ├── router/          # Rutas, ProtectedRoute, RoleRoute, GuestRoute
│   └── providers/       # AuthProvider (contexto global de sesión)
├── lib/
│   └── supabase/        # client, auth, db, storage
├── features/
│   ├── auth/            # Login, Registro, OTP, Recuperación de contraseña
│   ├── user/            # Dashboard, MisCasos, PublicarCaso, Avistamientos
│   ├── authority/       # Dashboard, Casos, Avistamientos, Revisión pendiente
│   ├── admin/           # Dashboard, Usuarios, Casos, Avistamientos, Configuración
│   └── public/          # Landing page, Casos públicos
├── shared/
│   ├── components/ui/   # Spinner, Alert, RoleBadge, StatusBadge, Toast
│   ├── hooks/           # useUsers
│   ├── utils/           # api, storage, interceptors
│   └── constants/       # roles.ts
└── main.tsx
```

---

## Base de datos (Supabase)

### Tablas principales
- `profiles` — datos de perfil de cada usuario
- `roles` — catálogo de roles (`user`, `authority`, `admin`)
- `user_roles` — relación usuarios↔roles
- `cases` — casos de personas desaparecidas
- `persons` — datos de la persona desaparecida (vinculada al caso)
- `caso_media` — fotos y videos adjuntos a cada caso
- `case_sightings` — avistamientos reportados por usuarios
- `cases_closed` — registro de cierre de casos con nota y responsable

### Seguridad
- Row Level Security (RLS) activa en todas las tablas de datos
- La gestión de usuarios con roles privilegiados se realiza exclusivamente desde una Edge Function con `service_role`, nunca desde el cliente
- Los datos de contacto de los reportantes solo son visibles para autoridades autorizadas

---

## Variables de entorno

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

---

## Cómo ejecutar el proyecto

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

---

## Equipo

Proyecto académico desarrollado como entrega final del curso.
