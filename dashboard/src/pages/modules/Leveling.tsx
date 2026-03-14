import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { leveling as levelingApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Modal from '@/components/Modal';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Trophy, Users, Gift, Trash2 } from 'lucide-react';

interface LevelUser {
  userId: string;
  username: string;
  xp: number;
  level: number;
}

interface Reward {
  id: string;
  level: number;
  roleId: string;
  roleName?: string;
}

export default function Leveling() {
  const { guildId, loading: configLoading } = useGuild();
  const [leaderboard, setLeaderboard] = useState<LevelUser[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newRewardLevel, setNewRewardLevel] = useState('');
  const [newRewardRole, setNewRewardRole] = useState('');
  const [addingReward, setAddingReward] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      levelingApi.leaderboard(guildId).catch(() => []),
      levelingApi.rewards(guildId).catch(() => []),
    ])
      .then(([lb, rw]) => {
        setLeaderboard(lb.leaderboard || lb);
        setRewards(rw.rewards || rw);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const addReward = async () => {
    if (!guildId || !newRewardLevel || !newRewardRole) return;
    setAddingReward(true);
    try {
      const result = await levelingApi.addReward(guildId, {
        level: parseInt(newRewardLevel),
        roleId: newRewardRole,
      });
      setRewards((prev) => [...prev, result.reward || result]);
      setShowAddReward(false);
      setNewRewardLevel('');
      setNewRewardRole('');
      toast.success('Reward added');
    } catch {
      toast.error('Failed to add reward');
    } finally {
      setAddingReward(false);
    }
  };

  const removeReward = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await levelingApi.removeReward(guildId, id);
      setRewards((prev) => prev.filter((r) => r.id !== id));
      toast.success('Reward removed');
    } catch {
      toast.error('Failed to remove reward');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (configLoading || loading) return <Loader text="Loading leveling..." />;

  const totalXp = leaderboard.reduce((s, u) => s + u.xp, 0);
  const highestLevel = leaderboard.length > 0 ? Math.max(...leaderboard.map((u) => u.level)) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Leveling System</h1>
        <p className="text-discord-muted mt-1">XP leaderboard and role rewards</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Members" value={leaderboard.length} icon={Users} color="text-discord-blurple" />
        <StatCard label="Highest Level" value={highestLevel} icon={Trophy} color="text-discord-yellow" />
        <StatCard label="Role Rewards" value={rewards.length} icon={Gift} color="text-discord-green" />
      </div>

      {/* Rewards */}
      <Card
        title="Level Rewards"
        description="Roles granted when members reach a level"
        className="mb-6"
        action={
          <Button size="sm" onClick={() => setShowAddReward(true)}>
            Add Reward
          </Button>
        }
      >
        <Table
          columns={[
            { key: 'level', label: 'Level', render: (r: Reward) => <span className="font-bold text-discord-yellow">Lv. {r.level}</span> },
            { key: 'roleId', label: 'Role ID', render: (r: Reward) => <code className="text-sm text-discord-muted">{r.roleId}</code> },
            {
              key: 'actions',
              label: '',
              render: (r: Reward) => (
                <button onClick={() => setDeleteTarget(r.id)} className="p-1 hover:text-discord-red text-discord-muted transition-colors">
                  <Trash2 size={16} />
                </button>
              ),
            },
          ]}
          data={rewards.sort((a, b) => a.level - b.level)}
          emptyMessage="No level rewards configured. Add one to get started."
        />
      </Card>

      {/* Leaderboard */}
      <Card title="XP Leaderboard">
        <Table
          columns={[
            {
              key: 'rank',
              label: '#',
              render: (_: LevelUser) => {
                const idx = leaderboard.indexOf(_);
                return <span className={idx < 3 ? 'font-bold text-discord-yellow' : ''}>{idx + 1}</span>;
              },
            },
            { key: 'username', label: 'User' },
            { key: 'level', label: 'Level', render: (u: LevelUser) => <span className="font-bold">Lv. {u.level}</span> },
            { key: 'xp', label: 'XP', render: (u: LevelUser) => <span className="text-discord-muted">{u.xp.toLocaleString()}</span> },
          ]}
          data={leaderboard}
          emptyMessage="No leveling data yet. Members earn XP by chatting."
        />
      </Card>

      {/* Add Reward Modal */}
      <Modal open={showAddReward} onClose={() => setShowAddReward(false)} title="Add Level Reward">
        <div className="space-y-4">
          <Input
            label="Level"
            type="number"
            placeholder="e.g. 10"
            value={newRewardLevel}
            onChange={(e) => setNewRewardLevel(e.target.value)}
          />
          <Input
            label="Role ID"
            placeholder="Enter the role ID to grant"
            value={newRewardRole}
            onChange={(e) => setNewRewardRole(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowAddReward(false)}>
              Cancel
            </Button>
            <Button onClick={addReward} loading={addingReward}>
              Add Reward
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && removeReward(deleteTarget)}
        title="Remove Reward"
        message="Are you sure you want to remove this level reward? Members who already have the role will keep it."
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  );
}
