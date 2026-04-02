import { pool } from '../lib/db'
import { syncForecasts } from '../lib/forecast'
import { referencePairs } from '../lib/reference'
import { syncLatestFx } from '../lib/fx'
import { syncNewsAndEvents } from '../lib/news'

const run = async () => {
  await syncLatestFx(pool, referencePairs)
  const result = await syncNewsAndEvents(pool, referencePairs)
  const forecasts = await syncForecasts(pool, referencePairs)
  await pool.end()
  console.log(`FX + news + forecasts synced. Stories: ${result.newsCount}, events: ${result.eventCount}, forecasts: ${forecasts.length}.`)
}

void run()
