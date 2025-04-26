type Environment = 'int' | 'stg' | 'prd'


type TableDefaults = {
  id: number
  created_at: Date
  updated_at: Date
  soft_deleted_at: Date | null
}

type AssetData = {
  title?: {
    title_id?: Title['title_id']
  }
}

type AssetStatus = 'active' | 'inactive'

type Asset = TableDefaults & {
  uuid: string
  data: AssetData | null
  status: AssetStatus
}

type SourceSystem = 'system_1' | 'system_2' | 'system_3'

type SourceAsset = TableDefaults & {
  asset_id: Asset['id']
  data: Record<string, any> | null
  source_id: string
  source_system: SourceSystem
  status: AssetStatus
}

type Title = TableDefaults & {
  data: Record<string, any> | null
  title_id: string
  name: string
}