
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "cases": {
                  Row: {
                    "cost": string,"created_at": string,"deck_id": string,"function_slug": string,"id": string,"position": number,"session_id": string | null,"source": Database["public"]['Enums']["case_source"],"story": string,"title": string,"updated_at": string,"who_feels_it": string
                  }
                  Insert: {
                    "cost"?: string,"created_at"?: string,"deck_id": string,"function_slug": string,"id"?: string,"position"?: number,"session_id"?: string | null,"source"?: Database["public"]['Enums']["case_source"],"story": string,"title": string,"updated_at"?: string,"who_feels_it"?: string
                  }
                  Update: {
                    "cost"?: string,"created_at"?: string,"deck_id"?: string,"function_slug"?: string,"id"?: string,"position"?: number,"session_id"?: string | null,"source"?: Database["public"]['Enums']["case_source"],"story"?: string,"title"?: string,"updated_at"?: string,"who_feels_it"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cases_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cases_function_slug_fkey"
      columns: ["function_slug"]
isOneToOne: false
      referencedRelation: "functions"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "cases_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"coach_messages": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"player_id": string | null,"role": Database["public"]['Enums']["coach_role"],"slot": string | null,"team_id": string,"token_earned_at": string | null,"tokens_spent": number,"trigger": Database["public"]['Enums']["coach_trigger"],"type": Database["public"]['Enums']["coach_message_type"] | null
                  }
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"player_id"?: string | null,"role": Database["public"]['Enums']["coach_role"],"slot"?: string | null,"team_id": string,"token_earned_at"?: string | null,"tokens_spent"?: number,"trigger"?: Database["public"]['Enums']["coach_trigger"],"type"?: Database["public"]['Enums']["coach_message_type"] | null
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"player_id"?: string | null,"role"?: Database["public"]['Enums']["coach_role"],"slot"?: string | null,"team_id"?: string,"token_earned_at"?: string | null,"tokens_spent"?: number,"trigger"?: Database["public"]['Enums']["coach_trigger"],"type"?: Database["public"]['Enums']["coach_message_type"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "coach_messages_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "coach_messages_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"decks": {
                  Row: {
                    "company_size": string,"copied_from": string | null,"country": string,"created_at": string,"created_by": string | null,"function_slugs": (string)[],"id": string,"industry": string,"name": string,"org_id": string | null,"pain_points": string,"target_platforms": (string)[],"tools": (string)[],"updated_at": string
                  }
                  Insert: {
                    "company_size"?: string,"copied_from"?: string | null,"country"?: string,"created_at"?: string,"created_by"?: string | null,"function_slugs"?: (string)[],"id"?: string,"industry"?: string,"name": string,"org_id"?: string | null,"pain_points"?: string,"target_platforms"?: (string)[],"tools"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "company_size"?: string,"copied_from"?: string | null,"country"?: string,"created_at"?: string,"created_by"?: string | null,"function_slugs"?: (string)[],"id"?: string,"industry"?: string,"name"?: string,"org_id"?: string | null,"pain_points"?: string,"target_platforms"?: (string)[],"tools"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "decks_copied_from_fkey"
      columns: ["copied_from"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "decks_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"design_checks": {
                  Row: {
                    "created_at": string,"design_version": Database["public"]['Enums']["design_version"],"flags": NonNullable<Json>,"id": string,"source": string,"team_id": string
                  }
                  Insert: {
                    "created_at"?: string,"design_version": Database["public"]['Enums']["design_version"],"flags"?: NonNullable<Json>,"id"?: string,"source"?: string,"team_id": string
                  }
                  Update: {
                    "created_at"?: string,"design_version"?: Database["public"]['Enums']["design_version"],"flags"?: NonNullable<Json>,"id"?: string,"source"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "design_checks_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"designs": {
                  Row: {
                    "action": string,"ai_kind": string | null,"data_access": string | null,"data_location": string | null,"data_quality": string | null,"decision": string,"effort": number | null,"frequency": string | null,"hours_saved_per_month": number | null,"human": string,"id": string,"impact": number | null,"name": string,"personal_data": string | null,"platform_fit": string | null,"risks": (string)[],"steps": string,"systems": (string)[],"team_id": string,"tools": (string)[],"trigger": string,"updated_at": string,"version": Database["public"]['Enums']["design_version"],"volume_per_month": number | null
                  }
                  Insert: {
                    "action"?: string,"ai_kind"?: string | null,"data_access"?: string | null,"data_location"?: string | null,"data_quality"?: string | null,"decision"?: string,"effort"?: number | null,"frequency"?: string | null,"hours_saved_per_month"?: number | null,"human"?: string,"id"?: string,"impact"?: number | null,"name"?: string,"personal_data"?: string | null,"platform_fit"?: string | null,"risks"?: (string)[],"steps"?: string,"systems"?: (string)[],"team_id": string,"tools"?: (string)[],"trigger"?: string,"updated_at"?: string,"version"?: Database["public"]['Enums']["design_version"],"volume_per_month"?: number | null
                  }
                  Update: {
                    "action"?: string,"ai_kind"?: string | null,"data_access"?: string | null,"data_location"?: string | null,"data_quality"?: string | null,"decision"?: string,"effort"?: number | null,"frequency"?: string | null,"hours_saved_per_month"?: number | null,"human"?: string,"id"?: string,"impact"?: number | null,"name"?: string,"personal_data"?: string | null,"platform_fit"?: string | null,"risks"?: (string)[],"steps"?: string,"systems"?: (string)[],"team_id"?: string,"tools"?: (string)[],"trigger"?: string,"updated_at"?: string,"version"?: Database["public"]['Enums']["design_version"],"volume_per_month"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "designs_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"functions": {
                  Row: {
                    "name": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"ideas": {
                  Row: {
                    "case_id": string | null,"created_at": string,"frequency": string | null,"id": string,"player_id": string | null,"session_id": string,"status": Database["public"]['Enums']["idea_status"],"team_id": string | null,"title": string,"what_happens": string,"who_feels_it": string
                  }
                  Insert: {
                    "case_id"?: string | null,"created_at"?: string,"frequency"?: string | null,"id"?: string,"player_id"?: string | null,"session_id": string,"status"?: Database["public"]['Enums']["idea_status"],"team_id"?: string | null,"title": string,"what_happens": string,"who_feels_it"?: string
                  }
                  Update: {
                    "case_id"?: string | null,"created_at"?: string,"frequency"?: string | null,"id"?: string,"player_id"?: string | null,"session_id"?: string,"status"?: Database["public"]['Enums']["idea_status"],"team_id"?: string | null,"title"?: string,"what_happens"?: string,"who_feels_it"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ideas_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ideas_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ideas_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ideas_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"individual_checks": {
                  Row: {
                    "action": string,"ai_summary": string | null,"breakdown": Json | null,"card_id": string,"decision": string,"human": string,"id": string,"kind": Database["public"]['Enums']["check_kind"],"player_id": string,"session_id": string,"started_at": string,"steps": string,"submitted_at": string | null,"total": number | null,"trigger": string
                  }
                  Insert: {
                    "action"?: string,"ai_summary"?: string | null,"breakdown"?: Json | null,"card_id": string,"decision"?: string,"human"?: string,"id"?: string,"kind": Database["public"]['Enums']["check_kind"],"player_id": string,"session_id": string,"started_at"?: string,"steps"?: string,"submitted_at"?: string | null,"total"?: number | null,"trigger"?: string
                  }
                  Update: {
                    "action"?: string,"ai_summary"?: string | null,"breakdown"?: Json | null,"card_id"?: string,"decision"?: string,"human"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["check_kind"],"player_id"?: string,"session_id"?: string,"started_at"?: string,"steps"?: string,"submitted_at"?: string | null,"total"?: number | null,"trigger"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "individual_checks_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "players"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "individual_checks_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"error": string | null,"id": string,"org_id": string | null,"payload": NonNullable<Json>,"result": Json | null,"status": Database["public"]['Enums']["job_status"],"type": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"error"?: string | null,"id"?: string,"org_id"?: string | null,"payload"?: NonNullable<Json>,"result"?: Json | null,"status"?: Database["public"]['Enums']["job_status"],"type": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"error"?: string | null,"id"?: string,"org_id"?: string | null,"payload"?: NonNullable<Json>,"result"?: Json | null,"status"?: Database["public"]['Enums']["job_status"],"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"org_members": {
                  Row: {
                    "created_at": string,"org_id": string,"role": Database["public"]['Enums']["org_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"org_id": string,"role"?: Database["public"]['Enums']["org_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"org_id"?: string,"role"?: Database["public"]['Enums']["org_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "org_members_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "ai_stack": (string)[],"created_at": string,"id": string,"is_active": boolean,"name": string,"session_credits": number,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "ai_stack"?: (string)[],"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"session_credits"?: number,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "ai_stack"?: (string)[],"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"session_credits"?: number,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_admins": {
                  Row: {
                    "created_at": string,"email": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"email": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"players": {
                  Row: {
                    "display_name": string,"id": string,"joined_at": string,"left_at": string | null,"session_id": string,"team_id": string | null,"user_id": string
                  }
                  Insert: {
                    "display_name": string,"id"?: string,"joined_at"?: string,"left_at"?: string | null,"session_id": string,"team_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "display_name"?: string,"id"?: string,"joined_at"?: string,"left_at"?: string | null,"session_id"?: string,"team_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "players_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "players_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"reference_solutions": {
                  Row: {
                    "action": string,"case_id": string,"created_at": string,"decision": string,"explanation": string,"human": string,"id": string,"steps": string,"trigger": string
                  }
                  Insert: {
                    "action": string,"case_id": string,"created_at"?: string,"decision": string,"explanation": string,"human": string,"id"?: string,"steps": string,"trigger": string
                  }
                  Update: {
                    "action"?: string,"case_id"?: string,"created_at"?: string,"decision"?: string,"explanation"?: string,"human"?: string,"id"?: string,"steps"?: string,"trigger"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reference_solutions_case_id_fkey"
      columns: ["case_id"]
isOneToOne: true
      referencedRelation: "cases"
      referencedColumns: ["id"]
    }
                  ]
                },"scores": {
                  Row: {
                    "ai_summary": string,"breakdown": NonNullable<Json>,"created_at": string,"design_version": Database["public"]['Enums']["design_version"],"facilitator_override": number | null,"final": number | null,"id": string,"team_id": string,"total": number
                  }
                  Insert: {
                    "ai_summary"?: string,"breakdown": NonNullable<Json>,"created_at"?: string,"design_version": Database["public"]['Enums']["design_version"],"facilitator_override"?: number | null,"final"?: never,"id"?: string,"team_id": string,"total": number
                  }
                  Update: {
                    "ai_summary"?: string,"breakdown"?: NonNullable<Json>,"created_at"?: string,"design_version"?: Database["public"]['Enums']["design_version"],"facilitator_override"?: number | null,"final"?: never,"id"?: string,"team_id"?: string,"total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "scores_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"deck_id": string | null,"ended_at": string | null,"id": string,"join_code": string | null,"mode": Database["public"]['Enums']["session_mode"],"name": string,"org_id": string,"phase": Database["public"]['Enums']["session_phase"],"phase_duration_seconds": number | null,"phase_started_at": string | null,"settings": NonNullable<Json>,"started_at": string | null,"target_platforms": (string)[],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"deck_id"?: string | null,"ended_at"?: string | null,"id"?: string,"join_code"?: string | null,"mode"?: Database["public"]['Enums']["session_mode"],"name"?: string,"org_id": string,"phase"?: Database["public"]['Enums']["session_phase"],"phase_duration_seconds"?: number | null,"phase_started_at"?: string | null,"settings"?: NonNullable<Json>,"started_at"?: string | null,"target_platforms"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"deck_id"?: string | null,"ended_at"?: string | null,"id"?: string,"join_code"?: string | null,"mode"?: Database["public"]['Enums']["session_mode"],"name"?: string,"org_id"?: string,"phase"?: Database["public"]['Enums']["session_phase"],"phase_duration_seconds"?: number | null,"phase_started_at"?: string | null,"settings"?: NonNullable<Json>,"started_at"?: string | null,"target_platforms"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_deck_id_fkey"
      columns: ["deck_id"]
isOneToOne: false
      referencedRelation: "decks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sessions_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "case_id": string | null,"created_at": string,"hint_tokens_earned": number,"hint_tokens_remaining": number,"id": string,"name": string,"session_id": string
                  }
                  Insert: {
                    "case_id"?: string | null,"created_at"?: string,"hint_tokens_earned"?: number,"hint_tokens_remaining"?: number,"id"?: string,"name": string,"session_id": string
                  }
                  Update: {
                    "case_id"?: string | null,"created_at"?: string,"hint_tokens_earned"?: number,"hint_tokens_remaining"?: number,"id"?: string,"name"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teams_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "teams_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"twists": {
                  Row: {
                    "affects": (string)[],"content": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["twist_kind"],"session_id": string,"source": string,"team_id": string
                  }
                  Insert: {
                    "affects"?: (string)[],"content": string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["twist_kind"],"session_id": string,"source"?: string,"team_id": string
                  }
                  Update: {
                    "affects"?: (string)[],"content"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["twist_kind"],"session_id"?: string,"source"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "twists_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "twists_team_id_fkey"
      columns: ["team_id"]
isOneToOne: true
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "add_hint_tokens":
{ Args: { "amount": number,"target_team": string }; Returns: number
                           },
"add_session_tokens":
{ Args: { "amount": number,"target_session": string }; Returns: undefined
                           },
"can_edit_deck":
{ Args: { "target_deck": string }; Returns: boolean
                           },
"can_read_deck":
{ Args: { "target_deck": string }; Returns: boolean
                           },
"consume_session_credit":
{ Args: { "target_org": string }; Returns: number
                           },
"earn_hint_token":
{ Args: { "cap": number,"target_message": string,"target_team": string }; Returns: number
                           },
"has_org_role":
{ Args: { "target_org": string,"wanted": Database["public"]['Enums']["org_role"] }; Returns: boolean
                           },
"is_org_member":
{ Args: { "target_org": string }; Returns: boolean
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_session_player":
{ Args: { "target_session": string }; Returns: boolean
                           },
"is_session_staff":
{ Args: { "target_session": string }; Returns: boolean
                           },
"is_signed_in_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_team_player":
{ Args: { "target_team": string }; Returns: boolean
                           },
"is_team_staff":
{ Args: { "target_team": string }; Returns: boolean
                           },
"set_org_ai_stack":
{ Args: { "stack": (string)[],"target_org": string }; Returns: undefined
                           },
"snapshot_designs_for_twist":
{ Args: { "target_session": string }; Returns: undefined
                           },
"spend_hint_tokens":
{ Args: { "amount": number,"target_team": string }; Returns: number
                           }
          }
          Enums: {
            "case_source": "ai"|"manual"|"library"|"raised","check_kind": "baseline"|"post","coach_message_type": "question"|"nudge"|"analogy"|"flag","coach_role": "team"|"coach","coach_trigger": "asked"|"inline_idle"|"inline_flag","design_version": "before_twist"|"after_twist","idea_status": "raised"|"designed","job_status": "queued"|"running"|"succeeded"|"failed","org_role": "admin"|"facilitator","session_mode": "live"|"practice","session_phase": "draft"|"lobby"|"baseline_check"|"solving"|"twist"|"solving_after_twist"|"prioritise"|"judging"|"reveal"|"post_check"|"commitments"|"report"|"closed","twist_kind": "operational"|"risk"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "case_source": ["ai", "manual", "library", "raised"],"check_kind": ["baseline", "post"],"coach_message_type": ["question", "nudge", "analogy", "flag"],"coach_role": ["team", "coach"],"coach_trigger": ["asked", "inline_idle", "inline_flag"],"design_version": ["before_twist", "after_twist"],"idea_status": ["raised", "designed"],"job_status": ["queued", "running", "succeeded", "failed"],"org_role": ["admin", "facilitator"],"session_mode": ["live", "practice"],"session_phase": ["draft", "lobby", "baseline_check", "solving", "twist", "solving_after_twist", "prioritise", "judging", "reveal", "post_check", "commitments", "report", "closed"],"twist_kind": ["operational", "risk"]
          }
        }
} as const
