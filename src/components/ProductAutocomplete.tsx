import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
  placeholder?: string
  type: "name" | "hsn"
  className?: string
}

export function ProductAutocomplete({
  products,
  value,
  onChange,
  onSelect,
  placeholder = "Select product...",
  type,
  className,
}: ProductAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  // Update internal input value when prop changes
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const filteredProducts = React.useMemo(() => {
    if (!inputValue) return products.slice(0, 50) // Show first 50 if empty
    
    const search = inputValue.toLowerCase()
    return products.filter((product) => {
      if (type === "name") {
        return product.name.toLowerCase().includes(search)
      } else {
        return product.hsnCode.toLowerCase().includes(search)
      }
    }).slice(0, 50) // Limit results for performance
  }, [products, inputValue, type])

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
          />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
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
                    {product.hsnCode && (
                       <span className="text-xs text-muted-foreground">HSN: {product.hsnCode}</span>
                    )}
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
