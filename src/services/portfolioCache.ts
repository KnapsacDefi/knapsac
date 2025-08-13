interface CachedPortfolio {
  data: any[];
  timestamp: number;
  version: string;
}

interface CalculatedFields {
  is_eligible: boolean;
  claimable_amount: number;
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
    if (!entry.lending_pool || !entry.lend_period) {
      return {
        is_eligible: false,
        claimable_amount: 0
      };
    }

    // Check eligibility based on expected_claim_date from database
    const now = new Date();
    const expectedClaimDate = new Date(entry.expected_claim_date);
    const isEligible = now >= expectedClaimDate && entry.payment_status !== 'completed';
    
    // Calculate claimable amount based on interest
    const principal = parseFloat(entry.lend_amount) || 0;
    const monthlyInterest = parseFloat(entry.lending_pool.monthly_interest) || 0;
    const periods = entry.lend_period / 30; // Convert days to months
    const interest = principal * (monthlyInterest / 100) * periods;
    
    return {
      is_eligible: isEligible,
      claimable_amount: principal + interest
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