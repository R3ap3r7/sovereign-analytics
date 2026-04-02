import { pool } from '../lib/db'
import { referencePairs } from '../lib/reference'
import { syncLatestFx } from '../lib/fx'
import { syncNewsAndEvents } from '../lib/news'

const run = async () => {
  await syncLatestFx(pool, referencePairs)
  const result = await syncNewsAndEvents(pool, referencePairs)
  await pool.end()
  console.log(`FX + news synced. Stories: ${result.newsCount}, events: ${result.eventCount}.`)
}

void run()
