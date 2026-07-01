import { type FormEvent, useState } from 'react';
import { Button, Input, Toast } from '@douyinfe/semi-ui';
import { IconLock, IconUser } from '@douyinfe/semi-icons';
import { login } from '../../api/endpoints/auth';
import { saveStoredToken } from '../../api/client';
import { Field } from '../../components/common/Field';

interface LoginProps {
  onAuthenticated: () => void;
}

export function Login({ onAuthenticated }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ username, password });
      saveStoredToken(data.access_token, data.expires_in, data.username);
      Toast.success({ content: '登录成功' });
      onAuthenticated();
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      setError(message);
      Toast.error({ content: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-form__header">
            <h1>登录</h1>
          </div>

          <Field label="账号">
            <Input
              prefix={<IconUser />}
              autoComplete="username"
              value={username}
              onChange={setUsername}
            />
          </Field>

          <Field label="密码">
            <Input
              prefix={<IconLock />}
              mode="password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            />
          </Field>

          {error ? <div className="login-error">{error}</div> : null}

          <Button htmlType="submit" type="primary" loading={loading}>
            登录
          </Button>
        </form>
      </section>
    </main>
  );
}
