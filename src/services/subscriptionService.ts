import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionCreationData {
  subscriptionType: 'early_bird' | 'standard';
  amountPaid: number;
  transactionHash?: string;
  endDate: string;
}

// Secure subscription service that uses wallet signatures for authentication
export const subscriptionService = {
  // Helper function to create a signature message with nonce
  createSecurityMessage(operation: string, walletAddress: string, privyUserId: string, timestamp: number, nonce?: string): string {
    const nonceString = nonce || Math.random().toString(36).substring(2, 15);
    return `Authorize ${operation} operation for wallet ${walletAddress} and user ${privyUserId} at ${timestamp} with nonce ${nonceString}`;
  },

  async getSubscription(walletAddress: string, privyUserId: string, signature: string) {
    const timestamp = Date.now();
    const message = this.createSecurityMessage('getSubscription', walletAddress, privyUserId, timestamp);

    try {
      const { data, error } = await supabase.functions.invoke('secure-subscription-operations', {
        body: {
          operation: 'get',
          walletAddress,
          privyUserId,
          signature,
          message
        }
      });

      if (error) {
        console.error("Secure subscription get error:", error);
        throw new Error('Failed to get subscription');
      }

      return data.subscription;
    } catch (error) {
      console.error("Subscription get failed:", error);
      throw new Error('Failed to get subscription');
    }
  },

  async createSubscription(walletAddress: string, privyUserId: string, subscriptionData: SubscriptionCreationData, signature: string, message?: string) {
    // Use provided message or create a default one
    const finalMessage = message || this.createSecurityMessage('createSubscription', walletAddress, privyUserId, Date.now());

    try {
      const { data: result, error } = await supabase.functions.invoke('secure-subscription-operations', {
        body: {
          operation: 'create',
          walletAddress,
          privyUserId,
          signature,
          message: finalMessage,
          subscriptionData
        }
      });

      if (error) {
        console.error("Secure subscription creation error:", error);
        throw new Error('Failed to create subscription');
      }

      return result.subscription;
    } catch (error) {
      console.error("Subscription creation failed:", error);
      throw new Error('Failed to create subscription');
    }
  },

  async updateSubscription(walletAddress: string, privyUserId: string, subscriptionData: Partial<SubscriptionCreationData>, signature: string) {
    const timestamp = Date.now();
    const message = this.createSecurityMessage('updateSubscription', walletAddress, privyUserId, timestamp);

    try {
      const { data: result, error } = await supabase.functions.invoke('secure-subscription-operations', {
        body: {
          operation: 'update',
          walletAddress,
          privyUserId,
          signature,
          message,
          subscriptionData
        }
      });

      if (error) {
        console.error("Secure subscription update error:", error);
        throw new Error('Failed to update subscription');
      }

      return result.subscription;
    } catch (error) {
      console.error("Subscription update failed:", error);
      throw new Error('Failed to update subscription');
    }
  }
};