"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Domain {
  id: string;
  name: string;
}

interface DomainSelectorProps {
  value: string;
  onValueChange: (domainId: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Static list of available domains for synchronous access
 * This is updated when domains are fetched from the API
 */
export const AVAILABLE_DOMAINS: Domain[] = [
  { id: "real-estate-yield", name: "Norwegian Commercial Real Estate Yield" },
  { id: "financial-forecasting", name: "Company Revenue Growth Rate Estimation" },
];

/**
 * Get a short display name for a domain ID
 */
export function getShortDomainName(domainId: string): string {
  const shortNames: Record<string, string> = {
    "real-estate-yield": "Real Estate",
    "financial-forecasting": "Financial",
  };
  return shortNames[domainId] || domainId;
}

/**
 * Get the full domain name for a domain ID
 */
export function getDomainName(domainId: string): string {
  const domain = AVAILABLE_DOMAINS.find((d) => d.id === domainId);
  return domain?.name || domainId;
}

export function DomainSelector({
  value,
  onValueChange,
  disabled = false,
  className,
}: DomainSelectorProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/domains")
      .then((res) => res.json())
      .then((data) => {
        setDomains(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load domains:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading domains..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select domain..." />
      </SelectTrigger>
      <SelectContent>
        {domains.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">
            No domains available
          </div>
        ) : (
          domains.map((domain) => (
            <SelectItem key={domain.id} value={domain.id}>
              {domain.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export default DomainSelector;
