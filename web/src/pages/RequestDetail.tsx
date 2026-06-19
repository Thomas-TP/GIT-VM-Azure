import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { fmtDate, fmtUptime } from '../lib/format';
import { Button, Card, IconBack, IconPlay, IconReboot, IconStop, IconTrash, Modal, Spinner } from '../ui';
import { StatusBadge } from '../components/StatusBadge';
import { OsIcon } from '../components/OsIcon';
import { ConnectionGuide } from '../components/ConnectionGuide';
import { SchedulePanel } from '../components/SchedulePanel';
import { Comments } from '../components/Comments';
import { useToast } from '../toast';

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{children}</span>
    </div>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

export function RequestDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const rid = Number(id);
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmTerm, setConfirmTerm] = useState(false);

  const q = useQuery({
    queryKey: ['request', rid],
    queryFn: () => api.getRequest(rid),
    refetchInterval: (query) => (query.state.data?.status === 'provisioning' ? 5000 : false),
  });
  const presetsQ = useQuery({ queryKey: ['presets'], queryFn: api.presets });
  const liveQ = useQuery({
    queryKey: ['live', rid],
    queryFn: () => api.live(rid),
    enabled: q.data?.status === 'active',
    refetchInterval: 10000,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['request', rid] });
    qc.invalidateQueries({ queryKey: ['live', rid] });
    qc.invalidateQueries({ queryKey: ['requests'] });
  };
  const onErr = () => toast.error(t('toast.error'));
  const termM = useMutation({
    mutationFn: () => api.terminate(rid),
    onSuccess: () => { refresh(); setConfirmTerm(false); toast.success(t('toast.terminated')); },
    onError: onErr,
  });
  const startM = useMutation({ mutationFn: () => api.start(rid), onSuccess: () => { refresh(); toast.success(t('toast.started')); }, onError: onErr });
  const stopM = useMutation({ mutationFn: () => api.stop(rid), onSuccess: () => { refresh(); toast.success(t('toast.stopped')); }, onError: onErr });
  const rebootM = useMutation({ mutationFn: () => api.reboot(rid), onSuccess: () => { refresh(); toast.success(t('toast.rebooted')); }, onError: onErr });
  const busy = startM.isPending || stopM.isPending || rebootM.isPending;

  if (q.isLoading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> {t('common.loading')}
      </div>
    );
  if (q.isError || !q.data)
    return (
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <IconBack className="h-4 w-4" /> {t('common.back')}
        </Link>
        <p className="text-sm text-red-500">{t('common.error')}</p>
      </div>
    );

  const r = q.data;
  // "expired" is derived from expired_at (the DB status stays 'active'). See ADR 0004.
  const effStatus = r.expired_at ? 'expired' : r.status;
  const cat = presetsQ.data;
  const perfDef = cat?.perf.find((p) => p.id === r.preset);
  const storageDef = cat?.storage.find((s) => s.id === r.storage);
  const osDef = cat?.os.find((o) => o.id === r.os);
  const connect = (r.connect_method as 'ssh' | 'rdp') ?? osDef?.connect ?? 'ssh';
  const sshUser = r.ssh_user ?? osDef?.sshUser ?? 'ubuntu';
  const keyName = r.ssh_key_name ?? `vm-portal-req-${r.id}`;
  const vmState = liveQ.data?.state ?? r.vm_state ?? 'none';
  const ip = liveQ.data?.publicIp ?? r.public_ip ?? null;
  const canTerm = r.status === 'active' || r.status === 'provisioning' || r.status === 'failed';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
        <IconBack className="h-4 w-4" /> {t('common.back')}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {osDef && <OsIcon family={osDef.family} className="h-10 w-10" />}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight">{t('detail.title', { id: r.id })}</h1>
              <StatusBadge status={effStatus} />
            </div>
            <p className="text-sm text-muted-foreground">{osDef?.label ?? r.os}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {r.status === 'active' && vmState === 'stopped' && !r.expired_at && (
            <Button variant="secondary" disabled={busy} onClick={() => startM.mutate()}>
              <IconPlay className="h-4 w-4 text-emerald-600" /> {t('actions.start')}
            </Button>
          )}
          {r.status === 'active' && vmState === 'running' && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => stopM.mutate()}>
                <IconStop className="h-4 w-4 text-amber-600" /> {t('actions.stop')}
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => rebootM.mutate()}>
                <IconReboot className="h-4 w-4" /> {t('actions.reboot')}
              </Button>
            </>
          )}
          {canTerm && (
            <Button variant="danger" onClick={() => setConfirmTerm(true)}>
              <IconTrash className="h-4 w-4" /> {t('actions.terminate')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Specs */}
        <Card className="p-5">
          <Eyebrow>{t('detail.specs')}</Eyebrow>
          <div className="divide-y divide-border">
            <Row label={t('form.os')}>
              <span className="inline-flex items-center gap-1.5">
                {osDef && <OsIcon family={osDef.family} className="h-4 w-4" />}
                {osDef?.label ?? r.os ?? '—'}
              </span>
            </Row>
            <Row label={t('detail.instanceType')} mono>{perfDef?.instanceType ?? r.preset}</Row>
            <Row label={t('detail.cpu')}>{perfDef ? `${perfDef.vcpu} vCPU` : '—'}</Row>
            <Row label={t('detail.memory')}>{perfDef ? `${perfDef.ramGb} Go` : '—'}</Row>
            <Row label={t('detail.disk')}>{storageDef?.label ?? r.storage ?? '—'}</Row>
            <Row label={t('detail.connectMethod')}>{connect === 'rdp' ? 'RDP' : 'SSH'}</Row>
            <Row label={t('common.region')} mono>{r.region}</Row>
          </div>
        </Card>

        {/* Request / lifecycle */}
        <Card className="p-5">
          <Eyebrow>{t('detail.overview')}</Eyebrow>
          <div className="divide-y divide-border">
            <Row label={t('table.purpose')}>{r.purpose}</Row>
            <Row label={t('detail.requestedBy')}>{r.user_email}</Row>
            <Row label={t('detail.createdAt')}>{fmtDate(r.created_at)}</Row>
            {r.start_date && <Row label={t('detail.startDate')}>{fmtDate(r.start_date)}</Row>}
            <Row label={t('detail.endDate')}>{fmtDate(r.end_date)}</Row>
            {r.decided_by && <Row label={t('detail.decidedBy')}>{r.decided_by}</Row>}
            {r.admin_note && <Row label={t('detail.adminNote')}>{r.admin_note}</Row>}
            {r.status === 'active' && (
              <Row label={t('detail.state')}>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      vmState === 'running' ? 'bg-emerald-500' : vmState === 'stopped' ? 'bg-zinc-400' : 'bg-amber-500'
                    }`}
                  />
                  {t(`vmState.${vmState}`, vmState)}
                </span>
              </Row>
            )}
            {vmState === 'running' && liveQ.data?.launchTime && (
              <Row label={t('detail.uptime')}>{fmtUptime(liveQ.data.launchTime)}</Row>
            )}
            {ip && <Row label={t('detail.ip')} mono>{ip}</Row>}
            {r.aws_instance_id && <Row label={t('detail.instance')} mono>{r.aws_instance_id}</Row>}
          </div>
        </Card>
      </div>

      {/* Connection */}
      <Card className="p-5">
        <Eyebrow>{t('guide.title')}</Eyebrow>
        {r.status === 'active' && ip && vmState !== 'stopped' ? (
          <ConnectionGuide id={r.id} ip={ip} user={sshUser} keyName={keyName} connect={connect} />
        ) : r.status === 'active' && vmState === 'stopped' ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.notReady')}</p>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.notReady')}</p>
        )}
      </Card>

      {r.status === 'active' && !r.expired_at && (
        <Card className="p-5">
          <Eyebrow>{t('schedule.title')}</Eyebrow>
          <SchedulePanel request={r} />
        </Card>
      )}

      <Comments requestId={rid} />

      <Modal
        open={confirmTerm}
        onClose={() => setConfirmTerm(false)}
        title={t('confirm.terminateTitle')}
        description={t('confirm.terminateBody')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmTerm(false)} disabled={termM.isPending}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => termM.mutate()} disabled={termM.isPending}>
              {termM.isPending ? <Spinner className="h-4 w-4" /> : null}
              {t('actions.terminate')}
            </Button>
          </>
        }
      />
    </div>
  );
}
