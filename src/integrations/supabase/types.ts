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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addon_purchases: {
        Row: {
          addon_type: string
          amount: number
          created_at: string
          id: string
          purchased_at: string | null
          razorpay_payment_id: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          addon_type: string
          amount: number
          created_at?: string
          id?: string
          purchased_at?: string | null
          razorpay_payment_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          addon_type?: string
          amount?: number
          created_at?: string
          id?: string
          purchased_at?: string | null
          razorpay_payment_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      advance_payments: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string
          razorpay_payment_id: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          course_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string
          razorpay_payment_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string
          razorpay_payment_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advance_payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          request_type: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          request_type: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          request_type?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          module_id: string | null
          passing_score: number
          questions_count: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          module_id?: string | null
          passing_score?: number
          questions_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          module_id?: string | null
          passing_score?: number
          questions_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          batch_id: string
          class_date: string
          created_at: string
          id: string
          marked_by: string | null
          status: string
          student_id: string
        }
        Insert: {
          batch_id: string
          class_date: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id: string
        }
        Update: {
          batch_id?: string
          class_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      batches: {
        Row: {
          available_seats: number
          batch_name: string
          booking_enabled: boolean | null
          course_id: string
          created_at: string
          days: string
          id: string
          start_date: string | null
          time_slot: string
          total_seats: number
          updated_at: string
        }
        Insert: {
          available_seats?: number
          batch_name: string
          booking_enabled?: boolean | null
          course_id: string
          created_at?: string
          days: string
          id?: string
          start_date?: string | null
          time_slot: string
          total_seats?: number
          updated_at?: string
        }
        Update: {
          available_seats?: number
          batch_name?: string
          booking_enabled?: boolean | null
          course_id?: string
          created_at?: string
          days?: string
          id?: string
          start_date?: string | null
          time_slot?: string
          total_seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_chef_id: string | null
          booking_date: string
          course_id: string
          created_at: string
          id: string
          recipe_id: string | null
          status: string
          student_id: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          assigned_chef_id?: string | null
          booking_date: string
          course_id: string
          created_at?: string
          id?: string
          recipe_id?: string | null
          status?: string
          student_id: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          assigned_chef_id?: string | null
          booking_date?: string
          course_id?: string
          created_at?: string
          id?: string
          recipe_id?: string | null
          status?: string
          student_id?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_chef_id_fkey"
            columns: ["assigned_chef_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          course_id: string
          created_at: string
          id: string
          issue_date: string
          status: string
          student_id: string
        }
        Insert: {
          certificate_number: string
          course_id: string
          created_at?: string
          id?: string
          issue_date?: string
          status?: string
          student_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          created_at?: string
          id?: string
          issue_date?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chef_specializations: {
        Row: {
          chef_id: string
          created_at: string
          id: string
          recipe_id: string
        }
        Insert: {
          chef_id: string
          created_at?: string
          id?: string
          recipe_id: string
        }
        Update: {
          chef_id?: string
          created_at?: string
          id?: string
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chef_specializations_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          base_fee: number
          created_at: string
          description: string
          duration: string
          id: string
          image_url: string | null
          level: string
          materials_count: number | null
          title: string
          updated_at: string
        }
        Insert: {
          base_fee: number
          created_at?: string
          description: string
          duration: string
          id?: string
          image_url?: string | null
          level: string
          materials_count?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          base_fee?: number
          created_at?: string
          description?: string
          duration?: string
          id?: string
          image_url?: string | null
          level?: string
          materials_count?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_inventory_requirement_items: {
        Row: {
          created_at: string
          current_stock: number
          id: string
          inventory_id: string
          is_purchased: boolean
          recipe_id: string | null
          required_quantity: number
          requirement_id: string
          to_purchase: number
        }
        Insert: {
          created_at?: string
          current_stock?: number
          id?: string
          inventory_id: string
          is_purchased?: boolean
          recipe_id?: string | null
          required_quantity?: number
          requirement_id: string
          to_purchase?: number
        }
        Update: {
          created_at?: string
          current_stock?: number
          id?: string
          inventory_id?: string
          is_purchased?: boolean
          recipe_id?: string | null
          required_quantity?: number
          requirement_id?: string
          to_purchase?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_inventory_requirement_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inventory_requirement_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_inventory_requirement_items_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "daily_inventory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_inventory_requirements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          generated_at: string
          generated_by: string
          id: string
          notes: string | null
          purchased_at: string | null
          purchased_by: string | null
          requirement_date: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by: string
          id?: string
          notes?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          requirement_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          generated_at?: string
          generated_by?: string
          id?: string
          notes?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          requirement_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollment_status_logs: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_enrollment_status: string
          old_enrollment_status: string
          reason: string | null
          student_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_enrollment_status: string
          old_enrollment_status: string
          reason?: string | null
          student_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_enrollment_status?: string
          old_enrollment_status?: string
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_status_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          attendance_completed: boolean | null
          attended_classes: number | null
          batch_id: string
          course_id: string
          created_at: string
          created_by: string | null
          enrollment_date: string
          fee_snapshot: number | null
          id: string
          is_advance_payment: boolean | null
          payment_completed: boolean | null
          progress: number | null
          status: string
          student_code: string | null
          student_id: string
          total_classes: number | null
          updated_at: string
          visiting_discount_type: string | null
          visiting_discount_value: number | null
        }
        Insert: {
          attendance_completed?: boolean | null
          attended_classes?: number | null
          batch_id: string
          course_id: string
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          fee_snapshot?: number | null
          id?: string
          is_advance_payment?: boolean | null
          payment_completed?: boolean | null
          progress?: number | null
          status?: string
          student_code?: string | null
          student_id: string
          total_classes?: number | null
          updated_at?: string
          visiting_discount_type?: string | null
          visiting_discount_value?: number | null
        }
        Update: {
          attendance_completed?: boolean | null
          attended_classes?: number | null
          batch_id?: string
          course_id?: string
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          fee_snapshot?: number | null
          id?: string
          is_advance_payment?: boolean | null
          payment_completed?: boolean | null
          progress?: number | null
          status?: string
          student_code?: string | null
          student_id?: string
          total_classes?: number | null
          updated_at?: string
          visiting_discount_type?: string | null
          visiting_discount_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          batch_id: string | null
          category: string
          chef_id: string | null
          created_at: string
          feedback_text: string
          id: string
          rating: number
          student_id: string
          suggestions: string | null
        }
        Insert: {
          batch_id?: string | null
          category: string
          chef_id?: string | null
          created_at?: string
          feedback_text: string
          id?: string
          rating: number
          student_id: string
          suggestions?: string | null
        }
        Update: {
          batch_id?: string | null
          category?: string
          chef_id?: string | null
          created_at?: string
          feedback_text?: string
          id?: string
          rating?: number
          student_id?: string
          suggestions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_ledger: {
        Row: {
          amount: number
          created_at: string
          enrollment_id: string | null
          entry_type: string
          id: string
          notes: string | null
          performed_by: string
          reference_id: string | null
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          enrollment_id?: string | null
          entry_type: string
          id?: string
          notes?: string | null
          performed_by: string
          reference_id?: string | null
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          enrollment_id?: string | null
          entry_type?: string
          id?: string
          notes?: string | null
          performed_by?: string
          reference_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_ledger_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_ledger_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string
          cost_per_unit: number | null
          created_at: string
          current_stock: number
          id: string
          name: string
          reorder_level: number
          required_stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          name: string
          reorder_level?: number
          required_stock?: number
          unit: string
          updated_at?: string
        }
        Update: {
          category?: string
          cost_per_unit?: number | null
          created_at?: string
          current_stock?: number
          id?: string
          name?: string
          reorder_level?: number
          required_stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_approvals: {
        Row: {
          action: string
          id: string
          notes: string | null
          performed_at: string
          performed_by: string
          requirement_id: string
        }
        Insert: {
          action: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by: string
          requirement_id: string
        }
        Update: {
          action?: string
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_approvals_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "daily_inventory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checklist_items: {
        Row: {
          checklist_id: string
          created_at: string
          current_stock: number
          id: string
          inventory_id: string
          is_purchased: boolean
          required_quantity: number
          to_purchase: number
        }
        Insert: {
          checklist_id: string
          created_at?: string
          current_stock?: number
          id?: string
          inventory_id: string
          is_purchased?: boolean
          required_quantity?: number
          to_purchase?: number
        }
        Update: {
          checklist_id?: string
          created_at?: string
          current_stock?: number
          id?: string
          inventory_id?: string
          is_purchased?: boolean
          required_quantity?: number
          to_purchase?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "inventory_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_checklist_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_checklists: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checklist_date: string
          created_at: string
          generated_by: string
          id: string
          notes: string | null
          purchased_at: string | null
          purchased_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checklist_date: string
          created_at?: string
          generated_by: string
          id?: string
          notes?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checklist_date?: string
          created_at?: string
          generated_by?: string
          id?: string
          notes?: string | null
          purchased_at?: string | null
          purchased_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_ledger: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          movement_type: string
          notes: string | null
          performed_by: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          movement_type: string
          notes?: string | null
          performed_by: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_usage: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          quantity_used: number
          usage_date: string
          used_by: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          quantity_used: number
          usage_date?: string
          used_by: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity_used?: number
          usage_date?: string
          used_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_usage_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          released_at: string | null
          released_by: string | null
          released_to_vendor: boolean
          resume_url: string | null
          status: string
          student_id: string
          updated_at: string
          vendor_status: string | null
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          released_at?: string | null
          released_by?: string | null
          released_to_vendor?: boolean
          resume_url?: string | null
          status?: string
          student_id: string
          updated_at?: string
          vendor_status?: string | null
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          released_at?: string | null
          released_by?: string | null
          released_to_vendor?: boolean
          resume_url?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          vendor_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_application_counts"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          location: string
          posted_at: string
          requirements: string[] | null
          salary_range: string | null
          title: string
          type: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          company: string
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          location: string
          posted_at?: string
          requirements?: string[] | null
          salary_range?: string | null
          title: string
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          company?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          location?: string
          posted_at?: string
          requirements?: string[] | null
          salary_range?: string | null
          title?: string
          type?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          course_id: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          confirmed_at: string
          created_at: string | null
          id: string
          message: string
          notification_id: string | null
          recipient_id: string
          sent_by: string
          title: string
        }
        Insert: {
          confirmed_at?: string
          created_at?: string | null
          id?: string
          message: string
          notification_id?: string | null
          recipient_id: string
          sent_by: string
          title: string
        }
        Update: {
          confirmed_at?: string
          created_at?: string | null
          id?: string
          message?: string
          notification_id?: string | null
          recipient_id?: string
          sent_by?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          enrollment_id: string
          id: string
          paid_at: string | null
          payment_id: string | null
          payment_stage: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          enrollment_id: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_stage: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          enrollment_id?: string
          id?: string
          paid_at?: string | null
          payment_id?: string | null
          payment_stage?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          enrollment_id: string
          gst_amount: number
          id: string
          invoice_number: string | null
          payment_date: string
          payment_method: string
          status: string
          stripe_payment_id: string | null
          student_id: string
          total_amount: number
        }
        Insert: {
          amount: number
          created_at?: string
          enrollment_id: string
          gst_amount: number
          id?: string
          invoice_number?: string | null
          payment_date?: string
          payment_method: string
          status?: string
          stripe_payment_id?: string | null
          student_id: string
          total_amount: number
        }
        Update: {
          amount?: number
          created_at?: string
          enrollment_id?: string
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          payment_date?: string
          payment_method?: string
          status?: string
          stripe_payment_id?: string | null
          student_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_proof_url: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          documents_verified: boolean | null
          email: string | null
          enrollment_status: string
          first_name: string
          id: string
          last_name: string
          marksheet_url: string | null
          must_change_password: boolean | null
          passport_photo_url: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address_proof_url?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          documents_verified?: boolean | null
          email?: string | null
          enrollment_status?: string
          first_name: string
          id: string
          last_name: string
          marksheet_url?: string | null
          must_change_password?: boolean | null
          passport_photo_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address_proof_url?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          documents_verified?: boolean | null
          email?: string | null
          enrollment_status?: string
          first_name?: string
          id?: string
          last_name?: string
          marksheet_url?: string | null
          must_change_password?: boolean | null
          passport_photo_url?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          ordered_quantity: number
          purchase_order_id: string
          received_quantity: number
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          ordered_quantity?: number
          purchase_order_id: string
          received_quantity?: number
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          ordered_quantity?: number
          purchase_order_id?: string
          received_quantity?: number
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          received_at: string | null
          received_by: string | null
          requirement_id: string | null
          status: string
          total_amount: number
          updated_at: string
          vendor_name: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          requirement_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_name: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          received_at?: string | null
          received_by?: string | null
          requirement_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "daily_inventory_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          assessment_id: string
          correct_answer: string
          created_at: string
          id: string
          options: Json
          order_index: number
          points: number
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          correct_answer: string
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          points?: number
          question_text: string
          question_type?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          correct_answer?: string
          created_at?: string
          id?: string
          options?: Json
          order_index?: number
          points?: number
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_batch_audit_log: {
        Row: {
          action: string
          actor_id: string
          course_id: string
          created_at: string
          id: string
          new_batch_id: string | null
          previous_batch_id: string | null
          reason: string | null
          recipe_id: string
          student_id: string
        }
        Insert: {
          action: string
          actor_id: string
          course_id: string
          created_at?: string
          id?: string
          new_batch_id?: string | null
          previous_batch_id?: string | null
          reason?: string | null
          recipe_id: string
          student_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          course_id?: string
          created_at?: string
          id?: string
          new_batch_id?: string | null
          previous_batch_id?: string | null
          reason?: string | null
          recipe_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_batch_audit_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batch_audit_log_new_batch_id_fkey"
            columns: ["new_batch_id"]
            isOneToOne: false
            referencedRelation: "recipe_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batch_audit_log_previous_batch_id_fkey"
            columns: ["previous_batch_id"]
            isOneToOne: false
            referencedRelation: "recipe_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batch_audit_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batch_audit_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_batch_memberships: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          booking_id: string | null
          created_at: string
          id: string
          is_manual_assignment: boolean
          recipe_batch_id: string
          student_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          is_manual_assignment?: boolean
          recipe_batch_id: string
          student_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          is_manual_assignment?: boolean
          recipe_batch_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_batch_memberships_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batch_memberships_recipe_batch_id_fkey"
            columns: ["recipe_batch_id"]
            isOneToOne: false
            referencedRelation: "recipe_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batch_memberships_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_batches: {
        Row: {
          batch_date: string
          capacity: number
          course_id: string
          created_at: string
          id: string
          is_manually_adjusted: boolean
          recipe_id: string
          session_notes: string | null
          session_notes_at: string | null
          session_notes_by: string | null
          status: string
          time_slot: string
          updated_at: string
        }
        Insert: {
          batch_date: string
          capacity?: number
          course_id: string
          created_at?: string
          id?: string
          is_manually_adjusted?: boolean
          recipe_id: string
          session_notes?: string | null
          session_notes_at?: string | null
          session_notes_by?: string | null
          status?: string
          time_slot: string
          updated_at?: string
        }
        Update: {
          batch_date?: string
          capacity?: number
          course_id?: string
          created_at?: string
          id?: string
          is_manually_adjusted?: boolean
          recipe_id?: string
          session_notes?: string | null
          session_notes_at?: string | null
          session_notes_by?: string | null
          status?: string
          time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          created_at: string
          id: string
          inventory_id: string
          notes: string | null
          quantity_per_student: number
          recipe_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id: string
          notes?: string | null
          quantity_per_student?: number
          recipe_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity_per_student?: number
          recipe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cook_time: number | null
          course_id: string
          created_at: string
          description: string | null
          difficulty: string | null
          id: string
          ingredients: Json | null
          instructions: string | null
          module_id: string | null
          prep_time: number | null
          title: string
          updated_at: string
          version: number
          video_url: string | null
        }
        Insert: {
          cook_time?: number | null
          course_id: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          module_id?: string | null
          prep_time?: number | null
          title: string
          updated_at?: string
          version?: number
          video_url?: string | null
        }
        Update: {
          cook_time?: number | null
          course_id?: string
          created_at?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          ingredients?: Json | null
          instructions?: string | null
          module_id?: string | null
          prep_time?: number | null
          title?: string
          updated_at?: string
          version?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          education: string | null
          email: string | null
          experience: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          resume_url: string | null
          skills: string | null
          student_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          education?: string | null
          email?: string | null
          experience?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string | null
          student_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          education?: string | null
          email?: string | null
          experience?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          resume_url?: string | null
          skills?: string | null
          student_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_access_approvals: {
        Row: {
          advance_payment_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          credentials_sent_at: string | null
          generated_password: string | null
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          advance_payment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credentials_sent_at?: string | null
          generated_password?: string | null
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          advance_payment_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credentials_sent_at?: string | null
          generated_password?: string | null
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_access_approvals_advance_payment_id_fkey"
            columns: ["advance_payment_id"]
            isOneToOne: false
            referencedRelation: "advance_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean | null
          question_id: string
          selected_answer: string | null
          student_assessment_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_answer?: string | null
          student_assessment_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_answer?: string | null
          student_assessment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_student_assessment_id_fkey"
            columns: ["student_assessment_id"]
            isOneToOne: false
            referencedRelation: "student_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_assessments: {
        Row: {
          assessment_id: string
          completed_at: string | null
          created_at: string
          id: string
          score: number | null
          started_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_assessments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_onboarding: {
        Row: {
          completed_at: string
          created_at: string
          goal: string
          id: string
          preferred_duration: string
          recipe_interests: string[]
          skill_level: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          goal: string
          id?: string
          preferred_duration: string
          recipe_interests?: string[]
          skill_level: string
          student_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          goal?: string
          id?: string
          preferred_duration?: string
          recipe_interests?: string[]
          skill_level?: string
          student_id?: string
        }
        Relationships: []
      }
      student_recipe_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          recipe_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          recipe_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          recipe_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_recipe_progress_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_recipe_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_access_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          credentials_sent_at: string | null
          generated_password: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
          vendor_profile_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credentials_sent_at?: string | null
          generated_password?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
          vendor_profile_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          credentials_sent_at?: string | null
          generated_password?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
          vendor_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_access_approvals_vendor_profile_id_fkey"
            columns: ["vendor_profile_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_profiles: {
        Row: {
          approval_status: string
          company_description: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          updated_at: string
          user_id: string
          vendor_code: string | null
          website: string | null
        }
        Insert: {
          approval_status?: string
          company_description?: string | null
          company_name: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          updated_at?: string
          user_id: string
          vendor_code?: string | null
          website?: string | null
        }
        Update: {
          approval_status?: string
          company_description?: string | null
          company_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          updated_at?: string
          user_id?: string
          vendor_code?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      job_application_counts: {
        Row: {
          application_count: number | null
          company: string | null
          is_active: boolean | null
          job_id: string | null
          location: string | null
          pending_count: number | null
          posted_at: string | null
          reviewed_count: number | null
          shortlisted_count: number | null
          title: string | null
          type: string | null
          vendor_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendor_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_move_student_batch: {
        Args: {
          p_from_batch_id: string
          p_reason?: string
          p_student_id: string
          p_to_batch_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      admin_remove_student_from_batch: {
        Args: { p_batch_id: string; p_reason?: string; p_student_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      approve_inventory_checklist: {
        Args: { p_notes?: string; p_requirement_id: string }
        Returns: undefined
      }
      approve_student_access: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      book_recipe_slot: {
        Args: {
          p_batch_date: string
          p_course_id: string
          p_recipe_id: string
          p_student_id: string
          p_time_slot: string
        }
        Returns: {
          booking_id: string
          message: string
          recipe_batch_id: string
          success: boolean
        }[]
      }
      book_recipe_slot_safe: {
        Args: {
          p_booking_id?: string
          p_recipe_batch_id: string
          p_student_id: string
        }
        Returns: undefined
      }
      cancel_recipe_booking: {
        Args: { p_booking_id: string; p_student_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      check_certificate_eligibility: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: boolean
      }
      check_lead_rate_limit: { Args: { p_email: string }; Returns: boolean }
      check_student_booking_eligibility: {
        Args: { p_student_id: string }
        Returns: {
          course_id: string
          is_eligible: boolean
          next_recipe_id: string
          next_recipe_title: string
          reason: string
        }[]
      }
      check_student_login_eligibility: {
        Args: { p_user_id: string }
        Returns: string
      }
      confirm_batch_completion: {
        Args: {
          p_attendance: Json
          p_batch_date: string
          p_recipe_id: string
          p_session_notes?: string
          p_time_slot: string
        }
        Returns: Json
      }
      create_payment_schedule: {
        Args: {
          p_due_days_1?: number
          p_due_days_2?: number
          p_enrollment_id: string
          p_registration_amount?: number
          p_student_id: string
          p_total_amount: number
        }
        Returns: undefined
      }
      decrement_batch_seats: { Args: { batch_id: string }; Returns: undefined }
      generate_certificate_number: {
        Args: { p_course_id: string }
        Returns: string
      }
      generate_daily_inventory_requirements: {
        Args: { p_date: string }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_random_password: { Args: never; Returns: string }
      generate_student_id: { Args: { p_course_id: string }; Returns: string }
      generate_vendor_id: { Args: never; Returns: string }
      get_available_recipe_slots: {
        Args: { p_course_id: string; p_from_date?: string; p_recipe_id: string }
        Returns: {
          available_spots: number
          batch_date: string
          capacity: number
          current_count: number
          recipe_batch_id: string
          time_slot: string
        }[]
      }
      get_current_vendor_profile: {
        Args: never
        Returns: {
          approval_status: string
          company_description: string | null
          company_name: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          updated_at: string
          user_id: string
          vendor_code: string | null
          website: string | null
        }
        SetofOptions: {
          from: "*"
          to: "vendor_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_next_incomplete_recipe: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: {
          recipe_id: string
          recipe_order: number
          recipe_title: string
        }[]
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_advance_paid: {
        Args: { p_payment_id: string; p_student_id: string }
        Returns: undefined
      }
      mark_recipe_complete_by_chef: {
        Args: { p_recipe_id: string; p_student_id: string }
        Returns: boolean
      }
      receive_purchase_order: { Args: { p_po_id: string }; Returns: undefined }
      release_application_to_vendor: {
        Args: { p_application_id: string }
        Returns: boolean
      }
      safe_deduct_inventory: {
        Args: {
          p_inventory_id: string
          p_notes?: string
          p_quantity: number
          p_used_by: string
        }
        Returns: undefined
      }
      update_overdue_payments: { Args: never; Returns: number }
    }
    Enums: {
      app_role:
        | "admin"
        | "student"
        | "chef"
        | "super_admin"
        | "inventory_manager"
        | "vendor"
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
      app_role: [
        "admin",
        "student",
        "chef",
        "super_admin",
        "inventory_manager",
        "vendor",
      ],
    },
  },
} as const
