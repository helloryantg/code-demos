import { syncRecords } from './sync-records'

;(async() => { 
  await syncRecords({
    env: 'int',
    uuids: ['123'],
    batchCount: 50,
  })
})()