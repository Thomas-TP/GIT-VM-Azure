import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { useToast } from '../toast';
import type { Snapshot, VmRequest } from '../types';
import { fmtDate } from '../lib/format';
import { Button, Modal, Spinner } from '../ui';

function SnapStatus({ s }: { s: Snapshot }) {
  const { t } = useTranslation();
  if (s.status === 'completed')
    return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ {t('snapshot.statusCompleted')}</span>;
  if (s.status === 'error')
    return <span className="text-xs font-medium text-red-600 dark:text-red-400">{t('snapshot.statusError')}</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
      <Spinner className="h-3.5 w-3.5" /> {t('snapshot.statusPending')}
    </span>
  );
}

/** Copy-to-clipboard code line. */
function Cmd({ children }: { children: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="group flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs">{children}</code>
      <button
        onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="shrink-0 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        {copied ? t('snapshot.copied') : t('snapshot.copy')}
      </button>
    </div>
  );
}

/** Recipe to rebuild an EBS snapshot as a local VMware/VirtualBox disk (coldsnap + qemu-img). */
function LocalExportModal({ snap, region, onClose }: { snap: Snapshot; region: string; onClose: () => void }) {
  const { t } = useTranslation();
  const sid = snap.aws_snapshot_id ?? 'snap-xxxxxxxx';
  return (
    <Modal open onClose={onClose} title={t('snapshot.localTitle')} footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="space-y-4 text-sm">
        <p className="text-muted-foreground">{t('snapshot.localIntro')}</p>

        <div className="space-y-1.5">
          <p className="font-medium">{t('snapshot.localStep1')}</p>
          <Cmd>cargo install coldsnap</Cmd>
          <p className="text-xs text-muted-foreground">{t('snapshot.localStep1Hint')}</p>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium">{t('snapshot.localStep2')}</p>
          <Cmd>{`AWS_REGION=${region} coldsnap download ${sid} disk.img`}</Cmd>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium">{t('snapshot.localStep3')}</p>
          <p className="text-xs text-muted-foreground">{t('snapshot.localStep3vbox')}</p>
          <Cmd>qemu-img convert -f raw -O vdi disk.img disk.vdi</Cmd>
          <p className="text-xs text-muted-foreground">{t('snapshot.localStep3vmware')}</p>
          <Cmd>qemu-img convert -f raw -O vmdk disk.img disk.vmdk</Cmd>
        </div>

        <div className="space-y-1.5">
          <p className="font-medium">{t('snapshot.localStep4')}</p>
        </div>

        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p>🔑 {t('snapshot.localIam')}</p>
          <p>🪟 {t('snapshot.localWin')}</p>
        </div>
      </div>
    </Modal>
  );
}

export function SnapshotPanel({ request }: { request: VmRequest }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [exportSnap, setExportSnap] = useState<Snapshot | null>(null);

  const presetsQ = useQuery({ queryKey: ['presets'], queryFn: api.presets });
  const region = presetsQ.data?.region ?? 'eu-central-2';

  const q = useQuery({
    queryKey: ['snapshots', request.id],
    queryFn: () => api.listSnapshots(request.id),
    refetchInterval: (qq) => ((qq.state.data ?? []).some((s) => s.status === 'pending') ? 10000 : false),
  });
  const createM = useMutation({
    mutationFn: () => api.createSnapshot(request.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['snapshots', request.id] }); toast.success(t('snapshot.created')); },
    onError: () => toast.error(t('toast.error')),
  });
  const toggleM = useMutation({
    mutationFn: (en: boolean) => api.setSnapshotOnDelete(request.id, en),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['request', request.id] }),
    onError: () => toast.error(t('toast.error')),
  });

  const snaps = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('snapshot.hint')}</p>
        <Button variant="secondary" disabled={createM.isPending} onClick={() => createM.mutate()}>
          {createM.isPending ? <Spinner className="h-4 w-4" /> : null}
          {t('snapshot.create')}
        </Button>
      </div>

      <label className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={!!request.snapshot_on_delete}
          onChange={(e) => toggleM.mutate(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        <span className="text-sm">{t('snapshot.autoLabel')}</span>
      </label>

      {snaps.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t('snapshot.empty')}</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {snaps.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">{s.aws_snapshot_id ?? `#${s.id}`}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(s.created_at)}{s.size_gb ? ` · ${s.size_gb} Go` : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                {s.status === 'completed' && s.aws_snapshot_id && (
                  <button onClick={() => setExportSnap(s)} className="text-xs font-medium text-foreground underline-offset-2 hover:underline">
                    {t('snapshot.localExport')}
                  </button>
                )}
                <SnapStatus s={s} />
              </div>
            </div>
          ))}
        </div>
      )}

      {exportSnap && <LocalExportModal snap={exportSnap} region={region} onClose={() => setExportSnap(null)} />}
    </div>
  );
}
