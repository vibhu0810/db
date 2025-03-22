import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { CheckIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { countryCodes } from "@/lib/country-codes";

interface PhoneInputProps {
  value: string; 
  onChange: (value: string) => void;
  defaultCountry?: string; // Country code (e.g., "US")
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  defaultCountry = "US", // Default to United States
  className,
  placeholder = "Enter phone number",
  disabled = false
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState(
    countryCodes.find(country => country.code === defaultCountry) || 
    countryCodes.find(country => country.code === "US")
  );
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Parse the value into countryCode and phoneNumber on initial load
  React.useEffect(() => {
    if (value) {
      // Check if the value starts with a dial code
      const matchedCountry = countryCodes.find(country => value.startsWith(country.dialCode));
      
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(value.substring(matchedCountry.dialCode.length).trim());
      } else {
        // If no dial code is found, just set the phone number portion
        setPhoneNumber(value);
      }
    }
  }, []);

  // Update the combined value whenever country or phone number changes
  React.useEffect(() => {
    const combinedValue = `${selectedCountry?.dialCode} ${phoneNumber}`.trim();
    onChange(combinedValue);
  }, [selectedCountry, phoneNumber, onChange]);

  const handleCountrySelect = (country: typeof selectedCountry) => {
    setSelectedCountry(country);
    setOpen(false);
    // Focus the input after selecting a country
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  return (
    <div className={cn("flex", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="flex-shrink-0 px-3 focus:ring-0 rounded-r-none border-r-0"
            style={{ minWidth: "85px" }}
          >
            <span className="mr-1">{selectedCountry?.flag}</span>
            <span className="hidden sm:inline">{selectedCountry?.dialCode}</span>
            <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            <CommandInput placeholder="Search country or code..." className="sticky top-0 z-10" />
            <CommandEmpty>No country found.</CommandEmpty>
            <ScrollArea className="h-[300px]">
              <CommandGroup>
                {countryCodes.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.country} ${country.dialCode}`}
                    onSelect={() => handleCountrySelect(country)}
                    className="flex items-center gap-2"
                  >
                    <span className="mr-1">{country.flag}</span>
                    <span className="flex-1 truncate">{country.country}</span>
                    <span className="text-muted-foreground">{country.dialCode}</span>
                    {selectedCountry?.code === country.code && (
                      <CheckIcon className="ml-auto h-4 w-4 opacity-100" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        ref={inputRef}
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneNumberChange}
        placeholder={placeholder}
        className="rounded-l-none"
        disabled={disabled}
      />
    </div>
  );
}