import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { GuildProvider } from '@/hooks/useGuild';
import Layout from '@/components/Layout';
import Loader from '@/components/Loader';
import ErrorBoundary from '@/components/ErrorBoundary';

// Pages
import Login from '@/pages/Login';
import Callback from '@/pages/Callback';
import GuildSelect from '@/pages/GuildSelect';
import Dashboard from '@/pages/Dashboard';
import NotFound from '@/pages/NotFound';

// Module pages
import GeneralConfig from '@/pages/modules/GeneralConfig';
import Invites from '@/pages/modules/Invites';
import Moderation from '@/pages/modules/Moderation';
import AutoMod from '@/pages/modules/AutoMod';
import Tickets from '@/pages/modules/Tickets';
import Automation from '@/pages/modules/Automation';
import Backups from '@/pages/modules/Backups';
import Reputation from '@/pages/modules/Reputation';
import Giveaways from '@/pages/modules/Giveaways';
import Suggestions from '@/pages/modules/Suggestions';
import Welcome from '@/pages/modules/Welcome';
import Starboard from '@/pages/modules/Starboard';
import ReactionRoles from '@/pages/modules/ReactionRoles';
import StickyMessages from '@/pages/modules/StickyMessages';
import Logging from '@/pages/modules/Logging';
import Rifas from '@/pages/modules/Rifas';
import MessageSender from '@/pages/modules/MessageSender';
import Migration from '@/pages/modules/Migration'
import Commands from '@/pages/modules/Commands';
import DarRango from '@/pages/modules/DarRango';
import Levels from '@/pages/modules/Levels';
import ServerStats from '@/pages/modules/ServerStats';

/** Wrapper that redirects to /login when user is not authenticated */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-darker">
        <Loader />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/callback" element={<Callback />} />

      {/* Protected routes */}
      <Route
        path="/guilds"
        element={
          <RequireAuth>
            <GuildSelect />
          </RequireAuth>
        }
      />

      {/* Guild routes — wrapped in Layout + GuildProvider */}
      <Route
        path="/guild/:guildId"
        element={
          <RequireAuth>
            <GuildProvider>
              <Layout />
            </GuildProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="config" element={<GeneralConfig />} />
        <Route path="invites" element={<Invites />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="automod" element={<AutoMod />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="automation" element={<Automation />} />
        <Route path="backups" element={<Backups />} />
        <Route path="migration" element={<Migration />} />
              <Route path="commands" element={<Commands />} />
        <Route path="reputation" element={<Reputation />} />
        <Route path="giveaways" element={<Giveaways />} />
        <Route path="suggestions" element={<Suggestions />} />
        <Route path="welcome" element={<Welcome />} />
        <Route path="starboard" element={<Starboard />} />
        <Route path="reactionroles" element={<ReactionRoles />} />
        <Route path="sticky" element={<StickyMessages />} />
        <Route path="logging" element={<Logging />} />
        <Route path="messages" element={<MessageSender />} />
        <Route path="rifas" element={<Rifas />} />
        <Route path="dar-rango" element={<DarRango />} />
        <Route path="levels" element={<Levels />} />
        <Route path="server-stats" element={<ServerStats />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/guilds" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppRoutes />
      </ErrorBoundary>
    </AuthProvider>
  );
}
