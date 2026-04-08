# Sovereign Analytics: Frontend Codebase Analysis for ML Integration

This document provides an exhaustive technical breakdown of the Sovereign Analytics frontend codebase. It is designed to equip developers and AI agents with the precise context required to integrate the new Python FastAPI Monte Carlo risk simulation engine into the existing React application.

---

## Section 1 — Tech Stack & Build System

The frontend is a single-page application built with modern React features, bundled by Vite, and styled with Tailwind CSS.

### Dependencies (from `package.json`)
**Core Framework & Libraries:**
*   `react` (`^18.3.1`)
*   `react-dom` (`^18.3.1`)
*   `react-router-dom` (`^7.13.2`)
*   `recharts` (`^3.8.1`) - Used extensively for charting features (Price, Forecast, Performance).
*   `clsx` (`^2.1.1`) & `tailwind-merge` (`^3.5.0`) - Used for conditional style processing.
*   `lucide-react` (`^1.7.0`) - Icon set.

**Build & Development Tools:**
*   `vite` (`^8.0.1`) - Fast dev server and bundler. By default runs on port `5173`.
*   `tailwindcss` (`^4.2.2`) - Utility-first CSS processing.
*   `typescript` (`~5.9.3`) - Strict typing language environment.
*   `eslint` (`^9.39.4`) & `vitest` (`^4.1.2`) - Linting and unit testing.
*   `concurrently` (`^9.2.1`) - Used in `npm run dev` to run both the Vite frontend and Express server concurrently (`tsx server/index.ts`).

### Build Configuration (`vite.config.ts` & `tsconfig.app.json`)
*   **Vite Server:** `vite.config.ts` configures a proxy to route `/api` paths to `http://localhost:8787`. This means standard backend requests go to the Express server. The FastAPI server is on port `8000`, so integration will require either modifying this proxy or making absolute URL path fetches (`http://localhost:8000`).
*   **TypeScript:** Strict mode is fully enabled. The source uses standard standard `.ts` and `.tsx` file resolution without non-standard path aliases (all imports are relative paths such as `../../domain/services/api`).

---

## Section 2 — Project File Tree

Complete, untruncated file tree for `src/`:

```text
src/
├── index.css
├── main.tsx
├── app/
│   ├── App.tsx
│   └── AppState.tsx
├── assets/
│   ├── hero.png
│   ├── react.svg
│   └── vite.svg
├── components/
│   ├── charts/
│   │   └── analytics.tsx
│   ├── domain/
│   │   └── cards.tsx
│   └── ui/
│       └── primitives.tsx
├── domain/
│   ├── marketData.ts
│   ├── calculators/
│   │   └── index.ts
│   ├── persistence/
│   │   └── index.ts
│   ├── seed/
│   │   └── data.ts
│   ├── selectors/
│   │   └── index.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── mockApi.ts
│   └── types/
│       └── index.ts
├── layouts/
│   └── AppShell.tsx
├── lib/
│   ├── useAsyncResource.ts
│   └── utils.ts
├── modules/
│   ├── shared.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── auth/
│   │   └── pages.tsx
│   ├── currencies/
│   │   └── pages.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── events/
│   │   └── pages.tsx
│   ├── forecast/
│   │   └── page.tsx
│   ├── markets/
│   │   └── pages.tsx
│   ├── notes/
│   │   └── page.tsx
│   ├── portfolio/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── simulation/
│   │   └── page.tsx
│   ├── strategies/
│   │   └── page.tsx
│   └── watchlist/
│       └── page.tsx
├── routes/
│   └── AppRoutes.tsx
└── test/
    ├── app-state.test.ts
    ├── calculators.test.ts
    ├── seed-links.test.ts
    └── setup.ts
```

---

## Section 3 — Routing & Pages

Routing is managed via `react-router-dom` defined in `src/routes/AppRoutes.tsx`. Lazy loading is applied conditionally within the app, but all logical route maps are defined below.

*   `/` -> Renders `MarketingPage` (from `auth/pages.tsx`). Landing/login proxy page.
*   `/login` -> Renders `MarketingPage`.
*   `/app` -> Wrapped by `AppShell` (the authenticated layout container).
    *   `/app` (index) -> Redirects to `/app/dashboard`.
    *   `/app/dashboard` -> `DashboardPage`, High-level macro view, priority market events.
    *   `/app/simulation` -> `SimulationLabPage`, The central hub for configuring and running scenarios/risk assessments.
    *   `/app/markets` -> `MarketsGridPage`, Grid layout of all asset pairs.
    *   `/app/markets/:pairId` -> `MarketDetailPage`, In-depth analysis, forecasting, and charts for a specific pair.
    *   `/app/currencies` -> `CurrenciesMapPage`, Global currency strength mappings.
    *   `/app/currencies/:code` -> `CurrencyDetailPage`, Deep dive into a specific currency.
    *   `/app/events` -> `EventsPage`, Live news feed and economic calendar.
    *   `/app/events/:eventId` -> `EventDetailPage`, Inspector for a specific event.
    *   `/app/portfolio` -> `PortfolioPage`, Active risk exposure, equity curves, active/closed paper trades.
    *   `/app/forecast` -> `ForecastPage`, Machine learning directional projections overview.
    *   `/app/strategies` -> `StrategiesPage`, Trade management and active rules definitions.
    *   `/app/notes` -> `NotesPage`, Custom tagging/journaling system.
    *   `/app/watchlist` -> `WatchlistPage`, Custom user watchlists.
    *   `/app/settings` -> `SettingsPage`, User preference toggles.
    *   `/app/admin` -> `AdminToolsPage`, Internal diagnostic state resets.

