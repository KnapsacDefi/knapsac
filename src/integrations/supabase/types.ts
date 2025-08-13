export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      lending_pool: {
        Row: {
          closing_date: string
          created_at: string
          id: string
          max_lend_period: number
          min_lend_period: number
          monthly_interest: number
          recipient_address: string
          startup_id: string | null
          status: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          closing_date: string
          created_at?: string
          id?: string
          max_lend_period: number
          min_lend_period: number
          monthly_interest: number
          recipient_address: string
          startup_id?: string | null
          status?: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          closing_date?: string
          created_at?: string
          id?: string
          max_lend_period?: number
          min_lend_period?: number
          monthly_interest?: number
          recipient_address?: string
          startup_id?: string | null
          status?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lending_pool_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio: {
        Row: {
          chain: string
          claim_amount: number | null
          claim_currency: string | null
          claim_date: string | null
          claim_transaction_hash: string | null
          created_at: string
          expected_claim_date: string
          id: string
          lend_amount: number
          lend_period: number
          lend_token: string
          lend_transaction_hash: string | null
          lending_pool_id: string
          payment_status: string
          payment_token: string | null
          recipient_address: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chain: string
          claim_amount?: number | null
          claim_currency?: string | null
          claim_date?: string | null
          claim_transaction_hash?: string | null
          created_at?: string
          expected_claim_date: string
          id?: string
          lend_amount: number
          lend_period: number
          lend_token: string
          lend_transaction_hash?: string | null
          lending_pool_id: string
          payment_status?: string
          payment_token?: string | null
          recipient_address: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chain?: string
          claim_amount?: number | null
          claim_currency?: string | null
          claim_date?: string | null
          claim_transaction_hash?: string | null
          created_at?: string
          expected_claim_date?: string
          id?: string
          lend_amount?: number
          lend_period?: number
          lend_token?: string
          lend_transaction_hash?: string | null
          lending_pool_id?: string
          payment_status?: string
          payment_token?: string | null
          recipient_address?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_lending_pool_id_fkey"
            columns: ["lending_pool_id"]
            isOneToOne: false
            referencedRelation: "lending_pool"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credit_score: number | null
          credit_score_recommendation: string | null
          crypto_address: string
          id: string
          profile_type: string
          show_all_tokens: boolean | null
          signed_terms_hash: string | null
          updated_at: string
          user_email: string | null
        }
        Insert: {
          created_at?: string
          credit_score?: number | null
          credit_score_recommendation?: string | null
          crypto_address: string
          id?: string
          profile_type: string
          show_all_tokens?: boolean | null
          signed_terms_hash?: string | null
          updated_at?: string
          user_email?: string | null
        }
        Update: {
          created_at?: string
          credit_score?: number | null
          credit_score_recommendation?: string | null
          crypto_address?: string
          id?: string
          profile_type?: string
          show_all_tokens?: boolean | null
          signed_terms_hash?: string | null
          updated_at?: string
          user_email?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          additional_data: Json | null
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          operation_type: string
          success: boolean
          user_agent: string | null
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          additional_data?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          operation_type: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          additional_data?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          operation_type?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      signature_nonces: {
        Row: {
          created_at: string
          id: string
          signature_hash: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          signature_hash: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          signature_hash?: string
          wallet_address?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string | null
          subscription_type: string
          transaction_hash: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          end_date: string
          id?: string
          start_date?: string
          status?: string | null
          subscription_type: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string | null
          subscription_type?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          chain: string
          conversion_rate: number | null
          created_at: string
          id: string
          mobile_network: string | null
          order_id: string | null
          paybox_response: Json | null
          recipient_address: string | null
          recipient_currency: string | null
          recipient_phone: string | null
          status: string
          token_symbol: string
          transaction_hash: string | null
          transaction_type: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          amount: number
          chain: string
          conversion_rate?: number | null
          created_at?: string
          id?: string
          mobile_network?: string | null
          order_id?: string | null
          paybox_response?: Json | null
          recipient_address?: string | null
          recipient_currency?: string | null
          recipient_phone?: string | null
          status?: string
          token_symbol: string
          transaction_hash?: string | null
          transaction_type: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          amount?: number
          chain?: string
          conversion_rate?: number | null
          created_at?: string
          id?: string
          mobile_network?: string | null
          order_id?: string | null
          paybox_response?: Json | null
          recipient_address?: string | null
          recipient_currency?: string | null
          recipient_phone?: string | null
          status?: string
          token_symbol?: string
          transaction_hash?: string | null
          transaction_type?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_nonces: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
