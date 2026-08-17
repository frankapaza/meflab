export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      archivo: {
        Row: {
          bucket: string
          bytes: number | null
          id: string
          nombre: string
          orden_id: string | null
          ruta: string
          subido_en: string
          subido_por: string | null
          tenant_id: string
          tipo_mime: string | null
        }
        Insert: {
          bucket: string
          bytes?: number | null
          id?: string
          nombre: string
          orden_id?: string | null
          ruta: string
          subido_en?: string
          subido_por?: string | null
          tenant_id: string
          tipo_mime?: string | null
        }
        Update: {
          bucket?: string
          bytes?: number | null
          id?: string
          nombre?: string
          orden_id?: string | null
          ruta?: string
          subido_en?: string
          subido_por?: string | null
          tenant_id?: string
          tipo_mime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archivo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archivo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      area: {
        Row: {
          activo: boolean
          codigo: string
          color: string | null
          created_at: string
          created_by: string | null
          es_default: boolean
          id: string
          lider_id: string | null
          nombre: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          es_default?: boolean
          id?: string
          lider_id?: string | null
          nombre: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          es_default?: boolean
          id?: string
          lider_id?: string | null
          nombre?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "area_lider_fk"
            columns: ["lider_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria: {
        Row: {
          accion: string
          antes: Json | null
          despues: Json | null
          id: number
          ip: unknown
          ocurrido_en: string
          registro_id: string | null
          tabla: string
          tenant_id: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          antes?: Json | null
          despues?: Json | null
          id?: number
          ip?: unknown
          ocurrido_en?: string
          registro_id?: string | null
          tabla: string
          tenant_id?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          antes?: Json | null
          despues?: Json | null
          id?: number
          ip?: unknown
          ocurrido_en?: string
          registro_id?: string | null
          tabla?: string
          tenant_id?: string | null
          usuario_id?: string | null
        }
        Relationships: []
      }
      categoria_servicio: {
        Row: {
          activo: boolean
          id: string
          nombre: string
          orden: number
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
          orden?: number
          tenant_id: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
          orden?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_servicio_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente: {
        Row: {
          activo: boolean
          bloqueado: boolean
          created_at: string
          created_by: string | null
          dias_credito: number
          direccion: string | null
          email: string | null
          id: string
          linea_credito: number | null
          lista_precio_id: string | null
          motivo_bloqueo: string | null
          numero_documento: string
          razon_social: string
          telefono: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          bloqueado?: boolean
          created_at?: string
          created_by?: string | null
          dias_credito?: number
          direccion?: string | null
          email?: string | null
          id?: string
          linea_credito?: number | null
          lista_precio_id?: string | null
          motivo_bloqueo?: string | null
          numero_documento: string
          razon_social: string
          telefono?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          bloqueado?: boolean
          created_at?: string
          created_by?: string | null
          dias_credito?: number
          direccion?: string | null
          email?: string | null
          id?: string
          linea_credito?: number | null
          lista_precio_id?: string | null
          motivo_bloqueo?: string | null
          numero_documento?: string
          razon_social?: string
          telefono?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
          tipo_documento?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_lista_precio_fk"
            columns: ["lista_precio_id"]
            isOneToOne: false
            referencedRelation: "lista_precio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      color: {
        Row: {
          codigo: string
          escala_id: string
          hex: string | null
          id: string
          orden: number
          tenant_id: string
        }
        Insert: {
          codigo: string
          escala_id: string
          hex?: string | null
          id?: string
          orden?: number
          tenant_id: string
        }
        Update: {
          codigo?: string
          escala_id?: string
          hex?: string | null
          id?: string
          orden?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "color_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "escala_color"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "color_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion: {
        Row: {
          clave: string
          descripcion: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          valor: Json
        }
        Insert: {
          clave: string
          descripcion?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          valor: Json
        }
        Update: {
          clave?: string
          descripcion?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_trabajo: {
        Row: {
          afectacion: Database["public"]["Enums"]["afectacion_tributaria"]
          arcada: string | null
          area_id: string
          cantidad: number
          color_id: string | null
          created_at: string
          created_by: string | null
          id: string
          orden_id: string
          piezas_fdi: string[]
          precio_unitario: number
          servicio_id: string
          tenant_id: string
        }
        Insert: {
          afectacion?: Database["public"]["Enums"]["afectacion_tributaria"]
          arcada?: string | null
          area_id: string
          cantidad?: number
          color_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          orden_id: string
          piezas_fdi?: string[]
          precio_unitario: number
          servicio_id: string
          tenant_id: string
        }
        Update: {
          afectacion?: Database["public"]["Enums"]["afectacion_tributaria"]
          arcada?: string | null
          area_id?: string
          cantidad?: number
          color_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          orden_id?: string
          piezas_fdi?: string[]
          precio_unitario?: number
          servicio_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_trabajo_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_trabajo_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "color"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_trabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_trabajo_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_trabajo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor: {
        Row: {
          activo: boolean
          cliente_id: string
          colegiatura: string | null
          created_at: string
          created_by: string | null
          email: string | null
          especialidad: string | null
          id: string
          nombre: string
          sede_entrega: string | null
          telefono: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          cliente_id: string
          colegiatura?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          especialidad?: string | null
          id?: string
          nombre: string
          sede_entrega?: string | null
          telefono?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          cliente_id?: string
          colegiatura?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          especialidad?: string | null
          id?: string
          nombre?: string
          sede_entrega?: string | null
          telefono?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      entrega: {
        Row: {
          created_by: string | null
          entregado_en: string
          evidencia_id: string | null
          id: string
          metodo: string
          observaciones: string | null
          orden_id: string
          receptor: string
          tenant_id: string
        }
        Insert: {
          created_by?: string | null
          entregado_en?: string
          evidencia_id?: string | null
          id?: string
          metodo: string
          observaciones?: string | null
          orden_id: string
          receptor: string
          tenant_id: string
        }
        Update: {
          created_by?: string | null
          entregado_en?: string
          evidencia_id?: string | null
          id?: string
          metodo?: string
          observaciones?: string | null
          orden_id?: string
          receptor?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrega_evidencia_id_fkey"
            columns: ["evidencia_id"]
            isOneToOne: false
            referencedRelation: "archivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrega_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      escala_color: {
        Row: {
          activo: boolean
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
          tenant_id: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "escala_color_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      estado_trabajo: {
        Row: {
          activo: boolean
          codigo: string
          color: string | null
          fase: Database["public"]["Enums"]["fase_canonica"]
          glifo: string | null
          id: string
          nombre: string
          orden: number
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          color?: string | null
          fase: Database["public"]["Enums"]["fase_canonica"]
          glifo?: string | null
          id?: string
          nombre: string
          orden?: number
          tenant_id: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          color?: string | null
          fase?: Database["public"]["Enums"]["fase_canonica"]
          glifo?: string | null
          id?: string
          nombre?: string
          orden?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estado_trabajo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      flujo_etapa: {
        Row: {
          flujo_id: string
          id: string
          obligatoria: boolean
          orden: number
          proceso_id: string
          tenant_id: string
        }
        Insert: {
          flujo_id: string
          id?: string
          obligatoria?: boolean
          orden: number
          proceso_id: string
          tenant_id: string
        }
        Update: {
          flujo_id?: string
          id?: string
          obligatoria?: boolean
          orden?: number
          proceso_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flujo_etapa_flujo_id_fkey"
            columns: ["flujo_id"]
            isOneToOne: false
            referencedRelation: "flujo_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flujo_etapa_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "proceso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flujo_etapa_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      flujo_produccion: {
        Row: {
          activo: boolean
          area_id: string
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          area_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          area_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flujo_produccion_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flujo_produccion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_precio: {
        Row: {
          activo: boolean
          created_at: string
          created_by: string | null
          es_default: boolean
          id: string
          nombre: string
          precios_incluyen_igv: boolean
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          es_default?: boolean
          id?: string
          nombre: string
          precios_incluyen_igv?: boolean
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          created_at?: string
          created_by?: string | null
          es_default?: boolean
          id?: string
          nombre?: string
          precios_incluyen_igv?: boolean
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_precio_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      lista_precio_item: {
        Row: {
          lista_precio_id: string
          precio: number
          precio_capturado: number
          servicio_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          lista_precio_id: string
          precio?: number
          precio_capturado: number
          servicio_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          lista_precio_id?: string
          precio?: number
          precio_capturado?: number
          servicio_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lista_precio_item_lista_precio_id_fkey"
            columns: ["lista_precio_id"]
            isOneToOne: false
            referencedRelation: "lista_precio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_precio_item_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lista_precio_item_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_estado_historial: {
        Row: {
          estado_antes: string | null
          estado_despues: string
          id: number
          motivo: string | null
          ocurrido_en: string
          orden_id: string
          tenant_id: string
          usuario_id: string | null
        }
        Insert: {
          estado_antes?: string | null
          estado_despues: string
          id?: number
          motivo?: string | null
          ocurrido_en?: string
          orden_id: string
          tenant_id: string
          usuario_id?: string | null
        }
        Update: {
          estado_antes?: string | null
          estado_despues?: string
          id?: number
          motivo?: string | null
          ocurrido_en?: string
          orden_id?: string
          tenant_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_estado_historial_estado_antes_fkey"
            columns: ["estado_antes"]
            isOneToOne: false
            referencedRelation: "estado_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_estado_historial_estado_despues_fkey"
            columns: ["estado_despues"]
            isOneToOne: false
            referencedRelation: "estado_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_estado_historial_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_estado_historial_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      orden_trabajo: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          created_by: string | null
          doctor_id: string
          estado_id: string
          fecha_comprometida: string
          fecha_entrega: string | null
          fecha_recepcion: string
          id: string
          indicaciones: string | null
          paciente_id: string
          prioridad: Database["public"]["Enums"]["prioridad_trabajo"]
          sede_id: string | null
          tenant_id: string
          tipo_recepcion: Database["public"]["Enums"]["tipo_recepcion"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          created_by?: string | null
          doctor_id: string
          estado_id: string
          fecha_comprometida: string
          fecha_entrega?: string | null
          fecha_recepcion?: string
          id?: string
          indicaciones?: string | null
          paciente_id: string
          prioridad?: Database["public"]["Enums"]["prioridad_trabajo"]
          sede_id?: string | null
          tenant_id: string
          tipo_recepcion?: Database["public"]["Enums"]["tipo_recepcion"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          doctor_id?: string
          estado_id?: string
          fecha_comprometida?: string
          fecha_entrega?: string | null
          fecha_recepcion?: string
          id?: string
          indicaciones?: string | null
          paciente_id?: string
          prioridad?: Database["public"]["Enums"]["prioridad_trabajo"]
          sede_id?: string | null
          tenant_id?: string
          tipo_recepcion?: Database["public"]["Enums"]["tipo_recepcion"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orden_trabajo_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_estado_id_fkey"
            columns: ["estado_id"]
            isOneToOne: false
            referencedRelation: "estado_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "paciente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "v_paciente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orden_trabajo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      paciente: {
        Row: {
          created_at: string
          created_by: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
          numero_documento: string | null
          simplificado: boolean
          tenant_id: string
          tipo_documento: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          numero_documento?: string | null
          simplificado?: boolean
          tenant_id: string
          tipo_documento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          numero_documento?: string | null
          simplificado?: boolean
          tenant_id?: string
          tipo_documento?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paciente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      precio_historial: {
        Row: {
          cambiado_en: string
          cambiado_por: string | null
          id: number
          lista_precio_id: string | null
          precio_antes: number | null
          precio_despues: number
          servicio_id: string
          tenant_id: string
        }
        Insert: {
          cambiado_en?: string
          cambiado_por?: string | null
          id?: number
          lista_precio_id?: string | null
          precio_antes?: number | null
          precio_despues: number
          servicio_id: string
          tenant_id: string
        }
        Update: {
          cambiado_en?: string
          cambiado_por?: string | null
          id?: number
          lista_precio_id?: string | null
          precio_antes?: number | null
          precio_despues?: number
          servicio_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "precio_historial_lista_precio_id_fkey"
            columns: ["lista_precio_id"]
            isOneToOne: false
            referencedRelation: "lista_precio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precio_historial_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "precio_historial_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      proceso: {
        Row: {
          activo: boolean
          area_id: string
          codigo: string
          horas_estimadas: number
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          area_id: string
          codigo: string
          horas_estimadas?: number
          id?: string
          nombre: string
          tenant_id: string
        }
        Update: {
          activo?: boolean
          area_id?: string
          codigo?: string
          horas_estimadas?: number
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proceso_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proceso_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      sede: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          direccion: string | null
          id: string
          nombre: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sede_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      serie: {
        Row: {
          activo: boolean
          correlativo: number
          created_at: string
          created_by: string | null
          id: string
          sede_id: string | null
          serie: string
          tenant_id: string
          tipo_doc: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          correlativo?: number
          created_at?: string
          created_by?: string | null
          id?: string
          sede_id?: string | null
          serie: string
          tenant_id: string
          tipo_doc: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          correlativo?: number
          created_at?: string
          created_by?: string | null
          id?: string
          sede_id?: string | null
          serie?: string
          tenant_id?: string
          tipo_doc?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serie_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serie_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      servicio: {
        Row: {
          activo: boolean
          afectacion: Database["public"]["Enums"]["afectacion_tributaria"]
          area_id: string
          categoria_id: string | null
          codigo: string
          created_at: string
          created_by: string | null
          flujo_id: string | null
          id: string
          nombre: string
          precio_base: number
          precio_capturado: number
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          afectacion?: Database["public"]["Enums"]["afectacion_tributaria"]
          area_id: string
          categoria_id?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          flujo_id?: string | null
          id?: string
          nombre: string
          precio_base?: number
          precio_capturado: number
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          afectacion?: Database["public"]["Enums"]["afectacion_tributaria"]
          area_id?: string
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          flujo_id?: string | null
          id?: string
          nombre?: string
          precio_base?: number
          precio_capturado?: number
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicio_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicio_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categoria_servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicio_flujo_id_fkey"
            columns: ["flujo_id"]
            isOneToOne: false
            referencedRelation: "flujo_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicio_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_produccion: {
        Row: {
          area_id: string
          created_at: string
          estado: Database["public"]["Enums"]["estado_tarea"]
          fecha_programada: string | null
          horas_estimadas: number
          horas_reales: number | null
          id: string
          iniciada_en: string | null
          notas: string | null
          orden_etapa: number
          orden_id: string
          proceso_id: string
          tecnico_id: string | null
          tenant_id: string
          terminada_en: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area_id: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_tarea"]
          fecha_programada?: string | null
          horas_estimadas?: number
          horas_reales?: number | null
          id?: string
          iniciada_en?: string | null
          notas?: string | null
          orden_etapa: number
          orden_id: string
          proceso_id: string
          tecnico_id?: string | null
          tenant_id: string
          terminada_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area_id?: string
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_tarea"]
          fecha_programada?: string | null
          horas_estimadas?: number
          horas_reales?: number | null
          id?: string
          iniciada_en?: string | null
          notas?: string | null
          orden_etapa?: number
          orden_id?: string
          proceso_id?: string
          tecnico_id?: string | null
          tenant_id?: string
          terminada_en?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarea_produccion_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_produccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_produccion_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "proceso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_produccion_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_produccion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          ruc: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          ruc?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          ruc?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      usuario: {
        Row: {
          activo: boolean
          area_id: string | null
          created_at: string
          created_by: string | null
          email: string
          id: string
          nombre: string
          paneles: Json | null
          sede_id: string | null
          telefono: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          id: string
          nombre: string
          paneles?: Json | null
          sede_id?: string | null
          telefono?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          nombre?: string
          paneles?: Json | null
          sede_id?: string | null
          telefono?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_area_apoyo: {
        Row: {
          area_id: string
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          area_id: string
          tenant_id: string
          usuario_id: string
        }
        Update: {
          area_id?: string
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_area_apoyo_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_area_apoyo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_area_apoyo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_rol: {
        Row: {
          area_id: string | null
          created_at: string
          created_by: string | null
          rol: Database["public"]["Enums"]["rol_sistema"]
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          rol: Database["public"]["Enums"]["rol_sistema"]
          tenant_id: string
          usuario_id: string
        }
        Update: {
          area_id?: string | null
          created_at?: string
          created_by?: string | null
          rol?: Database["public"]["Enums"]["rol_sistema"]
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_rol_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_rol_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_rol_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_paciente: {
        Row: {
          created_at: string | null
          edad: number | null
          fecha_nacimiento: string | null
          id: string | null
          nombre: string | null
          numero_documento: string | null
          simplificado: boolean | null
          tenant_id: string | null
          tipo_documento: string | null
          updated_at: string | null
          ve_datos_sensibles: boolean | null
        }
        Insert: {
          created_at?: string | null
          edad?: never
          fecha_nacimiento?: never
          id?: string | null
          nombre?: string | null
          numero_documento?: never
          simplificado?: boolean | null
          tenant_id?: string | null
          tipo_documento?: never
          updated_at?: string | null
          ve_datos_sensibles?: never
        }
        Update: {
          created_at?: string | null
          edad?: never
          fecha_nacimiento?: never
          id?: string | null
          nombre?: string | null
          numero_documento?: never
          simplificado?: boolean | null
          tenant_id?: string | null
          tipo_documento?: never
          updated_at?: string | null
          ve_datos_sensibles?: never
        }
        Relationships: [
          {
            foreignKeyName: "paciente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      area_default: { Args: { p_tenant: string }; Returns: string }
      areas_del_usuario: { Args: never; Returns: string[] }
      asegurar_append_only: { Args: never; Returns: undefined }
      cambiar_estado_orden: {
        Args: { p_estado: string; p_orden: string }
        Returns: undefined
      }
      current_tenant_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      documento_valido: {
        Args: { p_numero: string; p_tipo: string }
        Returns: boolean
      }
      fijar_etapas_flujo: {
        Args: { p_flujo: string; p_procesos: string[] }
        Returns: number
      }
      fijar_paneles: { Args: { p_paneles: Json }; Returns: undefined }
      generar_codigo_orden: { Args: { p_tenant: string }; Returns: string }
      instanciar_etapas: { Args: { p_orden: string }; Returns: number }
      jwt_claims: { Args: never; Returns: Json }
      normalizar_valor_venta: {
        Args: { p_incluye_igv: boolean; p_precio: number; p_tasa_igv?: number }
        Returns: number
      }
      piezas_fdi_validas: { Args: { p_piezas: string[] }; Returns: boolean }
      pk_como_texto: {
        Args: { p_fila: Json; p_relid: unknown }
        Returns: string
      }
      precio_para_cliente: {
        Args: { p_cliente: string; p_servicio: string }
        Returns: number
      }
      registrar_doctor_independiente: {
        Args: {
          p_colegiatura?: string
          p_dias_credito?: number
          p_email?: string
          p_especialidad?: string
          p_linea_credito?: number
          p_lista_precio_id?: string
          p_nombre: string
          p_numero_documento: string
          p_sede_entrega?: string
          p_telefono?: string
          p_tipo_documento: string
        }
        Returns: string
      }
      registrar_orden: {
        Args: {
          p_cliente: string
          p_doctor: string
          p_fecha_comprometida: string
          p_indicaciones?: string
          p_lineas: Json
          p_paciente: string
          p_prioridad?: string
          p_sede?: string
          p_tipo_recepcion?: string
        }
        Returns: string
      }
      ruc_valido: { Args: { p_ruc: string }; Returns: boolean }
      siguiente_correlativo: {
        Args: { p_serie: string; p_tenant: string; p_tipo_doc: string }
        Returns: number
      }
      tasa_igv: { Args: { p_tenant: string }; Returns: number }
      tiene_rol: { Args: { roles: string[] }; Returns: boolean }
    }
    Enums: {
      afectacion_tributaria: "gravado" | "exonerado" | "inafecto"
      estado_tarea:
        | "sin_asignar"
        | "asignada"
        | "en_curso"
        | "completa"
        | "anulada"
      fase_canonica: "inicial" | "productiva" | "control" | "final" | "anulada"
      prioridad_trabajo: "normal" | "urgente"
      rol_sistema:
        | "administrador"
        | "gerencia"
        | "lider_laboratorio"
        | "recepcion"
        | "lider_area"
        | "tecnico"
        | "portal_cliente"
      tipo_cliente: "clinica" | "doctor_independiente"
      tipo_recepcion: "impresion_fisica" | "archivo_stl" | "modelo" | "otro"
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
      afectacion_tributaria: ["gravado", "exonerado", "inafecto"],
      estado_tarea: [
        "sin_asignar",
        "asignada",
        "en_curso",
        "completa",
        "anulada",
      ],
      fase_canonica: ["inicial", "productiva", "control", "final", "anulada"],
      prioridad_trabajo: ["normal", "urgente"],
      rol_sistema: [
        "administrador",
        "gerencia",
        "lider_laboratorio",
        "recepcion",
        "lider_area",
        "tecnico",
        "portal_cliente",
      ],
      tipo_cliente: ["clinica", "doctor_independiente"],
      tipo_recepcion: ["impresion_fisica", "archivo_stl", "modelo", "otro"],
    },
  },
} as const

