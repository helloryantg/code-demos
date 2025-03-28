import dotenv from 'dotenv'

dotenv.config()

import { Knex } from 'knex'

import { getDb } from './get-db'
import { chunk } from '../../utils/chunk'
import { buildMultiLookup } from '../../utils/build-multi-lookup'
import { buildLookup } from '../../utils/build-lookup'

const { APP_ENV } = process.env

if (APP_ENV !== 'local') {
  throw new Error('This script is only intended for local development')
}

/**
 * The purpose of this script is to sync asset records and their related records from a remote database in a given environment to a local database.
 * This allows developers to work with real data in their local environment for testing and debugging purposes.
 */

type SyncRecordParams = {
  /**
   * The environment to sync records from (e.g. 'int', 'stg', 'prd')
   */
  env: Environment
  /**
   * The UUIDs of the asset records to sync
   */
  uuids: Asset['uuid'][]
  /**
   * The number of records to sync in a single batch. Depending on the size of the records and their relationships, this can help prevent memory issues.
   */
  batchCount: number
}

export async function syncRecords({ env, uuids, batchCount }: SyncRecordParams) {
  if (!uuids.length) {
    throw new Error('No records to sync')
  }
  
  console.info(`Starting sync of ${uuids.length} records in ${env} environment`)

  const remoteEnvDb = getDb(env)
  const localDb = getDb('local')

  try {
    const batchedUuids = chunk(uuids, batchCount)

    for (const uuidsBatch of batchedUuids) {
      console.info('Syncing batch of records', { batch: uuidsBatch })

      // Fetch asset records from the remote database
      const assets = await remoteEnvDb<Asset>('assets').whereIn('uuid', uuidsBatch)

      if (assets.length) {
        await processBatch({ remoteEnvDb, localDb, uuidsBatch, assets })
      } else {
        console.error('No records found for batch', { batch: uuidsBatch })
      }

      console.info('Batch complete')
    } 
  } catch (err) {
    console.error('Error syncing records', { err, env, ids: uuids })
  } finally {
    await remoteEnvDb.destroy()
    await localDb.destroy()

    console.info('Connections have been destroyed')
  }

  console.info('Sync complete')
}

async function processBatch({ remoteEnvDb, localDb, uuidsBatch, assets }: { remoteEnvDb: Knex, localDb: Knex, uuidsBatch: string[], assets: Asset[] }) {
  const { assetIds, assetUuids, uniqueGpmsIds } = getIdsFromAssets(assets)

  /**
   * Fetch related source asset and title records from individual tables
   * Relationships:
   * - assets.id -> source_assets.asset_id (one-to-many - i.e. a single asset can have many source assets)
   * - titles.gpms_id -> assets.data.title.gpms_id (one-to-many - i.e. a single title can have many assets)
   */
  const [sourceAssets, titles] = await Promise.all([
    remoteEnvDb<SourceAsset>('source_assets').whereIn('asset_id', assetIds),
    remoteEnvDb<Title>('titles').whereIn('gpms_id', uniqueGpmsIds)
  ])

  // Fetch existing asset and title records from the local database
  const [localAssets, localTitles] = await Promise.all([
    localDb<Asset>('assets').whereIn('uuid', assetIds),
    localDb<Title>('titles')
      .whereIn('gpms_id', uniqueGpmsIds)
      .returning(['gpms_id'])
  ])

  // Fetch existing source asset records from the local database
  const localAssetIds = localAssets.map(asset => asset.id)
  const localSourceAssets = await localDb<SourceAsset>('source_assets')
    .whereIn('asset_id', localAssetIds)
    .returning(['asset_id', 'source_system', 'source_id', 'id'])

  const localAssetsByUuid = buildLookup(localAssets, (asset) => asset.uuid)
  const sourceAssetsByAssetId = buildMultiLookup(sourceAssets, (sourceAsset) => sourceAsset.asset_id.toString())
  const localSourceAssetsByAssetId = buildMultiLookup(localSourceAssets, (sourceAsset) => sourceAsset.asset_id.toString())
    
  // Upsert asset and source asset records
  for (const asset of assets) {
    await localDb.transaction(async (trx) => {
      const sourceAssets = sourceAssetsByAssetId[asset.id.toString()] ?? []

      const existingLocalAsset = localAssetsByUuid[asset.uuid]
      const existingLocalSourceAssets = existingLocalAsset ? localSourceAssetsByAssetId[existingLocalAsset.id.toString()] ?? [] : []
      const existingLocalSourceAssetsBySourceSystemAndSourceId = buildLookup(existingLocalSourceAssets, (sourceAsset) => `${sourceAsset.source_system}:${sourceAsset.source_id}`)

      const upsertedAsset = await upsertAsset(asset, existingLocalAsset, trx)
      
      for (const sourceAsset of sourceAssets) {
        const existingLocalSourceAsset = existingLocalSourceAssetsBySourceSystemAndSourceId[`${sourceAsset.source_system}:${sourceAsset.source_id}`]

        await upsertSourceAsset({
          sourceAsset,
          existingLocalSourceAsset,
          upsertedAssetId: upsertedAsset.id,
          trx,
        })
      }

    }).catch((err) => { 
      console.error('Error upserting asset', { err, asset })
    })
  } 
  
  const titlesByGpmsId = buildLookup(titles, (title) => title.gpms_id)
  const localTitlesByGpmsId = buildLookup(localTitles, (title) => title.gpms_id)

  // Upsert title records
  for (const title of titles) {
    const existingLocalTitle = localTitlesByGpmsId[title.gpms_id]

    await upsertTitle({ title, existingLocalTitle, localDb })
  }
  
  // Log missing assets and titles for debug purposes
  const missingAssets = uuidsBatch.filter(uuid => !assetUuids.includes(uuid))

  if (missingAssets.length) {
    console.error('Missing assets', { missingAssets })
  }

  const missingTitles = uniqueGpmsIds.filter(gpmsId => !titlesByGpmsId[gpmsId])

  if (missingTitles.length) {
    console.error('Missing titles', { missingTitles })
  }
}

