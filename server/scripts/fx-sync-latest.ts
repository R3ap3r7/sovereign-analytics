import { pool } from '../lib/db'
import { syncLatestFx } from '../lib/fx'
import { referencePairs } from '../lib/reference'

const run = async () => {
  await syncLatestFx(pool, referencePairs)
  await pool.end()
  console.log('Latest FX rates synced.')
}

void run()
