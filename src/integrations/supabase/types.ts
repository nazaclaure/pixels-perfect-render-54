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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      claims: {
        Row: {
          answer1: string | null
          answer2: string | null
          claimant_id: string
          created_at: string
          details: string
          id: string
          item_id: string
          reject_reason: string | null
          reviewed_at: string | null
          status: string
        }
        Insert: {
          answer1?: string | null
          answer2?: string | null
          claimant_id?: string
          created_at?: string
          details: string
          id?: string
          item_id: string
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          answer1?: string | null
          answer2?: string | null
          claimant_id?: string
          created_at?: string
          details?: string
          id?: string
          item_id?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "found_items"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          claim_id: string | null
          delivered_at: string
          delivered_by: string
          id: string
          identity_checked: boolean
          item_id: string
          recipient_ci: string
          recipient_name: string
        }
        Insert: {
          claim_id?: string | null
          delivered_at?: string
          delivered_by?: string
          id?: string
          identity_checked?: boolean
          item_id: string
          recipient_ci: string
          recipient_name: string
        }
        Update: {
          claim_id?: string | null
          delivered_at?: string
          delivered_by?: string
          id?: string
          identity_checked?: boolean
          item_id?: string
          recipient_ci?: string
          recipient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "found_items"
            referencedColumns: ["id"]
          },
        ]
      }
      found_item_secrets: {
        Row: {
          item_id: string
          private_detail: string | null
          question1: string | null
          question2: string | null
        }
        Insert: {
          item_id: string
          private_detail?: string | null
          question1?: string | null
          question2?: string | null
        }
        Update: {
          item_id?: string
          private_detail?: string | null
          question1?: string | null
          question2?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "found_item_secrets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "found_items"
            referencedColumns: ["id"]
          },
        ]
      }
      found_items: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          finder_id: string
          found_date: string
          id: string
          location: string
          name: string
          office_location: string | null
          photo_path: string
          status: Database["public"]["Enums"]["item_status"]
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          finder_id?: string
          found_date: string
          id?: string
          location: string
          name: string
          office_location?: string | null
          photo_path: string
          status?: Database["public"]["Enums"]["item_status"]
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          finder_id?: string
          found_date?: string
          id?: string
          location?: string
          name?: string
          office_location?: string | null
          photo_path?: string
          status?: Database["public"]["Enums"]["item_status"]
        }
        Relationships: []
      }
      lost_reports: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          location: string
          lost_date: string
          name: string
          photo_path: string | null
          user_id: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location: string
          lost_date: string
          name: string
          photo_path?: string | null
          user_id?: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string
          lost_date?: string
          name?: string
          photo_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
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
      admin_deliver: {
        Args: {
          _ci: string
          _claim_id: string
          _item_id: string
          _name: string
        }
        Returns: undefined
      }
      admin_list_claims: {
        Args: never
        Returns: {
          answer1: string
          answer2: string
          claimant_email: string
          claimant_name: string
          created_at: string
          details: string
          id: string
          item_category: string
          item_description: string
          item_id: string
          item_name: string
          item_photo: string
          item_status: Database["public"]["Enums"]["item_status"]
          private_detail: string
          question1: string
          question2: string
          reject_reason: string
          status: string
        }[]
      }
      admin_list_items: {
        Args: never
        Returns: {
          category: string
          color: string
          created_at: string
          description: string
          finder_email: string
          finder_name: string
          found_date: string
          id: string
          location: string
          name: string
          office_location: string
          photo_path: string
          status: Database["public"]["Enums"]["item_status"]
        }[]
      }
      admin_review_claim: {
        Args: { _accept: boolean; _claim_id: string; _reason: string }
        Returns: undefined
      }
      admin_summary: { Args: never; Returns: Json }
      assert_encargado: { Args: never; Returns: undefined }
      get_item_questions: {
        Args: { _item_id: string }
        Returns: {
          question1: string
          question2: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "miembro" | "encargado"
      item_status: "por_recibir" | "disponible" | "en_revision" | "entregado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["miembro", "encargado"],
      item_status: ["por_recibir", "disponible", "en_revision", "entregado"],
    },
  },
} as const
