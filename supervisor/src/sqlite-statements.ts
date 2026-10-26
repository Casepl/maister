import type { DatabaseSync, StatementSync } from "node:sqlite";
import type { Logger } from "pino";

const MAX_CACHED_STATEMENTS = 256;

/** Own preparation reuse for one connection; never cache results or bindings. */
export function reuseSqliteStatements(
  database: DatabaseSync,
  logger?: Logger,
): DatabaseSync {
  const statements = new Map<string, StatementSync>();
  let hits = 0;
  let misses = 0;

  return {
    get isTransaction() {
      return database.isTransaction;
    },
    exec(sql) {
      database.exec(sql);
    },
    prepare(sql) {
      const cached = statements.get(sql);

      if (cached) {
        hits += 1;

        return cached;
      }
      misses += 1;
      const native = database.prepare(sql);
      const statement: StatementSync = {
        run: (...params) => native.run(...params),
        get: (...params) => native.get(...params),
        all: (...params) => native.all(...params),
        // A live iterator must not share its native cursor with another call.
        iterate: (...params) => database.prepare(sql).iterate(...params),
      };

      if (statements.size === MAX_CACHED_STATEMENTS) {
        const oldest = statements.keys().next().value;

        if (oldest !== undefined) statements.delete(oldest);
      }
      statements.set(sql, statement);

      return statement;
    },
    close() {
      database.close();
      logger?.debug(
        {
          hits,
          misses,
          retained: statements.size,
          limit: MAX_CACHED_STATEMENTS,
        },
        "sqlite-statement-cache-closed",
      );
      statements.clear();
    },
  };
}
