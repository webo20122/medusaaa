import { ModulesSdkTypes } from "@medusajs/modules-sdk"
import { MedusaError } from "@medusajs/utils"
import { asValue } from "awilix"
import { DataSource, DataSourceOptions } from "typeorm"
import * as StockLocationModels from "../models"
import { StockLocationServiceInitializeOptions } from "../types"

export default async (
  { options, container }: ModulesSdkTypes.LoaderOptions,
  moduleDeclaration?: ModulesSdkTypes.InternalModuleDeclaration
): Promise<void> => {
  if (
    moduleDeclaration?.scope === ModulesSdkTypes.MODULE_SCOPE.INTERNAL &&
    moduleDeclaration.resources === ModulesSdkTypes.MODULE_RESOURCE_TYPE.SHARED
  ) {
    return
  }

  const dbData =
    options?.database as StockLocationServiceInitializeOptions["database"]

  if (!dbData) {
    throw new MedusaError(
      MedusaError.Types.INVALID_ARGUMENT,
      `Database config is not present at module config "options.database"`
    )
  }

  const entities = Object.values(StockLocationModels)
  const dataSource = new DataSource({
    type: dbData.type,
    url: dbData.url,
    database: dbData.database,
    extra: dbData.extra || {},
    schema: dbData.schema,
    entities,
    logging: dbData.logging,
  } as DataSourceOptions)

  await dataSource.initialize()

  container.register({
    manager: asValue(dataSource.manager),
  })
}
