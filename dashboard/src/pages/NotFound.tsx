import { Link } from 'react-router-dom';
import Button from '../components/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-discord-blurple mb-4">404</h1>
      <h2 className="text-xl font-semibold text-discord-white mb-2">Page Not Found</h2>
      <p className="text-discord-muted mb-6 max-w-md">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/guilds">
        <Button variant="primary">Back to Guilds</Button>
      </Link>
    </div>
  );
}
