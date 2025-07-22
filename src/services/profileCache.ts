
interface CachedProfile {
  data: any;
  timestamp: number;
  loading: boolean;
}

interface ProfileCacheEntry {
  profile: CachedProfile;
  promise?: Promise<any>;
}

class ProfileCache {
  private cache = new Map<string, ProfileCacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.TTL;
  }

  private getCacheKey(walletAddress: string): string {
    return `profile_${walletAddress.toLowerCase()}`;
  }

  get(walletAddress: string): any | null {
    const key = this.getCacheKey(walletAddress);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (this.isExpired(entry.profile.timestamp)) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.profile.data;
  }

  set(walletAddress: string, data: any): void {
    const key = this.getCacheKey(walletAddress);
    this.cache.set(key, {
      profile: {
        data,
        timestamp: Date.now(),
        loading: false
      }
    });
  }

  isLoading(walletAddress: string): boolean {
    const key = this.getCacheKey(walletAddress);
    const entry = this.cache.get(key);
    return entry?.profile.loading || false;
  }

  setLoading(walletAddress: string, loading: boolean): void {
    const key = this.getCacheKey(walletAddress);
    const existing = this.cache.get(key);
    
    if (existing) {
      existing.profile.loading = loading;
    } else {
      this.cache.set(key, {
        profile: {
          data: null,
          timestamp: Date.now(),
          loading
        }
      });
    }
  }

  getOrSetPromise(walletAddress: string, promiseFactory: () => Promise<any>): Promise<any> {
    const key = this.getCacheKey(walletAddress);
    const entry = this.cache.get(key);
    
    // If we have a valid cached result, return it
    const cachedData = this.get(walletAddress);
    if (cachedData !== null) {
      return Promise.resolve(cachedData);
    }
    
    // If there's already a promise in flight, return it
    if (entry?.promise) {
      return entry.promise;
    }
    
    // Set loading state and create new promise
    this.setLoading(walletAddress, true);
    
    const promise = promiseFactory()
      .then((result) => {
        this.set(walletAddress, result);
        this.setLoading(walletAddress, false);
        return result;
      })
      .catch((error) => {
        this.setLoading(walletAddress, false);
        // Remove the promise from cache on error
        const currentEntry = this.cache.get(key);
        if (currentEntry) {
          delete currentEntry.promise;
        }
        throw error;
      });
    
    // Store the promise
    const currentEntry = this.cache.get(key);
    if (currentEntry) {
      currentEntry.promise = promise;
    }
    
    return promise;
  }

  invalidate(walletAddress: string): void {
    const key = this.getCacheKey(walletAddress);
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getStats() {
    const entries = Array.from(this.cache.entries());
    return {
      totalEntries: entries.length,
      validEntries: entries.filter(([_, entry]) => !this.isExpired(entry.profile.timestamp)).length,
      loadingEntries: entries.filter(([_, entry]) => entry.profile.loading).length
    };
  }
}

// Export singleton instance
export const profileCache = new ProfileCache();
