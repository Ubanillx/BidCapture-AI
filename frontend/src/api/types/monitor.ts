export interface ApiMessage {
  success?: boolean;
  message?: string;
}

export interface StatusResponse {
  is_running: boolean;
  last_run_time: string | null;
  next_run_time: string | null;
  total_bids: number;
  today_new: number;
  today_rounds: number;
  interval: number;
  progress_current: number;
  progress_total: number;
  progress_site: string;
  is_crawling: boolean;
}

export interface NotifyConfig {
  provider?: string;
  sign_name?: string;
  template_code?: string;
  access_key_id?: string;
  access_key_secret?: string;
  called_show_number?: string;
  tts_code?: string;
  token?: string;
}

export interface AiConfig {
  enable?: boolean;
  base_url?: string;
  api_key?: string;
  model?: string;
}

export interface AppConfig {
  keywords: string;
  exclude: string;
  must_contain: string;
  interval: number;
  enabled_sites?: string[];
  email_enabled: boolean;
  sms_enabled: boolean;
  voice_enabled: boolean;
  wechat_enabled: boolean;
  ai_enabled: boolean;
  use_selenium: boolean;
  sms_config: NotifyConfig;
  voice_config: NotifyConfig;
  ai_config: AiConfig;
  contacts?: Contact[];
  custom_sites?: CustomSite[];
  email_configs?: unknown[];
}

export interface Site {
  key: string;
  name: string;
  url: string;
  enabled: boolean;
}

export interface CustomSite {
  name: string;
  url: string;
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
  email_type?: string;
  email_password?: string;
  wechat_token?: string;
  enabled?: boolean;
}

export interface BidResult {
  id: string;
  title: string;
  url: string;
  source: string;
  pub_date: string | null;
  has_html: boolean;
  html_length: number;
}

export interface ResultsResponse {
  total: number;
  items: BidResult[];
}

export interface ResultDetail {
  id: string;
  title: string;
  url: string;
  source: string;
  pub_date: string | null;
  content_html: string;
}

export interface LogsResponse {
  logs: string[];
}
