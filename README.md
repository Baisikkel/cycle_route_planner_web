# Cycle Route Planner 🚲

This project is a specialized routing application designed to provide optimized cycling paths, utilizing advanced routing engines to offer a professional-grade experience beyond standard map services.

## 🔗 Project Resources
* **Task Management:** [Linear Board](https://linear.app/vanemarendajaks/project/bike-routing-project-8f5335b90c85)
* **Meetings:** [Google Meet Link](https://meet.google.com/gbi-prhd-seq)
* **Estimation Tool:** [Planning Poker Online](https://planningpokeronline.com/)

## 👥 Project Team
* **Infrastructure & Setup:** RaivoT, Oliver
* **Frontend Development:** Gretlin
* **Backend Development:** Lukas
* **Quality Assurance & Documentation:** Natalia Egorova, Anettagr

## 🛠 Tech Stack
* **Routing Engines:**
  * [BRouter](https://brouter.de/): Primary engine for granular bicycle routing customization.
  * [Digitransit](https://digitransit.fi/en): OTP2-based engine for multimodal integration.
* **Backend:** Java (Architecture focused on scalability and strict formatting).
* **Frontend:** React + Vite SPA, fully typed with TypeScript.

---

# 💻 Frontend Technical Documentation

React + Vite SPA. TypeScript throughout.

## 🚀 Environment Setup

```bash
cp .env.example .env.development    # Configure VITE_API_BASE_URL
npm install                         # Install dependencies
npm run dev                         # Launch development server (http://localhost:5173)
### 🛠 Automation Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server |
| `npm run build` | Executes TypeScript type-checks and production bundling |
| `npm run lint` | Validates code against ESLint rules |
| `npm run lint:fix` | Automatically resolves fixable ESLint warnings |
| `npm run format` | Enforces consistent code style via Prettier |
| `npm run i18n:extract` | Automatically scans source code for new translation keys |
| `npm run i18n:lint` | Detects missing translations across supported locales |

---

## 🏗 Architectural Structure

The project follows a strict modular directory structure:

```text
src/
├── api/              HTTP layer — fetch functions and API types
├── app/              Wires features together — routes, providers, navigation
├── components/       Shared UI primitives — no imports from app/ or features/
├── data/             TanStack Query hooks and query keys
├── features/         Feature modules — pages and business logic
│   └── {Feature}/     Thin Page component, styled components, hooks
├── lib/              Third-party library wrappers (always import from here)
├── models/           Domain types (BaseEntity and entity models)
└── theme/            Design tokens, global styles, and type augmentation
Import direction: app → features → components / data / api → lib / models / theme
---

## 📦 Dependency Abstraction

Third-party packages are re-exported through thin wrappers in `src/lib/` to minimize dependency surface.

| Library | Wrapper Path | Direct Import Allowed? |
| :--- | :--- | :--- |
| `react-router-dom` | `@lib/router` | ❌ No |
| `@tanstack/react-query` | `@lib/query` | ❌ No |
| `i18next / react-i18next` | `@lib/i18n` | ❌ No |
| `zustand` | `@lib/state` | ❌ No |
| `react-hook-form` | `@lib/forms` | ❌ No |
| `styled-components` | — | ✅ Yes (Used everywhere) |
| `react / react-dom` | — | ✅ Yes |
| `axios` | `@api/client` | ❌ No (Use apiClient) |

---

## 🎨 Development Guidelines

### Styled Components
Every component or page has a dedicated `*.styled.ts` companion file. Styled components are **never** defined inline in `.tsx` files. Use the `S.` namespace:

```tsx
import * as S from './Account.styled'

export const MyComponent = () => (
  <S.Container>
    <S.Title>Account Page</S.Title>
  </S.Container>
);
### 🌍 Localisation (i18n)

English phrases are used directly as translation keys. All user-visible strings must be wrapped in `t()`.

* Outside React components, use `extractKey` from `@lib/i18n` to mark strings for extraction.
* A pre-commit hook runs `i18n:extract` automatically.

---

### 🛠 Code Style

* **Prettier:** Mandatory formatting defined in `.prettierrc`.
* **ESLint:** Enforces TypeScript + React Hooks rules.
* **Import Order:** Enforced sequence (External packages -> @Alias imports -> Relative imports) separated by blank lines.

---

### 🐳 Deploying with Docker

The application is containerized using a multi-stage Docker build.

```bash
docker compose build --build-arg VITE_API_BASE_URL=[https://api.example.com](https://api.example.com)
docker compose up
