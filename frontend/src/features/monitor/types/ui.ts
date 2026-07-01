import type { Contact, CustomSite, ResultDetail } from '../../../api/types/monitor';

export type PageKey = 'dashboard' | 'results' | 'sites' | 'contacts' | 'settings' | 'logs';
export type NestedConfigKey = 'sms_config' | 'voice_config' | 'ai_config';

export interface PreviewState {
  visible: boolean;
  loading: boolean;
  data: Partial<ResultDetail> | null;
}

export interface ContactEditorState {
  visible: boolean;
  index: number;
  value: Contact;
}

export interface CustomSiteEditorState {
  visible: boolean;
  value: CustomSite;
}
