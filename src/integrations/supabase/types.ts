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
      beneficiamentos: {
        Row: {
          criado_em: string
          custo_beneficiamento: number
          custo_final_kg: number | null
          id: string
          lote_id: string
          observacoes: string | null
          perda_kg: number | null
          perda_percentual: number | null
          peso_antes: number
          peso_depois: number
        }
        Insert: {
          criado_em?: string
          custo_beneficiamento?: number
          custo_final_kg?: number | null
          id?: string
          lote_id: string
          observacoes?: string | null
          perda_kg?: number | null
          perda_percentual?: number | null
          peso_antes: number
          peso_depois: number
        }
        Update: {
          criado_em?: string
          custo_beneficiamento?: number
          custo_final_kg?: number | null
          id?: string
          lote_id?: string
          observacoes?: string | null
          perda_kg?: number | null
          perda_percentual?: number | null
          peso_antes?: number
          peso_depois?: number
        }
        Relationships: [
          {
            foreignKeyName: "beneficiamentos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cidade: string | null
          cpf_cnpj: string | null
          criado_em: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
        }
        Insert: {
          cidade?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
        }
        Update: {
          cidade?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      fotos_lote: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          lote_id: string
          url_foto: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          lote_id: string
          url_foto: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          lote_id?: string
          url_foto?: string
        }
        Relationships: [
          {
            foreignKeyName: "fotos_lote_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      localizacoes_patio: {
        Row: {
          ativo: boolean
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          codigo_lote: string
          criado_em: string
          criado_por: string | null
          custo_total_compra: number | null
          data_entrada: string
          fornecedor_id: string
          id: string
          localizacao_id: string | null
          material_id: string
          observacoes: string | null
          peso_bruto: number
          preco_kg_compra: number
          status: Database["public"]["Enums"]["status_lote"]
        }
        Insert: {
          codigo_lote: string
          criado_em?: string
          criado_por?: string | null
          custo_total_compra?: number | null
          data_entrada?: string
          fornecedor_id: string
          id?: string
          localizacao_id?: string | null
          material_id: string
          observacoes?: string | null
          peso_bruto: number
          preco_kg_compra: number
          status?: Database["public"]["Enums"]["status_lote"]
        }
        Update: {
          codigo_lote?: string
          criado_em?: string
          criado_por?: string | null
          custo_total_compra?: number | null
          data_entrada?: string
          fornecedor_id?: string
          id?: string
          localizacao_id?: string | null
          material_id?: string
          observacoes?: string | null
          peso_bruto?: number
          preco_kg_compra?: number
          status?: Database["public"]["Enums"]["status_lote"]
        }
        Relationships: [
          {
            foreignKeyName: "lotes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_localizacao_id_fkey"
            columns: ["localizacao_id"]
            isOneToOne: false
            referencedRelation: "localizacoes_patio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          ativo: boolean
          categoria: string | null
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          id: string
          localizacao_destino_id: string | null
          localizacao_origem_id: string | null
          lote_id: string
          observacoes: string | null
          peso_movimentado: number | null
          tipo_movimentacao: Database["public"]["Enums"]["tipo_movimentacao"]
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          localizacao_destino_id?: string | null
          localizacao_origem_id?: string | null
          lote_id: string
          observacoes?: string | null
          peso_movimentado?: number | null
          tipo_movimentacao: Database["public"]["Enums"]["tipo_movimentacao"]
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          id?: string
          localizacao_destino_id?: string | null
          localizacao_origem_id?: string | null
          lote_id?: string
          observacoes?: string | null
          peso_movimentado?: number | null
          tipo_movimentacao?: Database["public"]["Enums"]["tipo_movimentacao"]
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_localizacao_destino_id_fkey"
            columns: ["localizacao_destino_id"]
            isOneToOne: false
            referencedRelation: "localizacoes_patio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_localizacao_origem_id_fkey"
            columns: ["localizacao_origem_id"]
            isOneToOne: false
            referencedRelation: "localizacoes_patio"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          criado_em: string
          email: string
          id: string
          nome: string
          perfil: Database["public"]["Enums"]["perfil_usuario"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          email: string
          id: string
          nome: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          perfil?: Database["public"]["Enums"]["perfil_usuario"]
        }
        Relationships: []
      }
      vendas: {
        Row: {
          comprador: string
          criado_em: string
          custo_proporcional: number
          data_venda: string
          id: string
          lote_id: string
          margem_estimada: number | null
          observacoes: string | null
          peso_vendido: number
          preco_kg_venda: number
          receita_total: number | null
        }
        Insert: {
          comprador: string
          criado_em?: string
          custo_proporcional?: number
          data_venda?: string
          id?: string
          lote_id: string
          margem_estimada?: number | null
          observacoes?: string | null
          peso_vendido: number
          preco_kg_venda: number
          receita_total?: number | null
        }
        Update: {
          comprador?: string
          criado_em?: string
          custo_proporcional?: number
          data_venda?: string
          id?: string
          lote_id?: string
          margem_estimada?: number | null
          observacoes?: string | null
          peso_vendido?: number
          preco_kg_venda?: number
          receita_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      tem_perfil: {
        Args: {
          _perfil: Database["public"]["Enums"]["perfil_usuario"]
          _user_id: string
        }
        Returns: boolean
      }
      usuario_ativo: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      perfil_usuario: "operador" | "gestor"
      status_lote:
        | "recebido"
        | "em_beneficiamento"
        | "pronto"
        | "vendido_parcial"
        | "vendido_total"
      tipo_movimentacao:
        | "entrada"
        | "transferencia"
        | "beneficiamento"
        | "venda"
        | "ajuste"
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
      perfil_usuario: ["operador", "gestor"],
      status_lote: [
        "recebido",
        "em_beneficiamento",
        "pronto",
        "vendido_parcial",
        "vendido_total",
      ],
      tipo_movimentacao: [
        "entrada",
        "transferencia",
        "beneficiamento",
        "venda",
        "ajuste",
      ],
    },
  },
} as const
