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
      _mysql_crypto_key: {
        Row: {
          id: number
          key: string
        }
        Insert: {
          id?: number
          key: string
        }
        Update: {
          id?: number
          key?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          barber_name: string | null
          coupon_code: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          google_calendar_barber_id: string | null
          google_event_id: string | null
          id: string
          notes: string | null
          review_token: string | null
          service_id: string | null
          status: string | null
          total_price: number | null
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          barber_name?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          google_calendar_barber_id?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          review_token?: string | null
          service_id?: string | null
          status?: string | null
          total_price?: number | null
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          barber_name?: string | null
          coupon_code?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          google_calendar_barber_id?: string | null
          google_event_id?: string | null
          id?: string
          notes?: string | null
          review_token?: string | null
          service_id?: string | null
          status?: string | null
          total_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      available_time_slots: {
        Row: {
          active: boolean
          created_at: string
          id: string
          slot_time: string
          sort_order: number
          weekday: number | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          slot_time: string
          sort_order?: number
          weekday?: number | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          slot_time?: string
          sort_order?: number
          weekday?: number | null
        }
        Relationships: []
      }
      barbers: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          sort_order: number
          specialty: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      barbershop_amenities: {
        Row: {
          active: boolean
          amenity_key: string
          created_at: string
          id: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          amenity_key: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          amenity_key?: string
          created_at?: string
          id?: string
          sort_order?: number
        }
        Relationships: []
      }
      barbershop_profiles: {
        Row: {
          address: string | null
          created_at: string
          custom_domain: string | null
          id: string
          is_active: boolean
          is_cloud: boolean
          is_locked: boolean
          mysql_profile_id: string | null
          name: string
          owner_email: string
          owner_name: string | null
          owner_password: string
          permissions: Json
          phone: string | null
          site_mode: string
          site_published: boolean
          slug: string
          subdomain: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          is_cloud?: boolean
          is_locked?: boolean
          mysql_profile_id?: string | null
          name: string
          owner_email: string
          owner_name?: string | null
          owner_password: string
          permissions?: Json
          phone?: string | null
          site_mode?: string
          site_published?: boolean
          slug: string
          subdomain?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          is_active?: boolean
          is_cloud?: boolean
          is_locked?: boolean
          mysql_profile_id?: string | null
          name?: string
          owner_email?: string
          owner_name?: string | null
          owner_password?: string
          permissions?: Json
          phone?: string | null
          site_mode?: string
          site_published?: boolean
          slug?: string
          subdomain?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbershop_profiles_mysql_profile_id_fkey"
            columns: ["mysql_profile_id"]
            isOneToOne: false
            referencedRelation: "mysql_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      cashier_movements: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          session_id: string
          type: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          session_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          session_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashier_movements_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "cashier_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cashier_sessions: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          created_at: string
          id: string
          notes: string | null
          opened_at: string
          opening_amount: number
          panel_user_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          panel_user_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          panel_user_id?: string | null
        }
        Relationships: []
      }
      chatpro_config: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          instance_id: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endpoint?: string
          id?: string
          instance_id?: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          instance_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      command_items: {
        Row: {
          command_id: string
          created_at: string
          id: string
          price: number
          qty: number
          ref_id: string | null
          title: string
          type: string
        }
        Insert: {
          command_id: string
          created_at?: string
          id?: string
          price: number
          qty?: number
          ref_id?: string | null
          title: string
          type: string
        }
        Update: {
          command_id?: string
          created_at?: string
          id?: string
          price?: number
          qty?: number
          ref_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_items_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "commands"
            referencedColumns: ["id"]
          },
        ]
      }
      commands: {
        Row: {
          barber_name: string | null
          closed_at: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          opened_at: string
          panel_user_id: string | null
          status: string
          total: number
        }
        Insert: {
          barber_name?: string | null
          closed_at?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          opened_at?: string
          panel_user_id?: string | null
          status?: string
          total?: number
        }
        Update: {
          barber_name?: string | null
          closed_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          opened_at?: string
          panel_user_id?: string | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          appointment_id: string | null
          barber_id: string | null
          barber_name: string | null
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
          percent: number | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          barber_id?: string | null
          barber_name?: string | null
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          percent?: number | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          barber_id?: string | null
          barber_name?: string | null
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          percent?: number | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          discount_percent: number | null
          discount_value: number | null
          expires_at: string | null
          id: string
          max_uses: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_percent?: number | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
        }
        Relationships: []
      }
      credit_accounts: {
        Row: {
          balance: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_movements: {
        Row: {
          account_id: string
          amount: number
          appointment_id: string | null
          created_at: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          appointment_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_movements_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "credit_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          barber_id: string
          barber_name: string
          calendar_id: string
          created_at: string
          expires_at: string
          google_email: string | null
          id: string
          refresh_token: string
          updated_at: string
        }
        Insert: {
          access_token: string
          barber_id: string
          barber_name: string
          calendar_id?: string
          created_at?: string
          expires_at: string
          google_email?: string | null
          id?: string
          refresh_token: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          barber_id?: string
          barber_name?: string
          calendar_id?: string
          created_at?: string
          expires_at?: string
          google_email?: string | null
          id?: string
          refresh_token?: string
          updated_at?: string
        }
        Relationships: []
      }
      mysql_profiles: {
        Row: {
          created_at: string
          database_name: string
          host: string
          id: string
          is_active: boolean
          last_test_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          name: string
          password_encrypted: string
          port: number
          ssl_enabled: boolean
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          database_name: string
          host: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name: string
          password_encrypted: string
          port?: number
          ssl_enabled?: boolean
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          database_name?: string
          host?: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          name?: string
          password_encrypted?: string
          port?: number
          ssl_enabled?: boolean
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          id: string
          link: string | null
          message: string
          order_id: string | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          link?: string | null
          message: string
          order_id?: string | null
          read_at?: string | null
          title: string
          type?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          id?: string
          link?: string | null
          message?: string
          order_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_price: number
          product_title: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_price: number
          product_title: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_price?: number
          product_title?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          city: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          delivery_mode: string
          id: string
          neighborhood: string | null
          notes: string | null
          payment_method: string | null
          review_token: string | null
          reviewed: boolean
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_mode?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          payment_method?: string | null
          review_token?: string | null
          reviewed?: boolean
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          city?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_mode?: string
          id?: string
          neighborhood?: string | null
          notes?: string | null
          payment_method?: string | null
          review_token?: string | null
          reviewed?: boolean
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      panel_users: {
        Row: {
          active: boolean
          barber_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          password_hash: string
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          barber_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          password_hash: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          barber_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          password_hash?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      prize_wheel_slices: {
        Row: {
          active: boolean
          created_at: string
          custom_prize: string | null
          discount_percent: number | null
          discount_value: number | null
          icon: string
          id: string
          image_url: string | null
          label: string
          probability: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          custom_prize?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          icon?: string
          id?: string
          image_url?: string | null
          label: string
          probability?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          custom_prize?: string | null
          discount_percent?: number | null
          discount_value?: number | null
          icon?: string
          id?: string
          image_url?: string | null
          label?: string
          probability?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          is_public: boolean
          order_id: string | null
          product_id: string
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_public?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_public?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          brand: string | null
          category: string | null
          created_at: string
          description: string | null
          gallery: Json | null
          highlights: Json | null
          id: string
          image_url: string | null
          long_description: string | null
          price: number
          sort_order: number
          stock: number | null
          title: string
          updated_at: string
          weight: string | null
        }
        Insert: {
          active?: boolean
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          gallery?: Json | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          price: number
          sort_order?: number
          stock?: number | null
          title: string
          updated_at?: string
          weight?: string | null
        }
        Update: {
          active?: boolean
          brand?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          gallery?: Json | null
          highlights?: Json | null
          id?: string
          image_url?: string | null
          long_description?: string | null
          price?: number
          sort_order?: number
          stock?: number | null
          title?: string
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      render_baileys_session: {
        Row: {
          auth_state: Json | null
          id: number
          updated_at: string
        }
        Insert: {
          auth_state?: Json | null
          id?: number
          updated_at?: string
        }
        Update: {
          auth_state?: Json | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      render_config: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          shared_secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          shared_secret?: string
          updated_at?: string
          url?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          shared_secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          is_public: boolean
          rating: number
          review_token: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          is_public?: boolean
          rating: number
          review_token?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          is_public?: boolean
          rating?: number
          review_token?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean | null
          category: string | null
          created_at: string | null
          duration: string
          id: string
          image_url: string | null
          price: number
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          duration: string
          id?: string
          image_url?: string | null
          price: number
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          category?: string | null
          created_at?: string | null
          duration?: string
          id?: string
          image_url?: string | null
          price?: number
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      store_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          last_order_at: string | null
          name: string
          notes: string | null
          phone: string | null
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_inventory_movements: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          qty: number
          reason: string | null
          supplier_id: string | null
          type: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          qty: number
          reason?: string | null
          supplier_id?: string | null
          type: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          qty?: number
          reason?: string | null
          supplier_id?: string | null
          type?: string
          unit_cost?: number | null
        }
        Relationships: []
      }
      store_panel_users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          password_hash: string
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          password_hash: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          password_hash?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      store_suppliers: {
        Row: {
          active: boolean
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          active: boolean
          contact: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_carts: {
        Row: {
          created_at: string
          id: string
          items: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
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
      waitlist_entries: {
        Row: {
          called_at: string | null
          created_at: string
          finished_at: string | null
          id: string
          notes: string | null
          service_name: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          user_name: string
          user_phone: string | null
        }
        Insert: {
          called_at?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          service_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          user_name: string
          user_phone?: string | null
        }
        Update: {
          called_at?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          service_name?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          user_phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      barbershop_public: {
        Row: {
          id: string | null
          is_active: boolean | null
          is_cloud: boolean | null
          name: string | null
          site_mode: string | null
          site_published: boolean | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          is_cloud?: boolean | null
          name?: string | null
          site_mode?: string | null
          site_published?: boolean | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          is_cloud?: boolean | null
          name?: string | null
          site_mode?: string | null
          site_published?: boolean | null
          slug?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_mysql_profile: {
        Args: { _profile_id: string }
        Returns: undefined
      }
      deactivate_all_mysql_profiles: { Args: never; Returns: undefined }
      decrypt_mysql_password: { Args: { _encrypted: string }; Returns: string }
      encrypt_mysql_password: { Args: { _plain: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_owner_password: { Args: { _plain: string }; Returns: string }
      hash_panel_password: { Args: { _plain: string }; Returns: string }
      verify_panel_login: {
        Args: { _email: string; _plain: string }
        Returns: {
          active: boolean
          barber_id: string
          email: string
          full_name: string
          id: string
          permissions: Json
          role: string
        }[]
      }
      verify_store_panel_login: {
        Args: { _email: string; _plain: string }
        Returns: {
          active: boolean
          email: string
          full_name: string
          id: string
          permissions: Json
          role: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
