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
      allocation_history: {
        Row: {
          avg_response_time: unknown
          avg_response_time_raw: string | null
          backoffice_provider_id: number
          created_at: string | null
          id: string
          period_from: string
          period_to: string
          provider_name: string
          requests_accepted: number | null
          requests_expired: number | null
          requests_received: number | null
          requests_rejected: number | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          avg_response_time?: unknown
          avg_response_time_raw?: string | null
          backoffice_provider_id: number
          created_at?: string | null
          id?: string
          period_from: string
          period_to: string
          provider_name: string
          requests_accepted?: number | null
          requests_expired?: number | null
          requests_received?: number | null
          requests_rejected?: number | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avg_response_time?: unknown
          avg_response_time_raw?: string | null
          backoffice_provider_id?: number
          created_at?: string | null
          id?: string
          period_from?: string
          period_to?: string
          provider_name?: string
          requests_accepted?: number | null
          requests_expired?: number | null
          requests_received?: number | null
          requests_rejected?: number | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      allocation_sync_logs: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          error_stack: string | null
          excel_file_path: string | null
          excel_file_size_kb: number | null
          id: string
          period_from: string | null
          period_to: string | null
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          status: string | null
          triggered_at: string | null
          triggered_by: string | null
          triggered_by_system: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          period_from?: string | null
          period_to?: string | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status?: string | null
          triggered_at?: string | null
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          period_from?: string | null
          period_to?: string | null
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status?: string | null
          triggered_at?: string | null
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allocation_sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
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
      billing_processes: {
        Row: {
          assigned_provider_name: string | null
          base_service_cost: number | null
          bo_validation_date: string | null
          complaint: boolean | null
          conclusion_response: string | null
          created_at: string | null
          credit_note_number: number | null
          document_date: string | null
          document_number: string | null
          has_duplicate: boolean | null
          id: string
          invoices_number: number | null
          payment_date: string | null
          process_status: string | null
          provider_automatic_cost: boolean | null
          request_code: string
          scheduled_to: string | null
          service: string | null
          service_request_identifier: number | null
          sum_transactions: number | null
          synced_at: string | null
          timestamp_process_status: string | null
          total_invoice_value: number | null
          total_service_cost: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_provider_name?: string | null
          base_service_cost?: number | null
          bo_validation_date?: string | null
          complaint?: boolean | null
          conclusion_response?: string | null
          created_at?: string | null
          credit_note_number?: number | null
          document_date?: string | null
          document_number?: string | null
          has_duplicate?: boolean | null
          id?: string
          invoices_number?: number | null
          payment_date?: string | null
          process_status?: string | null
          provider_automatic_cost?: boolean | null
          request_code: string
          scheduled_to?: string | null
          service?: string | null
          service_request_identifier?: number | null
          sum_transactions?: number | null
          synced_at?: string | null
          timestamp_process_status?: string | null
          total_invoice_value?: number | null
          total_service_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_provider_name?: string | null
          base_service_cost?: number | null
          bo_validation_date?: string | null
          complaint?: boolean | null
          conclusion_response?: string | null
          created_at?: string | null
          credit_note_number?: number | null
          document_date?: string | null
          document_number?: string | null
          has_duplicate?: boolean | null
          id?: string
          invoices_number?: number | null
          payment_date?: string | null
          process_status?: string | null
          provider_automatic_cost?: boolean | null
          request_code?: string
          scheduled_to?: string | null
          service?: string | null
          service_request_identifier?: number | null
          sum_transactions?: number | null
          synced_at?: string | null
          timestamp_process_status?: string | null
          total_invoice_value?: number | null
          total_service_cost?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      billing_sync_logs: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          error_stack: string | null
          excel_file_path: string | null
          excel_file_size_kb: number | null
          id: string
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          status: string
          triggered_at: string
          triggered_by: string | null
          triggered_by_system: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status?: string
          triggered_at?: string
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status?: string
          triggered_at?: string
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          name: string
          subject: string
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          subject: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          subject?: string
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      material_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          material_name: string
          price_without_vat: number
          updated_at: string | null
          vat_rate: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_name: string
          price_without_vat: number
          updated_at?: string | null
          vat_rate?: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          material_name?: string
          price_without_vat?: number
          updated_at?: string | null
          vat_rate?: number
        }
        Relationships: []
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
            foreignKeyName: "onboarding_tasks_task_definition_id_fkey"
            columns: ["task_definition_id"]
            isOneToOne: false
            referencedRelation: "task_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_active: boolean | null
          key: string
          name: string
          path: string
          section: string | null
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          key: string
          name: string
          path: string
          section?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          key?: string
          name?: string
          path?: string
          section?: string | null
        }
        Relationships: []
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
      provider_custom_prices: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_price_without_vat: number
          id: string
          notes: string | null
          provider_id: string
          reference_price_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_price_without_vat: number
          id?: string
          notes?: string | null
          provider_id: string
          reference_price_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_price_without_vat?: number
          id?: string
          notes?: string | null
          provider_id?: string
          reference_price_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_custom_prices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_custom_prices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_custom_prices_reference_price_id_fkey"
            columns: ["reference_price_id"]
            isOneToOne: false
            referencedRelation: "service_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_custom_prices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      provider_forms_data: {
        Row: {
          available_weekdays: string[] | null
          certifications: string[] | null
          coverage_municipalities: string[] | null
          created_at: string | null
          has_activity_declaration: boolean | null
          has_computer: boolean | null
          has_liability_insurance: boolean | null
          has_transport: boolean | null
          has_work_accidents_insurance: boolean | null
          id: string
          num_technicians: number | null
          own_equipment: string[] | null
          provider_id: string
          selected_services: string[] | null
          submission_number: number | null
          submitted_at: string | null
          submitted_ip: string | null
          updated_at: string | null
          work_hours_end: string | null
          work_hours_start: string | null
          works_with_platforms: string[] | null
        }
        Insert: {
          available_weekdays?: string[] | null
          certifications?: string[] | null
          coverage_municipalities?: string[] | null
          created_at?: string | null
          has_activity_declaration?: boolean | null
          has_computer?: boolean | null
          has_liability_insurance?: boolean | null
          has_transport?: boolean | null
          has_work_accidents_insurance?: boolean | null
          id?: string
          num_technicians?: number | null
          own_equipment?: string[] | null
          provider_id: string
          selected_services?: string[] | null
          submission_number?: number | null
          submitted_at?: string | null
          submitted_ip?: string | null
          updated_at?: string | null
          work_hours_end?: string | null
          work_hours_start?: string | null
          works_with_platforms?: string[] | null
        }
        Update: {
          available_weekdays?: string[] | null
          certifications?: string[] | null
          coverage_municipalities?: string[] | null
          created_at?: string | null
          has_activity_declaration?: boolean | null
          has_computer?: boolean | null
          has_liability_insurance?: boolean | null
          has_transport?: boolean | null
          has_work_accidents_insurance?: boolean | null
          id?: string
          num_technicians?: number | null
          own_equipment?: string[] | null
          provider_id?: string
          selected_services?: string[] | null
          submission_number?: number | null
          submitted_at?: string | null
          submitted_ip?: string | null
          updated_at?: string | null
          work_hours_end?: string | null
          work_hours_start?: string | null
          works_with_platforms?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_forms_data_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
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
      provider_sync_logs: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          error_stack: string | null
          excel_file_path: string | null
          excel_file_size_kb: number | null
          id: string
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          status: string
          triggered_at: string
          triggered_by: string | null
          triggered_by_system: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status: string
          triggered_at?: string
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status?: string
          triggered_at?: string
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          active_requests: number | null
          activity_proof_url: string | null
          application_count: number | null
          archived_at: string | null
          available_weekdays: string[] | null
          backoffice_created_at: string | null
          backoffice_created_by: number | null
          backoffice_do_recurrence: boolean | null
          backoffice_is_active: boolean | null
          backoffice_last_login: string | null
          backoffice_password_defined: boolean | null
          backoffice_provider_id: number | null
          backoffice_status: string | null
          backoffice_status_updated_at: string | null
          backoffice_status_updated_by: number | null
          backoffice_synced_at: string | null
          backoffice_updated_at: string | null
          backoffice_updated_by: number | null
          cancelled_requests: number | null
          categories: string[] | null
          certifications: string[] | null
          completed_requests: number | null
          counties: string[] | null
          created_at: string | null
          districts: string[] | null
          email: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          facebook_url: string | null
          first_application_at: string | null
          forms_response_id: string | null
          forms_submitted_at: string | null
          forms_token: string | null
          has_activity_declaration: boolean | null
          has_admin_team: boolean | null
          has_computer: boolean | null
          has_liability_insurance: boolean | null
          has_own_transport: boolean | null
          has_work_accidents_insurance: boolean | null
          hubspot_contact_id: string | null
          iban: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          name: string
          nif: string | null
          num_technicians: number | null
          onboarding_started_at: string | null
          own_equipment: string[] | null
          phone: string | null
          relationship_owner_id: string | null
          requests_accepted: number | null
          requests_expired: number | null
          requests_received: number | null
          requests_rejected: number | null
          service_rating: number | null
          services: string[] | null
          status: Database["public"]["Enums"]["provider_status"] | null
          suspended_at: string | null
          technician_rating: number | null
          total_requests: number | null
          twitter_url: string | null
          updated_at: string | null
          website: string | null
          work_hours_end: string | null
          work_hours_start: string | null
          working_hours: string | null
          works_with_platforms: string[] | null
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
          active_requests?: number | null
          activity_proof_url?: string | null
          application_count?: number | null
          archived_at?: string | null
          available_weekdays?: string[] | null
          backoffice_created_at?: string | null
          backoffice_created_by?: number | null
          backoffice_do_recurrence?: boolean | null
          backoffice_is_active?: boolean | null
          backoffice_last_login?: string | null
          backoffice_password_defined?: boolean | null
          backoffice_provider_id?: number | null
          backoffice_status?: string | null
          backoffice_status_updated_at?: string | null
          backoffice_status_updated_by?: number | null
          backoffice_synced_at?: string | null
          backoffice_updated_at?: string | null
          backoffice_updated_by?: number | null
          cancelled_requests?: number | null
          categories?: string[] | null
          certifications?: string[] | null
          completed_requests?: number | null
          counties?: string[] | null
          created_at?: string | null
          districts?: string[] | null
          email: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          facebook_url?: string | null
          first_application_at?: string | null
          forms_response_id?: string | null
          forms_submitted_at?: string | null
          forms_token?: string | null
          has_activity_declaration?: boolean | null
          has_admin_team?: boolean | null
          has_computer?: boolean | null
          has_liability_insurance?: boolean | null
          has_own_transport?: boolean | null
          has_work_accidents_insurance?: boolean | null
          hubspot_contact_id?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name: string
          nif?: string | null
          num_technicians?: number | null
          onboarding_started_at?: string | null
          own_equipment?: string[] | null
          phone?: string | null
          relationship_owner_id?: string | null
          requests_accepted?: number | null
          requests_expired?: number | null
          requests_received?: number | null
          requests_rejected?: number | null
          service_rating?: number | null
          services?: string[] | null
          status?: Database["public"]["Enums"]["provider_status"] | null
          suspended_at?: string | null
          technician_rating?: number | null
          total_requests?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
          work_hours_end?: string | null
          work_hours_start?: string | null
          working_hours?: string | null
          works_with_platforms?: string[] | null
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
          active_requests?: number | null
          activity_proof_url?: string | null
          application_count?: number | null
          archived_at?: string | null
          available_weekdays?: string[] | null
          backoffice_created_at?: string | null
          backoffice_created_by?: number | null
          backoffice_do_recurrence?: boolean | null
          backoffice_is_active?: boolean | null
          backoffice_last_login?: string | null
          backoffice_password_defined?: boolean | null
          backoffice_provider_id?: number | null
          backoffice_status?: string | null
          backoffice_status_updated_at?: string | null
          backoffice_status_updated_by?: number | null
          backoffice_synced_at?: string | null
          backoffice_updated_at?: string | null
          backoffice_updated_by?: number | null
          cancelled_requests?: number | null
          categories?: string[] | null
          certifications?: string[] | null
          completed_requests?: number | null
          counties?: string[] | null
          created_at?: string | null
          districts?: string[] | null
          email?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          facebook_url?: string | null
          first_application_at?: string | null
          forms_response_id?: string | null
          forms_submitted_at?: string | null
          forms_token?: string | null
          has_activity_declaration?: boolean | null
          has_admin_team?: boolean | null
          has_computer?: boolean | null
          has_liability_insurance?: boolean | null
          has_own_transport?: boolean | null
          has_work_accidents_insurance?: boolean | null
          hubspot_contact_id?: string | null
          iban?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          name?: string
          nif?: string | null
          num_technicians?: number | null
          onboarding_started_at?: string | null
          own_equipment?: string[] | null
          phone?: string | null
          relationship_owner_id?: string | null
          requests_accepted?: number | null
          requests_expired?: number | null
          requests_received?: number | null
          requests_rejected?: number | null
          service_rating?: number | null
          services?: string[] | null
          status?: Database["public"]["Enums"]["provider_status"] | null
          suspended_at?: string | null
          technician_rating?: number | null
          total_requests?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          website?: string | null
          work_hours_end?: string | null
          work_hours_start?: string | null
          working_hours?: string | null
          works_with_platforms?: string[] | null
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
      role_permissions: {
        Row: {
          can_access: boolean | null
          created_at: string | null
          id: string
          page_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          page_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          can_access?: boolean | null
          created_at?: string | null
          id?: string
          page_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_mapping: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          match_type: string | null
          provider_service_name: string
          taxonomy_service_id: string
          updated_at: string | null
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          match_type?: string | null
          provider_service_name: string
          taxonomy_service_id: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          match_type?: string | null
          provider_service_name?: string
          taxonomy_service_id?: string
          updated_at?: string | null
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_mapping_taxonomy_service_id_fkey"
            columns: ["taxonomy_service_id"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_mapping_feedback: {
        Row: {
          actual_taxonomy_id: string | null
          algorithm_score: number | null
          created_at: string | null
          id: string
          provider_service_name: string
          suggested_taxonomy_id: string | null
          user_id: string | null
          was_correct: boolean | null
        }
        Insert: {
          actual_taxonomy_id?: string | null
          algorithm_score?: number | null
          created_at?: string | null
          id?: string
          provider_service_name: string
          suggested_taxonomy_id?: string | null
          user_id?: string | null
          was_correct?: boolean | null
        }
        Update: {
          actual_taxonomy_id?: string | null
          algorithm_score?: number | null
          created_at?: string | null
          id?: string
          provider_service_name?: string
          suggested_taxonomy_id?: string | null
          user_id?: string | null
          was_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "service_mapping_feedback_actual_taxonomy_id_fkey"
            columns: ["actual_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_feedback_suggested_taxonomy_id_fkey"
            columns: ["suggested_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_mapping_suggestions: {
        Row: {
          admin_notes: string | null
          approved_taxonomy_id: string | null
          created_at: string | null
          id: string
          provider_service_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          suggested_score_1: number | null
          suggested_score_2: number | null
          suggested_score_3: number | null
          suggested_taxonomy_id_1: string | null
          suggested_taxonomy_id_2: string | null
          suggested_taxonomy_id_3: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_taxonomy_id?: string | null
          created_at?: string | null
          id?: string
          provider_service_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_score_1?: number | null
          suggested_score_2?: number | null
          suggested_score_3?: number | null
          suggested_taxonomy_id_1?: string | null
          suggested_taxonomy_id_2?: string | null
          suggested_taxonomy_id_3?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_taxonomy_id?: string | null
          created_at?: string | null
          id?: string
          provider_service_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          suggested_score_1?: number | null
          suggested_score_2?: number | null
          suggested_score_3?: number | null
          suggested_taxonomy_id_1?: string | null
          suggested_taxonomy_id_2?: string | null
          suggested_taxonomy_id_3?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_mapping_suggestions_approved_taxonomy_id_fkey"
            columns: ["approved_taxonomy_id"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_suggestions_suggested_taxonomy_id_1_fkey"
            columns: ["suggested_taxonomy_id_1"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_suggestions_suggested_taxonomy_id_2_fkey"
            columns: ["suggested_taxonomy_id_2"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_mapping_suggestions_suggested_taxonomy_id_3_fkey"
            columns: ["suggested_taxonomy_id_3"]
            isOneToOne: false
            referencedRelation: "service_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      service_prices: {
        Row: {
          cluster: string
          created_at: string | null
          id: string
          is_active: boolean | null
          launch_date: string | null
          price_base: number | null
          price_cleaning: number | null
          price_cleaning_imper: number | null
          price_cleaning_imper_treatments: number | null
          price_cleaning_treatments: number | null
          price_extra_night: number | null
          price_hour_no_materials: number | null
          price_hour_with_materials: number | null
          price_new_visit: number | null
          service_group: string | null
          service_name: string
          typology: string | null
          unit_description: string
          updated_at: string | null
          vat_rate: number
        }
        Insert: {
          cluster: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          launch_date?: string | null
          price_base?: number | null
          price_cleaning?: number | null
          price_cleaning_imper?: number | null
          price_cleaning_imper_treatments?: number | null
          price_cleaning_treatments?: number | null
          price_extra_night?: number | null
          price_hour_no_materials?: number | null
          price_hour_with_materials?: number | null
          price_new_visit?: number | null
          service_group?: string | null
          service_name: string
          typology?: string | null
          unit_description: string
          updated_at?: string | null
          vat_rate: number
        }
        Update: {
          cluster?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          launch_date?: string | null
          price_base?: number | null
          price_cleaning?: number | null
          price_cleaning_imper?: number | null
          price_cleaning_imper_treatments?: number | null
          price_cleaning_treatments?: number | null
          price_extra_night?: number | null
          price_hour_no_materials?: number | null
          price_hour_with_materials?: number | null
          price_new_visit?: number | null
          service_group?: string | null
          service_name?: string
          typology?: string | null
          unit_description?: string
          updated_at?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          additional_charges_discount: number | null
          assigned_provider_id: string | null
          assigned_provider_name: string | null
          cancellation_comment: string | null
          cancellation_reason: string | null
          category: string | null
          category_id: number | null
          checkin_providers_app: boolean | null
          checkin_providers_app_timestamp: string | null
          checkout_providers_app: boolean | null
          checkout_providers_app_timestamp: string | null
          city: string | null
          client_district: string | null
          client_town: string | null
          cluster: string | null
          cluster_id: number | null
          contact_client_calltimes: number | null
          contact_client_cta: boolean | null
          contact_client_reason: string | null
          contact_client_timestamp: string | null
          cost_estimation: number | null
          created_at: string
          created_by: string | null
          delivery_schedule_providers_app: boolean | null
          done_on_mbway_flow: boolean | null
          fees: string | null
          fees_amount: number | null
          fid_id: string | null
          final_cost_estimation: number | null
          gross_additional_charges: number | null
          hubspot_deal_id: string | null
          id: string
          imported_at: string | null
          invoice_process_status: string | null
          is_mgm: boolean | null
          is_new_pricing_model: boolean | null
          last_update: string | null
          multiple_providers: boolean | null
          net_additional_charges: number | null
          net_amount: number | null
          number_additional_visits: number | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          promocode: string | null
          promocode_discount: number | null
          provider_allocation_manual: boolean | null
          provider_confirmed_timestamp: string | null
          provider_cost: number | null
          provider_request_notes: string | null
          providers_conclusion_notes: string | null
          providers_documents: boolean | null
          raw_data: Json | null
          recurrence_code: string | null
          recurrence_type: string | null
          refund_amount: number | null
          refund_comment: string | null
          refund_reason: string | null
          request_code: string
          reschedule_bo: boolean | null
          reschedule_comment: string | null
          reschedule_reason: string | null
          scheduled_delivery_date: string | null
          scheduled_to: string | null
          service: string | null
          service_address_line_1: string | null
          service_address_line_2: string | null
          service_id: number | null
          service_rating: number | null
          service_rating_comment: string | null
          source: string | null
          status: string
          status_updated_at: string | null
          status_updated_by: string | null
          tasks_count: number | null
          technician_allocation_before_service: boolean | null
          technician_allocation_timestamp: string | null
          technician_name: string | null
          technician_rating: number | null
          timestamp_rating: string | null
          updated_by: string | null
          used_wallet: boolean | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          additional_charges_discount?: number | null
          assigned_provider_id?: string | null
          assigned_provider_name?: string | null
          cancellation_comment?: string | null
          cancellation_reason?: string | null
          category?: string | null
          category_id?: number | null
          checkin_providers_app?: boolean | null
          checkin_providers_app_timestamp?: string | null
          checkout_providers_app?: boolean | null
          checkout_providers_app_timestamp?: string | null
          city?: string | null
          client_district?: string | null
          client_town?: string | null
          cluster?: string | null
          cluster_id?: number | null
          contact_client_calltimes?: number | null
          contact_client_cta?: boolean | null
          contact_client_reason?: string | null
          contact_client_timestamp?: string | null
          cost_estimation?: number | null
          created_at: string
          created_by?: string | null
          delivery_schedule_providers_app?: boolean | null
          done_on_mbway_flow?: boolean | null
          fees?: string | null
          fees_amount?: number | null
          fid_id?: string | null
          final_cost_estimation?: number | null
          gross_additional_charges?: number | null
          hubspot_deal_id?: string | null
          id?: string
          imported_at?: string | null
          invoice_process_status?: string | null
          is_mgm?: boolean | null
          is_new_pricing_model?: boolean | null
          last_update?: string | null
          multiple_providers?: boolean | null
          net_additional_charges?: number | null
          net_amount?: number | null
          number_additional_visits?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          promocode?: string | null
          promocode_discount?: number | null
          provider_allocation_manual?: boolean | null
          provider_confirmed_timestamp?: string | null
          provider_cost?: number | null
          provider_request_notes?: string | null
          providers_conclusion_notes?: string | null
          providers_documents?: boolean | null
          raw_data?: Json | null
          recurrence_code?: string | null
          recurrence_type?: string | null
          refund_amount?: number | null
          refund_comment?: string | null
          refund_reason?: string | null
          request_code: string
          reschedule_bo?: boolean | null
          reschedule_comment?: string | null
          reschedule_reason?: string | null
          scheduled_delivery_date?: string | null
          scheduled_to?: string | null
          service?: string | null
          service_address_line_1?: string | null
          service_address_line_2?: string | null
          service_id?: number | null
          service_rating?: number | null
          service_rating_comment?: string | null
          source?: string | null
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
          tasks_count?: number | null
          technician_allocation_before_service?: boolean | null
          technician_allocation_timestamp?: string | null
          technician_name?: string | null
          technician_rating?: number | null
          timestamp_rating?: string | null
          updated_by?: string | null
          used_wallet?: boolean | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          additional_charges_discount?: number | null
          assigned_provider_id?: string | null
          assigned_provider_name?: string | null
          cancellation_comment?: string | null
          cancellation_reason?: string | null
          category?: string | null
          category_id?: number | null
          checkin_providers_app?: boolean | null
          checkin_providers_app_timestamp?: string | null
          checkout_providers_app?: boolean | null
          checkout_providers_app_timestamp?: string | null
          city?: string | null
          client_district?: string | null
          client_town?: string | null
          cluster?: string | null
          cluster_id?: number | null
          contact_client_calltimes?: number | null
          contact_client_cta?: boolean | null
          contact_client_reason?: string | null
          contact_client_timestamp?: string | null
          cost_estimation?: number | null
          created_at?: string
          created_by?: string | null
          delivery_schedule_providers_app?: boolean | null
          done_on_mbway_flow?: boolean | null
          fees?: string | null
          fees_amount?: number | null
          fid_id?: string | null
          final_cost_estimation?: number | null
          gross_additional_charges?: number | null
          hubspot_deal_id?: string | null
          id?: string
          imported_at?: string | null
          invoice_process_status?: string | null
          is_mgm?: boolean | null
          is_new_pricing_model?: boolean | null
          last_update?: string | null
          multiple_providers?: boolean | null
          net_additional_charges?: number | null
          net_amount?: number | null
          number_additional_visits?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          promocode?: string | null
          promocode_discount?: number | null
          provider_allocation_manual?: boolean | null
          provider_confirmed_timestamp?: string | null
          provider_cost?: number | null
          provider_request_notes?: string | null
          providers_conclusion_notes?: string | null
          providers_documents?: boolean | null
          raw_data?: Json | null
          recurrence_code?: string | null
          recurrence_type?: string | null
          refund_amount?: number | null
          refund_comment?: string | null
          refund_reason?: string | null
          request_code?: string
          reschedule_bo?: boolean | null
          reschedule_comment?: string | null
          reschedule_reason?: string | null
          scheduled_delivery_date?: string | null
          scheduled_to?: string | null
          service?: string | null
          service_address_line_1?: string | null
          service_address_line_2?: string | null
          service_id?: number | null
          service_rating?: number | null
          service_rating_comment?: string | null
          source?: string | null
          status?: string
          status_updated_at?: string | null
          status_updated_by?: string | null
          tasks_count?: number | null
          technician_allocation_before_service?: boolean | null
          technician_allocation_timestamp?: string | null
          technician_name?: string | null
          technician_rating?: number | null
          timestamp_rating?: string | null
          updated_by?: string | null
          used_wallet?: boolean | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      service_taxonomy: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          id: string
          service: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category: string
          created_at?: string | null
          id?: string
          service: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          id?: string
          service?: string
          updated_at?: string | null
        }
        Relationships: []
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
      sync_logs: {
        Row: {
          created_at: string | null
          date_from: string
          date_to: string
          duration_seconds: number | null
          error_message: string | null
          error_stack: string | null
          excel_file_path: string | null
          excel_file_size_kb: number | null
          id: string
          records_inserted: number | null
          records_processed: number | null
          records_updated: number | null
          status: string
          triggered_at: string
          triggered_by: string | null
          triggered_by_system: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_from: string
          date_to: string
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status: string
          triggered_at?: string
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_from?: string
          date_to?: string
          duration_seconds?: number | null
          error_message?: string | null
          error_stack?: string | null
          excel_file_path?: string | null
          excel_file_size_kb?: number | null
          id?: string
          records_inserted?: number | null
          records_processed?: number | null
          records_updated?: number | null
          status?: string
          triggered_at?: string
          triggered_by?: string | null
          triggered_by_system?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          email_template_id: string | null
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
          email_template_id?: string | null
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
          email_template_id?: string | null
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
            foreignKeyName: "task_definitions_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
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
      provider_coverage_by_service: {
        Row: {
          category: string | null
          district: string | null
          municipality: string | null
          provider_count: number | null
          provider_ids: string[] | null
          provider_names: string[] | null
          request_count: number | null
          service: string | null
          taxonomy_service_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_user_access_page: {
        Args: { p_page_key: string; p_user_id: string }
        Returns: boolean
      }
      get_provider_coverage_by_service: {
        Args: { period_months?: number }
        Returns: {
          category: string
          district: string
          municipality: string
          provider_count: number
          provider_ids: string[]
          provider_names: string[]
          request_count: number
          service: string
          taxonomy_service_id: string
        }[]
      }
      get_user_accessible_pages: {
        Args: { p_user_id: string }
        Returns: string[]
      }
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
        | "forms_submission"
        | "document_uploaded"
        | "document_deleted"
      onboarding_type: "normal" | "urgente"
      payment_status: "pending" | "captured" | "refunded" | "failed"
      priority_status: "ativa" | "concluida" | "cancelada"
      priority_type: "ativar_prestadores" | "concluir_onboardings" | "outro"
      priority_urgency: "baixa" | "media" | "alta" | "urgente"
      provider_status:
        | "novo"
        | "em_onboarding"
        | "on_hold"
        | "ativo"
        | "suspenso"
        | "abandonado"
        | "arquivado"
      service_request_status:
        | "novo_pedido"
        | "atribuir_prestador"
        | "prestador_atribuido"
        | "em_execucao"
        | "concluido"
        | "cancelado_cliente"
        | "cancelado_backoffice"
        | "cancelado_prestador"
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
        "forms_submission",
        "document_uploaded",
        "document_deleted",
      ],
      onboarding_type: ["normal", "urgente"],
      payment_status: ["pending", "captured", "refunded", "failed"],
      priority_status: ["ativa", "concluida", "cancelada"],
      priority_type: ["ativar_prestadores", "concluir_onboardings", "outro"],
      priority_urgency: ["baixa", "media", "alta", "urgente"],
      provider_status: [
        "novo",
        "em_onboarding",
        "on_hold",
        "ativo",
        "suspenso",
        "abandonado",
        "arquivado",
      ],
      service_request_status: [
        "novo_pedido",
        "atribuir_prestador",
        "prestador_atribuido",
        "em_execucao",
        "concluido",
        "cancelado_cliente",
        "cancelado_backoffice",
        "cancelado_prestador",
      ],
      task_status: ["por_fazer", "em_curso", "concluida"],
      user_approval_status: ["pending", "approved", "rejected"],
      user_role: ["admin", "user", "manager", "relationship_manager"],
    },
  },
} as const
