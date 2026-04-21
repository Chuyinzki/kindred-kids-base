export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          absence_reason: string | null
          check_in_am: string | null
          check_in_pm: string | null
          check_out_am: string | null
          check_out_pm: string | null
          child_id: string
          created_at: string
          date: string
          id: string
          marked_absent: boolean
        }
        Insert: {
          absence_reason?: string | null
          check_in_am?: string | null
          check_in_pm?: string | null
          check_out_am?: string | null
          check_out_pm?: string | null
          child_id: string
          created_at?: string
          date?: string
          id?: string
          marked_absent?: boolean
        }
        Update: {
          absence_reason?: string | null
          check_in_am?: string | null
          check_in_pm?: string | null
          check_out_am?: string | null
          check_out_pm?: string | null
          child_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_absent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          cancel_at_period_end: boolean
          complimentary_note: string | null
          created_at: string
          current_period_ends_at: string | null
          id: string
          is_complimentary: boolean
          last_checkout_session_id: string | null
          last_invoice_status: string | null
          last_payment_error: string | null
          raw_customer: Json | null
          raw_subscription: Json | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          complimentary_note?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          is_complimentary?: boolean
          last_checkout_session_id?: string | null
          last_invoice_status?: string | null
          last_payment_error?: string | null
          raw_customer?: Json | null
          raw_subscription?: Json | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          complimentary_note?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          id?: string
          is_complimentary?: boolean
          last_checkout_session_id?: string | null
          last_invoice_status?: string | null
          last_payment_error?: string | null
          raw_customer?: Json | null
          raw_subscription?: Json | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          child_id_number: string
          created_at: string
          dob: string
          family_number: string
          family_pin: string
          id: string
          name: string
          parent_name: string
          provider_id: string
          specialist_tech_no: string | null
          updated_at: string
        }
        Insert: {
          child_id_number: string
          created_at?: string
          dob: string
          family_number: string
          family_pin: string
          id?: string
          name: string
          parent_name: string
          provider_id: string
          specialist_tech_no?: string | null
          updated_at?: string
        }
        Update: {
          child_id_number?: string
          created_at?: string
          dob?: string
          family_number?: string
          family_pin?: string
          id?: string
          name?: string
          parent_name?: string
          provider_id?: string
          specialist_tech_no?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      kiosk_sessions: {
        Row: {
          created_at: string
          daycare_name: string | null
          expires_at: string
          provider_id: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          daycare_name?: string | null
          expires_at?: string
          provider_id: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          daycare_name?: string | null
          expires_at?: string
          provider_id?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: []
      }
      monthly_sheets: {
        Row: {
          child_id: string
          created_at: string
          id: string
          month: number
          total_month_hours: number
          year: number
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          month: number
          total_month_hours?: number
          year: number
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          month?: number
          total_month_hours?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_sheets_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          complimentary_note: string | null
          created_at: string
          current_period_ends_at: string | null
          daycare_name: string | null
          id: string
          is_complimentary: boolean
          provider_alt_id: string | null
          provider_name: string | null
          provider_number: string | null
          stripe_customer_id: string | null
          subscription_price_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          subscription_updated_at: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          complimentary_note?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          daycare_name?: string | null
          id?: string
          is_complimentary?: boolean
          provider_alt_id?: string | null
          provider_name?: string | null
          provider_number?: string | null
          stripe_customer_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_updated_at?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          complimentary_note?: string | null
          created_at?: string
          current_period_ends_at?: string | null
          daycare_name?: string | null
          id?: string
          is_complimentary?: boolean
          provider_alt_id?: string | null
          provider_name?: string | null
          provider_number?: string | null
          stripe_customer_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          subscription_updated_at?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      create_kiosk_session: {
        Args: {
          daycare_name_override?: string
        }
        Returns: {
          daycare_name: string
          expires_at: string
          token: string
        }[]
      }
      kiosk_get_child_state: {
        Args: {
          child_uuid: string
          entered_pin: string
          session_token: string
        }
        Returns: {
          check_in_am: string | null
          check_in_pm: string | null
          check_out_am: string | null
          check_out_pm: string | null
          id: string
          marked_absent: boolean
        }[]
      }
      kiosk_list_children: {
        Args: {
          session_token: string
        }
        Returns: {
          id: string
          name: string
          parent_name: string
        }[]
      }
      kiosk_record_attendance: {
        Args: {
          action_name: string
          child_uuid: string
          entered_pin: string
          session_token: string
        }
        Returns: {
          attendance_id: string
          check_in_am: string | null
          check_in_pm: string | null
          check_out_am: string | null
          check_out_pm: string | null
          marked_absent: boolean
          message: string
        }[]
      }
      sync_billing_state: {
        Args: {
          _cancel_at_period_end: boolean
          _current_period_ends_at: string | null
          _last_checkout_session_id: string | null
          _last_invoice_status: string | null
          _last_payment_error: string | null
          _raw_customer: Json | null
          _raw_subscription: Json | null
          _stripe_customer_id: string | null
          _stripe_price_id: string | null
          _stripe_subscription_id: string | null
          _subscription_status: Database["public"]["Enums"]["subscription_status"]
          _trial_ends_at: string | null
          _user_id: string
        }
        Returns: undefined
      }
      user_has_billing_access: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "guest"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "unpaid"
        | "expired"
        | "incomplete"
        | "incomplete_expired"
        | "not_started"
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
    Enums: {
      app_role: ["admin", "guest"],
      subscription_status: ["trialing", "active", "past_due", "canceled", "unpaid", "expired", "incomplete", "incomplete_expired", "not_started"],
    },
  },
} as const
