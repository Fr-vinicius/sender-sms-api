export function buildMultiInsert(table, columns, rows, returning = null) {
  if (!rows.length) {
    throw new Error("Nenhuma linha para inserir");
  }

  // Sanitiza tabela e colunas para evitar injection
  const safeTable = `"${table.replace(/[^a-zA-Z0-9_]/g, "")}"`;
  const safeCols = columns.map((c) => `"${c.replace(/[^a-zA-Z0-9_]/g, "")}"`);

  const values = [];
  const params = [];
  let i = 1;

  for (const row of rows) {
    const placeholders = row.map(() => `$${i++}`);
    params.push(...row);
    values.push(`(${placeholders.join(",")})`);
  }

  let sql = `INSERT INTO ${safeTable} (${safeCols.join(
    ","
  )}) VALUES ${values.join(",")}`;
  if (returning) sql += ` RETURNING ${returning}`;

  return { sql, params };
}
