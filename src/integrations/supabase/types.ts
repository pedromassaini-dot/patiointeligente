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
      composicao_lotes: {
        Row: {
          criado_em: string
          custo_proporcional: number
          expedicao_lote_id: string | null
          fornecedor_id: string | null
          id: string
          material_id: string | null
          origem_lote_codigo: string
          origem_lote_id: string | null
          peso_usado: number
        }
        Insert: {
          criado_em?: string
          custo_proporcional?: number
          expedicao_lote_id?: string | null
          fornecedor_id?: string | null
          id?: string
          material_id?: string | null
          origem_lote_codigo?: string
          origem_lote_id?: string | null
          peso_usado: number
        }
        Update: {
          criado_em?: string
          custo_proporcional?: number
          expedicao_lote_id?: string | null
          fornecedor_id?: string | null
          id?: string
          material_id?: string | null
          origem_lote_codigo?: string
          origem_lote_id?: string | null
          peso_usado?: number
        }
        Relationships: [
          {
            foreignKeyName: "composicao_lotes_expedicao_lote_id_fkey"
            columns: ["expedicao_lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composicao_lotes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composicao_lotes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composicao_lotes_origem_lote_id_fkey"
            columns: ["origem_lote_id"]
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
      historico_lotes: {
        Row: {
          acao: string
          criado_em: string
          detalhes: Json | null
          id: string
          lote_codigo: string
          lote_id: string | null
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          lote_codigo?: string
          lote_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
        }
        Update: {
          acao?: string
          criado_em?: string
          detalhes?: Json | null
          id?: string
          lote_codigo?: string
          lote_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_lotes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      industrializadores: {
        Row: {
          ativo: boolean
          cidade: string | null
          cpf_cnpj: string | null
          criado_em: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cidade?: string | null
          cpf_cnpj?: string | null
          criado_em?: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
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
          consumido: boolean
          criado_em: string
          criado_por: string | null
          custo_total_compra: number | null
          data_entrada: string
          data_referencia: string | null
          fornecedor_id: string | null
          id: string
          localizacao_id: string | null
          lote_tipo: string
          material_id: string
          observacoes: string | null
          peso_bruto: number
          peso_disponivel: number | null
          preco_kg_compra: number
          remessa_origem_id: string | null
          status: Database["public"]["Enums"]["status_lote"]
          sublote_pai_id: string | null
        }
        Insert: {
          codigo_lote: string
          consumido?: boolean
          criado_em?: string
          criado_por?: string | null
          custo_total_compra?: number | null
          data_entrada?: string
          data_referencia?: string | null
          fornecedor_id?: string | null
          id?: string
          localizacao_id?: string | null
          lote_tipo?: string
          material_id: string
          observacoes?: string | null
          peso_bruto: number
          peso_disponivel?: number | null
          preco_kg_compra: number
          remessa_origem_id?: string | null
          status?: Database["public"]["Enums"]["status_lote"]
          sublote_pai_id?: string | null
        }
        Update: {
          codigo_lote?: string
          consumido?: boolean
          criado_em?: string
          criado_por?: string | null
          custo_total_compra?: number | null
          data_entrada?: string
          data_referencia?: string | null
          fornecedor_id?: string | null
          id?: string
          localizacao_id?: string | null
          lote_tipo?: string
          material_id?: string
          observacoes?: string | null
          peso_bruto?: number
          peso_disponivel?: number | null
          preco_kg_compra?: number
          remessa_origem_id?: string | null
          status?: Database["public"]["Enums"]["status_lote"]
          sublote_pai_id?: string | null
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
          {
            foreignKeyName: "lotes_remessa_origem_id_fkey"
            columns: ["remessa_origem_id"]
            isOneToOne: false
            referencedRelation: "remessas_industrializacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_sublote_pai_id_fkey"
            columns: ["sublote_pai_id"]
            isOneToOne: false
            referencedRelation: "lotes"
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
      remessa_lotes: {
        Row: {
          criado_em: string
          custo_proporcional: number
          id: string
          lote_id: string
          peso_enviado: number
          remessa_id: string
        }
        Insert: {
          criado_em?: string
          custo_proporcional?: number
          id?: string
          lote_id: string
          peso_enviado: number
          remessa_id: string
        }
        Update: {
          criado_em?: string
          custo_proporcional?: number
          id?: string
          lote_id?: string
          peso_enviado?: number
          remessa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remessa_lotes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remessa_lotes_remessa_id_fkey"
            columns: ["remessa_id"]
            isOneToOne: false
            referencedRelation: "remessas_industrializacao"
            referencedColumns: ["id"]
          },
        ]
      }
      remessa_retornos: {
        Row: {
          aproveitavel: boolean
          criado_em: string
          custo_unitario_calculado: number
          descricao: string
          id: string
          lote_gerado_id: string | null
          material_id: string | null
          observacoes: string | null
          peso_retornado: number
          remessa_id: string
        }
        Insert: {
          aproveitavel?: boolean
          criado_em?: string
          custo_unitario_calculado?: number
          descricao: string
          id?: string
          lote_gerado_id?: string | null
          material_id?: string | null
          observacoes?: string | null
          peso_retornado: number
          remessa_id: string
        }
        Update: {
          aproveitavel?: boolean
          criado_em?: string
          custo_unitario_calculado?: number
          descricao?: string
          id?: string
          lote_gerado_id?: string | null
          material_id?: string | null
          observacoes?: string | null
          peso_retornado?: number
          remessa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remessa_retornos_lote_gerado_id_fkey"
            columns: ["lote_gerado_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remessa_retornos_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remessa_retornos_remessa_id_fkey"
            columns: ["remessa_id"]
            isOneToOne: false
            referencedRelation: "remessas_industrializacao"
            referencedColumns: ["id"]
          },
        ]
      }
      remessas_industrializacao: {
        Row: {
          atualizado_em: string
          codigo: string
          criado_em: string
          criado_por: string | null
          custo_industrializacao: number
          data_envio: string
          data_retorno: string | null
          frete_ida: number
          frete_volta: number
          id: string
          industrializador_id: string
          observacoes: string | null
          outros_custos: number
          status: Database["public"]["Enums"]["status_remessa"]
        }
        Insert: {
          atualizado_em?: string
          codigo: string
          criado_em?: string
          criado_por?: string | null
          custo_industrializacao?: number
          data_envio?: string
          data_retorno?: string | null
          frete_ida?: number
          frete_volta?: number
          id?: string
          industrializador_id: string
          observacoes?: string | null
          outros_custos?: number
          status?: Database["public"]["Enums"]["status_remessa"]
        }
        Update: {
          atualizado_em?: string
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          custo_industrializacao?: number
          data_envio?: string
          data_retorno?: string | null
          frete_ida?: number
          frete_volta?: number
          id?: string
          industrializador_id?: string
          observacoes?: string | null
          outros_custos?: number
          status?: Database["public"]["Enums"]["status_remessa"]
        }
        Relationships: [
          {
            foreignKeyName: "remessas_industrializacao_industrializador_id_fkey"
            columns: ["industrializador_id"]
            isOneToOne: false
            referencedRelation: "industrializadores"
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
      is_gestor: { Args: { _user_id: string }; Returns: boolean }
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
        | "estoque_inicial"
        | "em_industrializacao"
      status_remessa:
        | "aberta"
        | "em_industrializacao"
        | "retornada"
        | "encerrada"
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
        "estoque_inicial",
        "em_industrializacao",
      ],
      status_remessa: [
        "aberta",
        "em_industrializacao",
        "retornada",
        "encerrada",
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
