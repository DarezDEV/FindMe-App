
# FindMe (Proyecto escolar)

Aplicación web (React + TypeScript + Vite + Tailwind) para registrar, moderar y dar seguimiento a casos de personas desaparecidas, con Supabase como backend.

## Requisitos

- Node.js (recomendado: LTS)
- NPM
- Proyecto de Supabase configurado (URL + ANON KEY)

## Configuración rápida

1. Instalar dependencias:

```bash
npm install
```

2. Variables de entorno:

- Crea un archivo `.env` en la raíz (o ajusta el existente) con:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Ejecutar en desarrollo:

```bash
npm run dev
```

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # build de producción (tsc + vite)
npm run preview  # vista previa del build
npm run lint     # eslint
```

## Roles y módulos

- **Público**: landing + listado público de casos.
- **Usuario**: publicar casos, ver casos recientes y reportar información.
- **Autoridad**: panel de gestión, revisión de publicaciones pendientes y moderación de avistamientos.
- **Admin**: panel similar al de autoridad (casos, revisión, avistamientos) + gestión de usuarios.

## Base de datos / SQL

En `sql/` hay scripts de apoyo para tablas y políticas (RLS / storage). Ajusta y ejecuta en Supabase según tu configuración.
