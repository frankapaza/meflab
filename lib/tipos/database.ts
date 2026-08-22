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
            foreignKeyName: "archivo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "archivo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "archivo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
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
      caja_movimiento: {
        Row: {
          categoria: string
          concepto: string
          created_at: string
          created_by: string | null
          id: string
          importe: number
          pago_id: string | null
          sesion_id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
        }
        Insert: {
          categoria: string
          concepto: string
          created_at?: string
          created_by?: string | null
          id?: string
          importe: number
          pago_id?: string | null
          sesion_id: string
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_caja"]
        }
        Update: {
          categoria?: string
          concepto?: string
          created_at?: string
          created_by?: string | null
          id?: string
          importe?: number
          pago_id?: string | null
          sesion_id?: string
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimiento_caja"]
        }
        Relationships: [
          {
            foreignKeyName: "caja_movimiento_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimiento_sesion_id_fkey"
            columns: ["sesion_id"]
            isOneToOne: false
            referencedRelation: "caja_sesion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_movimiento_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      caja_sesion: {
        Row: {
          abierta_en: string
          abierta_por: string
          autorizada_por: string | null
          cerrada_en: string | null
          cerrada_por: string | null
          diferencia: number | null
          estado: Database["public"]["Enums"]["estado_caja"]
          id: string
          monto_apertura: number
          monto_fisico: number | null
          monto_teorico: number | null
          observaciones: string | null
          sede_id: string | null
          tenant_id: string
        }
        Insert: {
          abierta_en?: string
          abierta_por: string
          autorizada_por?: string | null
          cerrada_en?: string | null
          cerrada_por?: string | null
          diferencia?: number | null
          estado?: Database["public"]["Enums"]["estado_caja"]
          id?: string
          monto_apertura: number
          monto_fisico?: number | null
          monto_teorico?: number | null
          observaciones?: string | null
          sede_id?: string | null
          tenant_id: string
        }
        Update: {
          abierta_en?: string
          abierta_por?: string
          autorizada_por?: string | null
          cerrada_en?: string | null
          cerrada_por?: string | null
          diferencia?: number | null
          estado?: Database["public"]["Enums"]["estado_caja"]
          id?: string
          monto_apertura?: number
          monto_fisico?: number | null
          monto_teorico?: number | null
          observaciones?: string | null
          sede_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caja_sesion_abierta_por_fkey"
            columns: ["abierta_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesion_autorizada_por_fkey"
            columns: ["autorizada_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesion_cerrada_por_fkey"
            columns: ["cerrada_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesion_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caja_sesion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
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
      checklist_calidad: {
        Row: {
          activo: boolean
          area_id: string
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          servicio_id: string | null
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
          servicio_id?: string | null
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
          servicio_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_calidad_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_calidad_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_calidad_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_punto: {
        Row: {
          checklist_id: string
          created_at: string
          critico: boolean
          descripcion: string
          id: string
          orden: number
          tenant_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string
          critico?: boolean
          descripcion: string
          id?: string
          orden: number
          tenant_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string
          critico?: boolean
          descripcion?: string
          id?: string
          orden?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_punto_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklist_calidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_punto_tenant_id_fkey"
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
          score: number | null
          score_calculado_en: string | null
          segmento: string | null
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
          score?: number | null
          score_calculado_en?: string | null
          segmento?: string | null
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
          score?: number | null
          score_calculado_en?: string | null
          segmento?: string | null
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
      competencia: {
        Row: {
          activo: boolean
          area_id: string
          codigo: string
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          tenant_id: string
        }
        Insert: {
          activo?: boolean
          area_id: string
          codigo: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          tenant_id: string
        }
        Update: {
          activo?: boolean
          area_id?: string
          codigo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competencia_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competencia_tenant_id_fkey"
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
      costo_externo: {
        Row: {
          concepto: string
          created_at: string
          created_by: string | null
          fecha: string
          id: string
          importe: number
          orden_id: string
          proveedor: string
          tenant_id: string
        }
        Insert: {
          concepto: string
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          importe: number
          orden_id: string
          proveedor: string
          tenant_id: string
        }
        Update: {
          concepto?: string
          created_at?: string
          created_by?: string | null
          fecha?: string
          id?: string
          importe?: number
          orden_id?: string
          proveedor?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "costo_externo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "costo_externo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "costo_externo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "costo_externo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "costo_externo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      cuenta_cobrar: {
        Row: {
          cerrada_en: string | null
          cliente_id: string
          created_at: string
          documento_id: string
          estado: Database["public"]["Enums"]["estado_cxc"]
          fecha_vencimiento: string
          id: string
          importe_original: number
          saldo: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cerrada_en?: string | null
          cliente_id: string
          created_at?: string
          documento_id: string
          estado?: Database["public"]["Enums"]["estado_cxc"]
          fecha_vencimiento: string
          id?: string
          importe_original: number
          saldo: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cerrada_en?: string | null
          cliente_id?: string
          created_at?: string
          documento_id?: string
          estado?: Database["public"]["Enums"]["estado_cxc"]
          fecha_vencimiento?: string
          id?: string
          importe_original?: number
          saldo?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_cobrar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_cobrar_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: true
            referencedRelation: "documento_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_cobrar_tenant_id_fkey"
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
            foreignKeyName: "detalle_trabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "detalle_trabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "detalle_trabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
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
      documento_detalle: {
        Row: {
          afectacion: Database["public"]["Enums"]["afectacion_tributaria"]
          cantidad: number
          consume_trabajo: boolean
          descripcion: string
          detalle_trabajo_id: string | null
          documento_id: string
          id: string
          igv: number
          precio_unitario: number
          subtotal: number
          tenant_id: string
          total: number
        }
        Insert: {
          afectacion?: Database["public"]["Enums"]["afectacion_tributaria"]
          cantidad: number
          consume_trabajo?: boolean
          descripcion: string
          detalle_trabajo_id?: string | null
          documento_id: string
          id?: string
          igv: number
          precio_unitario: number
          subtotal: number
          tenant_id: string
          total: number
        }
        Update: {
          afectacion?: Database["public"]["Enums"]["afectacion_tributaria"]
          cantidad?: number
          consume_trabajo?: boolean
          descripcion?: string
          detalle_trabajo_id?: string | null
          documento_id?: string
          id?: string
          igv?: number
          precio_unitario?: number
          subtotal?: number
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "documento_detalle_detalle_trabajo_id_fkey"
            columns: ["detalle_trabajo_id"]
            isOneToOne: false
            referencedRelation: "detalle_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_detalle_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documento_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_detalle_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      documento_venta: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          autorizado_por: string | null
          cliente_id: string
          correlativo: number
          created_at: string
          created_by: string | null
          declarado_en: string | null
          declarado_por: string | null
          documento_ref_id: string | null
          estado: Database["public"]["Enums"]["estado_documento"]
          estado_cpe: Database["public"]["Enums"]["estado_cpe"]
          fecha_emision: string
          fecha_vencimiento: string
          hash_cpe: string | null
          id: string
          igv: number
          motivo: string | null
          motivo_anulacion: string | null
          motivo_autorizacion: string | null
          numero: string
          observaciones: string | null
          respuesta_cpe: string | null
          sede_id: string | null
          serie: string
          subtotal: number
          tasa_igv: number
          tenant_id: string
          ticket_cpe: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          total: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          autorizado_por?: string | null
          cliente_id: string
          correlativo: number
          created_at?: string
          created_by?: string | null
          declarado_en?: string | null
          declarado_por?: string | null
          documento_ref_id?: string | null
          estado?: Database["public"]["Enums"]["estado_documento"]
          estado_cpe?: Database["public"]["Enums"]["estado_cpe"]
          fecha_emision?: string
          fecha_vencimiento: string
          hash_cpe?: string | null
          id?: string
          igv: number
          motivo?: string | null
          motivo_anulacion?: string | null
          motivo_autorizacion?: string | null
          numero: string
          observaciones?: string | null
          respuesta_cpe?: string | null
          sede_id?: string | null
          serie: string
          subtotal: number
          tasa_igv: number
          tenant_id: string
          ticket_cpe?: string | null
          tipo: Database["public"]["Enums"]["tipo_documento"]
          total: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          autorizado_por?: string | null
          cliente_id?: string
          correlativo?: number
          created_at?: string
          created_by?: string | null
          declarado_en?: string | null
          declarado_por?: string | null
          documento_ref_id?: string | null
          estado?: Database["public"]["Enums"]["estado_documento"]
          estado_cpe?: Database["public"]["Enums"]["estado_cpe"]
          fecha_emision?: string
          fecha_vencimiento?: string
          hash_cpe?: string | null
          id?: string
          igv?: number
          motivo?: string | null
          motivo_anulacion?: string | null
          motivo_autorizacion?: string | null
          numero?: string
          observaciones?: string | null
          respuesta_cpe?: string | null
          sede_id?: string | null
          serie?: string
          subtotal?: number
          tasa_igv?: number
          tenant_id?: string
          ticket_cpe?: string | null
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          total?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documento_venta_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_venta_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_venta_declarado_por_fkey"
            columns: ["declarado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_venta_documento_ref_id_fkey"
            columns: ["documento_ref_id"]
            isOneToOne: false
            referencedRelation: "documento_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_venta_sede_id_fkey"
            columns: ["sede_id"]
            isOneToOne: false
            referencedRelation: "sede"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documento_venta_tenant_id_fkey"
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
            foreignKeyName: "entrega_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "entrega_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "entrega_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: true
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
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
      gestion_cobranza: {
        Row: {
          canal: string
          cliente_id: string
          created_at: string
          cuenta_cobrar_id: string | null
          gestionado_en: string
          gestionado_por: string | null
          id: string
          notas: string | null
          resultado: Database["public"]["Enums"]["resultado_gestion"]
          tenant_id: string
        }
        Insert: {
          canal: string
          cliente_id: string
          created_at?: string
          cuenta_cobrar_id?: string | null
          gestionado_en?: string
          gestionado_por?: string | null
          id?: string
          notas?: string | null
          resultado: Database["public"]["Enums"]["resultado_gestion"]
          tenant_id: string
        }
        Update: {
          canal?: string
          cliente_id?: string
          created_at?: string
          cuenta_cobrar_id?: string | null
          gestionado_en?: string
          gestionado_por?: string | null
          id?: string
          notas?: string | null
          resultado?: Database["public"]["Enums"]["resultado_gestion"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestion_cobranza_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestion_cobranza_cuenta_cobrar_id_fkey"
            columns: ["cuenta_cobrar_id"]
            isOneToOne: false
            referencedRelation: "cuenta_cobrar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestion_cobranza_cuenta_cobrar_id_fkey"
            columns: ["cuenta_cobrar_id"]
            isOneToOne: false
            referencedRelation: "v_cartera"
            referencedColumns: ["cuenta_cobrar_id"]
          },
          {
            foreignKeyName: "gestion_cobranza_gestionado_por_fkey"
            columns: ["gestionado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gestion_cobranza_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      inspeccion: {
        Row: {
          checklist_id: string | null
          created_at: string
          created_by: string | null
          evidencia_id: string | null
          id: string
          inspeccionado_en: string
          inspeccionado_por: string | null
          observaciones: string | null
          orden_id: string
          resultado: Database["public"]["Enums"]["resultado_inspeccion"]
          tenant_id: string
        }
        Insert: {
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          evidencia_id?: string | null
          id?: string
          inspeccionado_en?: string
          inspeccionado_por?: string | null
          observaciones?: string | null
          orden_id: string
          resultado: Database["public"]["Enums"]["resultado_inspeccion"]
          tenant_id: string
        }
        Update: {
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          evidencia_id?: string | null
          id?: string
          inspeccionado_en?: string
          inspeccionado_por?: string | null
          observaciones?: string | null
          orden_id?: string
          resultado?: Database["public"]["Enums"]["resultado_inspeccion"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspeccion_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklist_calidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_evidencia_id_fkey"
            columns: ["evidencia_id"]
            isOneToOne: false
            referencedRelation: "archivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_inspeccionado_por_fkey"
            columns: ["inspeccionado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "inspeccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "inspeccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "inspeccion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      inspeccion_punto: {
        Row: {
          conforme: boolean
          created_at: string
          critico: boolean
          descripcion: string
          id: string
          inspeccion_id: string
          nota: string | null
          punto_id: string | null
          tenant_id: string
        }
        Insert: {
          conforme: boolean
          created_at?: string
          critico?: boolean
          descripcion: string
          id?: string
          inspeccion_id: string
          nota?: string | null
          punto_id?: string | null
          tenant_id: string
        }
        Update: {
          conforme?: boolean
          created_at?: string
          critico?: boolean
          descripcion?: string
          id?: string
          inspeccion_id?: string
          nota?: string | null
          punto_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspeccion_punto_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspeccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_punto_punto_id_fkey"
            columns: ["punto_id"]
            isOneToOne: false
            referencedRelation: "checklist_punto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspeccion_punto_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_fisico: {
        Row: {
          aprobado_en: string | null
          aprobado_por: string | null
          contado_en: string
          contado_por: string | null
          created_at: string
          id: string
          observaciones: string | null
          tenant_id: string
        }
        Insert: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          contado_en?: string
          contado_por?: string | null
          created_at?: string
          id?: string
          observaciones?: string | null
          tenant_id: string
        }
        Update: {
          aprobado_en?: string | null
          aprobado_por?: string | null
          contado_en?: string
          contado_por?: string | null
          created_at?: string
          id?: string
          observaciones?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_fisico_aprobado_por_fkey"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_fisico_contado_por_fkey"
            columns: ["contado_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_fisico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario_linea: {
        Row: {
          cantidad_contada: number
          cantidad_sistema: number
          created_at: string
          id: string
          inventario_id: string
          lote_id: string | null
          material_id: string
          tenant_id: string
        }
        Insert: {
          cantidad_contada: number
          cantidad_sistema: number
          created_at?: string
          id?: string
          inventario_id: string
          lote_id?: string | null
          material_id: string
          tenant_id: string
        }
        Update: {
          cantidad_contada?: number
          cantidad_sistema?: number
          created_at?: string
          id?: string
          inventario_id?: string
          lote_id?: string | null
          material_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_linea_inventario_id_fkey"
            columns: ["inventario_id"]
            isOneToOne: false
            referencedRelation: "inventario_fisico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_linea_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_linea_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_stock"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "inventario_linea_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_linea_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_alerta_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "inventario_linea_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "inventario_linea_tenant_id_fkey"
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
      lote: {
        Row: {
          codigo: string
          costo_unitario: number
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          recibido_el: string
          tenant_id: string
          ubicacion: string | null
          vence_el: string | null
        }
        Insert: {
          codigo: string
          costo_unitario: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          recibido_el?: string
          tenant_id: string
          ubicacion?: string | null
          vence_el?: string | null
        }
        Update: {
          codigo?: string
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          recibido_el?: string
          tenant_id?: string
          ubicacion?: string | null
          vence_el?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lote_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lote_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_alerta_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "lote_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "lote_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      material: {
        Row: {
          activo: boolean
          area_id: string
          codigo: string
          controla_lote: boolean
          costo_referencia: number
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          tenant_id: string
          umbral_bajo: number
          umbral_critico: number
          unidad: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activo?: boolean
          area_id: string
          codigo: string
          controla_lote?: boolean
          costo_referencia?: number
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          tenant_id: string
          umbral_bajo?: number
          umbral_critico?: number
          unidad?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activo?: boolean
          area_id?: string
          codigo?: string
          controla_lote?: boolean
          costo_referencia?: number
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          tenant_id?: string
          umbral_bajo?: number
          umbral_critico?: number
          unidad?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      movimiento_stock: {
        Row: {
          cantidad: number
          costo_unitario: number
          created_at: string
          created_by: string | null
          id: string
          lote_id: string | null
          material_id: string
          motivo: string | null
          orden_id: string | null
          retrabajo_id: string | null
          tarea_id: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Insert: {
          cantidad: number
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lote_id?: string | null
          material_id: string
          motivo?: string | null
          orden_id?: string | null
          retrabajo_id?: string | null
          tarea_id?: string | null
          tenant_id: string
          tipo: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Update: {
          cantidad?: number
          costo_unitario?: number
          created_at?: string
          created_by?: string | null
          id?: string
          lote_id?: string | null
          material_id?: string
          motivo?: string | null
          orden_id?: string | null
          retrabajo_id?: string | null
          tarea_id?: string | null
          tenant_id?: string
          tipo?: Database["public"]["Enums"]["tipo_movimiento_stock"]
        }
        Relationships: [
          {
            foreignKeyName: "movimiento_stock_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lote"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "v_stock"
            referencedColumns: ["lote_id"]
          },
          {
            foreignKeyName: "movimiento_stock_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_alerta_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "movimiento_stock_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "v_stock"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "movimiento_stock_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "movimiento_stock_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "movimiento_stock_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "movimiento_stock_retrabajo_id_fkey"
            columns: ["retrabajo_id"]
            isOneToOne: false
            referencedRelation: "retrabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tarea_produccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimiento_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacion: {
        Row: {
          canal: Database["public"]["Enums"]["canal_notificacion"]
          created_at: string
          cuerpo: string | null
          enlace: string | null
          enviada_en: string | null
          evento: string
          id: string
          leida_en: string | null
          rol_destino: string | null
          tenant_id: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          cuerpo?: string | null
          enlace?: string | null
          enviada_en?: string | null
          evento: string
          id?: string
          leida_en?: string | null
          rol_destino?: string | null
          tenant_id: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          created_at?: string
          cuerpo?: string | null
          enlace?: string | null
          enviada_en?: string | null
          evento?: string
          id?: string
          leida_en?: string | null
          rol_destino?: string | null
          tenant_id?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
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
            foreignKeyName: "orden_estado_historial_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "orden_estado_historial_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "orden_estado_historial_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
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
      pago: {
        Row: {
          anulado: boolean
          cliente_id: string
          created_at: string
          created_by: string | null
          evidencia_id: string | null
          fecha: string
          id: string
          importe: number
          medio: Database["public"]["Enums"]["medio_pago"]
          observaciones: string | null
          referencia: string | null
          sin_aplicar: number
          tenant_id: string
        }
        Insert: {
          anulado?: boolean
          cliente_id: string
          created_at?: string
          created_by?: string | null
          evidencia_id?: string | null
          fecha?: string
          id?: string
          importe: number
          medio: Database["public"]["Enums"]["medio_pago"]
          observaciones?: string | null
          referencia?: string | null
          sin_aplicar: number
          tenant_id: string
        }
        Update: {
          anulado?: boolean
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          evidencia_id?: string | null
          fecha?: string
          id?: string
          importe?: number
          medio?: Database["public"]["Enums"]["medio_pago"]
          observaciones?: string | null
          referencia?: string | null
          sin_aplicar?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_evidencia_id_fkey"
            columns: ["evidencia_id"]
            isOneToOne: false
            referencedRelation: "archivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      pago_aplicacion: {
        Row: {
          created_at: string
          created_by: string | null
          cuenta_cobrar_id: string
          id: string
          importe: number
          pago_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cuenta_cobrar_id: string
          id?: string
          importe: number
          pago_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cuenta_cobrar_id?: string
          id?: string
          importe?: number
          pago_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_aplicacion_cuenta_cobrar_id_fkey"
            columns: ["cuenta_cobrar_id"]
            isOneToOne: false
            referencedRelation: "cuenta_cobrar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_aplicacion_cuenta_cobrar_id_fkey"
            columns: ["cuenta_cobrar_id"]
            isOneToOne: false
            referencedRelation: "v_cartera"
            referencedColumns: ["cuenta_cobrar_id"]
          },
          {
            foreignKeyName: "pago_aplicacion_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_aplicacion_tenant_id_fkey"
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
      preferencia_notificacion: {
        Row: {
          activo: boolean
          canal: Database["public"]["Enums"]["canal_notificacion"]
          evento: string
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean
          canal: Database["public"]["Enums"]["canal_notificacion"]
          evento: string
          tenant_id: string
          usuario_id: string
        }
        Update: {
          activo?: boolean
          canal?: Database["public"]["Enums"]["canal_notificacion"]
          evento?: string
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencia_notificacion_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferencia_notificacion_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
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
      proceso_competencia: {
        Row: {
          competencia_id: string
          nivel_minimo: number
          proceso_id: string
          tenant_id: string
        }
        Insert: {
          competencia_id: string
          nivel_minimo?: number
          proceso_id: string
          tenant_id: string
        }
        Update: {
          competencia_id?: string
          nivel_minimo?: number
          proceso_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proceso_competencia_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proceso_competencia_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "proceso"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proceso_competencia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      promesa_pago: {
        Row: {
          cliente_id: string
          created_at: string
          cumplida_en: string | null
          estado: Database["public"]["Enums"]["estado_promesa"]
          fecha_prometida: string
          gestion_id: string
          id: string
          importe: number
          tenant_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          cumplida_en?: string | null
          estado?: Database["public"]["Enums"]["estado_promesa"]
          fecha_prometida: string
          gestion_id: string
          id?: string
          importe: number
          tenant_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          cumplida_en?: string | null
          estado?: Database["public"]["Enums"]["estado_promesa"]
          fecha_prometida?: string
          gestion_id?: string
          id?: string
          importe?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promesa_pago_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promesa_pago_gestion_id_fkey"
            columns: ["gestion_id"]
            isOneToOne: false
            referencedRelation: "gestion_cobranza"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promesa_pago_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      retrabajo: {
        Row: {
          abierto_en: string
          abierto_por: string | null
          causa: Database["public"]["Enums"]["causa_retrabajo"]
          cerrado_en: string | null
          costo_generado: number | null
          created_at: string
          created_by: string | null
          descripcion: string
          id: string
          importe_facturable: number
          inspeccion_id: string | null
          orden_id: string
          politica: Database["public"]["Enums"]["politica_garantia"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          abierto_en?: string
          abierto_por?: string | null
          causa?: Database["public"]["Enums"]["causa_retrabajo"]
          cerrado_en?: string | null
          costo_generado?: number | null
          created_at?: string
          created_by?: string | null
          descripcion: string
          id?: string
          importe_facturable?: number
          inspeccion_id?: string | null
          orden_id: string
          politica?: Database["public"]["Enums"]["politica_garantia"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          abierto_en?: string
          abierto_por?: string | null
          causa?: Database["public"]["Enums"]["causa_retrabajo"]
          cerrado_en?: string | null
          costo_generado?: number | null
          created_at?: string
          created_by?: string | null
          descripcion?: string
          id?: string
          importe_facturable?: number
          inspeccion_id?: string | null
          orden_id?: string
          politica?: Database["public"]["Enums"]["politica_garantia"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retrabajo_abierto_por_fkey"
            columns: ["abierto_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrabajo_inspeccion_id_fkey"
            columns: ["inspeccion_id"]
            isOneToOne: false
            referencedRelation: "inspeccion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "orden_trabajo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "retrabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "retrabajo_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "retrabajo_tenant_id_fkey"
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
            foreignKeyName: "tarea_produccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_costo_orden"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "tarea_produccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_pendiente_facturar"
            referencedColumns: ["orden_id"]
          },
          {
            foreignKeyName: "tarea_produccion_orden_id_fkey"
            columns: ["orden_id"]
            isOneToOne: false
            referencedRelation: "v_rentabilidad_orden"
            referencedColumns: ["orden_id"]
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
      tecnico_competencia: {
        Row: {
          acreditada_en: string | null
          acreditada_por: string | null
          competencia_id: string
          created_at: string
          nivel: number
          tenant_id: string
          usuario_id: string
        }
        Insert: {
          acreditada_en?: string | null
          acreditada_por?: string | null
          competencia_id: string
          created_at?: string
          nivel: number
          tenant_id: string
          usuario_id: string
        }
        Update: {
          acreditada_en?: string | null
          acreditada_por?: string | null
          competencia_id?: string
          created_at?: string
          nivel?: number
          tenant_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tecnico_competencia_acreditada_por_fkey"
            columns: ["acreditada_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnico_competencia_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnico_competencia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tecnico_competencia_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
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
      v_alerta_stock: {
        Row: {
          cantidad: number | null
          codigo: string | null
          material_id: string | null
          nivel: string | null
          nombre: string | null
          primer_vencimiento: string | null
          tenant_id: string | null
          umbral_bajo: number | null
          umbral_critico: number | null
          unidad: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cartera: {
        Row: {
          cliente_id: string | null
          cuenta_cobrar_id: string | null
          dias_mora: number | null
          documento: string | null
          documento_id: string | null
          estado: Database["public"]["Enums"]["estado_cxc"] | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          importe_original: number | null
          razon_social: string | null
          saldo: number | null
          tenant_id: string | null
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente"] | null
          tipo_documento: Database["public"]["Enums"]["tipo_documento"] | null
          tramo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_cobrar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_cobrar_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: true
            referencedRelation: "documento_venta"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_cobrar_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      v_costo_orden: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          costo_externo: number | null
          costo_mano_obra: number | null
          costo_materiales: number | null
          costo_retrabajo: number | null
          orden_id: string | null
          tenant_id: string | null
          valor_venta: number | null
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          costo_externo?: never
          costo_mano_obra?: never
          costo_materiales?: never
          costo_retrabajo?: never
          orden_id?: string | null
          tenant_id?: string | null
          valor_venta?: never
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          costo_externo?: never
          costo_mano_obra?: never
          costo_materiales?: never
          costo_retrabajo?: never
          orden_id?: string | null
          tenant_id?: string | null
          valor_venta?: never
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
            foreignKeyName: "orden_trabajo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      v_deuda_cliente: {
        Row: {
          cliente_id: string | null
          deuda_total: number | null
          documentos_abiertos: number | null
          mora_maxima: number | null
          por_vencer: number | null
          razon_social: string | null
          tenant_id: string | null
          vencido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cuenta_cobrar_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cuenta_cobrar_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
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
      v_pendiente_facturar: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          fecha_entrega: string | null
          orden_id: string | null
          razon_social: string | null
          tenant_id: string | null
          valor_venta: number | null
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
            foreignKeyName: "orden_trabajo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      v_rentabilidad_orden: {
        Row: {
          cliente_id: string | null
          codigo: string | null
          costo_externo: number | null
          costo_mano_obra: number | null
          costo_materiales: number | null
          costo_retrabajo: number | null
          costo_total: number | null
          margen: number | null
          margen_pct: number | null
          orden_id: string | null
          tenant_id: string | null
          valor_venta: number | null
        }
        Insert: {
          cliente_id?: string | null
          codigo?: string | null
          costo_externo?: never
          costo_mano_obra?: never
          costo_materiales?: never
          costo_retrabajo?: never
          costo_total?: never
          margen?: never
          margen_pct?: never
          orden_id?: string | null
          tenant_id?: string | null
          valor_venta?: never
        }
        Update: {
          cliente_id?: string | null
          codigo?: string | null
          costo_externo?: never
          costo_mano_obra?: never
          costo_materiales?: never
          costo_retrabajo?: never
          costo_total?: never
          margen?: never
          margen_pct?: never
          orden_id?: string | null
          tenant_id?: string | null
          valor_venta?: never
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
            foreignKeyName: "orden_trabajo_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stock: {
        Row: {
          cantidad: number | null
          codigo: string | null
          costo_unitario: number | null
          lote: string | null
          lote_id: string | null
          material_id: string | null
          nombre: string | null
          tenant_id: string | null
          ubicacion: string | null
          umbral_bajo: number | null
          umbral_critico: number | null
          unidad: string | null
          vence_el: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aplicar_anticipo: {
        Args: { p_aplicaciones: Json; p_pago: string }
        Returns: undefined
      }
      aprobar_inventario: { Args: { p_inventario: string }; Returns: number }
      area_default: { Args: { p_tenant: string }; Returns: string }
      areas_del_usuario: { Args: never; Returns: string[] }
      asegurar_append_only: { Args: never; Returns: undefined }
      cambiar_estado_orden: {
        Args: { p_estado: string; p_orden: string }
        Returns: undefined
      }
      cerrar_caja: {
        Args: {
          p_monto_fisico: number
          p_observaciones?: string
          p_sesion: string
        }
        Returns: number
      }
      consumir_material: {
        Args: {
          p_cantidad: number
          p_lote: string
          p_material: string
          p_motivo?: string
          p_orden?: string
          p_retrabajo?: string
          p_tarea?: string
        }
        Returns: string
      }
      costo_hora: { Args: { p_tenant: string }; Returns: number }
      current_tenant_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      documento_valido: {
        Args: { p_numero: string; p_tipo: string }
        Returns: boolean
      }
      emitir_documento: {
        Args: {
          p_autorizado_por?: string
          p_cliente: string
          p_dias_credito?: number
          p_documento_ref?: string
          p_lineas: Json
          p_motivo?: string
          p_motivo_autorizacion?: string
          p_observaciones?: string
          p_serie: string
          p_tipo: string
        }
        Returns: string
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
      notificar: {
        Args: {
          p_cuerpo?: string
          p_enlace?: string
          p_evento: string
          p_rol?: string
          p_titulo: string
          p_usuario?: string
        }
        Returns: string
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
      recalcular_cxc: { Args: { p_cxc: string }; Returns: undefined }
      recalcular_scores: { Args: { p_tenant?: string }; Returns: number }
      registrar_cpe: {
        Args: {
          p_documento: string
          p_estado: string
          p_hash?: string
          p_respuesta?: string
          p_ticket?: string
        }
        Returns: undefined
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
      registrar_inspeccion: {
        Args: {
          p_checklist: string
          p_evidencia?: string
          p_observaciones?: string
          p_orden: string
          p_puntos: Json
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
      registrar_pago: {
        Args: {
          p_aplicaciones?: Json
          p_cliente: string
          p_evidencia?: string
          p_importe: number
          p_medio: string
          p_observaciones?: string
          p_referencia?: string
          p_sesion_caja?: string
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
      canal_notificacion: "sistema" | "email" | "whatsapp"
      causa_retrabajo:
        | "error_laboratorio"
        | "error_impresion"
        | "cambio_indicacion"
        | "material_defectuoso"
        | "ajuste_clinico"
        | "sin_determinar"
      estado_caja: "abierta" | "cerrada"
      estado_cpe:
        | "no_aplica"
        | "pendiente"
        | "registrado_manual"
        | "aceptado"
        | "rechazado"
        | "anulado_sunat"
      estado_cxc: "abierta" | "cerrada" | "anulada"
      estado_documento: "emitido" | "anulado"
      estado_promesa: "vigente" | "cumplida" | "incumplida"
      estado_tarea:
        | "sin_asignar"
        | "asignada"
        | "en_curso"
        | "completa"
        | "anulada"
      fase_canonica: "inicial" | "productiva" | "control" | "final" | "anulada"
      medio_pago:
        | "efectivo"
        | "transferencia"
        | "deposito"
        | "yape_plin"
        | "tarjeta"
        | "cheque"
        | "otro"
      politica_garantia: "cubierto" | "parcial" | "facturable"
      prioridad_trabajo: "normal" | "urgente"
      resultado_gestion:
        | "promesa_pago"
        | "sin_respuesta"
        | "volver_a_llamar"
        | "reclamo"
        | "pagado"
        | "negativa"
      resultado_inspeccion: "aprobado" | "observado" | "rechazado"
      rol_sistema:
        | "administrador"
        | "gerencia"
        | "lider_laboratorio"
        | "recepcion"
        | "lider_area"
        | "tecnico"
        | "portal_cliente"
      tipo_cliente: "clinica" | "doctor_independiente"
      tipo_documento: "factura" | "boleta" | "nota_credito" | "nota_debito"
      tipo_movimiento_caja: "ingreso" | "egreso"
      tipo_movimiento_stock:
        | "entrada"
        | "consumo"
        | "merma"
        | "ajuste"
        | "devolucion"
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
      canal_notificacion: ["sistema", "email", "whatsapp"],
      causa_retrabajo: [
        "error_laboratorio",
        "error_impresion",
        "cambio_indicacion",
        "material_defectuoso",
        "ajuste_clinico",
        "sin_determinar",
      ],
      estado_caja: ["abierta", "cerrada"],
      estado_cpe: [
        "no_aplica",
        "pendiente",
        "registrado_manual",
        "aceptado",
        "rechazado",
        "anulado_sunat",
      ],
      estado_cxc: ["abierta", "cerrada", "anulada"],
      estado_documento: ["emitido", "anulado"],
      estado_promesa: ["vigente", "cumplida", "incumplida"],
      estado_tarea: [
        "sin_asignar",
        "asignada",
        "en_curso",
        "completa",
        "anulada",
      ],
      fase_canonica: ["inicial", "productiva", "control", "final", "anulada"],
      medio_pago: [
        "efectivo",
        "transferencia",
        "deposito",
        "yape_plin",
        "tarjeta",
        "cheque",
        "otro",
      ],
      politica_garantia: ["cubierto", "parcial", "facturable"],
      prioridad_trabajo: ["normal", "urgente"],
      resultado_gestion: [
        "promesa_pago",
        "sin_respuesta",
        "volver_a_llamar",
        "reclamo",
        "pagado",
        "negativa",
      ],
      resultado_inspeccion: ["aprobado", "observado", "rechazado"],
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
      tipo_documento: ["factura", "boleta", "nota_credito", "nota_debito"],
      tipo_movimiento_caja: ["ingreso", "egreso"],
      tipo_movimiento_stock: [
        "entrada",
        "consumo",
        "merma",
        "ajuste",
        "devolucion",
      ],
      tipo_recepcion: ["impresion_fisica", "archivo_stl", "modelo", "otro"],
    },
  },
} as const

