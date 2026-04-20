# FindMe - Sistema de Gestión de Personas Desaparecidas

![FindMe Logo](https://via.placeholder.com/150x50?text=FindMe)  
*Plataforma tecnológica para la gestión y búsqueda de personas desaparecidas*

---

## 📋 Descripción del Proyecto

**FindMe** es una plataforma web desarrollada en **React 19** con **TypeScript** que permite a usuarios comunes y autoridades gestionar casos de personas desaparecidas en República Dominicana.

El sistema facilita el reporte de casos, la gestión de avistamientos y la colaboración entre familiares y autoridades para aumentar las probabilidades de localización.

### Objetivo Principal
Brindar una herramienta centralizada que conecte a familiares de personas desaparecidas con autoridades competentes, permitiendo el reporte inmediato y seguimiento de casos de manera eficiente y organizada.

### Problema que Resuelve
- Dificultad para reportar personas desaparecidas
- Falta de comunicación entre familias y autoridades
- Descoordinación en el seguimiento de casos
- Necesidad de visibilidad controlada de información sensible

---

## 🛠 Tecnologías Utilizadas

### Frontend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| React | 19 | Biblioteca de interfaz de usuario |
| TypeScript | ^5 | Tipado estático |
| Vite | ^6 | Herramienta de build |
| Tailwind CSS | v4 | Framework de estilos |
| TanStack Query | ^5 | Gestión de estado asíncrono |
| React Router | v7 | Enrutamiento |

### Backend
| Tecnología | Descripción |
|------------|-------------|
| Supabase | Backend como servicio (BaaS) |
| PostgreSQL | Base de datos relacional |
| Supabase Auth | Autenticación de usuarios |
| Supabase Realtime | Notificaciones en tiempo real |
| Supabase Storage | Almacenamiento de archivos |

### Herramientas de Desarrollo
| Tecnología | Propósito |
|------------|----------|
| ESLint | Linting de código |
| TypeScript Compiler | Verificación de tipos |
| Git | Control de versiones |

---

## ✨ Características del Sistema

### 👤 Gestión de Usuarios
- **Registro de usuarios** con validación de correo electrónico
- **Inicio de sesión** seguro mediante Supabase Auth
- **Perfiles de usuario** con información personal y avatar
- **Recuperación de contraseña** por correo electrónico

### 🔐 Sistema de Roles
- **Usuario común**: Puede reportar casos, ver sus propios casos, reportar avistamientos
- **Autoridad**: Gestionar casos, aprobar/rechazar reportes, cerrar casos
- **Administrador**: Dashboard completo, reportes, gestión de usuarios

### 📝 Gestión de Casos
- **Crear caso de persona desaparecida** con múlti fotos y videos
- **Editar información** del caso
- **Seguimiento del estado** (pendiente, aprobado, rechazado, encontrado, cerrado)
- **Comentarios** en cada caso

### 📍 Avistamientos
- Reportar avistamientos de personas
- Vincular avistamientos a casos existentes
- Registro de ubicación y circunstancias

### 🔔 Sistema de Notificaciones
- **Notificaciones in-app** en tiempo real
- **Notificaciones push** via Web Push API
- **Badge de notificaciones** sin leer
- **Dropdown de notificaciones** con historial

### 📊 Dashboards
- **Dashboard de Usuario**: Mis casos reportados, estadísticas
- **Dashboard de Autoridad**: Casos pendientes, casos resueltos, avistamientos
- **Dashboard de Administrador**: Métricas completas, reportes, gestión

### 📄 Generación de Reportes
- Reportes en formato **PDF**
- Filtros por fecha, estado, ciudad
- Métricas y estadísticas visuales

---

## 📌 Requisitos del Sistema

### Software Necesario
- **Node.js** versión 18 o superior
- **npm** versión 9 o superior
- **Git** para control de versiones

### Navegadores Soportados
- Google Chrome (versión 90+)
- Mozilla Firefox (versión 88+)
- Microsoft Edge (versión 90+)
- Safari (versión 14+)

### Otros Requisitos
- Conexión a Internet para Supabase
- Cuenta en [Supabase](https://supabase.com) (gratis)

---

## 🚀 Instalación del Proyecto

### 1. Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/findme-app.git
cd findme-app
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase - Credenciales del proyecto
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# (Opcional) Bucket de storage
VITE_CASES_BUCKET=casos-media
```

### 4. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 📂 Estructura del Proyecto

```
findme-app/
├── public/                    # Archivos estáticos públicos
│   └── sw.js                 # Service Worker para Push
├── src/
│   ├── app/                 # Componentes de nivel app
│   │   ├── components/       # Componentes globales
│   │   ├── providers/       # Context providers
│   │   └── router/         # Definición de rutas
│   ├── features/           # Módulos por característica
│   │   ├── admin/         # Panel de administrador
│   │   ├── authority/    # Panel de autoridad
│   │   ├── auth/         # Autenticación
│   │   ├── cases/        # Gestión de casos
│   │   ├── notifications/# Sistema de notificaciones
│   │   ├── public/       # Páginas públicas
│   │   └── user/        # Panel de usuario
│   ├── lib/
│   │   └── supabase/    # Cliente Supabase
│   └── shared/
│       ├── components/   # Componentes compartidos
│       ├── constants/   # Constantes de la app
│       ├── hooks/       # Hooks personalizados
│       └── utils/       # Utilidades
├── supabase/
│   ├── functions/        # Edge Functions
│   ├── migrations/      # Migraciones SQL
│   └── config.toml     # Configuración Supabase
└── index.html          # Punto de entrada
```

### Descripción de Carpetas Clave

| Carpeta | Descripción |
|--------|-------------|
| `src/app/` | Configuración global de la aplicación |
| `src/features/` | Módulos de funcionalidad por rol |
| `src/lib/supabase/` | Cliente e integración con Supabase |
| `src/shared/` | Código reutilizable |
| `supabase/` | Recursos de backend (functions, DB) |

---

## 📖 Uso del Sistema

### Flujo de Usuario Común

1. **Registro/Login**
   - Usuario se registra o inicia sesión
   - Recibe correo de verificación (primer uso)

2. **Reportar Caso**
   - Navega a "Publicar Persona Perdida"
   - Completa datos de la persona
   - Sube fotos/videos
   - Proporciona ubicación y circunstancias
   - Envía para revisión

3. **Seguimiento**
   - Ve el estado en "Mis Casos"
   - Recibe notificaciones por actualizaciones
   - Puede agregar comentarios

### Flujo de Autoridad

1. **Login** con credenciales de autoridad
2. **Revisar casos pendientes** en panel de revisión
3. **Aprobar o rechazar** casos con nota
4. **Gestionar avistamientos** recibidos
5. **Marcar casos** como encontrados/cerrados

### Flujo de Administrador

1. **Dashboard** con métricas completas
2. **Gestionar usuarios** y roles
3. **Generar reportes** en PDF
4. **Monitorear actividad** del sistema

---

## 🔑 Credenciales de Prueba

### Cuenta de Administrador
```
Correo: admin@test.com
Contraseña: 123456
```

### Cuenta de Autoridad
```
Correo: autoridad@test.com
Contraseña: 123456
```

### Cuenta de Usuario
```
Correo: usuario@test.com
Contraseña: 123456
```

> **Nota**: Estas credenciales son para pruebas. En producción, configúralas en Supabase Dashboard → Authentication → Users.

---

## 🔌 API Utilizada: Supabase

### Integración en el Proyecto

El proyecto usa **Supabase** como backend completamente gestionado. La configuración está en `src/lib/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Módulos de Supabase Usados

#### 1. Authentication
```typescript
// Iniciar sesión
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'usuario@test.com',
  password: '123456'
})

// Cerrar sesión
await supabase.auth.signOut()
```

#### 2. Base de Datos (PostgreSQL)
```typescript
// Consultar casos
const { data, error } = await supabase
  .from('cases')
  .select('*')
  .eq('status', 'activo')

// Insertar caso
const { data, error } = await supabase
  .from('cases')
  .insert({/* datos del caso */})
```

#### 3. Realtime (Notificaciones en Tiempo Real)
```typescript
const channel = supabase
  .channel('custom-insert-channel')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications'
  }, (payload) => {
    console.log('Nueva notificación:', payload)
  })
  .subscribe()
```

#### 4. Storage (Archivos)
```typescript
// Subir imagen
const { data, error } = await supabase.storage
  .from('casos-media')
  .upload(ruta, archivo)
```

### Tablas Principales

| Tabla | Descripción |
|-------|------------|
| `users` | Usuarios de Supabase Auth |
| `profiles` | Perfiles extendidos de usuarios |
| `cases` | Casos de personas desaparecidas |
| `case_media` | Fotos y videos de casos |
| `sightings` | Avistamientos reportados |
| `notifications` | Notificaciones del sistema |
| `push_subscriptions` | Suscripciones push |

---

## 👥 Autores

| Rol | Nombre/Usuario |
|-----|---------------|
| **Desarrollador Principal** | [Tu nombre] |
| **Administrador del Proyecto** | Rijo |

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más detalles.

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -m 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

---

*Desarrollado con ❤️ para ayudar a reunir familias* 🏠

---

**FindMe** - *Donde cada caso cuenta, cada búsqueda importa* 🔍