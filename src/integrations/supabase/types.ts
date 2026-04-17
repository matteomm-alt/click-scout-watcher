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
      athlete_evaluations: {
        Row: {
          athlete_id: string
          created_at: string
          evaluated_at: string
          evaluator_id: string
          fundamental: string
          id: string
          notes: string | null
          score: number
          society_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          evaluated_at?: string
          evaluator_id: string
          fundamental: string
          id?: string
          notes?: string | null
          score: number
          society_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          evaluated_at?: string
          evaluator_id?: string
          fundamental?: string
          id?: string
          notes?: string | null
          score?: number
          society_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_evaluations_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_evaluations_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_objectives: {
        Row: {
          athlete_id: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          society_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          society_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          society_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_objectives_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_objectives_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      attendances: {
        Row: {
          athlete_id: string
          event_id: string
          id: string
          note: string | null
          recorded_at: string
          recorded_by: string
          society_id: string
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          athlete_id: string
          event_id: string
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by: string
          society_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          athlete_id?: string
          event_id?: string
          id?: string
          note?: string | null
          recorded_at?: string
          recorded_by?: string
          society_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendances_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_reads: {
        Row: {
          communication_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          communication_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          communication_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_reads_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "communications"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          pinned: boolean
          priority: Database["public"]["Enums"]["communication_priority"]
          society_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          priority?: Database["public"]["Enums"]["communication_priority"]
          society_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          priority?: Database["public"]["Enums"]["communication_priority"]
          society_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      convocation_players: {
        Row: {
          athlete_id: string
          convocation_id: string
          id: string
          note: string | null
          role: Database["public"]["Enums"]["convocation_role"]
          shirt_number: number | null
        }
        Insert: {
          athlete_id: string
          convocation_id: string
          id?: string
          note?: string | null
          role?: Database["public"]["Enums"]["convocation_role"]
          shirt_number?: number | null
        }
        Update: {
          athlete_id?: string
          convocation_id?: string
          id?: string
          note?: string | null
          role?: Database["public"]["Enums"]["convocation_role"]
          shirt_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "convocation_players_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocation_players_convocation_id_fkey"
            columns: ["convocation_id"]
            isOneToOne: false
            referencedRelation: "convocations"
            referencedColumns: ["id"]
          },
        ]
      }
      convocations: {
        Row: {
          created_at: string
          created_by: string
          event_id: string | null
          id: string
          location: string | null
          match_date: string | null
          meeting_time: string | null
          notes: string | null
          society_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id?: string | null
          id?: string
          location?: string | null
          match_date?: string | null
          meeting_time?: string | null
          notes?: string | null
          society_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string | null
          id?: string
          location?: string | null
          match_date?: string | null
          meeting_time?: string | null
          notes?: string | null
          society_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convocations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convocations_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          society_id: string
          start_at: string
          team_label: string | null
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          society_id: string
          start_at: string
          team_label?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          society_id?: string
          start_at?: string
          team_label?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          duration_min: number | null
          equipment: string | null
          fundamental: string | null
          id: string
          intensity: string | null
          is_shared: boolean
          name: string
          society_id: string
          tags: string[]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          duration_min?: number | null
          equipment?: string | null
          fundamental?: string | null
          id?: string
          intensity?: string | null
          is_shared?: boolean
          name: string
          society_id: string
          tags?: string[]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          duration_min?: number | null
          equipment?: string | null
          fundamental?: string | null
          id?: string
          intensity?: string | null
          is_shared?: boolean
          name?: string
          society_id?: string
          tags?: string[]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_assignments: {
        Row: {
          assigned_at: string
          athlete_id: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          recorded_by: string
          returned_at: string | null
          society_id: string
        }
        Insert: {
          assigned_at?: string
          athlete_id: string
          id?: string
          item_id: string
          notes?: string | null
          quantity?: number
          recorded_by: string
          returned_at?: string | null
          society_id: string
        }
        Update: {
          assigned_at?: string
          athlete_id?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          recorded_by?: string
          returned_at?: string | null
          society_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_assignments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_assignments_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          quantity: number
          size: string | null
          society_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          size?: string | null
          society_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          size?: string | null
          society_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_society_id_fkey"
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
      objectives: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          scope: string
          society_id: string
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          scope?: string
          society_id: string
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          scope?: string
          society_id?: string
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "objectives_society_id_fkey"
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
      scout_actions: {
        Row: {
          action_index: number
          attack_combo: string | null
          away_rotation: number[] | null
          away_score: number
          away_setter_pos: number | null
          created_at: string
          end_subzone: string | null
          end_zone: number | null
          evaluation: string
          home_rotation: number[] | null
          home_score: number
          home_setter_pos: number | null
          id: string
          player_number: number | null
          rally_index: number
          raw_code: string
          scout_match_id: string
          scout_team_id: string
          serving_side: string | null
          set_combo: string | null
          set_number: number
          side: string
          skill: string
          skill_type: string | null
          start_zone: number | null
          timestamp_clock: string | null
        }
        Insert: {
          action_index: number
          attack_combo?: string | null
          away_rotation?: number[] | null
          away_score?: number
          away_setter_pos?: number | null
          created_at?: string
          end_subzone?: string | null
          end_zone?: number | null
          evaluation: string
          home_rotation?: number[] | null
          home_score?: number
          home_setter_pos?: number | null
          id?: string
          player_number?: number | null
          rally_index: number
          raw_code: string
          scout_match_id: string
          scout_team_id: string
          serving_side?: string | null
          set_combo?: string | null
          set_number: number
          side: string
          skill: string
          skill_type?: string | null
          start_zone?: number | null
          timestamp_clock?: string | null
        }
        Update: {
          action_index?: number
          attack_combo?: string | null
          away_rotation?: number[] | null
          away_score?: number
          away_setter_pos?: number | null
          created_at?: string
          end_subzone?: string | null
          end_zone?: number | null
          evaluation?: string
          home_rotation?: number[] | null
          home_score?: number
          home_setter_pos?: number | null
          id?: string
          player_number?: number | null
          rally_index?: number
          raw_code?: string
          scout_match_id?: string
          scout_team_id?: string
          serving_side?: string | null
          set_combo?: string | null
          set_number?: number
          side?: string
          skill?: string
          skill_type?: string | null
          start_zone?: number | null
          timestamp_clock?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_actions_scout_match_id_fkey"
            columns: ["scout_match_id"]
            isOneToOne: false
            referencedRelation: "scout_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_actions_scout_team_id_fkey"
            columns: ["scout_team_id"]
            isOneToOne: false
            referencedRelation: "scout_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_matches: {
        Row: {
          away_sets_won: number
          away_team_id: string
          city: string | null
          coach_id: string
          created_at: string
          home_sets_won: number
          home_team_id: string
          id: string
          league: string | null
          match_date: string | null
          match_time: string | null
          phase: string | null
          raw_header: Json | null
          season: string | null
          set_results: Json
          source_filename: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          away_sets_won?: number
          away_team_id: string
          city?: string | null
          coach_id: string
          created_at?: string
          home_sets_won?: number
          home_team_id: string
          id?: string
          league?: string | null
          match_date?: string | null
          match_time?: string | null
          phase?: string | null
          raw_header?: Json | null
          season?: string | null
          set_results?: Json
          source_filename?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          away_sets_won?: number
          away_team_id?: string
          city?: string | null
          coach_id?: string
          created_at?: string
          home_sets_won?: number
          home_team_id?: string
          id?: string
          league?: string | null
          match_date?: string | null
          match_time?: string | null
          phase?: string | null
          raw_header?: Json | null
          season?: string | null
          set_results?: Json
          source_filename?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "scout_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "scout_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_players: {
        Row: {
          created_at: string
          external_id: string | null
          first_name: string | null
          id: string
          is_captain: boolean
          is_libero: boolean
          last_name: string
          number: number
          role: string | null
          scout_team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          first_name?: string | null
          id?: string
          is_captain?: boolean
          is_libero?: boolean
          last_name: string
          number: number
          role?: string | null
          scout_team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          first_name?: string | null
          id?: string
          is_captain?: boolean
          is_libero?: boolean
          last_name?: string
          number?: number
          role?: string | null
          scout_team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_players_scout_team_id_fkey"
            columns: ["scout_team_id"]
            isOneToOne: false
            referencedRelation: "scout_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_teams: {
        Row: {
          city: string | null
          coach_id: string
          created_at: string
          id: string
          is_own_team: boolean
          name: string
          notes: string | null
          short_name: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          coach_id: string
          created_at?: string
          id?: string
          is_own_team?: boolean
          name: string
          notes?: string | null
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          coach_id?: string
          created_at?: string
          id?: string
          is_own_team?: boolean
          name?: string
          notes?: string | null
          short_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      season_phases: {
        Row: {
          end_date: string | null
          goals: string | null
          id: string
          load_level: string | null
          name: string
          order_index: number
          plan_id: string
          start_date: string | null
        }
        Insert: {
          end_date?: string | null
          goals?: string | null
          id?: string
          load_level?: string | null
          name: string
          order_index?: number
          plan_id: string
          start_date?: string | null
        }
        Update: {
          end_date?: string | null
          goals?: string | null
          id?: string
          load_level?: string | null
          name?: string
          order_index?: number
          plan_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_phases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "season_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      season_plans: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          season: string
          society_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          season: string
          society_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          season?: string
          society_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_plans_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
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
          age_group: string | null
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          fundamental: string | null
          id: string
          society_id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          age_group?: string | null
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          fundamental?: string | null
          id?: string
          society_id: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          age_group?: string | null
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          fundamental?: string | null
          id?: string
          society_id?: string
          tags?: string[]
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
      training_blocks: {
        Row: {
          description: string | null
          duration_min: number | null
          exercise_id: string | null
          id: string
          intensity: string | null
          order_index: number
          reps: number | null
          title: string
          training_id: string
        }
        Insert: {
          description?: string | null
          duration_min?: number | null
          exercise_id?: string | null
          id?: string
          intensity?: string | null
          order_index?: number
          reps?: number | null
          title: string
          training_id: string
        }
        Update: {
          description?: string | null
          duration_min?: number | null
          exercise_id?: string | null
          id?: string
          intensity?: string | null
          order_index?: number
          reps?: number | null
          title?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_blocks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_blocks_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_schemes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          fundamental: string | null
          id: string
          name: string
          scheme_data: Json
          society_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          fundamental?: string | null
          id?: string
          name: string
          scheme_data?: Json
          society_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          fundamental?: string | null
          id?: string
          name?: string
          scheme_data?: Json
          society_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_schemes_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      training_skeletons: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          society_id: string
          total_duration_min: number | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          society_id: string
          total_duration_min?: number | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          society_id?: string
          total_duration_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_skeletons_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          created_at: string
          created_by: string
          duration_min: number | null
          event_id: string | null
          goal: string | null
          id: string
          notes: string | null
          scheduled_date: string | null
          skeleton_id: string | null
          society_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_min?: number | null
          event_id?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          skeleton_id?: string | null
          society_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_min?: number | null
          event_id?: string | null
          goal?: string | null
          id?: string
          notes?: string | null
          scheduled_date?: string | null
          skeleton_id?: string | null
          society_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_skeleton_id_fkey"
            columns: ["skeleton_id"]
            isOneToOne: false
            referencedRelation: "training_skeletons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_society_id_fkey"
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
      volume_logs: {
        Row: {
          athlete_id: string | null
          created_at: string
          created_by: string
          fundamental: string | null
          id: string
          intensity: string | null
          log_date: string
          notes: string | null
          reps: number | null
          society_id: string
          training_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          created_at?: string
          created_by: string
          fundamental?: string | null
          id?: string
          intensity?: string | null
          log_date?: string
          notes?: string | null
          reps?: number | null
          society_id: string
          training_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          created_at?: string
          created_by?: string
          fundamental?: string | null
          id?: string
          intensity?: string | null
          log_date?: string
          notes?: string | null
          reps?: number | null
          society_id?: string
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volume_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volume_logs_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volume_logs_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
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
      attendance_status: "presente" | "assente" | "giustificato" | "ritardo"
      communication_priority: "bassa" | "normale" | "alta" | "urgente"
      convocation_role: "titolare" | "riserva" | "libero" | "non_convocato"
      event_type: "allenamento" | "partita" | "riunione" | "torneo" | "altro"
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
      attendance_status: ["presente", "assente", "giustificato", "ritardo"],
      communication_priority: ["bassa", "normale", "alta", "urgente"],
      convocation_role: ["titolare", "riserva", "libero", "non_convocato"],
      event_type: ["allenamento", "partita", "riunione", "torneo", "altro"],
    },
  },
} as const
