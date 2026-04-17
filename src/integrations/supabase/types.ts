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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      athletes: {
        Row: {
          birth_date: string | null
          coach_id: string
          created_at: string
          first_name: string | null
          id: string
          is_captain: boolean
          is_libero: boolean
          last_name: string
          notes: string | null
          number: number | null
          role: string | null
          society_id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          coach_id: string
          created_at?: string
          first_name?: string | null
          id?: string
          is_captain?: boolean
          is_libero?: boolean
          last_name: string
          notes?: string | null
          number?: number | null
          role?: string | null
          society_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          coach_id?: string
          created_at?: string
          first_name?: string | null
          id?: string
          is_captain?: boolean
          is_libero?: boolean
          last_name?: string
          notes?: string | null
          number?: number | null
          role?: string | null
          society_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      match_actions: {
        Row: {
          attack_code: string | null
          away_score: number
          code: string | null
          created_at: string
          end_zone: number | null
          evaluation: string
          home_score: number
          id: string
          match_id: string
          player_number: number
          serve_type: string | null
          set_number: number
          skill: string
          start_zone: number | null
          team: string
          timestamp: string | null
        }
        Insert: {
          attack_code?: string | null
          away_score?: number
          code?: string | null
          created_at?: string
          end_zone?: number | null
          evaluation: string
          home_score?: number
          id?: string
          match_id: string
          player_number: number
          serve_type?: string | null
          set_number?: number
          skill: string
          start_zone?: number | null
          team: string
          timestamp?: string | null
        }
        Update: {
          attack_code?: string | null
          away_score?: number
          code?: string | null
          created_at?: string
          end_zone?: number | null
          evaluation?: string
          home_score?: number
          id?: string
          match_id?: string
          player_number?: number
          serve_type?: string | null
          set_number?: number
          skill?: string
          start_zone?: number | null
          team?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_actions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number
          away_sets_won: number
          coach_id: string
          created_at: string
          home_score: number
          home_sets_won: number
          id: string
          is_ended: boolean
          match_data: Json | null
          match_date: string | null
          opponent: string | null
          society_id: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_score?: number
          away_sets_won?: number
          coach_id: string
          created_at?: string
          home_score?: number
          home_sets_won?: number
          id?: string
          is_ended?: boolean
          match_data?: Json | null
          match_date?: string | null
          opponent?: string | null
          society_id: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_score?: number
          away_sets_won?: number
          coach_id?: string
          created_at?: string
          home_score?: number
          home_sets_won?: number
          id?: string
          is_ended?: boolean
          match_data?: Json | null
          match_date?: string | null
          opponent?: string | null
          society_id?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      societies: {
        Row: {
          accent_color: string
          created_at: string
          created_by: string | null
          features: Json
          font_family: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string
          slug: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          created_by?: string | null
          features?: Json
          font_family?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string
          slug: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          created_by?: string | null
          features?: Json
          font_family?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      society_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          society_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          society_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          society_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_invitations_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_guidelines: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          society_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          society_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          society_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_guidelines_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          society_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          society_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          society_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_societies: {
        Args: { _user_id: string }
        Returns: {
          society_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_society_admin: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      is_society_member: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "society_admin" | "coach"
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
      app_role: ["super_admin", "society_admin", "coach"],
    },
  },
} as const
