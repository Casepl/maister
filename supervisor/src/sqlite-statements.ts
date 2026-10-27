import type {
  DatabaseSync,
  SQLInputValue,
  SQLOutputValue,
  StatementResultingChanges,
} from "node:sqlite";
import type { Logger } from "pino";

const MAX_CACHED_STATEMENTS = 256;

type Row = Record<string, SQLOutputValue>;

type CachedStatement = {
  run(...params: SQLInputValue[]): StatementResultingChanges;
  get(...params: SQLInputValue[]): Row | undefined;
  all(...params: SQLInputValue[]): Row[];
  iterate(...params: SQLInputValue[]): NodeJS.Iterator<Row>;
};

/** Own preparation reuse for one connection; never cache results or bindings. */
export function reuseSqliteStatements(
  database: DatabaseSync,
  logger?: Logger,
): DatabaseSync {
  const statements = new Map<string, CachedStatement>();
  let hits = 0;
  let misses = 0;

  // The state store calls only these members; the cast keeps every store
  // signature on the native `DatabaseSync` type.
  const wrapped = {
    get isTransaction() {
      return database.isTransaction;
    },
    exec(sql: string) {
      database.exec(sql);
    },
    prepare(sql: string): CachedStatement {
      const cached = statements.get(sql);

      if (cached) {
        hits += 1;

        return cached;
      }
      misses += 1;
      const native = database.prepare(sql);
      const statement: CachedStatement = {
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

  return wrapped as unknown as DatabaseSync;
}