---

## Section 4 — State Management & API Layer

### Global State Context (`src/app/AppState.tsx`)
The frontend shuns redundant Redux/Zustand implementations and relies directly on a combination of React Context (`AppStateContext`) to hold high-level active primitives for the application session:
*   `theme` / `setTheme`
*   `activeSimulation` / `setActiveSimulation`: Holds the draft object properties when a user clicks "Sim" from anywhere in the app to populate `SimulationLabPage`.
*   `bootstrapped` flag: Used to await hydration.

### Data Fetching Hook (`src/lib/useAsyncResource.ts`)
Components utilize a custom `useAsyncResource` hook that executes an async function on mount or when dependencies change. It handles `loading` states and catches errors gracefully. This drives all the UI data populations (e.g., `useAsyncResource(() => appApi.getDashboardWorkspace(), [])`).

### The Application API Layer (`src/domain/services/api.ts`)
The `appApi` singleton acts as the centralized data broker connecting the React UI to backend functions.
*   **Seeding & Hydration:** Initial loading is dictated via `/api/seed` or `api.ts`'s internal caching.
*   **Workspace APIs:** Page endpoints generally return aggregate "Workspace" domains. Examples include `getDashboardWorkspace()`, `getPortfolioWorkspace()`, `getSimulationWorkspace()`.
*   Most "calculations" (like `runMonteCarloTest()`) currently return dummy/random walk calculations mapped against an internal snapshot.

---

## Section 5 — Simulation Data Flow (Deep Dive)

The risk simulation primarily lives in `src/modules/simulation/page.tsx` (`SimulationLabPage`).

1.  **Preparation (State Loading):**
    When the page boots, it fetches base data from `appApi.getSimulationWorkspace(pairId)`. This provides spot prices and historical parameters.
2.  **User Input Mapping:**
    The page maintains local state objects (`draft`, `sequence`, `monteCarlo` settings). Specifically, `monteCarlo.paths` and `monteCarlo.horizon`.
3.  **Local Execution (`calculateTradeOutputs`):**
    When running the simulation, the frontend utilizes the `src/domain/calculators.ts` module to run `calculateTradeOutputs(draft, ...)` to generate a snapshot.
    There is also currently an API layer `appApi.runMonteCarloTest()` which the UI uses to generate random outcomes on the frontend mimicking standard deviations instead of deferring to a backend ML engine.
4.  **UI Feedback Layer:**
    The `SimulationLabPage` reflects the outcomes inside the `ForecastChart` component (`src/components/charts/analytics.tsx`) pushing the min/max band layers generated from local random walks. It also logs "Expected Move" and "Margin Used" dynamically as a user changes Leverage or Size arrays.

---

## Section 6 — ML Integration Points

The integration of the FastAPI `/simulate-risk` endpoint requires hijacking this client-side calculation and delegating it to the Python backend on `http://localhost:8000`.

### Integration Roadmap / Target Locations:

**1. `src/domain/services/api.ts` - New Request Methods**
Add specialized fetch wrappers inside `appApi`:
```typescript
async checkMLHealth(): Promise<boolean> {
  // fetch('http://localhost:8000/')
}

async simulateRisk(payload: {
  account_balance: number,
  lot_size: number,
  leverage: number,
  pair_id: string 
}): Promise<any> { // Typing mapped to FastAPI Output
  // fetch('http://localhost:8000/simulate-risk', { method: 'POST', body: ... })
}
```

**2. `src/modules/simulation/page.tsx` - Intercept the Local Calculation**
*   Modify the "Run Simulation" or the continuous `calculateTradeOutputs` recalculation loop.
*   If we rely on the button click "Run Simulation", wire the onClick handler to `appApi.simulateRisk()`.
*   Pass `portfolio.freeMargin` or `portfolio.balance` (pulled from earlier portfolio endpoints or Context) as the `account_balance`.
*   Pass the component's internal `draft.size` as `lot_size`, `draft.leverage` as `leverage`, and `draft.pairId` as `pair_id`.

**3. `src/modules/simulation/page.tsx` - Re-mapping Visuals**
*   Parse the returned JSON payload (`margin_call_probability`, `expected_loss`, `expected_max_loss`).
*   Display the `margin_call_probability %` loudly on the UI logic flow. Update danger tags via `tone="danger"` if the ML engine outputs a high risk (>10% probability).
*   Map the returned `terminal_prices` to a distribution array if a chart needs plotting, replacing or supplementing `appApi.runMonteCarloTest()`.

### Summary of Change Strategy
The strategy involves minimal destruction: append the new ML calls into `appApi` directly bypassing the `vite.config.ts` absolute `/api` proxy constraint by explicitly fetching `http://localhost:8000`. Update `SimulationLabPage` state arrays to process ML payload results alongside legacy state returns. This guarantees an isolated, clean integration of the new server into the existing logic stream.
