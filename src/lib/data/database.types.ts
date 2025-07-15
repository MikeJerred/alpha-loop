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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      loops: {
        Row: {
          borrow_apr_daily: number
          borrow_apr_monthly: number
          borrow_apr_weekly: number
          borrow_apr_yearly: number
          borrow_asset_address: string
          borrow_asset_symbol: string
          chain_id: number
          created_at: string
          id: number
          link: string
          liquidity_usd: number
          lltv: number
          max_ltv: number
          protocol: string
          supply_apr_daily: number
          supply_apr_monthly: number
          supply_apr_weekly: number
          supply_apr_yearly: number
          supply_asset_address: string
          supply_asset_symbol: string
        }
        Insert: {
          borrow_apr_daily?: number
          borrow_apr_monthly?: number
          borrow_apr_weekly?: number
          borrow_apr_yearly?: number
          borrow_asset_address?: string
          borrow_asset_symbol?: string
          chain_id?: number
          created_at?: string
          id?: number
          link?: string
          liquidity_usd?: number
          lltv?: number
          max_ltv?: number
          protocol?: string
          supply_apr_daily?: number
          supply_apr_monthly?: number
          supply_apr_weekly?: number
          supply_apr_yearly?: number
          supply_asset_address?: string
          supply_asset_symbol?: string
        }
        Update: {
          borrow_apr_daily?: number | null
          borrow_apr_monthly?: number | null
          borrow_apr_weekly?: number | null
          borrow_apr_yearly?: number | null
          borrow_asset_address?: string | null
          borrow_asset_symbol?: string | null
          chain_id?: number | null
          created_at?: string
          id?: number
          link?: string | null
          liquidity_usd?: number | null
          lltv?: number | null
          max_ltv?: number | null
          protocol?: string | null
          supply_apr_daily?: number | null
          supply_apr_monthly?: number | null
          supply_apr_weekly?: number | null
          supply_apr_yearly?: number | null
          supply_asset_address?: string | null
          supply_asset_symbol?: string | null
        }
        Relationships: []
      }
      yields: {
        Row: {
          asset_symbol: string
          created_at: string
          id: number
          yield_apr_daily: number | null
          yield_apr_monthly: number | null
          yield_apr_weekly: number | null
          yield_apr_yearly: number | null
        }
        Insert: {
          asset_symbol: string
          created_at?: string
          id?: number
          yield_apr_daily?: number | null
          yield_apr_monthly?: number | null
          yield_apr_weekly?: number | null
          yield_apr_yearly?: number | null
        }
        Update: {
          asset_symbol?: string
          created_at?: string
          id?: number
          yield_apr_daily?: number | null
          yield_apr_monthly?: number | null
          yield_apr_weekly?: number | null
          yield_apr_yearly?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      loops_with_yields: {
        Row: {
          borrow_apr_daily: number
          borrow_apr_monthly: number
          borrow_apr_weekly: number
          borrow_apr_yearly: number
          borrow_asset_address: string
          borrow_asset_symbol: string
          borrow_yield_daily: number | null
          borrow_yield_monthly: number | null
          borrow_yield_weekly: number | null
          borrow_yield_yearly: number | null
          chain_id: number
          created_at: string
          id: number
          link: string
          liquidity_usd: number
          lltv: number
          max_ltv: number
          protocol: string
          supply_apr_daily: number
          supply_apr_monthly: number
          supply_apr_weekly: number
          supply_apr_yearly: number
          supply_asset_address: string
          supply_asset_symbol: string
          supply_yield_daily: number | null
          supply_yield_monthly: number | null
          supply_yield_weekly: number | null
          supply_yield_yearly: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
