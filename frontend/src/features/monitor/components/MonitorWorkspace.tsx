import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  Empty,
  Input,
  Modal,
  Progress,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  TextArea,
  Toast,
  Tooltip,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconBell,
  IconClear,
  IconCopy,
  IconDelete,
  IconDownload,
  IconEdit,
  IconExternalOpen,
  IconEyeOpened,
  IconPlay,
  IconPlus,
  IconRefresh,
  IconSave,
  IconSearch,
  IconServer,
  IconStop,
} from '@douyinfe/semi-icons';
import { Field } from '../../../components/common/Field';
import { LogConsole } from '../../../components/common/LogConsole';
import { MetricCard } from '../../../components/common/MetricCard';
import { SectionHeader } from '../../../components/common/SectionHeader';
import { AppShell } from '../../../components/layout/AppShell';
import { apiUrl } from '../../../api/client';
import {
  clearLogs,
  getConfig,
  getContacts,
  getCustomSites,
  getLogs,
  getResultDetail,
  getResults,
  getSites,
  getStatus,
  runOnce,
  saveConfig,
  saveContacts as saveContactsRequest,
  saveCustomSites as saveCustomSitesRequest,
  saveEnabledSites,
  saveFullConfig as saveFullConfigRequest,
  startMonitor,
  stopMonitor,
  testEndpoint as testEndpointRequest,
} from '../../../api/endpoints/monitor';
import type {
  AppConfig,
  BidResult,
  Contact,
  CustomSite,
  ResultsResponse,
  Site,
  StatusResponse,
} from '../../../api/types/monitor';
import { displayValue, progressPercent } from '../../../utils/format';
import {
  DEFAULT_CONFIG,
  EMPTY_CONTACT,
  EMPTY_CUSTOM_SITE,
  EMPTY_STATUS,
  navItems,
} from '../constants';
import type { ContactEditorState, CustomSiteEditorState, NestedConfigKey, PageKey, PreviewState } from '../types/ui';
import { ContactEditor } from './ContactEditor';

const { Text } = Typography;

function notifyError(error: unknown) {
  Toast.error({ content: error instanceof Error ? error.message : '操作失败' });
}

function Page({ children }: { children: ReactNode }) {
  return <main className="page">{children}</main>;
}

function Panel({
  title,
  actions,
  children,
  dense = false,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  dense?: boolean;
}) {
  return (
    <section className="flat-panel">
      <div className="flat-panel__header">
        <h3 className="flat-panel__title">{title}</h3>
        {actions ? <div className="toolbar-group">{actions}</div> : null}
      </div>
      <div className={dense ? 'flat-panel__body flat-panel__body--dense' : 'flat-panel__body'}>{children}</div>
    </section>
  );
}

function ChannelCell({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="channel-cell">
      <span className="channel-name">{label}</span>
      <span className="channel-state">
        <span className={enabled ? 'status-dot status-dot--ok' : 'status-dot'} /> {enabled ? '已启用' : '未启用'}
      </span>
    </div>
  );
}

function SwitchItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="switch-item">
      <span>{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

interface MonitorWorkspaceProps {
  username: string;
  onLogout: () => void;
}

export function MonitorWorkspace({ username, onLogout }: MonitorWorkspaceProps) {
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [status, setStatus] = useState<StatusResponse>(EMPTY_STATUS);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<ResultsResponse>({ total: 0, items: [] });
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [sites, setSites] = useState<Site[]>([]);
  const [customSites, setCustomSites] = useState<CustomSite[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [siteQuery, setSiteQuery] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewState>({ visible: false, loading: false, data: null });
  const [contactEditor, setContactEditor] = useState<ContactEditorState>({ visible: false, index: -1, value: EMPTY_CONTACT });
  const [customSiteEditor, setCustomSiteEditor] = useState<CustomSiteEditorState>({ visible: false, value: EMPTY_CUSTOM_SITE });

  const setBusy = (key: string, value: boolean) => {
    setLoading((current) => ({ ...current, [key]: value }));
  };

  const loadStatus = async () => {
    try {
      const data = await getStatus();
      setStatus({ ...EMPTY_STATUS, ...data });
    } catch (error) {
      notifyError(error);
    }
  };

  const loadLogs = async () => {
    try {
      const data = await getLogs(120);
      setLogs(data.logs || []);
    } catch (error) {
      notifyError(error);
    }
  };

  const loadResults = async () => {
    setBusy('results', true);
    try {
      const data = await getResults(100);
      setResults({ total: data.total || 0, items: data.items || [] });
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('results', false);
    }
  };

  const loadConfig = async () => {
    setBusy('config', true);
    try {
      const data = await getConfig();
      setConfig({ ...DEFAULT_CONFIG, ...data });
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('config', false);
    }
  };

  const loadSites = async () => {
    setBusy('sites', true);
    try {
      const [siteData, customData] = await Promise.all([getSites(), getCustomSites()]);
      setSites(siteData || []);
      setCustomSites(customData || []);
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('sites', false);
    }
  };

  const loadContacts = async () => {
    setBusy('contacts', true);
    try {
      const data = await getContacts();
      setContacts(data || []);
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('contacts', false);
    }
  };

  const refreshDashboard = async () => {
    await Promise.all([loadStatus(), loadLogs()]);
  };

  useEffect(() => {
    refreshDashboard();
    loadResults();
    loadConfig();
    loadSites();
    loadContacts();

    const timer = window.setInterval(() => {
      loadStatus();
      loadLogs();
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const filteredSites = useMemo(() => {
    const query = siteQuery.trim().toLowerCase();
    if (!query) return sites;
    return sites.filter((site) => `${site.name} ${site.key} ${site.url}`.toLowerCase().includes(query));
  }, [sites, siteQuery]);

  const enabledSiteCount = useMemo(() => sites.filter((site) => site.enabled).length, [sites]);
  const enabledContactCount = useMemo(() => contacts.filter((contact) => contact.enabled !== false).length, [contacts]);
  const latestResults = useMemo(() => results.items.slice(0, 6), [results.items]);
  const enabledChannelCount = [
    config.email_enabled,
    config.sms_enabled,
    config.voice_enabled,
    config.wechat_enabled,
  ].filter(Boolean).length;
  const statusProgress = progressPercent(status);

  const runMonitorAction = async (action: () => Promise<{ message?: string }>, successMessage: string) => {
    setBusy('action', true);
    try {
      const data = await action();
      Toast.success({ content: data.message || successMessage });
      await refreshDashboard();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('action', false);
    }
  };

  const saveBasicConfig = async () => {
    setBusy('saveConfig', true);
    try {
      const payload = {
        keywords: config.keywords,
        exclude: config.exclude,
        must_contain: config.must_contain,
        interval: Number(config.interval) || 20,
        email_enabled: Boolean(config.email_enabled),
        sms_enabled: Boolean(config.sms_enabled),
        voice_enabled: Boolean(config.voice_enabled),
        wechat_enabled: Boolean(config.wechat_enabled),
        ai_enabled: Boolean(config.ai_enabled),
        use_selenium: Boolean(config.use_selenium),
      };
      const data = await saveConfig(payload);
      Toast.success({ content: data.message || '配置已保存' });
      await loadConfig();
      await loadStatus();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('saveConfig', false);
    }
  };

  const saveFullConfig = async () => {
    setBusy('saveFullConfig', true);
    try {
      const data = await saveFullConfigRequest(config);
      Toast.success({ content: data.message || '高级配置已保存' });
      await loadConfig();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('saveFullConfig', false);
    }
  };

  const saveSites = async () => {
    setBusy('saveSites', true);
    try {
      const enabledSites = sites.filter((site) => site.enabled).map((site) => site.key);
      const data = await saveEnabledSites(enabledSites);
      Toast.success({ content: data.message || '站点配置已保存' });
      await loadSites();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('saveSites', false);
    }
  };

  const saveCustomSites = async (nextSites: CustomSite[]) => {
    setBusy('customSites', true);
    try {
      const data = await saveCustomSitesRequest(nextSites);
      Toast.success({ content: data.message || '自定义站点已保存' });
      await loadSites();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('customSites', false);
    }
  };

  const saveContacts = async (nextContacts: Contact[]) => {
    setBusy('contacts', true);
    try {
      const data = await saveContactsRequest(nextContacts);
      Toast.success({ content: data.message || '联系人已保存' });
      setContacts(nextContacts);
      await loadContacts();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy('contacts', false);
    }
  };

  const openPreview = async (record: BidResult) => {
    setPreview({ visible: true, loading: true, data: { title: record.title } });
    try {
      const data = await getResultDetail(record);
      setPreview({ visible: true, loading: false, data });
    } catch (error) {
      notifyError(error);
      setPreview({ visible: false, loading: false, data: null });
    }
  };

  const copyPreviewHtml = async () => {
    if (!preview.data?.content_html) return;
    try {
      await navigator.clipboard.writeText(preview.data.content_html);
      Toast.success({ content: '正文 HTML 已复制' });
    } catch (error) {
      notifyError(error);
    }
  };

  const testEndpoint = async (path: string, payload: Record<string, unknown>, successPrefix: string) => {
    setBusy(path, true);
    try {
      const data = await testEndpointRequest(path, payload || {});
      if (data.success === false) {
        Toast.warning({ content: data.message || `${successPrefix}失败` });
      } else {
        Toast.success({ content: data.message || `${successPrefix}成功` });
      }
      await loadLogs();
    } catch (error) {
      notifyError(error);
    } finally {
      setBusy(path, false);
    }
  };

  const updateConfig = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
  };

  const updateNestedConfig = (section: NestedConfigKey, key: string, value: string) => {
    setConfig((current) => ({
      ...current,
      [section]: {
        ...(current[section] || {}),
        [key]: value,
      },
    }));
  };

  const resultColumns = [
    {
      title: '招标标题',
      dataIndex: 'title',
      width: 560,
      render: (text: string, record: BidResult) => (
        <div className="result-title-cell">
          <span className="result-title-main" title={String(displayValue(text, '未命名'))}>
            {displayValue(text, '未命名')}
          </span>
          <span className="result-title-url" title={String(displayValue(record.url))}>
            {displayValue(record.url)}
          </span>
        </div>
      ),
    },
    {
      title: '来源',
      dataIndex: 'source',
      width: 160,
      render: (text: string) => <Tag>{displayValue(text)}</Tag>,
    },
    {
      title: '发布日期',
      dataIndex: 'pub_date',
      width: 150,
      render: (text: string | null) => <span className="is-number">{displayValue(text)}</span>,
    },
    {
      title: '正文',
      dataIndex: 'html_length',
      width: 130,
      render: (text: number, record: BidResult) => (
        <Tag color={record.has_html ? 'green' : 'grey'}>{record.has_html ? `${text} 字符` : '无正文'}</Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'operate',
      width: 120,
      render: (_: unknown, record: BidResult) => (
        <Space>
          <Tooltip content="预览正文">
            <Button theme="borderless" icon={<IconEyeOpened />} disabled={!record.has_html} onClick={() => openPreview(record)} />
          </Tooltip>
          <Tooltip content="打开原文">
            <Button theme="borderless" icon={<IconExternalOpen />} disabled={!record.url} onClick={() => window.open(record.url, '_blank', 'noopener,noreferrer')} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const siteColumns = [
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 86,
      render: (_: unknown, record: Site) => (
        <Checkbox
          checked={Boolean(record.enabled)}
          onChange={(event) => {
            const checked = Boolean(event.target.checked);
            setSites((current) => current.map((item) => (item.key === record.key ? { ...item, enabled: checked } : item)));
          }}
        />
      ),
    },
    {
      title: '网站名称',
      dataIndex: 'name',
      width: 220,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '标识',
      dataIndex: 'key',
      width: 180,
      render: (text: string) => <span className="is-number">{text}</span>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      render: (text: string) => (
        <span className="ellipsis-cell" title={String(displayValue(text))}>
          {displayValue(text)}
        </span>
      ),
    },
  ];

  const contactColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 180,
      render: (text: string, record: Contact) => (
        <Space>
          <span className={record.enabled === false ? 'status-dot' : 'status-dot status-dot--ok'} />
          <Text strong>{displayValue(text, '未命名')}</Text>
        </Space>
      ),
    },
    {
      title: '手机',
      dataIndex: 'phone',
      width: 170,
      render: (text: string | undefined) => <span className="is-number">{displayValue(text)}</span>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      render: (text: string | undefined, record: Contact) => (
        <Space vertical align="start">
          <Text>{displayValue(text)}</Text>
          {record.email_type ? <Text type="tertiary">{record.email_type}</Text> : null}
        </Space>
      ),
    },
    {
      title: '微信',
      dataIndex: 'wechat_token',
      width: 120,
      render: (text: string | undefined) => (text ? <Tag color="green">已配置</Tag> : <Tag color="grey">未配置</Tag>),
    },
    {
      title: '操作',
      dataIndex: 'operate',
      width: 150,
      render: (_: unknown, record: Contact, index: number) => (
        <Space>
          <Tooltip content="编辑">
            <Button theme="borderless" icon={<IconEdit />} onClick={() => setContactEditor({ visible: true, index, value: { ...EMPTY_CONTACT, ...record } })} />
          </Tooltip>
          <Tooltip content="删除">
            <Button
              theme="borderless"
              type="danger"
              icon={<IconDelete />}
              onClick={() => saveContacts(contacts.filter((_, contactIndex) => contactIndex !== index))}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const customSiteColumns = [
    {
      title: '网站名称',
      dataIndex: 'name',
      width: 220,
      render: (text: string) => <Text strong>{displayValue(text)}</Text>,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      render: (text: string) => (
        <span className="ellipsis-cell" title={String(displayValue(text))}>
          {displayValue(text)}
        </span>
      ),
    },
    {
      title: '操作',
      dataIndex: 'operate',
      width: 90,
      render: (_: unknown, _record: CustomSite, index: number) => (
        <Tooltip content="删除">
          <Button
            theme="borderless"
            type="danger"
            icon={<IconDelete />}
            onClick={() => {
              const nextSites = customSites.filter((_, siteIndex) => siteIndex !== index);
              setCustomSites(nextSites);
              saveCustomSites(nextSites);
            }}
          />
        </Tooltip>
      ),
    },
  ];

  const renderDashboard = () => (
    <Page>
      <SectionHeader
        title="监控总览"
        description="招标采集、过滤、通知和站点覆盖的一屏管理视图"
        actions={(
          <>
            <Button icon={<IconRefresh />} onClick={refreshDashboard}>刷新</Button>
            <Button type="primary" icon={<IconPlay />} loading={loading.action} disabled={status.is_running} onClick={() => runMonitorAction(startMonitor, '监控已启动')}>启动</Button>
            <Button type="danger" icon={<IconStop />} loading={loading.action} disabled={!status.is_running} onClick={() => runMonitorAction(stopMonitor, '监控已停止')}>停止</Button>
            <Button icon={<IconSearch />} loading={loading.action} onClick={() => runMonitorAction(runOnce, '已开始检索')}>立即检索</Button>
          </>
        )}
      />

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="metrics-strip">
            <MetricCard label="运行状态" value={status.is_running ? '运行中' : '已停止'} hint={status.is_crawling ? `正在检索：${status.progress_site || '准备中'}` : '后台调度状态'} />
            <MetricCard label="累计结果" value={status.total_bids} hint="数据库总记录" />
            <MetricCard label="今日新增" value={status.today_new} hint={`今日 ${status.today_rounds || 0} 轮`} />
            <MetricCard label="轮询间隔" value={`${status.interval || 20}`} hint="分钟/轮" />
          </div>

          <Panel
            title="执行进度"
            actions={<Tag color={status.is_running ? 'green' : 'grey'}>{status.is_running ? '调度开启' : '调度关闭'}</Tag>}
          >
            <div className="status-grid">
              <div className="form-stack">
                <div className="status-line">
                  <Tag color={status.is_crawling ? 'amber' : 'grey'}>{status.is_crawling ? '正在采集' : '空闲'}</Tag>
                  <Text type="tertiary">
                    {status.is_crawling ? `${status.progress_current || 0}/${status.progress_total || 0} ${status.progress_site || ''}` : '当前没有正在执行的采集任务'}
                  </Text>
                </div>
                <Progress percent={statusProgress} showInfo />
              </div>
              <div className="status-meta">
                <div className="meta-row"><span>上次检索</span><strong>{displayValue(status.last_run_time)}</strong></div>
                <div className="meta-row"><span>下次检索</span><strong>{displayValue(status.next_run_time)}</strong></div>
                <div className="meta-row"><span>内置站点</span><strong>{enabledSiteCount}/{sites.length || 0}</strong></div>
                <div className="meta-row"><span>联系人</span><strong>{enabledContactCount}/{contacts.length || 0}</strong></div>
              </div>
            </div>
          </Panel>

          <Panel
            title="最近命中"
            dense
            actions={<Button icon={<IconRefresh />} onClick={loadResults}>刷新结果</Button>}
          >
            <Table
              className="data-table result-table"
              rowKey="id"
              loading={loading.results}
              columns={resultColumns}
              dataSource={latestResults}
              scroll={{ x: 1120 }}
              pagination={false}
              empty={<Empty title="暂无招标结果" description="执行一次检索后会在这里展示命中记录" />}
            />
          </Panel>
        </div>

        <div className="dashboard-side">
          <Panel title="通知通道">
            <div className="channel-grid">
              <ChannelCell label="邮件" enabled={Boolean(config.email_enabled)} />
              <ChannelCell label="短信" enabled={Boolean(config.sms_enabled)} />
              <ChannelCell label="语音" enabled={Boolean(config.voice_enabled)} />
              <ChannelCell label="微信" enabled={Boolean(config.wechat_enabled)} />
              <ChannelCell label="AI 过滤" enabled={Boolean(config.ai_enabled)} />
              <ChannelCell label="Selenium" enabled={Boolean(config.use_selenium)} />
            </div>
            <Divider margin="12px" />
            <Text type="tertiary">已启用 {enabledChannelCount} 个通知通道，自定义站点 {customSites.length} 个。</Text>
          </Panel>

          <Panel title="最近日志" actions={<Button icon={<IconRefresh />} onClick={loadLogs}>刷新</Button>}>
            <LogConsole logs={logs.slice(-10)} compact />
          </Panel>
        </div>
      </div>
    </Page>
  );

  const renderResults = () => (
    <Page>
      <SectionHeader
        title="招标结果"
        description={`当前共 ${results.total} 条，默认展示最近 100 条`}
        actions={(
          <>
            <Button icon={<IconRefresh />} onClick={loadResults}>刷新</Button>
            <Button icon={<IconDownload />} onClick={() => { window.location.href = apiUrl('/api/results/export-html-csv'); }}>导出正文 CSV</Button>
          </>
        )}
      />
      <section className="flat-panel table-panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <Tag>最近 100 条</Tag>
            <Tag color="green">{results.items.filter((item) => item.has_html).length} 条含正文</Tag>
          </div>
          <div className="toolbar-group">
            <Button icon={<IconRefresh />} onClick={loadResults}>重新加载</Button>
          </div>
        </div>
        <div className="flat-panel__body flat-panel__body--dense">
          <Table
            className="data-table result-table"
            rowKey="id"
            loading={loading.results}
            columns={resultColumns}
            dataSource={results.items}
            scroll={{ x: 1120 }}
            pagination={false}
            empty={<Empty title="暂无招标结果" description="执行一次检索后会在这里展示命中记录" />}
          />
        </div>
      </section>
    </Page>
  );

  const renderSites = () => (
    <Page>
      <SectionHeader
        title="采集站点"
        description="管理内置采集源和自定义网站"
        actions={(
          <>
            <Button icon={<IconRefresh />} onClick={loadSites}>刷新</Button>
            <Button icon={<IconSave />} type="primary" loading={loading.saveSites} onClick={saveSites}>保存内置站点</Button>
          </>
        )}
      />
      <section className="flat-panel table-panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <Input prefix={<IconSearch />} placeholder="搜索站点名称、标识或 URL" value={siteQuery} onChange={setSiteQuery} />
            <Button onClick={() => setSites((current) => current.map((site) => ({ ...site, enabled: true })))}>全选</Button>
            <Button onClick={() => setSites((current) => current.map((site) => ({ ...site, enabled: false })))}>清空</Button>
          </div>
          <div className="toolbar-group">
            <Tag>{enabledSiteCount}/{sites.length || 0} 已启用</Tag>
          </div>
        </div>
        <div className="flat-panel__body flat-panel__body--dense">
          <Spin spinning={loading.sites}>
            <Table
              className="data-table"
              rowKey="key"
              columns={siteColumns}
              dataSource={filteredSites}
              scroll={{ x: 920 }}
              pagination={false}
            />
          </Spin>
        </div>
      </section>

      <Panel
        title="自定义站点"
        dense
        actions={<Button icon={<IconPlus />} type="primary" onClick={() => setCustomSiteEditor({ visible: true, value: EMPTY_CUSTOM_SITE })}>添加站点</Button>}
      >
        <Table
          className="data-table"
          rowKey={(record?: CustomSite) => record?.url || record?.name || ''}
          loading={loading.customSites}
          columns={customSiteColumns}
          dataSource={customSites}
          scroll={{ x: 760 }}
          pagination={false}
          empty={<Empty title="暂无自定义站点" description="添加后会和内置采集源一起参与检索" />}
        />
      </Panel>
    </Page>
  );

  const renderContacts = () => (
    <Page>
      <SectionHeader
        title="联系人"
        description="通知接收人、邮箱授权码和 PushPlus Token"
        actions={(
          <>
            <Button icon={<IconRefresh />} onClick={loadContacts}>刷新</Button>
            <Button icon={<IconPlus />} type="primary" onClick={() => setContactEditor({ visible: true, index: -1, value: EMPTY_CONTACT })}>添加联系人</Button>
          </>
        )}
      />
      <section className="flat-panel table-panel">
        <div className="toolbar">
          <div className="toolbar-group">
            <Tag>{enabledContactCount}/{contacts.length || 0} 已启用</Tag>
            <Tag color={config.email_enabled ? 'green' : 'grey'}>邮件 {config.email_enabled ? '开启' : '关闭'}</Tag>
            <Tag color={config.wechat_enabled ? 'green' : 'grey'}>微信 {config.wechat_enabled ? '开启' : '关闭'}</Tag>
          </div>
        </div>
        <div className="flat-panel__body flat-panel__body--dense">
          <Table
            className="data-table"
            rowKey={(record?: Contact) => record?.name || record?.email || record?.phone || ''}
            loading={loading.contacts}
            columns={contactColumns}
            dataSource={contacts}
            scroll={{ x: 740 }}
            pagination={false}
            empty={<Empty title="暂无联系人" description="添加联系人后才会发送邮件、短信、微信或语音通知" />}
          />
        </div>
      </section>
    </Page>
  );

  const renderSettings = () => (
    <Page>
      <SectionHeader
        title="规则配置"
        description="关键词过滤、通知通道和 AI 二次判断"
        actions={(
          <>
            <Button icon={<IconRefresh />} onClick={loadConfig}>刷新</Button>
            <Button icon={<IconSave />} type="primary" loading={loading.saveConfig} onClick={saveBasicConfig}>保存基础配置</Button>
            <Button icon={<IconSave />} loading={loading.saveFullConfig} onClick={saveFullConfig}>保存高级配置</Button>
          </>
        )}
      />
      <Spin spinning={loading.config}>
        <div className="settings-grid">
          <Panel title="检索规则">
            <div className="form-stack">
              <Field label="关注关键词" hint="逗号分隔，命中任意一个进入候选">
                <TextArea autosize rows={3} value={config.keywords || ''} onChange={(value) => updateConfig('keywords', value)} />
              </Field>
              <Field label="排除关键词" hint="逗号分隔，命中后直接排除">
                <TextArea autosize rows={3} value={config.exclude || ''} onChange={(value) => updateConfig('exclude', value)} />
              </Field>
              <div className="two-column-grid">
                <Field label="必须包含">
                  <Input value={config.must_contain || ''} onChange={(value) => updateConfig('must_contain', value)} />
                </Field>
                <Field label="检索间隔（分钟）">
                  <Input type="number" min={1} value={String(config.interval || '')} onChange={(value) => updateConfig('interval', Number(value) || 20)} />
                </Field>
              </div>
              <Divider margin="4px" />
              <div className="switch-grid">
                <SwitchItem label="Selenium 浏览器模式" checked={Boolean(config.use_selenium)} onChange={(checked) => updateConfig('use_selenium', checked)} />
                <SwitchItem label="AI 过滤" checked={Boolean(config.ai_enabled)} onChange={(checked) => updateConfig('ai_enabled', checked)} />
                <SwitchItem label="邮件" checked={Boolean(config.email_enabled)} onChange={(checked) => updateConfig('email_enabled', checked)} />
                <SwitchItem label="短信" checked={Boolean(config.sms_enabled)} onChange={(checked) => updateConfig('sms_enabled', checked)} />
                <SwitchItem label="语音" checked={Boolean(config.voice_enabled)} onChange={(checked) => updateConfig('voice_enabled', checked)} />
                <SwitchItem label="微信" checked={Boolean(config.wechat_enabled)} onChange={(checked) => updateConfig('wechat_enabled', checked)} />
              </div>
            </div>
          </Panel>

          <div className="two-column-grid">
            <Panel
              title="短信配置"
              actions={<Button icon={<IconBell />} loading={loading['/api/test/sms']} onClick={() => { const phone = window.prompt('请输入测试手机号'); if (phone) testEndpoint('/api/test/sms', { phone }, '短信测试'); }}>测试短信</Button>}
            >
              <div className="form-stack">
                <Field label="AccessKey ID"><Input value={config.sms_config?.access_key_id || ''} onChange={(value) => updateNestedConfig('sms_config', 'access_key_id', value)} /></Field>
                <Field label="AccessKey Secret"><Input mode="password" value={config.sms_config?.access_key_secret || ''} onChange={(value) => updateNestedConfig('sms_config', 'access_key_secret', value)} /></Field>
                <Field label="签名名称"><Input value={config.sms_config?.sign_name || ''} onChange={(value) => updateNestedConfig('sms_config', 'sign_name', value)} /></Field>
                <Field label="模板代码"><Input value={config.sms_config?.template_code || ''} onChange={(value) => updateNestedConfig('sms_config', 'template_code', value)} /></Field>
              </div>
            </Panel>

            <Panel
              title="语音配置"
              actions={<Button icon={<IconBell />} loading={loading['/api/test/voice']} onClick={() => { const phone = window.prompt('请输入测试手机号'); if (phone) testEndpoint('/api/test/voice', { phone }, '语音测试'); }}>测试语音</Button>}
            >
              <div className="form-stack">
                <Field label="AccessKey ID"><Input value={config.voice_config?.access_key_id || ''} onChange={(value) => updateNestedConfig('voice_config', 'access_key_id', value)} /></Field>
                <Field label="AccessKey Secret"><Input mode="password" value={config.voice_config?.access_key_secret || ''} onChange={(value) => updateNestedConfig('voice_config', 'access_key_secret', value)} /></Field>
                <Field label="TTS 模板 ID"><Input value={config.voice_config?.tts_code || ''} onChange={(value) => updateNestedConfig('voice_config', 'tts_code', value)} /></Field>
                <Field label="被叫显号"><Input value={config.voice_config?.called_show_number || ''} onChange={(value) => updateNestedConfig('voice_config', 'called_show_number', value)} /></Field>
              </div>
            </Panel>
          </div>

          <Panel
            title="AI 配置"
            actions={<Button icon={<IconServer />} loading={loading['/api/test/ai']} onClick={() => testEndpoint('/api/test/ai', {}, 'AI 测试')}>测试 AI</Button>}
          >
            <div className="two-column-grid">
              <Field label="API 地址"><Input value={config.ai_config?.base_url || ''} onChange={(value) => updateNestedConfig('ai_config', 'base_url', value)} /></Field>
              <Field label="模型"><Input value={config.ai_config?.model || ''} onChange={(value) => updateNestedConfig('ai_config', 'model', value)} /></Field>
              <Field label="API Key"><Input mode="password" value={config.ai_config?.api_key || ''} onChange={(value) => updateNestedConfig('ai_config', 'api_key', value)} /></Field>
            </div>
          </Panel>
        </div>
      </Spin>
    </Page>
  );

  const renderLogs = () => (
    <Page>
      <SectionHeader
        title="运行日志"
        description="最近 120 条服务端日志"
        actions={(
          <>
            <Button icon={<IconRefresh />} onClick={loadLogs}>刷新</Button>
            <Button
              icon={<IconClear />}
              type="danger"
              onClick={async () => {
                try {
                  await clearLogs();
                  Toast.success({ content: '日志已清空' });
                  await loadLogs();
                } catch (error) {
                  notifyError(error);
                }
              }}
            >
              清空日志
            </Button>
          </>
        )}
      />
      <Panel title="服务端输出">
        <LogConsole logs={logs} />
      </Panel>
    </Page>
  );

  const pages: Record<PageKey, () => ReactNode> = {
    dashboard: renderDashboard,
    results: renderResults,
    sites: renderSites,
    contacts: renderContacts,
    settings: renderSettings,
    logs: renderLogs,
  };

  return (
    <>
      <AppShell
        activePage={activePage}
        navItems={navItems}
        isRunning={status.is_running}
        isBusy={status.is_crawling}
        username={username}
        onPageChange={setActivePage}
        onRefresh={refreshDashboard}
        onLogout={onLogout}
      >
        {pages[activePage]()}
      </AppShell>

      <Modal
        title={preview.data?.title || '正文预览'}
        visible={preview.visible}
        width={960}
        footer={(
          <Space>
            <Button icon={<IconCopy />} onClick={copyPreviewHtml} disabled={!preview.data?.content_html}>复制 HTML</Button>
            <Button onClick={() => setPreview({ visible: false, loading: false, data: null })}>关闭</Button>
          </Space>
        )}
        onCancel={() => setPreview({ visible: false, loading: false, data: null })}
      >
        {preview.loading ? (
          <Spin />
        ) : (
          <div className="preview-body">
            <div className="preview-meta">
              <Tag>来源：{displayValue(preview.data?.source)}</Tag>
              <Tag>发布日期：{displayValue(preview.data?.pub_date)}</Tag>
              {preview.data?.url ? <Button icon={<IconExternalOpen />} onClick={() => window.open(preview.data?.url || '', '_blank', 'noopener,noreferrer')}>原文</Button> : null}
            </div>
            <TextArea autosize rows={12} value={preview.data?.content_html || ''} readonly />
          </div>
        )}
      </Modal>

      <Modal
        title={contactEditor.index >= 0 ? '编辑联系人' : '添加联系人'}
        visible={contactEditor.visible}
        width={640}
        onCancel={() => setContactEditor({ visible: false, index: -1, value: EMPTY_CONTACT })}
        onOk={() => {
          if (!contactEditor.value.name.trim()) {
            Toast.warning({ content: '请输入联系人姓名' });
            return;
          }
          const nextContacts = [...contacts];
          if (contactEditor.index >= 0) {
            nextContacts[contactEditor.index] = contactEditor.value;
          } else {
            nextContacts.push(contactEditor.value);
          }
          setContactEditor({ visible: false, index: -1, value: EMPTY_CONTACT });
          saveContacts(nextContacts);
        }}
      >
        <ContactEditor value={contactEditor.value} onChange={(value) => setContactEditor((current) => ({ ...current, value }))} />
      </Modal>

      <Modal
        title="添加自定义站点"
        visible={customSiteEditor.visible}
        width={560}
        onCancel={() => setCustomSiteEditor({ visible: false, value: EMPTY_CUSTOM_SITE })}
        onOk={() => {
          const value = customSiteEditor.value;
          if (!value.name.trim() || !value.url.trim()) {
            Toast.warning({ content: '请填写网站名称和 URL' });
            return;
          }
          const nextSites = [...customSites, value];
          setCustomSites(nextSites);
          setCustomSiteEditor({ visible: false, value: EMPTY_CUSTOM_SITE });
          saveCustomSites(nextSites);
        }}
      >
        <div className="form-stack">
          <Field label="网站名称">
            <Input value={customSiteEditor.value.name} onChange={(value) => setCustomSiteEditor((current) => ({ ...current, value: { ...current.value, name: value } }))} />
          </Field>
          <Field label="网站 URL">
            <Input value={customSiteEditor.value.url} onChange={(value) => setCustomSiteEditor((current) => ({ ...current, value: { ...current.value, url: value } }))} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
