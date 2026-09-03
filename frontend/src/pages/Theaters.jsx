import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Armchair, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { theaterApi } from '../services/theaterApi';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Modal, ConfirmDialog } from '../components/common/Modal';

const ROW_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);
const DEFAULT_SEATS = 10;

function rowLabel(index) {
  return String.fromCharCode(65 + index);
}

function emptyForm() {
  return { name: '', rowCount: 10, rowSeats: Array(10).fill(DEFAULT_SEATS) };
}

export default function Theaters() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewing, setViewing] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['theaters'],
    queryFn: () => theaterApi.list(),
  });

  const theaters = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (payload) => theaterApi.create(payload),
    onSuccess: () => {
      toast.success('Theater created');
      closeForm();
      qc.invalidateQueries({ queryKey: ['theaters'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => theaterApi.update(id, payload),
    onSuccess: () => {
      toast.success('Theater updated');
      closeForm();
      qc.invalidateQueries({ queryKey: ['theaters'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => theaterApi.remove(id),
    onSuccess: () => {
      toast.success('Theater deleted');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['theaters'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const totalSeats = useMemo(
    () => form.rowSeats.reduce((sum, n) => sum + Number(n || DEFAULT_SEATS), 0),
    [form.rowSeats]
  );

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setForm(emptyForm());
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(theater) {
    const rowCount = theater.rowCount || theater.rows?.length || 10;
    const rowSeats = Array.from({ length: rowCount }, (_, i) =>
      Number(theater.rows?.[i]?.seats || DEFAULT_SEATS)
    );
    setEditing(theater);
    setForm({ name: theater.name, rowCount, rowSeats });
    setFormOpen(true);
  }

  function setRowCount(value) {
    const count = Number(value);
    setForm((prev) => {
      const nextSeats = Array.from({ length: count }, (_, i) =>
        Number(prev.rowSeats[i] || DEFAULT_SEATS)
      );
      return { ...prev, rowCount: count, rowSeats: nextSeats };
    });
  }

  function setRowSeats(index, value) {
    setForm((prev) => {
      const rowSeats = [...prev.rowSeats];
      rowSeats[index] = Number(value);
      return { ...prev, rowSeats };
    });
  }

  function submitForm(e) {
    e?.preventDefault?.();
    const payload = {
      name: form.name.trim(),
      rowCount: Number(form.rowCount),
      rowSeats: form.rowSeats.map((n) => Number(n) || DEFAULT_SEATS),
    };
    if (editing) {
      updateMutation.mutate({ id: editing._id, payload });
      return;
    }
    createMutation.mutate(payload);
  }

  return (
    <div>
      <PageHeader
        title="Theaters / Screens"
        subtitle="Create a screen, pick rows (1–20), then seats per row (1–20). Default is 10 seats if you leave a row unchanged."
        actions={
          <Button className="flex-1 sm:flex-none" onClick={openCreate}>
            <Plus size={16} /> Add screen
          </Button>
        }
      />

      {isLoading && <Skeleton className="h-48" />}
      {error && <ErrorState message={error.message} onRetry={refetch} />}

      {!isLoading && !error && theaters.length === 0 && (
        <EmptyState
          title="No screens yet"
          description="Add a theater screen and its seat layout before creating shows."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> Add screen
            </Button>
          }
        />
      )}

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {theaters.map((theater) => (
          <article
            key={theater._id}
            className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
                <Armchair size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{theater.name}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {theater.rowCount} rows · {theater.totalSeats} seats
                </p>
                <p className="mt-2 break-words text-xs text-muted">
                  {(theater.rows || [])
                    .map((r) => `${r.row}:${r.seats}`)
                    .join(' · ')}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setViewing(theater)}>
                <Eye size={14} /> View
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(theater)}>
                <Pencil size={14} /> Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(theater)}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Edit screen' : 'Add screen'}
        onClose={closeForm}
        footerClassName="flex-col sm:flex-row"
        footer={
          <>
            <Button variant="outline" className="w-full sm:w-auto" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              loading={createMutation.isPending || updateMutation.isPending}
              onClick={submitForm}
            >
              {editing ? 'Save' : 'Create screen'}
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitForm}>
          <Input
            label="Screen name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            placeholder="e.g. Screen 1"
          />
          <Select
            label="Number of rows (1–20)"
            value={form.rowCount}
            onChange={(e) => setRowCount(e.target.value)}
            required
          >
            {ROW_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'row' : 'rows'}
              </option>
            ))}
          </Select>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">
              Seats in each row (1–20, default 10)
            </p>
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {form.rowSeats.map((seats, index) => (
                <Select
                  key={rowLabel(index)}
                  label={`Row ${rowLabel(index)}`}
                  value={seats}
                  onChange={(e) => setRowSeats(index, e.target.value)}
                >
                  {ROW_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} seats
                    </option>
                  ))}
                </Select>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-xs text-muted">
              Total seats: <strong>{totalSeats}</strong>. Unchanged rows stay at 10.
            </p>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title={viewing ? viewing.name : 'Screen'}
        onClose={() => setViewing(null)}
        footerClassName="flex-col"
        footer={
          <Button className="w-full min-h-12" size="lg" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && <TheaterSeatPreview theater={viewing} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete screen?"
        danger
        confirmLabel="Delete screen"
        loading={deleteMutation.isPending}
        message={
          deleteTarget
            ? `Remove ${deleteTarget.name}? Shows that already use this screen must be deleted first.`
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  );
}

function TheaterSeatPreview({ theater }) {
  const rows = theater.rows || [];
  const maxCols = rows.reduce((max, row) => Math.max(max, Number(row.seats) || 0), 1);

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted">
        {theater.rowCount} rows · {theater.totalSeats} seats
      </p>
      <div className="px-4 sm:px-8">
        <div className="cinema-screen py-2 text-center text-[9px] font-bold uppercase tracking-[0.3em] text-muted sm:text-[10px]">
          Screen this way
        </div>
      </div>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.row} className="flex w-full min-w-0 items-center gap-1">
            <span className="w-3.5 shrink-0 text-center text-[9px] font-bold text-muted sm:w-5 sm:text-xs">
              {row.row}
            </span>
            <div
              className="grid min-w-0 flex-1 gap-0.5"
              style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: maxCols }, (_, index) => {
                const column = index + 1;
                if (column > Number(row.seats)) {
                  return <span key={`${row.row}-empty-${column}`} className="aspect-square" />;
                }
                return (
                  <span
                    key={`${row.row}${column}`}
                    title={`${row.row}${column}`}
                    className="flex aspect-square items-center justify-center rounded-[4px] border border-line bg-surface text-[9px] font-bold text-ink sm:rounded-md sm:text-[11px]"
                  >
                    <span className="sm:hidden">{column}</span>
                    <span className="hidden sm:inline">
                      {row.row}
                      {column}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
