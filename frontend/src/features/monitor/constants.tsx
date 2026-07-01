import type { ReactNode } from 'react';
import {
  IconArticle,
  IconGlobe,
  IconHome,
  IconLive,
  IconSetting,
  IconUser,
} from '@douyinfe/semi-icons';
import type { AppConfig, Contact, CustomSite, StatusResponse } from '../../api/types/monitor';
import type { PageKey } from './types/ui';

export const EMPTY_STATUS: StatusResponse = {
  is_running: false,
  last_run_time: null,
  next_run_time: null,
  total_bids: 0,
  today_new: 0,
  today_rounds: 0,
  interval: 20,
  progress_current: 0,
  progress_total: 0,
  progress_site: '',
  is_crawling: false,
};

export const DEFAULT_CONFIG: AppConfig = {
  keywords: '',
  exclude: '',
  must_contain: '',
  interval: 20,
  email_enabled: false,
  sms_enabled: false,
  voice_enabled: false,
  wechat_enabled: false,
  ai_enabled: false,
  use_selenium: false,
  sms_config: {},
  voice_config: {},
  ai_config: {},
};

export const EMPTY_CONTACT: Contact = {
  name: '',
  phone: '',
  email: '',
  email_type: 'QQ邮箱',
  email_password: '',
  wechat_token: '',
  enabled: true,
};

export const EMPTY_CUSTOM_SITE: CustomSite = {
  name: '',
  url: '',
};

export const navItems: Array<{ key: PageKey; label: string; icon: ReactNode }> = [
  { key: 'dashboard', label: '监控总览', icon: <IconHome /> },
  { key: 'results', label: '招标结果', icon: <IconArticle /> },
  { key: 'sites', label: '采集站点', icon: <IconGlobe /> },
  { key: 'contacts', label: '联系人', icon: <IconUser /> },
  { key: 'settings', label: '规则配置', icon: <IconSetting /> },
  { key: 'logs', label: '运行日志', icon: <IconLive /> },
];
