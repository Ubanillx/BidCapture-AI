import { Empty, List, Typography } from '@douyinfe/semi-ui';

const { Text } = Typography;

interface LogConsoleProps {
  logs: string[];
  compact?: boolean;
}

export function LogConsole({ logs, compact = false }: LogConsoleProps) {
  if (!logs.length) {
    return (
      <div className="empty-state">
        <Empty title="暂无日志" description="服务启动或执行检索后会出现运行记录" />
      </div>
    );
  }

  const items = compact ? logs.slice(-10) : logs;

  return (
    <div className={compact ? 'log-console log-console--compact' : 'log-console'}>
      <List
        dataSource={items}
        renderItem={(line) => (
          <List.Item>
            <Text className="log-line">{line}</Text>
          </List.Item>
        )}
      />
    </div>
  );
}
