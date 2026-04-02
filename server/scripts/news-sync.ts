import { pool } from '../lib/db'
import { referencePairs } from '../lib/reference'
import { syncNewsAndEvents } from '../lib/news'

const run = async () => {
  const result = await syncNewsAndEvents(pool, referencePairs)
  await pool.end()
  console.log(`News synced: ${result.newsCount} stories, ${result.eventCount} events.`)
}

void run()
