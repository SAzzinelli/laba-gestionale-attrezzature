// backend/utils/database.js
// Database abstraction layer that handles both PostgreSQL and SQLite

import { query as postgresQuery } from './postgres.js';
import { query as sqliteQuery, querySync as sqliteQuerySync } from './db.js';

let currentDbType = 'unknown';

export function setDatabaseType(type) {
  currentDbType = type;
  console.log(`📊 Database type set to: ${type}`);
}

export function getDatabaseType() {
  return currentDbType;
}

export async function query(sql, params = []) {
  if (currentDbType === 'postgresql') {
    return await postgresQuery(sql, params);
  } else if (currentDbType === 'sqlite') {
    return sqliteQuery(sql, params);
  } else {
    throw new Error('Database type not set');
  }
}

export function querySync(sql, params = []) {
  if (currentDbType === 'sqlite') {
    return sqliteQuerySync(sql, params);
  } else {
    throw new Error('Sync queries only supported for SQLite');
  }
}

// Helper per gestire le differenze tra i database
export function adaptQuery(sql, params = []) {
  if (currentDbType === 'postgresql') {
    // PostgreSQL usa $1, $2, etc.
    return { sql, params };
  } else if (currentDbType === 'sqlite') {
    // SQLite usa ?, ?, etc.
    let adaptedSql = sql;
    let paramIndex = 1;
    const adaptedParams = [];
    
    for (let i = 0; i < params.length; i++) {
      const placeholder = `$${i + 1}`;
      const questionMark = '?';
      adaptedSql = adaptedSql.replace(placeholder, questionMark);
      adaptedParams.push(params[i]);
    }
    
    return { sql: adaptedSql, params: adaptedParams };
  }
  
  return { sql, params };
}
