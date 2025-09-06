import pkg from "pg";
import { SUPABASE_DB_URL, DB_MAX_POOL } from "./env.js";

const { Pool } = pkg;

if (!SUPABASE_DB_URL) {
  throw new Error("❌ Variável SUPABASE_DB_URL não definida!");
}

export const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  max: Number(DB_MAX_POOL) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("connect", () => {
  console.log("✅ [DB] Nova conexão estabelecida");
});

pool.on("error", (err) => {
  console.error("❌ [DB] Erro inesperado no pool:", err.message);
});

export default pool;
