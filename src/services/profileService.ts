import { supabase } from "@/integrations/supabase/client";

export interface ProfileCreationData {
  userEmail?: string;
  walletAddress: string;
  profileType: "Startup" | "Lender" | "Service Provider";
  signedTermsHash: string;
}

export const profileService = {
  async checkExistingProfile(walletAddress: string) {
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('crypto_address', walletAddress)
      .maybeSingle();

    if (checkError) {
      console.error("Database check error:", checkError);
      throw new Error('Failed to check existing profile');
    }

    return existingProfile;
  },

  async createProfile(data: ProfileCreationData) {
    const { error } = await supabase
      .from('profiles')
      .insert({
        user_email: data.userEmail || '', // Optional metadata
        crypto_address: data.walletAddress,
        profile_type: data.profileType,
        signed_terms_hash: data.signedTermsHash,
      });

    if (error) {
      throw error;
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