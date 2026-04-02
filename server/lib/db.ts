import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Pool, type PoolClient } from 'pg'
import { config } from './config'

export const pool = new Pool({
  connectionString: config.databaseUrl,
})

export const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>) => {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const result = await callback(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export const ensureSchema = async () => {
  const currentFile = fileURLToPath(import.meta.url)
  const schemaPath = resolve(dirname(currentFile), '../db/schema.sql')
  const sql = readFileSync(schemaPath, 'utf8')
  await pool.query(sql)
}
