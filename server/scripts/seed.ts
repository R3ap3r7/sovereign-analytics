import { pool } from '../lib/db'
import { seedDatabase } from '../lib/seed'

const run = async () => {
  await seedDatabase(pool)
  await pool.end()
  console.log('Database initialized with reference data, live news/events, and 10 years of FX history.')
}

void run()
