export interface ZendeskUser {
  id: number;
  name: string;
  email: string;
  alias?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  time_zone?: string;
  locale?: string;
  role?: string;
  verified?: boolean;
  active?: boolean;
  details?: string;
  notes?: string;
  phone?: string;
  photo?: {
    url: string;
    id: number;
    file_name: string;
    content_url: string;
    mapped_content_url: string;
    content_type: string;
    size: number;
    width: number;
    height: number;
    inline: boolean;
    deleted: boolean;
    thumbnails: Array<{
      url: string;
      id: number;
      file_name: string;
      content_url: string;
      mapped_content_url: string;
      content_type: string;
      size: number;
      width: number;
      height: number;
      inline: boolean;
      deleted: boolean;
    }>;
  };
}

export interface ZendeskOrganization {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  domain_names?: string[];
  details?: string;
  notes?: string;
  shared_tickets?: boolean;
  shared_comments?: boolean;
  external_id?: string;
  group_id?: number;
  organization_fields?: Record<string, unknown>;
  tags?: string[];
}

export interface ZendeskTrigger {
  url: string;
  id: number;
  title: string;
  active: boolean;
  updated_at: string;
  created_at: string;
  default: boolean;
  actions: Array<{ field: string; value: string | string[] }>;
  conditions: { all: Array<unknown>; any: Array<unknown> };
  description: string | null;
  position: number;
  raw_title: string;
  category_id: string;
}

export interface ZendeskTriggerCategory {
  id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ZendeskAutomation {
  id: number;
  title: string;
  raw_title: string;
  active: boolean;
  position: number;
  actions: Array<{ field: string; value: string | string[] }>;
  conditions: { all: Array<unknown>; any: Array<unknown> };
  created_at: string;
  updated_at: string;
}

export interface ZendeskDynamicContent {
  id: number;
  name: string;
  placeholder: string;
  default_locale_id: number;
  created_at: string;
  updated_at: string;
  variants: ZendeskDynamicContentVariant[];
}

export interface ZendeskDynamicContentVariant {
  id: number;
  locale_id: number;
  active: boolean;
  default: boolean;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ZendeskMacro {
  url: string;
  id: number;
  title: string;
  active: boolean;
  updated_at: string;
  created_at: string;
  usage_count: number;
  description: string | null;
}

export interface ZendeskTicketField {
  id: number;
  url: string;
  type: string;
  title: string;
  raw_title: string;
  description: string;
  raw_description: string;
  position: number;
  active: boolean;
  required: boolean;
  collapsed_for_agents: boolean;
  regexp_for_validation: string | null;
  title_in_portal: string;
  raw_title_in_portal: string;
  visible_in_portal: boolean;
  editable_in_portal: boolean;
  required_in_portal: boolean;
  tag: string | null;
  created_at: string;
  updated_at: string;
  removable: boolean;
  agent_description: string | null;
  system_field_options: unknown[];
  custom_field_options?: ZendeskCustomFieldOption[];
  sub_type_id: number | null;
  permission_group_id: number | null;
}

export interface ZendeskCustomFieldOption {
  id: number;
  name: string;
  value: string | null;
  default: boolean;
}

export interface ZendeskSupportAddress {
  id: number;
  url: string;
  email: string;
  name: string;
  default: boolean;
  brand_id: number;
  cname_status: string;
  dns_results: string;
  domain_verification_code: string;
  domain_verification_status: string;
  forwarding_status: string;
  spf_status: string;
  created_at: string;
  updated_at: string;
}

export interface ZendeskTicketForm {
  id: number;
  name: string;
  display_name: string;
  position: number;
  active: boolean;
  end_user_visible: boolean;
  default: boolean;
  in_all_brands: boolean;
  restricted_brand_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface ZendeskGroup {
  id: number;
  name: string;
  description: string;
  default: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  url: string;
  is_public: boolean;
}

export interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: string;
  organization_id: number;
  brand_id: number;
  group_id: number;
  created_at: string;
  updated_at: string;
  external_id: string;
  recipient: string;
  tags: string[];
  ticket_form_id: number;
  priority: string;
  type: string;
  requester_id?: number;
  via: { channel: string; source: { from: Record<string, unknown>; to: Record<string, unknown> }; rel: string };
  custom_fields: { id: number; value: string | null }[];
}

export interface ZendeskView {
  id: number;
  title: string;
  active: boolean;
  updated_at: string;
  created_at: string;
}

export interface ZendeskBrand {
  id: number;
  name: string;
  active: boolean;
  brand_url: string;
  created_at: string;
  updated_at: string;
  default: boolean;
  has_help_center: boolean;
  help_center_state: string;
  host_mapping: string;
  is_deleted: boolean;
  logo?: {
    content_type: string;
    content_url: string;
    file_name: string;
    id: number;
    mapped_content_url: string;
    size: number;
    thumbnails: Array<{
      content_type: string;
      content_url: string;
      file_name: string;
      id: number;
      mapped_content_url: string;
      size: number;
      url: string;
    }>;
    url: string;
  };
  signature_template: string;
  subdomain: string;
  ticket_form_ids?: number[];
  url: string;
}

export interface ZendeskGroupMembership {
  id: number;
  user_id: number;
  group_id: number;
  default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZendeskCustomRole {
  id: number;
  name: string;
  description: string;
  role_type: number;
  team_member_count: number;
  created_at: string;
  updated_at: string;
  configuration?: {
    assign_tickets_to_any_group: boolean;
    chat_access: boolean;
    end_user_list_access: string;
    end_user_profile_access: string;
    explore_access: string;
    forum_access: string;
    forum_access_restricted_content: boolean;
    group_access: boolean;
    light_agent: boolean;
    macro_access: string;
    manage_business_rules: boolean;
    manage_contextual_workspaces: boolean;
    manage_dynamic_content: boolean;
    manage_extensions_and_channels: boolean;
    manage_facebook: boolean;
    manage_organization_fields: boolean;
    manage_ticket_fields: boolean;
    manage_ticket_forms: boolean;
    manage_user_fields: boolean;
    moderate_forums: boolean;
    organization_editing: boolean;
    organization_notes_editing: boolean;
    report_access: string;
    side_conversation_create: boolean;
    ticket_access: string;
    ticket_comment_access: string;
    ticket_deletion: boolean;
    ticket_editing: boolean;
    ticket_merge: boolean;
    ticket_tag_editing: boolean;
    twitter_search_access: boolean;
    user_view_access: string;
    view_access: string;
    view_deleted_tickets: boolean;
    voice_access: boolean;
    voice_dashboard_access: boolean;
  };
}
