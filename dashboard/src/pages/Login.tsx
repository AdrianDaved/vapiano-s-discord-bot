import { Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-discord-darker">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Logo */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-discord-blurple flex items-center justify-center mb-6">
          <Bot size={40} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-discord-white mb-2">Vapiano Bot</h1>
        <p className="text-discord-muted mb-8">
          Sign in with your Discord account to manage your servers
        </p>

        <Button onClick={login} size="lg" className="w-full">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
          </svg>
          Sign in with Discord
        </Button>

        <p className="text-xs text-discord-muted mt-6">
          We only request access to your basic profile and guild list.
        </p>
      </div>
    </div>
  );
}
