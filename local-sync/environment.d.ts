declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ENV?: 'local' | 'int' | 'stg' | 'prd'
      DB_POOL_MAX_SIZE?: string
      DB_POOL_MIN_SIZE?: string
      INT_READ_ONLY_DB_CONNECTION_STRING?: string
      LOCAL_DB_CONNECTION_STRING?: string
      PRD_READ_ONLY_DB_CONNECTION_STRING?: string
      STG_READ_ONLY_DB_CONNECTION_STRING?: string
    }
  }
}

// Adding empty export {} to make it a module
export {}
