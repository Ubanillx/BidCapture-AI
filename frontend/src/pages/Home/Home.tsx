import { MonitorWorkspace } from '../../features/monitor/components/MonitorWorkspace';

interface HomeProps {
  username: string;
  onLogout: () => void;
}

export function Home({ username, onLogout }: HomeProps) {
  return <MonitorWorkspace username={username} onLogout={onLogout} />;
}
