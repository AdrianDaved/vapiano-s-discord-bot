import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '@/lib/api';
import Loader from '@/components/Loader';

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/auth/exchange', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token);
          navigate('/guilds', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      })
      .catch(() => navigate('/login', { replace: true }));
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-discord-darker">
      <Loader text="Iniciando sesion..." />
    </div>
  );
}
