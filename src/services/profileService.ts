import { supabase } from "@/integrations/supabase/client";

export interface ProfileCreationData {
  userEmail?: string;
  walletAddress: string;
  profileType: "Startup" | "Lender" | "Service Provider";
  signedTermsHash: string;
}

// Secure profile service that uses wallet signatures for authentication
export const profileService = {
  // Helper function to create a signature message with nonce
  createSecurityMessage(operation: string, walletAddress: string, timestamp: number, nonce?: string): string {
    const nonceString = nonce || Math.random().toString(36).substring(2, 15);
    return `Authorize ${operation} operation for wallet ${walletAddress} at ${timestamp} with nonce ${nonceString}`;
  },

  async checkExistingProfile(walletAddress: string, signature: string) {
    const timestamp = Date.now();
    const message = this.createSecurityMessage('checkProfile', walletAddress, timestamp);

    try {
      const { data, error } = await supabase.functions.invoke('secure-profile-operations', {
        body: {
          operation: 'checkExisting',
          walletAddress,
          signature,
          message
        }
      });

      if (error) {
        console.error("Secure profile check error:", error);
        throw new Error('Failed to check existing profile');
      }

      return data.exists;
    } catch (error) {
      console.error("Profile check failed:", error);
      throw new Error('Failed to check existing profile');
    }
  },

  async getProfile(walletAddress: string, signature: string) {
    const timestamp = Date.now();
    const message = this.createSecurityMessage('getProfile', walletAddress, timestamp);

    try {
      const { data, error } = await supabase.functions.invoke('secure-profile-operations', {
        body: {
          operation: 'get',
          walletAddress,
          signature,
          message
        }
      });

      if (error) {
        console.error("Secure profile get error:", error);
        throw new Error('Failed to get profile');
      }

      return data.profile;
    } catch (error) {
      console.error("Profile get failed:", error);
      throw new Error('Failed to get profile');
    }
  },

  async createProfile(data: ProfileCreationData, signature: string, originalMessage: string) {
    try {
      console.log('🔄 ProfileService.createProfile called with:', { 
        walletAddress: data.walletAddress,
        profileType: data.profileType,
        userEmail: data.userEmail,
        signedTermsHash: data.signedTermsHash,
        signature,
        originalMessage,
        messageLength: originalMessage.length
      });
      
      const requestBody = {
        operation: 'create',
        walletAddress: data.walletAddress,
        signature,
        message: originalMessage, // Use the original signed message
        profileData: {
          userEmail: data.userEmail,
          profileType: data.profileType,
          signedTermsHash: data.signedTermsHash
        }
      };
      
      console.log('📡 Calling edge function with body:', requestBody);
      console.log('🔍 Request body validation:', {
        hasWalletAddress: !!requestBody.walletAddress,
        hasSignature: !!requestBody.signature,
        hasMessage: !!requestBody.message,
        walletAddressLength: requestBody.walletAddress?.length,
        signatureLength: requestBody.signature?.length,
        messageLength: requestBody.message?.length,
        signaturePreview: requestBody.signature?.substring(0, 10) + '...',
        messagePreview: requestBody.message?.substring(0, 50) + '...'
      });
      
      const { data: result, error } = await supabase.functions.invoke('secure-profile-operations', {
        body: requestBody
      });
      
      console.log('📨 Edge function response:', { result, error });

      if (error) {
        console.error("❌ Secure profile creation error:", {
          error,
          errorMessage: error?.message,
          errorDetails: error?.details,
          errorHint: error?.hint,
          errorCode: error?.code
        });
        throw new Error(`Failed to create profile: ${error?.message || error}`);
      }

      console.log('✅ Profile created successfully:', result);
      return result.profile;
    } catch (error) {
      console.error("❌ Profile creation failed in service:", {
        error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorType: typeof error
      });
      throw new Error(`Failed to create profile: ${error?.message || error}`);
    }
  },

  async createSignedTermsHash(message: string, signature: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message + signature);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
};