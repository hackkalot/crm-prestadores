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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          priority_id: string | null
          provider_id: string | null
          read_at: string | null
          task_id: string | null
          title: string
          trigger_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          priority_id?: string | null
          provider_id?: string | null
          read_at?: string | null
          task_id?: string | null
          title: string
          trigger_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          priority_id?: string | null
          provider_id?: string | null
          read_at?: string | null
          task_id?: string | null
          title?: string
          trigger_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_history: {
        Row: {
          applied_at: string
          created_at: string | null
          hubspot_submission_id: string | null
          id: string
          provider_id: string
          raw_data: Json | null
          source: string | null
        }
        Insert: {
          applied_at: string
          created_at?: string | null
          hubspot_submission_id?: string | null
          id?: string
          provider_id: string
          raw_data?: Json | null
          source?: string | null
        }
        Update: {
          applied_at?: string
          created_at?: string | null
          hubspot_submission_id?: string | null
          id?: string
          provider_id?: string
          raw_data?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_history_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      history_log: {
        Row: {
          card_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          event_type: Database["public"]["Enums"]["history_event_type"]
          id: string
          new_value: Json | null
          old_value: Json | null
          provider_id: string
          reason: string | null
          task_id: string | null
        }
        Insert: {
          card_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          event_type: Database["public"]["Enums"]["history_event_type"]
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          provider_id: string
          reason?: string | null
          task_id?: string | null
        }
        Update: {
          card_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          event_type?: Database["public"]["Enums"]["history_event_type"]
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          provider_id?: string
          reason?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "history_log_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "history_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          id: string
          note_type: string | null
          provider_id: string
          task_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          id?: string
          note_type?: string | null
          provider_id: string
          task_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          id?: string
          note_type?: string | null
          provider_id?: string
          task_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_cards: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_stage_id: string
          id: string
          onboarding_type: Database["public"]["Enums"]["onboarding_type"]
          provider_id: string
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_stage_id: string
          id?: string
          onboarding_type?: Database["public"]["Enums"]["onboarding_type"]
          provider_id: string
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_stage_id?: string
          id?: string
          onboarding_type?: Database["public"]["Enums"]["onboarding_type"]
          provider_id?: string
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_cards_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "stage_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_cards_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_tasks: {
        Row: {
          card_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deadline_at: string | null
          id: string
          original_deadline_at: string | null
          owner_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_definition_id: string
          updated_at: string | null
        }
        Insert: {
          card_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deadline_at?: string | null
          id?: string
          original_deadline_at?: string | null
          owner_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_definition_id: string
          updated_at?: string | null
        }
        Update: {
          card_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deadline_at?: string | null
          id?: string
          original_deadline_at?: string | null
          owner_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_definition_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_tasks_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "onboarding_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_tasks_task_definition_id_fkey"
            columns: ["task_definition_id"]
            isOneToOne: false
            referencedRelation: "task_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      priorities: {
        Row: {
          baseline_onboarding_count: number | null
          baseline_provider_count: number | null
          calculation_metadata: Json | null
          cancelled_at: string | null
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          created_by: string
          criteria: Json | null
          current_active_count: number | null
          current_value: number | null
          deadline: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["priority_status"]
          target_value: number
          title: string
          type: Database["public"]["Enums"]["priority_type"]
          unit: string | null
          updated_at: string | null
          urgency: Database["public"]["Enums"]["priority_urgency"]
          was_successful: boolean | null
        }
        Insert: {
          baseline_onboarding_count?: number | null
          baseline_provider_count?: number | null
          calculation_metadata?: Json | null
          cancelled_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by: string
          criteria?: Json | null
          current_active_count?: number | null
          current_value?: number | null
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["priority_status"]
          target_value: number
          title: string
          type: Database["public"]["Enums"]["priority_type"]
          unit?: string | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["priority_urgency"]
          was_successful?: boolean | null
        }
        Update: {
          baseline_onboarding_count?: number | null
          baseline_provider_count?: number | null
          calculation_metadata?: Json | null
          cancelled_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          created_by?: string
          criteria?: Json | null
          current_active_count?: number | null
          current_value?: number | null
          deadline?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["priority_status"]
          target_value?: number
          title?: string
          type?: Database["public"]["Enums"]["priority_type"]
          unit?: string | null
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["priority_urgency"]
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "priorities_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priorities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priorities_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          priority_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          priority_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          priority_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "priority_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_assignments_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      priority_progress_log: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value: number
          note: string | null
          old_value: number
          priority_id: string
          provider_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value: number
          note?: string | null
          old_value: number
          priority_id: string
          provider_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: number
          note?: string | null
          old_value?: number
          priority_id?: string
          provider_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "priority_progress_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_progress_log_priority_id_fkey"
            columns: ["priority_id"]
            isOneToOne: false
            referencedRelation: "priorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "priority_progress_log_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_documents: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          provider_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          provider_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          provider_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_documents_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_price_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          provider_id: string
          snapshot_data: Json
          snapshot_name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          provider_id: string
          snapshot_data: Json
          snapshot_name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          provider_id?: string
          snapshot_data?: Json
          snapshot_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_price_snapshots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_price_snapshots_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_prices: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          price_without_vat: number
          provider_id: string
          service_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price_without_vat: number
          provider_id: string
          service_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price_without_vat?: number
          provider_id?: string
          service_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_prices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_prices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          assigned_at: string | null
          id: string
          is_active: boolean | null
          provider_id: string
          service_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_id: string
          service_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          abandoned_at: string | null
          abandoned_by: string | null
          abandonment_notes: string | null
          abandonment_party:
            | Database["public"]["Enums"]["abandonment_party"]
            | null
          abandonment_reason: string | null
          activated_at: string | null
          activity_proof_url: string | null
          application_count: number | null
          created_at: string | null
          districts: string[] | null
          email: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          facebook_url: string | null
          first_application_at: string | null
          has_admin_team: boolean | null
          has_own_transport: boolean | null
          hubspot_contact_id: string | null
          iban: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          nif: string | null
          num_technicians: number | null
          onboarding_started_at: string | null
          phone: string | null
          relationship_owner_id: string | null
          services: string[] | null
          status: Database["public"]["Enums"]["provider_status"] | null
          suspended_at: string | null
          twitter_url: string | null
          updated_at: string | null
          website: string | null
          working_hours: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abandoned_by?: string | null
          abandonment_notes?: string | null
          abandonment_party?:
            | Database["public"]["Enums"]["abandonment_party"]
            | null
          abandonment_reason?: string | null
          activated_at?: string | null
          activity_proof_url?: string | null
          application_count?: number | null
          created_at?: string | null
          districts?: string[] | null
          email: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          facebook_url?: string | null
          first_application_at?: string | null
          has_admin_team?: boolean | null
          has_own_transport?: boolean | null
          hubspot_contact_id?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name: string
          nif?: string | null
          num_technicians?: number | null
          onboarding_started_at?: string | null
          phone?: string | null
          relationship_owner_id?: string | null
          services?: string[] | null
          status?: Database["public"]["Enums"]["provider_status"] | null
          suspended_at?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
          working_hours?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abandoned_by?: string | null
          abandonment_notes?: string | null
          abandonment_party?:
            | Database["public"]["Enums"]["abandonment_party"]
            | null
          abandonment_reason?: string | null
          activated_at?: string | null
          activity_proof_url?: string | null
          application_count?: number | null
          created_at?: string | null
          districts?: string[] | null
          email?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          facebook_url?: string | null
          first_application_at?: string | null
          has_admin_team?: boolean | null
          has_own_transport?: boolean | null
          hubspot_contact_id?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          nif?: string | null
          num_technicians?: number | null
          onboarding_started_at?: string | null
          phone?: string | null
          relationship_owner_id?: string | null
          services?: string[] | null
          status?: Database["public"]["Enums"]["provider_status"] | null
          suspended_at?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
          working_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "providers_abandoned_by_fkey"
            columns: ["abandoned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "providers_relationship_owner_id_fkey"
            columns: ["relationship_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_prices: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          price_without_vat: number
          service_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          variant_description: string | null
          variant_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price_without_vat: number
          service_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_description?: string | null
          variant_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          price_without_vat?: number
          service_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          variant_description?: string | null
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_prices_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          cluster: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          vat_rate: number | null
        }
        Insert: {
          cluster?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Update: {
          cluster?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          vat_rate?: number | null
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          launched_at: string | null
          name: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          launched_at?: string | null
          name: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          launched_at?: string | null
          name?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_log: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          setting_key: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          setting_key: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          setting_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_definitions: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          name: string
          stage_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          name: string
          stage_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          name?: string
          stage_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      task_definitions: {
        Row: {
          alert_hours_before: number | null
          created_at: string | null
          default_deadline_hours_normal: number | null
          default_deadline_hours_urgent: number | null
          default_owner_id: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          name: string
          stage_id: string
          task_number: number
          updated_at: string | null
        }
        Insert: {
          alert_hours_before?: number | null
          created_at?: string | null
          default_deadline_hours_normal?: number | null
          default_deadline_hours_urgent?: number | null
          default_owner_id?: string | null
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          name: string
          stage_id: string
          task_number: number
          updated_at?: string | null
        }
        Update: {
          alert_hours_before?: number | null
          created_at?: string | null
          default_deadline_hours_normal?: number | null
          default_deadline_hours_urgent?: number | null
          default_owner_id?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          name?: string
          stage_id?: string
          task_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_definitions_default_owner_id_fkey"
            columns: ["default_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_definitions_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stage_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          approval_status:
            | Database["public"]["Enums"]["user_approval_status"]
            | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["user_approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["user_approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_user_admin: { Args: { user_id: string }; Returns: boolean }
      is_user_approved: { Args: { user_id: string }; Returns: boolean }
      is_user_manager: { Args: { user_id: string }; Returns: boolean }
      is_user_rm: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      abandonment_party: "prestador" | "fixo"
      entity_type: "tecnico" | "eni" | "empresa"
      history_event_type:
        | "stage_change"
        | "task_completed"
        | "task_reopened"
        | "owner_change"
        | "task_owner_change"
        | "deadline_change"
        | "note_added"
        | "status_change"
        | "price_change"
        | "field_change"
      onboarding_type: "normal" | "urgente"
      priority_status: "ativa" | "concluida" | "cancelada"
      priority_type: "ativar_prestadores" | "concluir_onboardings" | "outro"
      priority_urgency: "baixa" | "media" | "alta" | "urgente"
      provider_status:
        | "novo"
        | "em_onboarding"
        | "ativo"
        | "suspenso"
        | "abandonado"
        | "arquivado"
      task_status: "por_fazer" | "em_curso" | "concluida"
      user_approval_status: "pending" | "approved" | "rejected"
      user_role: "admin" | "user" | "manager" | "relationship_manager"
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
    Enums: {
      abandonment_party: ["prestador", "fixo"],
      entity_type: ["tecnico", "eni", "empresa"],
      history_event_type: [
        "stage_change",
        "task_completed",
        "task_reopened",
        "owner_change",
        "task_owner_change",
        "deadline_change",
        "note_added",
        "status_change",
        "price_change",
        "field_change",
      ],
      onboarding_type: ["normal", "urgente"],
      priority_status: ["ativa", "concluida", "cancelada"],
      priority_type: ["ativar_prestadores", "concluir_onboardings", "outro"],
      priority_urgency: ["baixa", "media", "alta", "urgente"],
      provider_status: [
        "novo",
        "em_onboarding",
        "ativo",
        "suspenso",
        "abandonado",
        "arquivado",
      ],
      task_status: ["por_fazer", "em_curso", "concluida"],
      user_approval_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "user", "manager", "relationship_manager"],
    },
  },
} as const
