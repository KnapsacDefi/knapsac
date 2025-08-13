interface CachedLendingPool {
  data: any;
  timestamp: number;
  version: string;
}

interface CachedLendingPools {
  [poolId: string]: CachedLendingPool;
}

class LendingPoolCache {
  private readonly CACHE_KEY = 'lending_pool_cache';
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly BASIC_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for basic info
  private readonly CACHE_VERSION = '1.0';

  private isExpired(timestamp: number, isBasic = false): boolean {
    const duration = isBasic ? this.BASIC_CACHE_DURATION : this.CACHE_DURATION;
    return Date.now() - timestamp > duration;
  }

  private getCache(): CachedLendingPools {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return {};
      return JSON.parse(cached);
    } catch (error) {
      console.warn('Error reading lending pool cache:', error);
      this.clear();
      return {};
    }
  }

  private setCache(cache: CachedLendingPools): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Error saving lending pool cache:', error);
    }
  }

  get(poolId: string): any | null {
    try {
      const cache = this.getCache();
      const cachedPool = cache[poolId];
      
      if (!cachedPool) return null;
      
      // Check if it's basic info (no funding data) for longer cache
      const isBasic = !cachedPool.data.total_lent && !cachedPool.data.funding_progress;
      
      if (cachedPool.version !== this.CACHE_VERSION || this.isExpired(cachedPool.timestamp, isBasic)) {
        this.invalidate(poolId);
        return null;
      }

      return cachedPool.data;
    } catch (error) {
      console.warn('Error reading lending pool cache:', error);
      this.invalidate(poolId);
      return null;
    }
  }

  set(poolId: string, data: any): void {
    try {
      const cache = this.getCache();
      cache[poolId] = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      this.setCache(cache);
    } catch (error) {
      console.warn('Error saving lending pool cache:', error);
    }
  }

  invalidate(poolId: string): void {
    try {
      const cache = this.getCache();
      delete cache[poolId];
      this.setCache(cache);
    } catch (error) {
      console.warn('Error invalidating lending pool cache:', error);
    }
  }

  clear(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Invalidate all cache entries (useful after portfolio changes)
  invalidateAll(): void {
    this.clear();
  }

  // Warm cache with multiple pools (used when browsing pool lists)
  warmCache(pools: any[]): void {
    if (!pools || !Array.isArray(pools)) return;
    
    pools.forEach(pool => {
      if (pool.id) {
        this.set(pool.id, pool);
      }
    });
  }

  getLastUpdated(poolId: string): string | null {
    try {
      const cache = this.getCache();
      const cachedPool = cache[poolId];
      if (!cachedPool) return null;
      
      return new Date(cachedPool.timestamp).toLocaleTimeString();
    } catch {
      return null;
    }
  }
}

export const lendingPoolCache = new LendingPoolCache();