import { AdminPostProductsProductVariantsReq, Product } from "@medusajs/medusa"
import { useMedusa } from "medusa-react"
import { useContext, useEffect } from "react"
import { useForm } from "react-hook-form"
import Button from "../../../../../components/fundamentals/button"
import Modal from "../../../../../components/molecules/modal"
import LayeredModal, {
  LayeredModalContext,
} from "../../../../../components/molecules/modal/layered-modal"
import EditFlowVariantForm, {
  EditFlowVariantFormType,
} from "../../../components/variant-form/edit-flow-variant-form"
import useEditProductActions from "../../hooks/use-edit-product-actions"

type Props = {
  onClose: () => void
  open: boolean
  product: Product
}

const AddVariantModal = ({ open, onClose, product }: Props) => {
  const context = useContext(LayeredModalContext)
  const { client } = useMedusa()
  const form = useForm<EditFlowVariantFormType>({
    defaultValues: getDefaultValues(product),
  })

  const { onAddVariant, addingVariant } = useEditProductActions(product.id)

  const { handleSubmit, reset } = form

  useEffect(() => {
    reset(getDefaultValues(product))
  }, [product])

  const resetAndClose = () => {
    reset(getDefaultValues(product))
    onClose()
  }

  const createStockLocationsForVariant = async (
    productRes,
    stock_locations: { stocked_quantity: number; location_id: string }[]
  ) => {
    const { variants } = productRes

    const pvMap = new Map(product.variants.map((v) => [v.id, true]))
    const addedVariant = variants.find((variant) => !pvMap.get(variant.id))

    const inventory = await client.admin.variants.getInventory(addedVariant.id)

    console.log(inventory)

    await Promise.all(
      inventory.variant.inventory
        .map(async (item) => {
          return Promise.all(
            stock_locations.map(async (stock_location) => {
              client.admin.inventoryItems.createLocationLevel(item.id!, {
                location_id: stock_location.location_id,
                stocked_quantity: stock_location.stocked_quantity,
              })
            })
          )
        })
        .flat()
    )
  }

  const onSubmit = handleSubmit((data) => {
    const {
      stock: { stock_location },
    } = data
    delete data.stock.stock_location

    onAddVariant(createAddPayload(data), (productRes) => {
      if (typeof stock_location !== "undefined") {
        createStockLocationsForVariant(productRes, stock_location).then(() => {
          resetAndClose()
        })
      } else {
        resetAndClose()
      }
    })
  })

  return (
    <LayeredModal context={context} open={open} handleClose={resetAndClose}>
      <Modal.Body>
        <Modal.Header handleClose={resetAndClose}>
          <h1 className="inter-xlarge-semibold">Add Variant</h1>
        </Modal.Header>
        <form onSubmit={onSubmit}>
          <Modal.Content>
            <EditFlowVariantForm form={form} />
          </Modal.Content>
          <Modal.Footer>
            <div className="flex items-center justify-end w-full gap-x-xsmall">
              <Button
                variant="secondary"
                size="small"
                type="button"
                onClick={resetAndClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="small"
                type="submit"
                loading={addingVariant}
              >
                Save and close
              </Button>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Body>
    </LayeredModal>
  )
}

const getDefaultValues = (product: Product): EditFlowVariantFormType => {
  const options = product.options.map((option) => ({
    title: option.title,
    id: option.id,
    value: "",
  }))

  return {
    general: {
      title: null,
      material: null,
    },
    stock: {
      sku: null,
      ean: null,
      upc: null,
      barcode: null,
      inventory_quantity: null,
      manage_inventory: false,
      allow_backorder: false,
      stock_location: [],
    },
    options: options,
    prices: {
      prices: [],
    },
    dimensions: {
      weight: null,
      width: null,
      height: null,
      length: null,
    },
    customs: {
      mid_code: null,
      hs_code: null,
      origin_country: null,
    },
  }
}

export const createAddPayload = (
  data: EditFlowVariantFormType
): AdminPostProductsProductVariantsReq => {
  const { general, stock, options, prices, dimensions, customs } = data

  const priceArray = prices.prices
    .filter((price) => typeof price.amount === "number")
    .map((price) => {
      return {
        amount: price.amount,
        currency_code: price.region_id ? undefined : price.currency_code,
        region_id: price.region_id,
      }
    })

  return {
    // @ts-ignore
    ...general,
    ...customs,
    ...stock,
    inventory_quantity: stock.inventory_quantity || 0,
    ...dimensions,
    ...customs,
    // @ts-ignore
    origin_country: customs.origin_country
      ? customs.origin_country.value
      : null,
    // @ts-ignore
    prices: priceArray,
    title: data.general.title || `${options?.map((o) => o.value).join(" / ")}`,
    options: options.map((option) => ({
      option_id: option.id,
      value: option.value,
    })),
  }
}

export default AddVariantModal