import { syncRecords } from './sync-records.js'

await syncRecords({
  env: 'int',
  uuids: [],
  batchCount: 50,
})
