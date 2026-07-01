import { useEffect, useState } from 'react';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import {
  AUTH_CHANGED_EVENT,
  clearStoredToken,
  getStoredUser,
  hasValidStoredToken,
} from './api/client';

function App() {
  const [authenticated, setAuthenticated] = useState(() => hasValidStoredToken());
  const [username, setUsername] = useState(() => getStoredUser() || '');

  useEffect(() => {
    const syncAuth = () => {
      setAuthenticated(hasValidStoredToken());
      setUsername(getStoredUser() || '');
    };

    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
  }, []);

  if (!authenticated) {
    return <Login onAuthenticated={() => {
      setAuthenticated(true);
      setUsername(getStoredUser() || '');
    }} />;
  }

  return (
    <Home
      username={username || 'admin'}
      onLogout={() => {
        clearStoredToken();
        setAuthenticated(false);
        setUsername('');
      }}
    />
  );
}

export default App;
