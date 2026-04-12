# Cycle Route Planner — Frontend

React + Vite SPA. TypeScript throughout.

---

## Running locally

```bash
cp .env.example .env.development   # set VITE_API_BASE_URL
npm install
npm run dev                         # http://localhost:5173
```

Useful scripts:

| Command                | What it does                         |
| ---------------------- | ------------------------------------ |
| `npm run dev`          | Start dev server                     |
| `npm run build`        | Type-check + production build        |
| `npm run lint`         | Run ESLint                           |
| `npm run lint:fix`     | Auto-fix ESLint issues               |
| `npm run format`       | Prettier format                      |
| `npm run i18n:extract` | Extract translation keys from source |
| `npm run i18n:lint`    | Check for missing translation keys   |

---

## Deploying

Docker builds a production image served by nginx on port 3000.

```bash
docker compose build --build-arg VITE_API_BASE_URL=https://api.example.com
docker compose up
```

The Dockerfile uses a multi-stage build: `base → build → production (nginx-unprivileged)`.
Pass `VITE_API_BASE_URL` at build time — Vite bakes it into the bundle.

---

## Project structure

```
src/
├── api/              HTTP layer — fetch functions and API-specific types per resource
│   ├── models.ts         Base response/error shapes (ApiItemResponse, ApiListResponse, ApiError)
│   └── {resource}/
│       ├── index.ts       Fetch functions
│       └── apiModels.ts   Request/response types for this resource
├── app/              Wires features together — routes, providers, navigation
│   ├── navigation/       Header nav actions (only place that knows about feature routes)
│   ├── providers/        App-level providers (theme, i18n, query)
│   └── routes/           Route definitions
├── components/       Shared UI primitives — no imports from app/ or features/
├── data/             TanStack Query hooks and query keys per entity
├── features/         Feature modules — pages and all feature-specific logic
│   └── {Feature}/
│       ├── {Feature}Page.tsx   Page component (thin — calls hook, renders sub-components)
│       ├── {Feature}.styled.ts Page-level styled components
│       ├── components/         Feature-specific sub-components (each with own .styled.ts)
│       ├── hooks/              Feature-level hooks wrapping data/ layer
│       ├── utils.ts            Helper functions and constants for this feature
│       └── config.ts           Feature-level configuration/constants
├── lib/              Third-party library wrappers — always import from here, not directly
├── models/           Domain types
│   └── base.ts           BaseEntity { id: string } — all entity models extend this
└── theme/            Design tokens, global styles, styled-components type augmentation
```

Keep page and component files as short as possible — business logic belongs in hooks, helper functions in `utils.ts`, and constants in `config.ts`.

**Import direction:** `app → features → components / data / api → lib / models / theme`

Nothing imports from `app/` or `features/` except `app/`. To remove a feature, delete its folder and remove it from `app/routes` and `app/navigation` — nothing else needs to change.

---

## Packages and lib abstraction

Third-party packages are not imported directly in application code where it can be avoided. Instead they are re-exported through thin wrappers in `src/lib/`. This keeps the dependency surface small and makes swapping a library a one-file change.

| Library                 | Abstracted via | Direct imports OK?    |
| ----------------------- | -------------- | --------------------- |
| react-router-dom        | `@lib/router`  | No                    |
| @tanstack/react-query   | `@lib/query`   | No                    |
| i18next / react-i18next | `@lib/i18n`    | No                    |
| zustand                 | `@lib/state`   | No                    |
| react-hook-form         | `@lib/forms`   | No                    |
| styled-components       | —              | Yes (used everywhere) |
| react / react-dom       | —              | Yes                   |
| axios                   | `@api/client`  | No (use apiClient)    |

---

## Styled components

Every component or page that needs styling has a dedicated `*.styled.ts` companion file. Styled components are never defined inline in `.tsx` files.

```
AccountPage.tsx          ← JSX only, no styled-components import
Account.styled.ts        ← all page-level styled components

components/
  AccountForm.tsx
  AccountForm.styled.ts
```

Import the styled file as a namespace and prefix usages with `S.` to keep imports cleaner:

```tsx
import * as S from './Account.styled'
;<S.Title>Account</S.Title>
```

---

## Path aliases

Defined in `vite.config.ts`. Use these instead of relative paths for `src/` imports:

| Alias         | Resolves to      |
| ------------- | ---------------- |
| `@app`        | `src/app`        |
| `@api`        | `src/api`        |
| `@components` | `src/components` |
| `@data`       | `src/data`       |
| `@features`   | `src/features`   |
| `@lib`        | `src/lib`        |
| `@models`     | `src/models`     |
| `@theme`      | `src/theme`      |

Relative imports (`../`) are fine within the same feature or component folder.

---

## Code style

**Prettier** We use Prettier to keep code style consistant. Styling is definer in `.prettierrc`.

> **Recommended:** enable format-on-save in VS Code/Cursor — open the Command Palette (`Ctrl+Shift+P`) → _Open User Settings (JSON)_ and add:
>
> ```json
> "editor.formatOnSave": true,
> "editor.defaultFormatter": "esbenp.prettier-vscode"
> ```
>
> Note this is a global user setting, not a project setting.

**ESLint** (`eslint.config.js`): TypeScript + React Hooks + React Refresh rules. Import order is enforced — groups must be separated by blank lines and sorted alphabetically within each group:

```
external packages
              ← blank line
@alias imports
              ← blank line
relative imports
```

---

## Localisation with i18n

English phrases are used directly as translation keys:

```tsx
const { t } = useAppTranslation()

t('Save changes') // ✅
t('actions.save') // ❌
```

All user-visible strings must be wrapped in `t()`. In places where hooks are not available (e.g. outside React components, in `utils.ts` or `config.ts`), use `extractKey` from `@lib/i18n` to mark the string for extraction, then pass the value into `t()` where the hook is available:

```ts
// utils.ts or config.ts — no hook available
import { extractKey } from '@lib/i18n'

export const ERROR_MESSAGES = {
  required: extractKey('This field is required'),
}
```

```tsx
// Component — hook available
const { t } = useAppTranslation()
<span>{t(ERROR_MESSAGES.required)}</span>
```

A pre-commit hook runs `i18n:extract` automatically, updates `public/locales`, and stages the result — translation files do not need to be edited manually.

Supported locales: `en`, `et`. Locale files live in `public/locales/{lang}/`.
