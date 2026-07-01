import type { ReactNode } from 'react';
import { Avatar, Button, Layout, Nav, Tag } from '@douyinfe/semi-ui';
import {
  IconExit,
  IconPlay,
  IconRefresh,
  IconStop,
} from '@douyinfe/semi-icons';

const { Header, Sider, Content } = Layout;

export interface AppShellNavItem<T extends string> {
  key: T;
  label: string;
  icon: ReactNode;
}

interface AppShellProps<T extends string> {
  activePage: T;
  navItems: Array<AppShellNavItem<T>>;
  isRunning: boolean;
  isBusy: boolean;
  username: string;
  children: ReactNode;
  onPageChange: (page: T) => void;
  onRefresh: () => void;
  onLogout: () => void;
}

export function AppShell<T extends string>({
  activePage,
  navItems,
  isRunning,
  isBusy,
  username,
  children,
  onPageChange,
  onRefresh,
  onLogout,
}: AppShellProps<T>) {
  return (
    <Layout className="app-shell">
      <Sider className="app-sider">
        <Nav className="app-nav" selectedKeys={[activePage]} onSelect={({ itemKey }) => onPageChange(itemKey as T)}>
          <Nav.Header>
            <div className="brand-lockup">
              <div className="brand-mark">BC</div>
              <div>
                <p className="brand-title">BidCapture AI</p>
                <span className="brand-caption">招标监控管理端</span>
              </div>
            </div>
          </Nav.Header>
          {navItems.map((item) => (
            <Nav.Item
              key={item.key}
              itemKey={item.key}
              icon={item.icon}
              text={item.label}
            />
          ))}
        </Nav>
      </Sider>
      <Layout className="app-main">
        <Header className="app-topbar">
          <div className="topbar-inner">
            <div className="topbar-actions">
              <Tag color={isRunning ? 'green' : 'grey'} prefixIcon={isRunning ? <IconPlay /> : <IconStop />}>
                {isRunning ? '运行中' : '已停止'}
              </Tag>
              <Button icon={<IconRefresh />} onClick={onRefresh}>
                刷新
              </Button>
              <div className="topbar-user">
                <Avatar size="small" color="blue">
                  {username.slice(0, 1).toUpperCase()}
                </Avatar>
                <span>{username}</span>
              </div>
              <Button icon={<IconExit />} onClick={onLogout}>
                退出
              </Button>
            </div>
          </div>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
