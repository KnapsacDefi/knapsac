interface CachedPortfolio {
  data: any[];
  timestamp: number;
  version: string;
}

interface CalculatedFields {
  is_eligible: boolean;
  claimable_amount: number;
  eligible_date: string;
}

class PortfolioCache {
  private readonly CACHE_KEY = 'portfolio_cache';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_VERSION = '1.0';

  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.CACHE_DURATION;
  }

  get(): any[] | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const parsedCache: CachedPortfolio = JSON.parse(cached);
      
      if (parsedCache.version !== this.CACHE_VERSION || this.isExpired(parsedCache.timestamp)) {
        this.clear();
        return null;
      }

      return parsedCache.data;
    } catch (error) {
      console.warn('Error reading portfolio cache:', error);
      this.clear();
      return null;
    }
  }

  set(data: any[]): void {
    try {
      const cacheData: CachedPortfolio = {
        data,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Error saving portfolio cache:', error);
    }
  }

  clear(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }

  // Calculate client-side fields for progressive loading
  calculateFields(entry: any): CalculatedFields {
    const lendingPool = entry.lending_pool;
    const currentDate = new Date();
    const closingDate = new Date(lendingPool.closing_date);
    const eligibleDate = new Date(closingDate.getTime() + (lendingPool.min_lend_period * 24 * 60 * 60 * 1000));
    
    const isEligible = currentDate > eligibleDate;
    
    let claimableAmount = 0;
    if (isEligible) {
      const eligibleDays = Math.floor((currentDate.getTime() - closingDate.getTime()) / (24 * 60 * 60 * 1000));
      const eligibleMonths = eligibleDays / 30;
      const interestMultiplier = 1 + (eligibleMonths * (parseFloat(lendingPool.monthly_interest) / 100));
      claimableAmount = parseFloat(entry.lend_amount) * interestMultiplier;
    }
    
    return {
      is_eligible: isEligible,
      claimable_amount: claimableAmount,
      eligible_date: eligibleDate.toISOString()
    };
  }

  getLastUpdated(): string | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const parsedCache: CachedPortfolio = JSON.parse(cached);
      return new Date(parsedCache.timestamp).toLocaleTimeString();
    } catch {
      return null;
    }
  }
}

export const portfolioCache = new PortfolioCache();