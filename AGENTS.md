# AGENTS.md - FindMe App Developer Guide

## Project Overview

FindMe is a React 19 + TypeScript application for managing missing persons cases. It uses Vite as the build tool, Tailwind CSS v4 for styling, and Supabase for backend services. The app supports three user roles: user, authority, and admin.

## Architecture Notes

- **Service Worker** (`public/sw.js`): Required for push notifications to work. Must be served from root `/`.
- **Push Notifications**: Uses Web Push API via Supabase Edge Functions. Requires `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` secrets in Supabase.
- **Realtime**: Uses Supabase Realtime for in-app notifications (not push).

---

## Build, Lint, and Test Commands

### Development
```bash
npm run dev          # Start Vite dev server with hot reload
npm run preview      # Preview production build locally
```

### Building
```bash
npm run build        # Run TypeScript compiler + Vite build
```

### Linting
```bash
npm run lint         # Run ESLint on entire project
```

### Type Checking
```bash
npx tsc --noEmit     # TypeScript type checking only
```

### Running a Single Test
**Note:** No test framework is currently configured. When adding tests:
```bash
# With Vitest
npx vitest run --single-run src/path/to/test file.test.ts

# With Jest
npx jest src/path/to/test/file.test.ts
```

---

## Code Style Guidelines

### TypeScript Configuration

The project uses strict TypeScript with these key settings:
- `strict: true` - Full strict type checking
- `noUnusedLocals: true` - Error on unused local variables
- `noUnusedParameters: true` - Error on unused function parameters
- `verbatimModuleSyntax: true` - Explicit import/export type syntax

### Imports

**Order (follow existing code pattern):**
1. External library imports (react, react-router-dom, supabase)
2. Internal app imports (features, shared, lib)
3. Relative imports from parent directories (`../`)

**Type imports:** Use `import { type SomeType }` or `import type { SomeType }` for types only.

```typescript
import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Alert } from '../../../shared/components/ui'
import { loginUser } from '../services'
import type { LoginData } from '../../../lib/supabase/auth'
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `LoginPage`, `RoleBadge`, `Alert` |
| Files (components) | PascalCase | `LoginPage.tsx`, `Alert.tsx` |
| Files (utilities) | kebab-case | `storage.ts`, `interceptors.ts` |
| Hooks | camelCase, use prefix | `useAuth`, `useSearchParams` |
| Constants | SCREAMING_SNAKE_CASE | `ROLES.USER`, `VITE_SUPABASE_URL` |
| Types/Interfaces | PascalCase | `RoleName`, `RegisterData` |
| CSS classes | kebab-case | `.btn-primary`, `.input-field` |

### Component Structure

Follow this pattern for React components:

```typescript
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '../../../shared/components/ui'
import { loginUser } from '../services'

interface ComponentProps {
  title: string
  onSubmit: () => void
}

export default function ComponentName({ title, onSubmit }: ComponentProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await loginUser({ email, password })
      navigate('/user')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Default error message'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <Alert type="error" message={error} />}
      {/* component JSX */}
    </div>
  )
}
```

### Error Handling

- Always use try/catch for async operations
- Check error type before accessing message: `err instanceof Error ? err.message : 'Default message'`
- Set error state to display to user, never silently catch
- Throw descriptive errors during initialization (see `src/lib/supabase/client.ts:6-8`)

```typescript
try {
  await someAsyncOperation()
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unexpected error occurred'
  setError(message)
}
```

### Tailwind CSS

- Use `@theme` in `index.css` for custom colors (see `src/index.css:3-18`)
- Define reusable component classes in `@layer components`
- Custom utility classes: `input-field`, `btn-primary`, `btn-secondary`, `card`

**Color palette defined:**
- Primary: `#3266db`, Primary Hover: `#2954b8`
- Background: `#f8fafc`, Card: `#ffffff`, Border: `#e2e8f0`
- Text Primary: `#0f172a`, Text Secondary: `#475569`
- Success: `#16a34a`, Warning: `#f59e0b`, Error: `#dc2626`, Info: `#0ea5e9`

### File Organization

```
src/
├── app/                    # App-level components
│   ├── providers/          # React context providers
│   └── router/             # Route definitions and guards
├── features/               # Feature-based modules
│   ├── auth/
│   │   ├── components/     # Auth-specific components
│   │   ├── hooks/          # Auth-specific hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API/service functions
│   │   └── types.ts        # Feature types
│   ├── admin/
│   └── authority/
├── lib/                    # Core libraries (Supabase client, etc.)
│   └── supabase/
├── shared/                 # Shared code across features
│   ├── components/
│   │   ├── layout/         # Layout components
│   │   └── ui/             # Reusable UI components
│   ├── constants/          # App constants
│   ├── hooks/              # Shared hooks
│   └── utils/              # Utility functions
└── index.css               # Global styles and Tailwind config
```

### Constants and Types

- Use `as const` for object constants that shouldn't be widened
- Export types alongside implementations
- Use barrel exports (`index.ts`) for cleaner imports

```typescript
// Constants
export const ROLES = {
  USER: 'user',
  AUTHORITY: 'authority',
  ADMIN: 'admin',
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]

// Barrel export
export { loginUser, logoutUser, type LoginData } from './auth'
```

### ESLint Rules

The project uses:
- `@eslint/js` - JavaScript recommended rules
- `typescript-eslint` - TypeScript ESLint support
- `eslint-plugin-react-hooks` - React hooks rules
- `eslint-plugin-react-refresh` - HMR-safe component checks

Run `npm run lint` before committing to catch issues.

### Environment Variables

Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Access in code via:
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
```

---

## Best Practices

1. **Never commit secrets** - Keep `.env` in `.gitignore`
2. **Use TypeScript strictly** - Avoid `any`, use proper types
3. **Handle all async errors** - Never leave unhandled promise rejections
4. **Keep components focused** - Single responsibility principle
5. **Use barrel exports** - Cleaner import paths
6. **Follow existing patterns** - Match the code style in the codebase
7. **Run lint before commit** - `npm run lint`
8. **Test your changes** - Add tests when implementing features
