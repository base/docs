# fetchOnrampOptions

## Overview

The `fetchOnrampOptions` utility is a powerful function that retrieves jurisdiction-specific onramp data, including supported fiat currencies and available cryptocurrency assets. This utility is essential for building compliant onramp experiences that respect regional regulatory requirements and asset availability.

## Table of Contents
- [Overview](#overview)
- [What is fetchOnrampOptions?](#what-is-fetchonrampoptions)
- [Use Cases](#use-cases)
- [Prerequisites](#prerequisites)
- [Basic Usage](#basic-usage)
- [Parameters](#parameters)
- [Return Value](#return-value)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)
- [Country-Specific Guidelines](#country-specific-guidelines)
- [Troubleshooting](#troubleshooting)
- [Related Resources](#related-resources)

---

## What is fetchOnrampOptions?

`fetchOnrampOptions` queries the Coinbase Onramp API to determine:

1. **Available Fiat Currencies** - Which fiat currencies can be used for purchases (e.g., USD, EUR, GBP)
2. **Supported Crypto Assets** - Which cryptocurrencies can be purchased in the specified jurisdiction
3. **Network Availability** - Which blockchain networks are available for each asset
4. **Regional Restrictions** - Jurisdiction-specific limitations and requirements

This information enables you to:
- Build compliant onramp flows that only show available options
- Provide accurate asset selection based on user location
- Handle regional variations in supported assets and currencies
- Create seamless user experiences with pre-filtered options

---

## Use Cases

### 1. Dynamic Asset Filtering
Filter available cryptocurrencies based on user location to ensure compliance:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

async function getAvailableAssets(country: string, subdivision?: string) {
  const options = await fetchOnrampOptions({ 
    country, 
    subdivision,
    apiKey: process.env.ONRAMP_API_KEY 
  });
  
  return options.assets.map(asset => ({
    id: asset.id,
    name: asset.name,
    availableNetworks: asset.networks.length
  }));
}
```

### 2. Currency Selection UI
Build a currency selector that only shows available options:

```tsx
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';
import { useState, useEffect } from 'react';

function CurrencySelector({ country, subdivision }) {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrencies() {
      try {
        const options = await fetchOnrampOptions({ country, subdivision });
        setCurrencies(options.fiatCurrencies);
      } catch (error) {
        console.error('Failed to load currencies:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadCurrencies();
  }, [country, subdivision]);

  if (loading) return <div>Loading currencies...</div>;

  return (
    <select>
      {currencies.map(currency => (
        <option key={currency.id} value={currency.id}>
          {currency.symbol} {currency.name}
        </option>
      ))}
    </select>
  );
}
```

### 3. Compliance Validation
Validate that a user's intended purchase is available in their region:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

async function validatePurchase(
  country: string,
  subdivision: string | undefined,
  assetId: string,
  fiatCurrencyId: string
): Promise<{ valid: boolean; reason?: string }> {
  const options = await fetchOnrampOptions({ country, subdivision });

  // Check if fiat currency is supported
  const isFiatSupported = options.fiatCurrencies.some(
    currency => currency.id === fiatCurrencyId
  );
  
  if (!isFiatSupported) {
    return { 
      valid: false, 
      reason: `${fiatCurrencyId} is not supported in ${country}` 
    };
  }

  // Check if asset is available
  const isAssetAvailable = options.assets.some(
    asset => asset.id === assetId
  );
  
  if (!isAssetAvailable) {
    return { 
      valid: false, 
      reason: `${assetId} is not available for purchase in ${country}` 
    };
  }

  return { valid: true };
}
```

### 4. Network Selection
Display available networks for a specific asset:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

async function getAssetNetworks(
  country: string,
  assetId: string,
  subdivision?: string
) {
  const options = await fetchOnrampOptions({ country, subdivision });
  
  const asset = options.assets.find(a => a.id === assetId);
  
  if (!asset) {
    throw new Error(`Asset ${assetId} not available in ${country}`);
  }

  return asset.networks.map(network => ({
    id: network.id,
    name: network.name,
    chainId: network.config.chainId
  }));
}

// Usage
const ethNetworks = await getAssetNetworks('US', 'ETH', 'CA');
console.log(ethNetworks);
// [{ id: 'ethereum', name: 'Ethereum', chainId: '0x1' }, ...]
```

---

## Prerequisites

### API Key Requirements
You need a Coinbase Onramp API key to use this utility. There are two ways to provide it:

1. **Via OnchainKitProvider** (React applications):
   ```tsx
   import { OnchainKitProvider } from '@coinbase/onchainkit';
   
   function App() {
     return (
       <OnchainKitProvider apiKey="your-api-key">
         {/* Your app */}
       </OnchainKitProvider>
     );
   }
   ```

2. **Direct Parameter** (non-React or outside provider):
   ```typescript
   const options = await fetchOnrampOptions({
     country: 'US',
     subdivision: 'CA',
     apiKey: 'your-api-key'
   });
   ```

### Getting an API Key
1. Visit the [Coinbase Developer Platform](https://portal.cdp.coinbase.com)
2. Create a project or select an existing one
3. Navigate to the Onramp section
4. Generate or copy your API key

### Dependencies
```bash
npm install @coinbase/onchainkit
# or
yarn add @coinbase/onchainkit
# or
pnpm add @coinbase/onchainkit
```

---

## Basic Usage

### Simple Example

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

async function checkAvailability() {
  const options = await fetchOnrampOptions({
    country: 'US',
    subdivision: 'CA', // Required for US
    apiKey: process.env.ONRAMP_API_KEY
  });

  console.log('Available currencies:', options.fiatCurrencies);
  console.log('Available assets:', options.assets);
}

checkAvailability();
```

### React Component Example

```tsx
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';
import { useState, useEffect } from 'react';

function OnrampOptions({ country, subdivision }) {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const data = await fetchOnrampOptions({ 
          country, 
          subdivision 
        });
        setOptions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, [country, subdivision]);

  if (loading) return <div>Loading options...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>Available Currencies</h3>
      <ul>
        {options.fiatCurrencies.map(currency => (
          <li key={currency.id}>
            {currency.symbol} {currency.name}
          </li>
        ))}
      </ul>

      <h3>Available Assets</h3>
      <ul>
        {options.assets.map(asset => (
          <li key={asset.id}>
            {asset.name} ({asset.networks.length} networks)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Next.js Server-Side Example

```typescript
// app/api/onramp-options/route.ts
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');
  const subdivision = searchParams.get('subdivision');

  if (!country) {
    return NextResponse.json(
      { error: 'Country parameter is required' },
      { status: 400 }
    );
  }

  try {
    const options = await fetchOnrampOptions({
      country,
      subdivision: subdivision || undefined,
      apiKey: process.env.ONRAMP_API_KEY
    });

    return NextResponse.json(options);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch onramp options' },
      { status: 500 }
    );
  }
}
```

---

## Parameters

### Complete Parameter Reference

```typescript
interface FetchOnrampOptionsParams {
  country: string;
  subdivision?: string;
  apiKey?: string;
}
```

### `country` (required)

**Type:** `string`

**Description:** ISO 3166-1 alpha-2 two-letter country code representing the user's country of residence.

**Format:** Uppercase two-letter code (e.g., `'US'`, `'GB'`, `'DE'`)

**Examples:**
```typescript
// United States
fetchOnrampOptions({ country: 'US', subdivision: 'NY' });

// United Kingdom
fetchOnrampOptions({ country: 'GB' });

// Germany
fetchOnrampOptions({ country: 'DE' });

// Japan
fetchOnrampOptions({ country: 'JP' });

// Brazil
fetchOnrampOptions({ country: 'BR' });
```

**Validation:**
- Must be a valid ISO 3166-1 alpha-2 code
- Must be uppercase
- Cannot be empty or null

**Common Country Codes:**
| Country | Code | Subdivision Required |
|---------|------|---------------------|
| United States | US | Yes |
| United Kingdom | GB | No |
| Canada | CA | No |
| Germany | DE | No |
| France | FR | No |
| Japan | JP | No |
| Australia | AU | No |
| Brazil | BR | No |
| India | IN | No |
| Singapore | SG | No |

### `subdivision` (conditionally required)

**Type:** `string | undefined`

**Description:** ISO 3166-2 two-letter subdivision code representing the user's state or province within their country.

**Required When:**
- `country = 'US'` - Required for United States residents due to state-specific regulations

**Format:** Uppercase two-letter code (e.g., `'NY'`, `'CA'`, `'TX'`)

**Examples:**
```typescript
// US residents - subdivision required
fetchOnrampOptions({ country: 'US', subdivision: 'CA' }); // California
fetchOnrampOptions({ country: 'US', subdivision: 'NY' }); // New York
fetchOnrampOptions({ country: 'US', subdivision: 'TX' }); // Texas

// Non-US residents - subdivision optional
fetchOnrampOptions({ country: 'GB' }); // UK - no subdivision needed
fetchOnrampOptions({ country: 'CA' }); // Canada - optional
```

**US State Codes Reference:**
| State | Code | State | Code |
|-------|------|-------|------|
| Alabama | AL | Montana | MT |
| Alaska | AK | Nebraska | NE |
| Arizona | AZ | Nevada | NV |
| Arkansas | AR | New Hampshire | NH |
| California | CA | New Jersey | NJ |
| Colorado | CO | New Mexico | NM |
| Connecticut | CT | New York | NY |
| Delaware | DE | North Carolina | NC |
| Florida | FL | North Dakota | ND |
| Georgia | GA | Ohio | OH |
| Hawaii | HI | Oklahoma | OK |
| Idaho | ID | Oregon | OR |
| Illinois | IL | Pennsylvania | PA |
| Indiana | IN | Rhode Island | RI |
| Iowa | IA | South Carolina | SC |
| Kansas | KS | South Dakota | SD |
| Kentucky | KY | Tennessee | TN |
| Louisiana | LA | Texas | TX |
| Maine | ME | Utah | UT |
| Maryland | MD | Vermont | VT |
| Massachusetts | MA | Virginia | VA |
| Michigan | MI | Washington | WA |
| Minnesota | MN | West Virginia | WV |
| Mississippi | MS | Wisconsin | WI |
| Missouri | MO | Wyoming | WY |

**Why US Requires Subdivision:**
Certain US states have specific cryptocurrency regulations and restrictions. For example:
- New York requires a BitLicense for certain operations
- Some states have different asset availability
- Regulatory compliance varies by state

### `apiKey` (conditionally required)

**Type:** `string | undefined`

**Description:** Your Coinbase Onramp API key for authentication.

**Required When:**
- Using the utility outside of `OnchainKitProvider` context
- Using in a non-React environment (Node.js, serverless functions)
- Server-side rendering without provider context

**Optional When:**
- Used within a React component tree wrapped by `OnchainKitProvider`
- The provider already has an API key configured

**Examples:**
```typescript
// With explicit API key
const options = await fetchOnrampOptions({
  country: 'US',
  subdivision: 'CA',
  apiKey: 'your-api-key-here'
});

// With environment variable
const options = await fetchOnrampOptions({
  country: 'GB',
  apiKey: process.env.COINBASE_ONRAMP_API_KEY
});

// In React with provider (no apiKey needed)
function MyComponent() {
  const [options, setOptions] = useState(null);
  
  useEffect(() => {
    fetchOnrampOptions({ country: 'US', subdivision: 'CA' })
      .then(setOptions);
  }, []);
  
  // ...
}
```

**Security Best Practices:**
```typescript
// ✅ Good: Use environment variables
apiKey: process.env.COINBASE_ONRAMP_API_KEY

// ✅ Good: Server-side only
// In Next.js API route or server component
apiKey: process.env.ONRAMP_API_KEY

// ❌ Bad: Never hardcode in client-side code
apiKey: 'pk_live_123456789' // Don't do this!

// ❌ Bad: Never commit to version control
apiKey: 'your-actual-key-here' // Don't do this!
```

---

## Return Value

### Type Definition

```typescript
interface OnrampOptionsResponseData {
  fiatCurrencies: FiatCurrency[];
  assets: Asset[];
}

interface FiatCurrency {
  id: string;      // Currency code (e.g., 'USD')
  name: string;    // Full name (e.g., 'US Dollar')
  symbol: string;  // Currency symbol (e.g., '$')
}

interface Asset {
  id: string;          // Asset symbol (e.g., 'ETH')
  name: string;        // Full name (e.g., 'Ethereum')
  networks: Network[]; // Available networks
}

interface Network {
  id: string;    // Network identifier (e.g., 'ethereum')
  name: string;  // Display name (e.g., 'Ethereum')
  config: {
    chainId: string;  // Hex chain ID (e.g., '0x1')
  };
}
```

### Example Response

```typescript
{
  fiatCurrencies: [
    {
      id: "USD",
      name: "US Dollar",
      symbol: "$"
    },
    {
      id: "EUR",
      name: "Euro",
      symbol: "€"
    }
  ],
  assets: [
    {
      id: "ETH",
      name: "Ethereum",
      networks: [
        {
          id: "ethereum",
          name: "Ethereum",
          config: {
            chainId: "0x1"  // Mainnet
          }
        },
        {
          id: "base",
          name: "Base",
          config: {
            chainId: "0x2105"  // Base mainnet
          }
        }
      ]
    },
    {
      id: "BTC",
      name: "Bitcoin",
      networks: [
        {
          id: "bitcoin",
          name: "Bitcoin",
          config: {
            chainId: "0x0"  // Bitcoin doesn't use EVM chain IDs
          }
        }
      ]
    },
    {
      id: "USDC",
      name: "USD Coin",
      networks: [
        {
          id: "ethereum",
          name: "Ethereum",
          config: {
            chainId: "0x1"
          }
        },
        {
          id: "base",
          name: "Base",
          config: {
            chainId: "0x2105"
          }
        },
        {
          id: "polygon",
          name: "Polygon",
          config: {
            chainId: "0x89"
          }
        }
      ]
    }
  ]
}
```

### Understanding the Response

#### Fiat Currencies Array
Each fiat currency object contains:
- **`id`**: The ISO 4217 currency code used in transactions
- **`name`**: Human-readable currency name for display
- **`symbol`**: The currency symbol for formatting amounts

```typescript
// Using fiat currency data
options.fiatCurrencies.forEach(currency => {
  console.log(`${currency.symbol} ${currency.name} (${currency.id})`);
});
// Output: $ US Dollar (USD)
```

#### Assets Array
Each asset object contains:
- **`id`**: The asset symbol/ticker (e.g., ETH, BTC, USDC)
- **`name`**: Full asset name for display
- **`networks`**: Array of blockchain networks where this asset can be purchased

```typescript
// Finding a specific asset
const eth = options.assets.find(asset => asset.id === 'ETH');
console.log(`${eth.name} available on ${eth.networks.length} networks`);
```

#### Networks Array
Each network object contains:
- **`id`**: Network identifier for API calls
- **`name`**: Display name for the network
- **`config.chainId`**: Hexadecimal chain ID for wallet connections

```typescript
// Converting chain ID to decimal
const chainIdHex = network.config.chainId;
const chainIdDecimal = parseInt(chainIdHex, 16);

// Example: '0x1' -> 1 (Ethereum Mainnet)
// Example: '0x2105' -> 8453 (Base Mainnet)
```

---

## Advanced Usage

### 1. Caching Strategy

Implement caching to reduce API calls and improve performance:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

interface CacheEntry {
  data: OnrampOptionsResponseData;
  timestamp: number;
}

class OnrampOptionsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number; // Time to live in milliseconds

  constructor(ttlMinutes: number = 60) {
    this.ttl = ttlMinutes * 60 * 1000;
  }

  private getCacheKey(country: string, subdivision?: string): string {
    return `${country}${subdivision ? `-${subdivision}` : ''}`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  async getOptions(
    country: string,
    subdivision?: string
  ): Promise<OnrampOptionsResponseData> {
    const key = this.getCacheKey(country, subdivision);
    const cached = this.cache.get(key);

    if (cached && !this.isExpired(cached)) {
      console.log('Cache hit for', key);
      return cached.data;
    }

    console.log('Cache miss for', key);
    const data = await fetchOnrampOptions({ 
      country, 
      subdivision,
      apiKey: process.env.ONRAMP_API_KEY 
    });

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(country: string, subdivision?: string): void {
    const key = this.getCacheKey(country, subdivision);
    this.cache.delete(key);
  }
}

// Usage
const cache = new OnrampOptionsCache(30); // 30-minute TTL

async function getOptions(country: string, subdivision?: string) {
  return cache.getOptions(country, subdivision);
}
```

### 2. Custom React Hook

Create a reusable hook with built-in caching and error handling:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';
import { useState, useEffect, useCallback } from 'react';

interface UseOnrampOptionsResult {
  options: OnrampOptionsResponseData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useOnrampOptions(
  country: string,
  subdivision?: string
): UseOnrampOptionsResult {
  const [options, setOptions] = useState<OnrampOptionsResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOnrampOptions({ 
        country, 
        subdivision 
      });
      setOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [country, subdivision]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, loading, error, refetch: fetchOptions };
}

// Usage
function AssetSelector({ country, subdivision }) {
  const { options, loading, error, refetch } = useOnrampOptions(
    country,
    subdivision
  );

  if (loading) return <div>Loading assets...</div>;
  if (error) {
    return (
      <div>
        <p>Error loading options: {error.message}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <select>
      {options?.assets.map(asset => (
        <option key={asset.id} value={asset.id}>
          {asset.name}
        </option>
      ))}
    </select>
  );
}
```

### 3. Location Detection Integration

Combine with geolocation to automatically detect user location:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

interface LocationData {
  country: string;
  subdivision?: string;
}

async function detectUserLocation(): Promise<LocationData> {
  // Using a geolocation API service
  const response = await fetch('https://ipapi.co/json/');
  const data = await response.json();
  
  return {
    country: data.country_code,
    subdivision: data.region_code || undefined
  };
}

async function getOptionsForUser(): Promise<OnrampOptionsResponseData> {
  const location = await detectUserLocation();
  
  console.log(`Detected location: ${location.country}`, location.subdivision);
  
  return fetchOnrampOptions({
    country: location.country,
    subdivision: location.subdivision,
    apiKey: process.env.ONRAMP_API_KEY
  });
}

// React component example
function AutoDetectOnramp() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [options, setOptions] = useState(null);

  useEffect(() => {
    async function setup() {
      const userLocation = await detectUserLocation();
      setLocation(userLocation);
      
      const onrampOptions = await fetchOnrampOptions({
        country: userLocation.country,
        subdivision: userLocation.subdivision
      });
      setOptions(onrampOptions);
    }

    setup();
  }, []);

  if (!location || !options) {
    return <div>Detecting your location...</div>;
  }

  return (
    <div>
      <p>Your location: {location.country} {location.subdivision}</p>
      <AssetList assets={options.assets} />
    </div>
  );
}
```

### 4. Multi-Region Comparison

Compare available options across different regions:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

interface RegionComparison {
  country: string;
  subdivision?: string;
  fiatCurrencies: number;
  assets: number;
  uniqueAssets: string[];
}

async function compareRegions(
  regions: Array<{ country: string; subdivision?: string }>
): Promise<RegionComparison[]> {
  const comparisons = await Promise.all(
    regions.map(async (region) => {
      const options = await fetchOnrampOptions({
        ...region,
        apiKey: process.env.ONRAMP_API_KEY
      });

      return {
        ...region,
        fiatCurrencies: options.fiatCurrencies.length,
        assets: options.assets.length,
        uniqueAssets: options.assets.map(a => a.id)
      };
    })
  );

  return comparisons;
}

// Usage
const comparison = await compareRegions([
  { country: 'US', subdivision: 'NY' },
  { country: 'US', subdivision: 'CA' },
  { country: 'GB' },
  { country: 'DE' }
]);

console.table(comparison);
```

### 5. Asset Availability Checker

Create a utility to check if specific assets are available:

```typescript
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';

interface AssetAvailability {
  available: boolean;
  networks?: Network[];
  reason?: string;
}

async function checkAssetAvailability(
  country: string,
  assetId: string,
  subdivision?: string
): Promise<AssetAvailability> {
  try {
    const options = await fetchOnrampOptions({ 
      country, 
      subdivision,
      apiKey: process.env.ONRAMP_API_KEY 
    });

    const asset = options.assets.find(a => a.id === assetId);

    if (!asset) {
      return {
        available: false,
        reason: `${assetId} is not available in ${country}`
      };
    }

    return {
      available: true,
      networks: asset.networks
    };
  } catch (error) {
    return {
      available: false,
      reason: `Error checking availability: ${error.message}`
    };
  }
}

// Usage
const ethAvailability = await checkAssetAvailability('US', 'ETH', 'CA');

if (ethAvailability.available) {
  console.log(`ETH available on networks:`, ethAvailability.networks);
} else {
  console.log(ethAvailability.reason);
}
```

### 6. Dynamic Form Builder

Build a form that adapts based on available options:

```tsx
import { fetchOnrampOptions } from '@coinbase/onchainkit/fund';
import { useState, useEffect } from 'react';

function DynamicOnrampForm({ country, subdivision }) {
  const [options, setOptions] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');

  useEffect(() => {
    async function loadOptions() {
      const data = await fetchOnrampOptions({ country, subdivision });
      setOptions(data);
      
      // Set defaults
      if (data.fiatCurrencies.length > 0) {
        setSelectedCurrency(data.fiatCurrencies[0].id);
      }
      if (data.assets.length > 0) {
        setSelectedAsset(data.assets[0].id);
        if (data.assets[0].networks.length > 0) {
          setSelectedNetwork(data.assets[0].networks[0].id);
        }
      }
    }

    loadOptions();
  }, [country, subdivision]);

  if (!options) return <div>Loading...</div>;

  const selectedAssetData = options.assets.find(a => a.id === selectedAsset);

  return (
    <form>
      <div>
        <label>Fiat Currency</label>
        <select 
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
        >
          {options.fiatCurrencies.map(currency => (
            <option key={currency.id} value={currency.id}>
              {currency.symbol} {currency.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Asset to Purchase</label>
        <select 
          value={selectedAsset}
          onChange={(e) => {
            setSelectedAsset(e.target.value);
            const asset = options.assets.find(a => a.id === e.target.value);
            if (asset && asset.networks.length > 0) {
              setSelectedNetwork(asset.networks[0].id);
            }
          }}
        >
          {options.assets.map(asset => (
            <option key={asset.id} value={asset.id}>
              {asset.name} ({asset.networks.length} networks)
            </option>
          ))}
        </select>
      </div>

      {selectedAssetData && (
        <div>
          <label>Network</label>
          <select 
            value={selectedNetwork}
            onChange={(e) => setSelectedNetwork(e.target.value)}
          >
            {selectedAssetData.networks.map(network => (
              <option key={network.id} value={network.id}>
                {network.name} (Chain ID: {network.config.chainId})
              </option>
            ))}
          </select>
        </div>
      )}

      <button type="submit">Continue to Purchase</button>
    </form>
  );
}
```

---

## Best Practices

### 1. Performance Optimization

**Cache Aggressively**
```typescript
// Cache options for at least 30-60 minutes
// Options don't change frequently
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
```

**Parallel Requests**
```typescript
// When you need options for multiple regions
const [usOptions, ukOptions] = await Promise.all([
  fetchOnrampOptions({ country: 'US', subdivision: 'CA' }),
  fetchOnrampOptions({ country: 'GB' })
]);
```

**Prefetch on Route Load**
```typescript
// In Next.js, prefetch in getServerSideProps or loader
export async function getServerSideProps() {
  const options = await fetchOnrampOptions({
    country: 'US',
    subdivision: 'CA',
    apiKey: process.env.ONRAMP_API_KEY
  });

  return { props: { options } };
}
```

### 2. Error Handling

**Graceful Fallbacks**
```typescript
async function getOptionsWithFallback(
  country: string,
  subdivision?: string
) {
  try {
    return await fetchOnrampOptions({ country, subdivision });
  } catch (error) {
    console.error('Failed to fetch options:', error);
    
    // Return empty options as fallback
    return {
      fiatCurrencies: [],
      assets: []
    };
  }
}
```

**Retry Logic**
```typescript
async function fetchWithRetry(
  params: FetchOnrampOptionsParams,
  maxRetries: number = 3
): Promise<OnrampOptionsResponseData> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchOnrampOptions(params);
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }

  throw lastError;
}
```

### 3. Type Safety

**Strict Typing**
```typescript
import type { OnrampOptionsResponseData } from '@coinbase/onchainkit/fund';

interface ProcessedOptions {
  currencies: string[];
  assetsByNetwork: Record<string, string[]>;
}

function processOptions(
  options: OnrampOptionsResponseData
): ProcessedOptions {
  return {
    currencies: options.fiatCurrencies.map(c => c.id),
    assetsByNetwork: options.assets.reduce((acc, asset) => {
      asset.networks.forEach(network => {
        if (!acc[network.id]) {
          acc[network.id] = [];
        }
        acc[network.id].push(asset.id);
      });
      return acc;
    }, {} as Record<string, string[]>)
  };
}
```

**Type Guards**
```typescript
function isValidCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

function isValidSubdivisionCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code);
}

async function safelyFetchOptions(
  country: string,
  subdivision?: string
) {
  if (!isValidCountryCode(country)) {
    throw new Error(`Invalid country code: ${country}`);
  }

  if (subdivision && !isValidSubdivisionCode(subdivision)) {
    throw new Error(`Invalid subdivision code: ${subdivision}`);
  }

  return fetchOnrampOptions({ country, subdivision });
}
```

### 4. User Experience

**Loading States**
```tsx
function LoadingAwareSelector({ country, subdivision }) {
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchOnrampOptions({ country, subdivision });
      setOptions(data);
      setLoading(false);
    }
    load();
  }, [country, subdivision]);

  if (loading) {
    return (
      <div className="skeleton">
        <div className="skeleton-select" />
        <div className="skeleton-select" />
      </div>
    );
  }

  return <AssetSelector options={options} />;
}
```

**Progressive Enhancement**
```tsx
function ProgressiveOnrampFlow() {
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState('');
  const [options, setOptions] = useState(null);

  // Step 1: Get country
  if (step === 1) {
    return (
      <CountrySelector 
        onSelect={(c) => {
          setCountry(c);
          setStep(2);
        }}
      />
    );
  }

  // Step 2: Load options and show asset selector
  if (step === 2) {
    return (
      <AssetSelector 
        country={country}
        onSelect={() => setStep(3)}
      />
    );
  }

  // Step 3: Complete purchase
  return <PurchaseForm />;
}
```

### 5. Security

**Server-Side API Keys**
```typescript
// ✅ Good: Server-side only
// pages/api/onramp-options.ts
export default async function handler(req, res) {
  const options = await fetchOnrampOptions({
    country: req.query.country,
    subdivision: req.query.subdivision,
    apiKey: process.env.ONRAMP_API_KEY // Server-side only
  });
  
  res.json(options);
}

// ❌ Bad: Client-side API key exposure
function ClientComponent() {
  const options = await fetchOnrampOptions({
    country: 'US',
    apiKey: 'pk_live_123...' // Never do this!
  });
}
```

**Input Validation**
```typescript
import { z } from 'zod';

const LocationSchema = z.object({
  country: z.string().length(2).regex(/^[A-Z]{2}$/),
  subdivision: z.string().length(2).regex(/^[A-Z]{2}$/).optional()
});

async function validatedFetchOptions(params: unknown) {
  const validated = LocationSchema.parse(params);
  return fetchOnrampOptions({
    ...validated,
    apiKey: process.env.ONRAMP_API_KEY
  });
}
```

---

## Error Handling

### Common Errors

#### 1. Missing API Key

**Error:**
```
Error: API key is required
```

**Solution:**
```typescript
// Ensure API key is provided via provider or parameter
const options = await fetchOnrampOptions({
  country: 'US',
  subdivision: 'CA',
  apiKey: process.env.ONRAMP_API_KEY // Add this
});
```

#### 2. Invalid Country Code

**Error:**
```
Error: Invalid country code
```

**Solution:**
```typescript
// Use valid ISO 3166-1 alpha-2 codes
const options = await fetchOnrampOptions({
  country: 'US', // ✅ Correct
  // country: 'USA', // ❌ Wrong - must be 2 letters
  subdivision: 'CA'
});
```

#### 3. Missing Required Subdivision

**Error:**
```
Error: Subdivision is required for US residents
```

**Solution:**
```typescript
// Always provide subdivision for US
const options = await fetchOnrampOptions({
  country: 'US',
  subdivision: 'CA' // Required for US
});
```

#### 4. Network/API Errors

**Error:**
```
Error: Failed to fetch onramp options
```

**Solution:**
```typescript
async function robustFetch(country: string, subdivision?: string) {
  try {
    return await fetchOnrampOptions({ country, subdivision });
  } catch (error) {
    if (error.message.includes('network')) {
      // Network error - retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchOnrampOptions({ country, subdivision });
    }
    
    if (error.message.includes('rate limit')) {
      // Rate limited - wait longer
      await new Promise(resolve => setTimeout(resolve, 5000));
      return fetchOnrampOptions({ country, subdivision });
    }
    
    throw error;
  }
}
```

### Comprehensive Error Handler

```typescript
interface ErrorResult {
  success: false;
  error: string;
  code: string;
}

interface SuccessResult {
  success: true;
  data: OnrampOptionsResponseData;
}

type FetchResult = SuccessResult | ErrorResult;

async function safeFetchOnrampOptions(
  country: string,
  subdivision?: string
): Promise<FetchResult> {
  try {
    // Validate inputs
    if (!country || country.length !== 2) {
      return {
        success: false,
        error: 'Invalid country code. Must be 2-letter ISO code.',
        code: 'INVALID_COUNTRY'
      };
    }

    if (country === 'US' && !subdivision) {
      return {
        success: false,
        error: 'Subdivision required for US residents.',
        code: 'MISSING_SUBDIVISION'
      };
    }

    // Fetch options
    const data = await fetchOnrampOptions({ 
      country, 
      subdivision,
      apiKey: process.env.ONRAMP_API_KEY
    });

    return {
      success: true,
      data
    };

  } catch (error) {
    console.error('fetchOnrampOptions error:', error);

    if (error.message.includes('API key')) {
      return {
        success: false,
        error: 'API key is missing or invalid.',
        code: 'INVALID_API_KEY'
      };
    }

    if (error.message.includes('rate limit')) {
      return {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED'
      };
    }

    return {
      success: false,
      error: 'Failed to fetch onramp options. Please try again.',
      code: 'UNKNOWN_ERROR'
    };
  }
}

// Usage
const result = await safeFetchOnrampOptions('US', 'CA');

if (result.success) {
  console.log('Options:', result.data);
} else {
  console.error(`Error [${result.code}]:`, result.error);
}
```

---

## Country-Specific Guidelines

### United States

**Requirements:**
- Subdivision (state code) is **mandatory**
- Different states may have different asset restrictions

**Example:**
```typescript
// California
const caOptions = await fetchOnrampOptions({
  country: 'US',
  subdivision: 'CA'
});

// New York
const nyOptions = await fetchOnrampOptions({
  country: 'US',
  subdivision: 'NY'
});
```

**State Considerations:**
- New York has BitLicense requirements
- Some states restrict certain assets
- Regulatory landscape varies by state

### United Kingdom

**Requirements:**
- No subdivision required
- FCA regulated

**Example:**
```typescript
const ukOptions = await fetchOnrampOptions({
  country: 'GB'
});
```

### European Union

**Requirements:**
- Use country-specific codes (DE, FR, IT, etc.)
- No subdivision typically required
- MiCA regulation applies

**Examples:**
```typescript
// Germany
const deOptions = await fetchOnrampOptions({ country: 'DE' });

// France
const frOptions = await fetchOnrampOptions({ country: 'FR' });

// Netherlands
const nlOptions = await fetchOnrampOptions({ country: 'NL' });
```

### Asia-Pacific

**Requirements vary by country:**

```typescript
// Japan
const jpOptions = await fetchOnrampOptions({ country: 'JP' });

// Singapore
const sgOptions = await fetchOnrampOptions({ country: 'SG' });

// Australia
const auOptions = await fetchOnrampOptions({ country: 'AU' });

// South Korea
const krOptions = await fetchOnrampOptions({ country: 'KR' });
```

---

## Troubleshooting

### Issue: Empty Assets Array

**Symptom:** `options.assets` returns an empty array

**Possible Causes:**
1. The country/region doesn't support crypto purchases
2. Regulatory restrictions in that jurisdiction
3. Service temporarily unavailable in that region

**Solution:**
```typescript
const options = await fetchOnrampOptions({ country, subdivision });

if (options.assets.length === 0) {
  console.warn(`No assets available in ${country}`);
  // Show appropriate message to user
  return 'Crypto purchases are not available in your region';
}
```

### Issue: Unexpected Asset Restrictions

**Symptom:** Expected assets are missing from the response

**Cause:** Regional regulatory restrictions

**Solution:**
```typescript
// Check if specific asset is available
function isAssetAvailable(
  options: OnrampOptionsResponseData,
  assetId: string
): boolean {
  return options.assets.some(asset => asset.id === assetId);
}

const hasETH = isAssetAvailable(options, 'ETH');
if (!hasETH) {
  console.log('ETH not available in this region');
}
```

### Issue: Stale Data

**Symptom:** Options seem outdated

**Cause:** Aggressive caching without invalidation

**Solution:**
```typescript
// Implement cache invalidation
class CacheWithInvalidation {
  private cache = new Map();

  async getOptions(country: string, subdivision?: string) {
    const key = `${country}-${subdivision}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.data;
    }

    const data = await fetchOnrampOptions({ country, subdivision });
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  invalidateAll() {
    this.cache.clear();
  }
}
```

### Issue: Slow Response Times

**Symptom:** Function takes several seconds to respond

**Solutions:**

1. **Implement caching:**
```typescript
// Cache at application level
const optionsCache = new Map();

async function getCachedOptions(country: string, subdivision?: string) {
  const key = `${country}-${subdivision}`;
  
  if (optionsCache.has(key)) {
    return optionsCache.get(key);
  }

  const options = await fetchOnrampOptions({ country, subdivision });
  optionsCache.set(key, options);
  return options;
}
```

2. **Use server-side caching:**
```typescript
// In Next.js with SWR
import useSWR from 'swr';

function useOnrampOptions(country: string, subdivision?: string) {
  const { data, error } = useSWR(
    ['onramp-options', country, subdivision],
    () => fetchOnrampOptions({ country, subdivision }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000 // 1 hour
    }
  );

  return { options: data, loading: !error && !data, error };
}
```

### Debug Helper

```typescript
async function debugFetchOnrampOptions(
  country: string,
  subdivision?: string
) {
  console.group('fetchOnrampOptions Debug');
  console.log('Parameters:', { country, subdivision });
  console.log('API Key present:', !!process.env.ONRAMP_API_KEY);
  console.time('Fetch duration');

  try {
    const options = await fetchOnrampOptions({ 
      country, 
      subdivision,
      apiKey: process.env.ONRAMP_API_KEY
    });

    console.log('Success!');
    console.log('Fiat currencies:', options.fiatCurrencies.length);
    console.log('Assets:', options.assets.length);
    console.log('Assets list:', options.assets.map(a => a.id));
    console.timeEnd('Fetch duration');
    
    return options;

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.timeEnd('Fetch duration');
    throw error;

  } finally {
    console.groupEnd();
  }
}
```

---

## Related Resources

### OnchainKit Documentation
- [OnchainKit Overview](https://onchainkit.xyz)
- [Fund Components](https://onchainkit.xyz/fund/introduction)
- [Type Definitions](https://onchainkit.xyz/fund/types)
- [Getting Started Guide](https://onchainkit.xyz/getting-started)

### API References
- [`fetchOnrampOptions` API](https://onchainkit.xyz/fund/fetch-onramp-options)
- [`OnrampOptionsResponseData` Type](https://onchainkit.xyz/fund/types#onrampoptionsresponsedata)
- [Coinbase Onramp API Documentation](https://docs.cdp.coinbase.com/onramp)

### Related Utilities
- `FundButton` - Complete onramp UI component
- `fetchOnrampQuote` - Get pricing for transactions
- `fetchOnrampTransaction` - Check transaction status

### External Resources
- [ISO 3166-1 Country Codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
- [ISO 3166-2 Subdivision Codes](https://en.wikipedia.org/wiki/ISO_3166-2)
- [Coinbase Developer Platform](https://portal.cdp.coinbase.com)

### Community
- [OnchainKit GitHub](https://github.com/coinbase/onchainkit)
- [Discord Community](https://discord.gg/coinbase)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/onchainkit)

---

## Summary

The `fetchOnrampOptions` utility is essential for building compliant, user-friendly onramp experiences. Key takeaways:

✅ **Always provide country code** (ISO 3166-1 alpha-2)  
✅ **Provide subdivision for US users** (state code required)  
✅ **Implement caching** to improve performance  
✅ **Handle errors gracefully** with fallbacks  
✅ **Validate inputs** before making API calls  
✅ **Secure API keys** (use environment variables)  
✅ **Test with multiple regions** to ensure compatibility

By following this guide, you'll be able to integrate Coinbase Onramp seamlessly into your application while respecting regional regulations and providing excellent user experience.

---

**Last Updated:** January 2026

For the latest information and updates, visit the [official OnchainKit documentation](https://onchainkit.xyz).
