interface CachedWalletData {
  profile: any;
  subscription: any;
  usdcBalance: number;
  gooddollarBalance: number;
  timestamp: number;
}

interface WalletCacheEntry {
  data: CachedWalletData;
  loading: boolean;
  promise?: Promise<any>;
}

class WalletCache {
  private cache = new Map<string, WalletCacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL;
  }

  private getCacheKey(walletAddress: string): string {
    return `wallet_${walletAddress.toLowerCase()}`;
  }

  get(walletAddress: string): CachedWalletData | null {
    const key = this.getCacheKey(walletAddress);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (this.isExpired(entry.data.timestamp)) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(walletAddress: string, data: Partial<CachedWalletData>): void {
    const key = this.getCacheKey(walletAddress);
    const existing = this.cache.get(key);
    
    const cachedData: CachedWalletData = {
      profile: data.profile ?? existing?.data.profile ?? null,
      subscription: data.subscription ?? existing?.data.subscription ?? null,
      usdcBalance: data.usdcBalance ?? existing?.data.usdcBalance ?? 0,
      gooddollarBalance: data.gooddollarBalance ?? existing?.data.gooddollarBalance ?? 0,
      timestamp: Date.now()
    };

    this.cache.set(key, {
      data: cachedData,
      loading: false
    });
  }

  setPartial(walletAddress: string, field: keyof CachedWalletData, value: any): void {
    const key = this.getCacheKey(walletAddress);
    const existing = this.cache.get(key);
    
    if (existing) {
      existing.data[field] = value;
      existing.data.timestamp = Date.now();
    } else {
      const partialData: Partial<CachedWalletData> = { [field]: value };
      this.set(walletAddress, partialData);
    }
  }

  isLoading(walletAddress: string): boolean {
    const key = this.getCacheKey(walletAddress);
    const entry = this.cache.get(key);
    return entry?.loading || false;
  }

  setLoading(walletAddress: string, loading: boolean): void {
    const key = this.getCacheKey(walletAddress);
    const existing = this.cache.get(key);
    
    if (existing) {
      existing.loading = loading;
    } else {
      this.cache.set(key, {
        data: {
          profile: null,
          subscription: null,
          usdcBalance: 0,
          gooddollarBalance: 0,
          timestamp: Date.now()
        },
        loading
      });
    }
  }

  invalidate(walletAddress: string): void {
    const key = this.getCacheKey(walletAddress);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get last updated time for UI display
  getLastUpdated(walletAddress: string): string | null {
    const cached = this.get(walletAddress);
    if (!cached) return null;
    
    const diff = Date.now() - cached.timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  }
}

export const walletCache = new WalletCache();