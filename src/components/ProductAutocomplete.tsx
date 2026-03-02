import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Product } from "@/types"

interface ProductAutocompleteProps {
  products: Product[]
  value: string
  onChange: (value: string) => void
  onSelect: (product: Product) => void
  onCreateProduct?: () => void
  placeholder?: string
  type: "name" | "hsn"
  className?: string
}

export function ProductAutocomplete({
  products,
  value,
  onChange,
  onSelect,
  onCreateProduct,
  placeholder = "Select product...",
  type,
  className,
}: ProductAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  const normalize = React.useCallback((text: string) => text.trim().toLowerCase(), [])

  // Update internal input value when prop changes
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const filteredProducts = React.useMemo(() => {
    if (!inputValue) return products.slice(0, 50) // Show first 50 if empty
    
    const search = inputValue.toLowerCase()
    return products.filter((product) => {
      const blob = [
        product.name,
        product.hsnCode,
        product.model || "",
        product.itemNo || "",
        product.storage || "",
        product.color || "",
        product.barcode || "",
      ]
        .join(" ")
        .toLowerCase()
      if (type === "name") {
        return blob.includes(search)
      } else {
        return blob.includes(search)
      }
    }).slice(0, 50) // Limit results for performance
  }, [products, inputValue, type])

  const hasExactMatch = React.useMemo(() => {
    const typed = normalize(inputValue)
    if (!typed) return false
    return products.some((product) => {
      const productValue = type === "name" ? product.name : product.hsnCode || ""
      return normalize(productValue) === typed
    })
  }, [inputValue, normalize, products, type])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
           <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal text-left px-3", !value && "text-muted-foreground", className)}
          >
            {value || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}> 
          <CommandInput 
            placeholder={placeholder} 
            value={inputValue}
            onValueChange={(val) => {
                setInputValue(val)
                onChange(val)
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return
              if (hasExactMatch) return
              e.preventDefault()
              e.stopPropagation()
              onChange(inputValue)
              setOpen(false)
            }}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No product found.</p>
                {onCreateProduct && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onCreateProduct()
                      setOpen(false)
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Product
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {onCreateProduct && (
                <CommandItem
                  value="__create_product__"
                  onSelect={() => {
                    onCreateProduct()
                    setOpen(false)
                  }}
                  className="font-medium text-primary"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Product
                </CommandItem>
              )}
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={type === "name" ? product.name : product.hsnCode}
                  onSelect={() => {
                    const newValue = type === "name" ? product.name : product.hsnCode
                    setInputValue(newValue)
                    onChange(newValue)
                    onSelect(product)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === (type === "name" ? product.name : product.hsnCode) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{product.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        product.model || "",
                        product.storage || "",
                        product.color || "",
                        product.hsnCode ? `HSN: ${product.hsnCode}` : "",
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
