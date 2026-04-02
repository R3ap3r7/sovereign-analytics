import type { Pool, PoolClient } from 'pg'
import type {
  AdminMarketMutation,
  MacroScenarioPreset,
  Pair,
  PortfolioAccount,
  StrategyTemplate,
  User,
} from '../../src/domain/types'
import { ensureSchema, withTransaction } from './db'
import { syncHistoricalFx, syncLatestFx } from './fx'
import { syncNewsAndEvents } from './news'
import {
  buildReferencePortfolios,
  referenceCurrencies,
  referencePairs,
  referenceScenarios,
  referenceStrategies,
  referenceUsers,
} from './reference'

const defaultMutation: AdminMarketMutation = {
  currencyShifts: {},
  pairVolatilityShifts: {},
  newsToneShifts: {},
  triggeredEventIds: [],
}

const upsertPayloadRows = async <T extends { id: string }>(
  client: PoolClient,
  table: string,
  rows: T[],
  extraColumns?: (row: T) => Record<string, unknown>,
) => {
  if (!rows.length) return
  for (const row of rows) {
    const extras = extraColumns?.(row) ?? {}
    const columns = ['id', ...Object.keys(extras), 'payload']
    const values = [row.id, ...Object.values(extras), row]
    const placeholders = columns.map((_, index) => `$${index + 1}`)
    const updates = [...Object.keys(extras), 'payload'].map((column) => `${column} = excluded.${column}`)
    await client.query(
      `insert into ${table} (${columns.join(', ')}) values (${placeholders.join(', ')})
       on conflict (id) do update set ${updates.join(', ')}`,
      values,
    )
  }
}

const seedUsers = async (client: PoolClient, users: User[]) => {
  for (const user of users) {
    await client.query(
      `insert into users (
        id, role, status, email, password, display_name, avatar_seed,
        experience_level, risk_profile, analysis_focus, default_account_currency,
        favorite_currencies, favorite_pairs, dashboard_preset, settings,
        onboarding_completed, verified, locked
      ) values (
        $1,$2,$3,$4,$5,$6,$7,
        $8,$9,$10,$11,
        $12,$13,$14,$15,
        $16,$17,$18
      )`,
      [
        user.id,
        user.role,
        user.status,
        user.email,
        user.password,
        user.displayName,
        user.avatarSeed,
        user.experienceLevel,
        user.riskProfile,
        user.analysisFocus,
        user.defaultAccountCurrency,
        user.favoriteCurrencies,
        user.favoritePairs,
        user.dashboardPreset,
        user.settings,
        user.onboardingCompleted,
        user.verified,
        user.locked,
      ],
    )
    await client.query('insert into user_visits (user_id, pairs, currencies, events) values ($1, $2, $3, $4)', [user.id, [], [], []])
  }
}

const seedPortfolios = async (client: PoolClient, rows: PortfolioAccount[]) => {
  for (const row of rows) {
    await client.query('insert into portfolios (id, user_id, payload) values ($1, $2, $3)', [row.id, row.userId, row])
  }
}

const seedStaticTables = async (client: PoolClient) => {
  for (const row of referenceCurrencies) {
    await client.query(
      'insert into currencies (code, payload) values ($1, $2) on conflict (code) do update set payload = excluded.payload',
      [row.code, row],
    )
  }
  await upsertPayloadRows<Pair>(client, 'pairs', referencePairs)
  await upsertPayloadRows<StrategyTemplate>(client, 'strategies', referenceStrategies)
  await upsertPayloadRows<MacroScenarioPreset>(client, 'scenarios', referenceScenarios)
}

const seedMutableTables = async (client: PoolClient) => {
  await client.query(
    'truncate table user_sessions, user_visits, notes, alerts, watchlist, journals, orders, positions, simulations, portfolios, users restart identity cascade',
  )
  await client.query('delete from admin_state')
  await seedUsers(client, referenceUsers)
  await seedPortfolios(client, buildReferencePortfolios(referenceUsers))
  await client.query('insert into admin_state (singleton, mutation) values (true, $1) on conflict (singleton) do update set mutation = excluded.mutation', [defaultMutation])
}

const ensureDemoUsers = async (client: PoolClient) => {
  const count = await client.query<{ count: string }>('select count(*)::text as count from users')
  if (Number(count.rows[0]?.count ?? '0') > 0) return
  await seedUsers(client, referenceUsers)
  await seedPortfolios(client, buildReferencePortfolios(referenceUsers))
  await client.query('insert into admin_state (singleton, mutation) values (true, $1) on conflict (singleton) do update set mutation = excluded.mutation', [defaultMutation])
}

const syncHistoricalIfEmpty = async (database: Pool) => {
  const count = await database.query<{ count: string }>('select count(*)::text as count from pair_daily_rates')
  if (Number(count.rows[0]?.count ?? '0') > 0) return
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 10)
  await syncHistoricalFx(database, referencePairs, startDate.toISOString().slice(0, 10), new Date().toISOString().slice(0, 10))
}

export const seedDatabase = async (database: Pool) => {
  await ensureSchema()
  await withTransaction(async (client) => {
    await seedStaticTables(client)
    await seedMutableTables(client)
  })
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - 10)
  await syncHistoricalFx(database, referencePairs, startDate.toISOString().slice(0, 10), new Date().toISOString().slice(0, 10))
  await syncLatestFx(database, referencePairs)
  await syncNewsAndEvents(database, referencePairs)
}

export const initializeDatabase = async (database: Pool) => {
  await ensureSchema()
  await withTransaction(async (client) => {
    await seedStaticTables(client)
    await ensureDemoUsers(client)
  })
  await syncHistoricalIfEmpty(database)
  await syncLatestFx(database, referencePairs)
  await syncNewsAndEvents(database, referencePairs)
}

export const resetMutableState = async () => {
  await withTransaction(async (client) => {
    await seedMutableTables(client)
  })
}
