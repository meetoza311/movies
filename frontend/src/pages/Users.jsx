import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users as UsersIcon, KeyRound, Pencil, Trash2, Plus } from 'lucide-react';
import { userApi } from '../services/userApi';
import { useAuth } from '../context/AuthContext';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Modal, ConfirmDialog } from '../components/common/Modal';
import { formatDate } from '../utils/format';

const emptyForm = { name: '', email: '', password: '' };

export default function Users() {
  const { admin } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [myPasswordOpen, setMyPasswordOpen] = useState(false);
  const [myPasswords, setMyPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => userApi.create(payload),
    onSuccess: () => {
      toast.success('User created');
      closeForm();
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => userApi.update(id, payload),
    onSuccess: () => {
      toast.success('User updated');
      closeForm();
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, password }) => userApi.resetPassword(id, password),
    onSuccess: () => {
      toast.success('Password updated');
      setPasswordTarget(null);
      setNewPassword('');
    },
    onError: (err) => toast.error(err.message),
  });

  const changeMineMutation = useMutation({
    mutationFn: () =>
      userApi.changeMyPassword(myPasswords.currentPassword, myPasswords.newPassword),
    onSuccess: () => {
      toast.success('Your password was changed');
      setMyPasswordOpen(false);
      setMyPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => userApi.remove(id),
    onSuccess: () => {
      toast.success('User deleted');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast.error(err.message),
  });

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(user) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: '' });
    setFormOpen(true);
  }

  function submitForm(e) {
    e?.preventDefault?.();
    if (editing) {
      updateMutation.mutate({
        id: editing._id,
        payload: { name: form.name, email: form.email },
      });
      return;
    }
    createMutation.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
    });
  }

  function submitReset(e) {
    e?.preventDefault?.();
    resetMutation.mutate({ id: passwordTarget._id, password: newPassword });
  }

  function submitMyPassword(e) {
    e?.preventDefault?.();
    if (myPasswords.newPassword !== myPasswords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    changeMineMutation.mutate();
  }

  const users = data?.data || [];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Add admins who can access the full cinema desk"
        actions={
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setMyPasswordOpen(true)}>
              <KeyRound size={16} /> My password
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={openCreate}>
              <Plus size={16} /> Add user
            </Button>
          </>
        }
      />

      {isLoading && <Skeleton className="h-48" />}
      {error && <ErrorState message={error.message} onRetry={refetch} />}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          title="No users yet"
          description="Create an admin user to share access."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> Add user
            </Button>
          }
        />
      )}

      <div className="hidden overflow-x-auto overflow-y-hidden rounded-2xl border border-line bg-surface shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isMe = String(user._id) === String(admin?.id || admin?._id);
              return (
                <tr key={user._id} className="border-t border-line">
                  <td className="px-4 py-3 font-semibold">
                    {user.name}
                    {isMe ? <span className="ml-2 text-xs text-teal">(you)</span> : null}
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                        <Pencil size={14} /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPasswordTarget(user);
                          setNewPassword('');
                        }}
                      >
                        <KeyRound size={14} /> Password
                      </Button>
                      {!isMe && (
                        <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(user)}>
                          <Trash2 size={14} /> Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {users.map((user) => {
          const isMe = String(user._id) === String(admin?.id || admin?._id);
          return (
            <article
              key={user._id}
              className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal">
                  <UsersIcon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink">
                    {user.name} {isMe ? <span className="text-xs text-teal">(you)</span> : null}
                  </p>
                  <p className="truncate text-sm text-muted">{user.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    {user.role} · {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPasswordTarget(user);
                    setNewPassword('');
                  }}
                >
                  Password
                </Button>
                {!isMe && (
                  <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(user)}>
                    Delete
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Edit user' : 'Add user'}
        onClose={closeForm}
        footer={
          <>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={submitForm}
            >
              {editing ? 'Save' : 'Create user'}
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={submitForm}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            required
          />
          {!editing && (
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
              placeholder="Min 6 characters"
            />
          )}
          <p className="text-xs text-muted">
            This user can log in and use the full admin UI (movies, shows, bookings).
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(passwordTarget)}
        title={`Set password — ${passwordTarget?.name || ''}`}
        onClose={() => setPasswordTarget(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setPasswordTarget(null)}>
              Cancel
            </Button>
            <Button loading={resetMutation.isPending} onClick={submitReset}>
              Update password
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={submitReset}>
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Min 6 characters"
          />
        </form>
      </Modal>

      <Modal
        open={myPasswordOpen}
        title="Change my password"
        onClose={() => setMyPasswordOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setMyPasswordOpen(false)}>
              Cancel
            </Button>
            <Button loading={changeMineMutation.isPending} onClick={submitMyPassword}>
              Save password
            </Button>
          </>
        }
      >
        <form className="space-y-3" onSubmit={submitMyPassword}>
          <Input
            label="Current password"
            type="password"
            value={myPasswords.currentPassword}
            onChange={(e) =>
              setMyPasswords((p) => ({ ...p, currentPassword: e.target.value }))
            }
            required
          />
          <Input
            label="New password"
            type="password"
            value={myPasswords.newPassword}
            onChange={(e) => setMyPasswords((p) => ({ ...p, newPassword: e.target.value }))}
            required
            minLength={6}
          />
          <Input
            label="Confirm new password"
            type="password"
            value={myPasswords.confirmPassword}
            onChange={(e) =>
              setMyPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
            }
            required
            minLength={6}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user?"
        danger
        confirmLabel="Delete user"
        loading={deleteMutation.isPending}
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name} (${deleteTarget.email})? They will no longer be able to log in.`
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  );
}
