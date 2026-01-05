// Tipos gerados automaticamente pelo Supabase CLI
// Correr: npm run db:generate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums
export type EntityType = 'tecnico' | 'eni' | 'empresa'
export type ProviderStatus = 'novo' | 'em_onboarding' | 'ativo' | 'suspenso' | 'abandonado'
export type OnboardingType = 'normal' | 'urgente'
export type AbandonmentParty = 'prestador' | 'fixo'
export type TaskStatus = 'por_fazer' | 'em_curso' | 'concluida'
export type HistoryEventType =
  | 'stage_change'
  | 'task_completed'
  | 'task_reopened'
  | 'owner_change'
  | 'task_owner_change'
  | 'deadline_change'
  | 'note_added'
  | 'status_change'
  | 'price_change'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          password_hash: string
          email_verified: boolean
          email_verification_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          password_hash: string
          email_verified?: boolean
          email_verification_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          password_hash?: string
          email_verified?: boolean
          email_verification_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      providers: {
        Row: {
          id: string
          name: string
          entity_type: EntityType
          nif: string | null
          email: string
          phone: string | null
          website: string | null
          districts: string[] | null
          services: string[] | null
          num_technicians: number | null
          has_admin_team: boolean | null
          has_own_transport: boolean | null
          working_hours: string | null
          iban: string | null
          activity_proof_url: string | null
          status: ProviderStatus
          application_count: number
          abandonment_party: AbandonmentParty | null
          abandonment_reason: string | null
          abandonment_notes: string | null
          abandoned_at: string | null
          abandoned_by: string | null
          first_application_at: string | null
          onboarding_started_at: string | null
          activated_at: string | null
          suspended_at: string | null
          relationship_owner_id: string | null
          hubspot_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          entity_type: EntityType
          nif?: string | null
          email: string
          phone?: string | null
          website?: string | null
          districts?: string[] | null
          services?: string[] | null
          num_technicians?: number | null
          has_admin_team?: boolean | null
          has_own_transport?: boolean | null
          working_hours?: string | null
          iban?: string | null
          activity_proof_url?: string | null
          status?: ProviderStatus
          application_count?: number
          abandonment_party?: AbandonmentParty | null
          abandonment_reason?: string | null
          abandonment_notes?: string | null
          abandoned_at?: string | null
          abandoned_by?: string | null
          first_application_at?: string | null
          onboarding_started_at?: string | null
          activated_at?: string | null
          suspended_at?: string | null
          relationship_owner_id?: string | null
          hubspot_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          entity_type?: EntityType
          nif?: string | null
          email?: string
          phone?: string | null
          website?: string | null
          districts?: string[] | null
          services?: string[] | null
          num_technicians?: number | null
          has_admin_team?: boolean | null
          has_own_transport?: boolean | null
          working_hours?: string | null
          iban?: string | null
          activity_proof_url?: string | null
          status?: ProviderStatus
          application_count?: number
          abandonment_party?: AbandonmentParty | null
          abandonment_reason?: string | null
          abandonment_notes?: string | null
          abandoned_at?: string | null
          abandoned_by?: string | null
          first_application_at?: string | null
          onboarding_started_at?: string | null
          activated_at?: string | null
          suspended_at?: string | null
          relationship_owner_id?: string | null
          hubspot_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      application_history: {
        Row: {
          id: string
          provider_id: string
          raw_data: Json | null
          source: string
          hubspot_submission_id: string | null
          applied_at: string
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          raw_data?: Json | null
          source?: string
          hubspot_submission_id?: string | null
          applied_at: string
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          raw_data?: Json | null
          source?: string
          hubspot_submission_id?: string | null
          applied_at?: string
          created_at?: string
        }
      }
      stage_definitions: {
        Row: {
          id: string
          stage_number: string
          name: string
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stage_number: string
          name: string
          display_order: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage_number?: string
          name?: string
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      task_definitions: {
        Row: {
          id: string
          stage_id: string
          task_number: number
          name: string
          description: string | null
          default_owner_id: string | null
          default_deadline_hours_normal: number | null
          default_deadline_hours_urgent: number | null
          alert_hours_before: number
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stage_id: string
          task_number: number
          name: string
          description?: string | null
          default_owner_id?: string | null
          default_deadline_hours_normal?: number | null
          default_deadline_hours_urgent?: number | null
          alert_hours_before?: number
          display_order: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          stage_id?: string
          task_number?: number
          name?: string
          description?: string | null
          default_owner_id?: string | null
          default_deadline_hours_normal?: number | null
          default_deadline_hours_urgent?: number | null
          alert_hours_before?: number
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      onboarding_cards: {
        Row: {
          id: string
          provider_id: string
          onboarding_type: OnboardingType
          current_stage_id: string
          owner_id: string
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          onboarding_type?: OnboardingType
          current_stage_id: string
          owner_id: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          onboarding_type?: OnboardingType
          current_stage_id?: string
          owner_id?: string
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      onboarding_tasks: {
        Row: {
          id: string
          card_id: string
          task_definition_id: string
          status: TaskStatus
          owner_id: string | null
          deadline_at: string | null
          original_deadline_at: string | null
          started_at: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          card_id: string
          task_definition_id: string
          status?: TaskStatus
          owner_id?: string | null
          deadline_at?: string | null
          original_deadline_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          card_id?: string
          task_definition_id?: string
          status?: TaskStatus
          owner_id?: string | null
          deadline_at?: string | null
          original_deadline_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          provider_id: string
          task_id: string | null
          content: string
          note_type: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          task_id?: string | null
          content: string
          note_type?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          task_id?: string | null
          content?: string
          note_type?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      history_log: {
        Row: {
          id: string
          provider_id: string
          card_id: string | null
          task_id: string | null
          event_type: HistoryEventType
          description: string
          old_value: Json | null
          new_value: Json | null
          reason: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          card_id?: string | null
          task_id?: string | null
          event_type: HistoryEventType
          description: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          card_id?: string | null
          task_id?: string | null
          event_type?: HistoryEventType
          description?: string
          old_value?: Json | null
          new_value?: Json | null
          reason?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      service_categories: {
        Row: {
          id: string
          name: string
          cluster: string | null
          vat_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          cluster?: string | null
          vat_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          cluster?: string | null
          vat_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      services: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string | null
          unit: string | null
          is_active: boolean
          launched_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string | null
          unit?: string | null
          is_active?: boolean
          launched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string | null
          unit?: string | null
          is_active?: boolean
          launched_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      reference_prices: {
        Row: {
          id: string
          service_id: string
          variant_name: string | null
          variant_description: string | null
          price_without_vat: number
          valid_from: string
          valid_until: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          service_id: string
          variant_name?: string | null
          variant_description?: string | null
          price_without_vat: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          service_id?: string
          variant_name?: string | null
          variant_description?: string | null
          price_without_vat?: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      provider_services: {
        Row: {
          id: string
          provider_id: string
          service_id: string
          is_active: boolean
          assigned_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          service_id: string
          is_active?: boolean
          assigned_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          service_id?: string
          is_active?: boolean
          assigned_at?: string
        }
      }
      provider_prices: {
        Row: {
          id: string
          provider_id: string
          service_id: string
          variant_name: string | null
          price_without_vat: number
          valid_from: string
          valid_until: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          service_id: string
          variant_name?: string | null
          price_without_vat: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          service_id?: string
          variant_name?: string | null
          price_without_vat?: number
          valid_from?: string
          valid_until?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      provider_price_snapshots: {
        Row: {
          id: string
          provider_id: string
          snapshot_name: string | null
          snapshot_data: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          snapshot_name?: string | null
          snapshot_data: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          snapshot_name?: string | null
          snapshot_data?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      alerts: {
        Row: {
          id: string
          provider_id: string | null
          task_id: string | null
          user_id: string
          alert_type: string
          title: string
          message: string | null
          is_read: boolean
          read_at: string | null
          trigger_at: string
          created_at: string
        }
        Insert: {
          id?: string
          provider_id?: string | null
          task_id?: string | null
          user_id: string
          alert_type: string
          title: string
          message?: string | null
          is_read?: boolean
          read_at?: string | null
          trigger_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          provider_id?: string | null
          task_id?: string | null
          user_id?: string
          alert_type?: string
          title?: string
          message?: string | null
          is_read?: boolean
          read_at?: string | null
          trigger_at?: string
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_by?: string | null
          updated_at?: string
        }
      }
      settings_log: {
        Row: {
          id: string
          setting_key: string
          old_value: Json | null
          new_value: Json | null
          changed_by: string | null
          changed_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          old_value?: Json | null
          new_value?: Json | null
          changed_by?: string | null
          changed_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          old_value?: Json | null
          new_value?: Json | null
          changed_by?: string | null
          changed_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      entity_type: EntityType
      provider_status: ProviderStatus
      onboarding_type: OnboardingType
      abandonment_party: AbandonmentParty
      task_status: TaskStatus
      history_event_type: HistoryEventType
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
