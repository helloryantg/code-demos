import knexConstructor from 'knex'

const { LOCAL_DB_CONNECTION_STRING, INT_READ_ONLY_DB_CONNECTION_STRING, STG_READ_ONLY_DB_CONNECTION_STRING, PRD_READ_ONLY_DB_CONNECTION_STRING, DB_POOL_MIN_SIZE, DB_POOL_MAX_SIZE } = process.env

type AllowedEnvironment = Environment | 'local'

const connectionsLookup: Record<AllowedEnvironment, string | undefined> = {
  local: LOCAL_DB_CONNECTION_STRING,
  int: INT_READ_ONLY_DB_CONNECTION_STRING,
  stg: STG_READ_ONLY_DB_CONNECTION_STRING,
  prd: PRD_READ_ONLY_DB_CONNECTION_STRING,
}

const getConnectionString = (env: AllowedEnvironment) => {
  const connectionString = connectionsLookup[env]

  if (!connectionString) {
    throw new Error(`No connection string found for environment: ${env}`)
  }

  return connectionString
}

export function getDb(env: AllowedEnvironment) {
  return knexConstructor({
    client: 'pg',
    debug: false,
    connection: {
      connectionString: getConnectionString(env),
      timezone: 'utc',
    },
    pool: {
      min: DB_POOL_MIN_SIZE && parseInt(DB_POOL_MIN_SIZE) || 2,
      max: DB_POOL_MAX_SIZE && parseInt(DB_POOL_MAX_SIZE) || 10,
    }
  })
}