/** Error thrown from the D1 layer, policies or hooks; mapped to a Postgres-style code. */
export class DbFailure extends Error {
  constructor(message: string, public code = "P0001") {
    super(message);
  }
}
