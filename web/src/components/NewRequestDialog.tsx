import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { useToast } from '../toast';
import type { PresetCatalog } from '../types';
import { Button, Field, Input, Modal, Select, Spinner, Textarea } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function NewRequestDialog({
  open,
  onClose,
  catalog,
}: {
  open: boolean;
  onClose: () => void;
  catalog: PresetCatalog;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [perf, setPerf] = useState(catalog.perf[0]?.id ?? '');
  const [storage, setStorage] = useState(catalog.storage[1]?.id ?? catalog.storage[0]?.id ?? '');
  const [os, setOs] = useState(catalog.os[0]?.id ?? '');
  const [purpose, setPurpose] = useState('');
  const [start, setStart] = useState(() => toLocalInput(new Date()));
  const [end, setEnd] = useState(() => toLocalInput(new Date(Date.now() + 7 * 86400000)));

  const endDate = end ? new Date(end) : null;
  const startDate = start ? new Date(start) : null;
  const datesValid =
    !!endDate && !isNaN(endDate.getTime()) && endDate.getTime() > Date.now() &&
    (!startDate || (!isNaN(startDate.getTime()) && startDate.getTime() < endDate.getTime()));

  const monthly = useMemo(() => {
    const p = catalog.perf.find((x) => x.id === perf);
    const s = catalog.storage.find((x) => x.id === storage);
    if (!p || !s) return 0;
    return p.hourlyUsd * 730 + s.sizeGb * catalog.storageUsdGbMonth;
  }, [perf, storage, catalog]);
  const hourly = catalog.perf.find((x) => x.id === perf)?.hourlyUsd ?? 0;

  const m = useMutation({
    mutationFn: () =>
      api.createRequest(
        perf,
        storage,
        os,
        purpose.trim(),
        start ? new Date(start).toISOString() : null,
        new Date(end).toISOString()
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      setPurpose('');
      onClose();
      toast.success(t('toast.requestCreated'));
    },
    onError: (e) => {
      toast.error(e instanceof ApiError && e.message === 'rate_limited' ? t('toast.rateLimited') : t('toast.error'));
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('form.title')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={m.isPending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => m.mutate()} disabled={!perf || !storage || !os || !purpose.trim() || !datesValid || m.isPending}>
            {m.isPending ? <Spinner className="h-4 w-4" /> : null}
            {m.isPending ? t('form.submitting') : t('form.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label={t('form.perf')}>
          <Select value={perf} onChange={(e) => setPerf(e.target.value)}>
            {catalog.perf.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — ${p.hourlyUsd.toFixed(3)}/h
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('form.storage')}>
            <Select value={storage} onChange={(e) => setStorage(e.target.value)}>
              {catalog.storage.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('form.os')}>
            <Select value={os} onChange={(e) => setOs(e.target.value)}>
              {catalog.os.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t('form.purpose')}>
          <Textarea
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={t('form.purposePlaceholder')}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('form.start')}>
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t('form.end')}>
            <Input type="datetime-local" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {!datesValid && <p className="-mt-1 text-xs text-amber-500">{t('form.endRequired')}</p>}

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
          <span className="text-xs text-muted-foreground">{t('form.estCost')}</span>
          <span className="text-sm font-semibold tabular-nums">
            ≈ ${monthly.toFixed(2)}
            <span className="font-normal text-muted-foreground"> /{t('form.month')} · ${hourly.toFixed(3)}/h</span>
          </span>
        </div>

        {m.isError && <p className="text-sm text-red-500">{t('common.error')}</p>}
      </div>
    </Modal>
  );
}