function getIdsFromAssets (assets: Asset[]) {
  const assetIds: number[] = []
  const assetUuids: string[] = []
  const gpmsIds = new Set<string>()

  for (const asset of assets) {
    const { id, uuid, data } = asset

    assetIds.push(id)
    assetUuids.push(uuid)

    if (data?.title?.gpms_id) {
      gpmsIds.add(data.title.gpms_id)
    }
  }      

  const uniqueGpmsIds = Array.from(gpmsIds)

  return {
    assetIds,
    assetUuids,
    uniqueGpmsIds,
  }
}

async function upsertAsset(asset: Asset, existingLocalAsset: Asset, trx: Knex.Transaction) {
  let upsertedAsset: Pick<Asset, 'id'> | undefined

  if (existingLocalAsset) {
    const { id, uuid, ...rest } = asset

    upsertedAsset = await trx<Asset>('assets')
      .update({
        ...rest, // Update all fields except 'id' and 'uuid'
      })
      .where('id', existingLocalAsset.id)
      .returning(['id'])
      .first()
  } else {
    const { id, ...rest } = asset

    upsertedAsset = await trx<Asset>('assets')
      .insert({
        ...rest // Insert all fields except 'id' - let the database handle the auto-increment
      })
      .returning(['id'])
      .first()
  }

  if (!upsertedAsset) {
    throw new Error('Failed to upsert asset')
  }

  return upsertedAsset
}

async function upsertSourceAsset({
  sourceAsset,
  existingLocalSourceAsset,
  upsertedAssetId,
  trx
}: {
    sourceAsset: SourceAsset, 
    existingLocalSourceAsset:  Pick<SourceAsset, "id" | "asset_id" | "source_id" | "source_system"> | undefined,
    upsertedAssetId: Asset['id'],
    trx: Knex.Transaction
}) {
  const { source_system, source_id, asset_id, id, ...rest } = sourceAsset

  if (existingLocalSourceAsset) {
    await trx<SourceAsset>('source_assets')
      .update({
        asset_id: upsertedAssetId,
        source_system,
        source_id,
        ...rest, // Update all fields except 'id'
      })
      .where('id', existingLocalSourceAsset.id)
  } else {
    await trx<SourceAsset>('source_assets')
      .insert({
        asset_id: upsertedAssetId,
        source_system,
        source_id,
        ...rest, // Insert all fields except 'id' - let the database handle the auto-increment
      })
  }
}

async function upsertTitle({ existingLocalTitle, title, localDb }: { existingLocalTitle: Pick<Title, 'gpms_id'>, title: Title, localDb: Knex }) {
  if (existingLocalTitle) {
    const { id, gpms_id, ...rest } = title

    await localDb<Title>('titles')
      .update({
        ...rest, // Update all fields except 'id' and 'gpms_id'
      })
      .where('gpms_id', existingLocalTitle.gpms_id)
  } else {
    const { id, ...rest } = title

    await localDb<Title>('titles')
      .insert({
        ...rest // Insert all fields except 'id' - let the database handle the auto-increment
      })
  }
}