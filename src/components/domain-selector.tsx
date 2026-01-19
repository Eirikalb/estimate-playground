"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DomainInfo {
  id: string;
  name: string;
}

// Available domains - this should match what's in src/domains/
export const AVAILABLE_DOMAINS: DomainInfo[] = [
  { id: "real-estate-yield", name: "Real Estate Yield" },
  { id: "financial-forecasting", name: "Financial Forecasting" },
];

interface DomainSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function DomainSelector({ value, onValueChange, className }: DomainSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select domain..." />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_DOMAINS.map((domain) => (
          <SelectItem key={domain.id} value={domain.id}>
            <span className="font-medium">{domain.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Helper to get domain name by ID
export function getDomainName(id: string): string {
  const domain = AVAILABLE_DOMAINS.find(d => d.id === id);
  return domain?.name || id;
}

// Helper to get short domain name for display
export function getShortDomainName(id: string): string {
  const mapping: Record<string, string> = {
    "real-estate-yield": "Real Estate",
    "financial-forecasting": "Finance",
  };
  return mapping[id] || id;
}
