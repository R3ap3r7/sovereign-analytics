import { pool } from '../lib/db'
import { syncForecasts } from '../lib/forecast'
import { referencePairs } from '../lib/reference'

const run = async () => {
  const results = await syncForecasts(pool, referencePairs)
  console.log(JSON.stringify(results, null, 2))
  await pool.end()
}

void run()
