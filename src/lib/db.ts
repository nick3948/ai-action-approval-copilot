import pg from "pg";

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

let initialized = false;

export async function setupHistoryTable() {
  if (initialized) return;
  const db = getDbPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_chat_history (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(1024) NOT NULL,
      date BIGINT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_chat_history_user_id ON user_chat_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_chat_history_date ON user_chat_history(date DESC);
  `);
  initialized = true;
}
