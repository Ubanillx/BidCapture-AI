import { Input, Select, Space, Switch } from '@douyinfe/semi-ui';
import { Field } from '../../../components/common/Field';
import type { Contact } from '../../../api/types/monitor';

interface ContactEditorProps {
  value: Contact;
  onChange: (value: Contact) => void;
}

export function ContactEditor({ value, onChange }: ContactEditorProps) {
  const update = (key: keyof Contact, nextValue: string | boolean) => {
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <Space vertical align="start">
      <Field label="姓名">
        <Input value={value.name || ''} onChange={(nextValue) => update('name', nextValue)} />
      </Field>
      <Field label="启用">
        <Switch checked={value.enabled !== false} onChange={(checked) => update('enabled', checked)} />
      </Field>
      <Field label="手机号">
        <Input value={value.phone || ''} onChange={(nextValue) => update('phone', nextValue)} />
      </Field>
      <Field label="邮箱地址">
        <Input value={value.email || ''} onChange={(nextValue) => update('email', nextValue)} />
      </Field>
      <Field label="邮箱类型">
        <Select value={value.email_type || 'QQ邮箱'} onChange={(nextValue) => update('email_type', String(nextValue || 'QQ邮箱'))}>
          <Select.Option value="QQ邮箱">QQ邮箱</Select.Option>
          <Select.Option value="163邮箱">163邮箱</Select.Option>
          <Select.Option value="Gmail">Gmail</Select.Option>
          <Select.Option value="Outlook">Outlook</Select.Option>
          <Select.Option value="企业邮箱">企业邮箱</Select.Option>
        </Select>
      </Field>
      <Field label="邮箱授权码">
        <Input mode="password" value={value.email_password || ''} onChange={(nextValue) => update('email_password', nextValue)} />
      </Field>
      <Field label="PushPlus Token">
        <Input value={value.wechat_token || ''} onChange={(nextValue) => update('wechat_token', nextValue)} />
      </Field>
    </Space>
  );
}
