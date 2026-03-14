import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setToken } from '@/lib/api';
import Loader from '@/components/Loader';

export default function Callback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
      navigate('/guilds', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-discord-darker">
      <Loader text="Signing you in..." />
    </div>
  );
}
