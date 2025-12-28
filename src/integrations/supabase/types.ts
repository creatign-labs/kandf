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
      batches: {
        Row: {
          available_seats: number
          batch_name: string
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
      enrollments: {
        Row: {
          batch_id: string
          course_id: string
          created_at: string
          enrollment_date: string
          id: string
          progress: number | null
          status: string
          student_code: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          course_id: string
          created_at?: string
          enrollment_date?: string
          id?: string
          progress?: number | null
          status?: string
          student_code?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          course_id?: string
          created_at?: string
          enrollment_date?: string
          id?: string
          progress?: number | null
          status?: string
          student_code?: string | null
          student_id?: string
          updated_at?: string
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
          category: string
          created_at: string
          feedback_text: string
          id: string
          rating: number
          student_id: string
          suggestions: string | null
        }
        Insert: {
          category: string
          created_at?: string
          feedback_text: string
          id?: string
          rating: number
          student_id: string
          suggestions?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          feedback_text?: string
          id?: string
          rating?: number
          student_id?: string
          suggestions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_student_id_fkey"
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
          resume_url: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
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
        }
        Relationships: []
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
          account_status: string
          avatar_url: string | null
          bio: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_inventory_checklist: {
        Args: { p_notes?: string; p_requirement_id: string }
        Returns: undefined
      }
      approve_student_access: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      check_student_login_eligibility: {
        Args: { p_user_id: string }
        Returns: string
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
    }
    Enums: {
      app_role: "admin" | "student" | "chef" | "super_admin"
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
      app_role: ["admin", "student", "chef", "super_admin"],
    },
  },
} as const
