export function buildFilterQuery(filters) {
  const conditions = [];
  const params = [];

  if (filters.ids) {
    conditions.push(`id IN (${filters.ids.map(() => '?').join(',')})`);
    params.push(...filters.ids);
  }

  if (filters.authors) {
    conditions.push(`pubkey IN (${filters.authors.map(() => '?').join(',')})`);
    params.push(...filters.authors);
  }

  if (filters.kinds) {
    conditions.push(`kind IN (${filters.kinds.map(() => '?').join(',')})`);
    params.push(...filters.kinds);
  }

  if (filters.since) {
    conditions.push('created_at >= ?');
    params.push(filters.since);
  }

  if (filters.until) {
    conditions.push('created_at <= ?');
    params.push(filters.until);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM events ${whereClause} ORDER BY created_at DESC LIMIT 1000`;

  return { sql, params };
}