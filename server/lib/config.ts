import 'dotenv/config'

export const config = {
  apiPort: Number(process.env.API_PORT ?? 8787),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/sovereign_analytics',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'sa_session',
  frankfurterBaseUrl: process.env.FRANKFURTER_BASE_URL ?? 'https://api.frankfurter.dev/v2',
  frankfurterProvider: process.env.FRANKFURTER_PROVIDER ?? 'ECB',
  fxSyncIntervalMinutes: Number(process.env.FX_SYNC_INTERVAL_MINUTES ?? 60),
  newsSyncIntervalMinutes: Number(process.env.NEWS_SYNC_INTERVAL_MINUTES ?? 30),
  forecastSyncIntervalMinutes: Number(process.env.FORECAST_SYNC_INTERVAL_MINUTES ?? 360),
  googleNewsLanguage: process.env.GOOGLE_NEWS_LANGUAGE ?? 'en-US',
  googleNewsRegion: process.env.GOOGLE_NEWS_REGION ?? 'US',
  googleNewsEdition: process.env.GOOGLE_NEWS_EDITION ?? 'US:en',
}
