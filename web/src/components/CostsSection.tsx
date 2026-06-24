import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import type { CostData, PresetCatalog } from '../types';
import { Card, Spinner } from '../ui';

const usd = (n: number | null | undefined) => `$${(n ?? 0).toFixed(2)}`;
const COLORS = ['#0FA3A3', '#12355B', '#2EC4B6', '#FF6B5C', '#6C8EBF', '#E0A458', '#8E7DBE', '#7BA05B'];

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1.5 text-3xl font-semibold tracking-tight tabular-nums ${tone ?? ''}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

/** Horizontal labelled bars. */
function Bars({ items, color }: { items: { label: string; value: number }[]; color?: (i: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 0.0001);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 shrink-0 truncate text-muted-foreground" title={it.label}>{it.label}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: color ? color(i) : COLORS[0] }} />
          </div>
          <span className="w-16 shrink-0 text-right font-medium tabular-nums">{usd(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function CostsSection({ catalog }: { catalog?: PresetCatalog }) {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ['admin-costs'], queryFn: api.adminCosts, refetchInterval: 60000 });
  const osLabel = (os: string | null) => (os ? catalog?.os.find((o) => o.id === os)?.label ?? os : '—');

  if (q.isLoading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner /> {t('common.loading')}</div>;
  const d: CostData | undefined = q.data;
  if (!d) return <p className="text-sm text-muted-foreground">{t('toast.error')}</p>;

  const budgetPct = d.real ? Math.min(100, (d.real.total / d.budget) * 100) : 0;
  const overBudget = d.forecast != null && d.forecast > d.budget;
  const dailyMax = Math.max(...(d.real?.daily ?? []).map((x) => x.amount), 0.0001);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('costs.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('costs.subtitle')}</p>
      </div>

      {!d.real && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {t('costs.ceDisabled')}
        </div>
      )}

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('costs.realMonth')} value={d.real ? usd(d.real.total) : '—'} sub={t('costs.realSub')} />
        <StatCard label={t('costs.forecast')} value={d.forecast != null ? usd(d.forecast) : '—'} sub={t('costs.ofBudget', { budget: usd(d.budget) })} tone={overBudget ? 'text-red-600 dark:text-red-400' : ''} />
        <StatCard label={t('costs.estTotal')} value={usd(d.estimated.total)} sub={t('costs.estSub', { hours: Math.round(d.estimated.vmHours) })} />
        <StatCard label={t('costs.vmCount')} value={String(d.estimated.count)} sub={t('costs.activeTerminated', { active: d.estimated.active, terminated: d.estimated.terminated })} />
      </div>

      {/* budget bar */}
      {d.real && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('costs.budgetUsed')}</span>
            <span className="tabular-nums text-muted-foreground">{usd(d.real.total)} / {usd(d.budget)}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, background: budgetPct > 80 ? '#FF6B5C' : '#0FA3A3' }} />
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* daily trend */}
        <Card className="p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('costs.dailyTrend')}</h3>
          {d.real && d.real.daily.length ? (
            <div className="flex h-32 items-end gap-1">
              {d.real.daily.map((x) => (
                <div key={x.date} className="group flex-1" title={`${x.date} · ${usd(x.amount)}`}>
                  <div className="w-full rounded-t bg-teal-500/80 transition group-hover:bg-teal-500" style={{ height: `${Math.max(2, (x.amount / dailyMax) * 120)}px` }} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('costs.noReal')}</p>
          )}
        </Card>

        {/* by service */}
        <Card className="p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('costs.byService')}</h3>
          {d.real && d.real.byService.length ? (
            <Bars items={d.real.byService.slice(0, 6).map((s) => ({ label: s.service, value: s.amount }))} color={(i) => COLORS[i % COLORS.length]} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('costs.noReal')}</p>
          )}
        </Card>
      </div>

      {/* top VMs by cost */}
      <Card className="p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('costs.topVms')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-medium">{t('costs.colVm')}</th>
                <th className="py-2 pr-3 font-medium">{t('admin.colOwner')}</th>
                <th className="hidden py-2 pr-3 font-medium sm:table-cell">{t('admin.colOs')}</th>
                <th className="py-2 pr-3 text-right font-medium">{t('costs.colDuration')}</th>
                <th className="py-2 text-right font-medium">{t('costs.colCost')}</th>
              </tr>
            </thead>
            <tbody>
              {d.estimated.perVm.map((v) => (
                <tr key={v.id} className="border-b border-border/70 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${v.active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span className="font-medium">{v.name || `#${String(v.id).padStart(3, '0')}`}</span>
                    </span>
                  </td>
                  <td className="max-w-[12rem] truncate py-2 pr-3 text-muted-foreground" title={v.owner}>{v.owner}</td>
                  <td className="hidden py-2 pr-3 text-muted-foreground sm:table-cell">{osLabel(v.os)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">{v.hours < 24 ? `${v.hours.toFixed(1)} h` : `${(v.hours / 24).toFixed(1)} j`}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{usd(v.cost)}</td>
                </tr>
              ))}
              {d.estimated.perVm.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">{t('costs.noVms')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('costs.byOs')}</h3>
          <Bars items={d.estimated.byOs.slice(0, 7).map((o) => ({ label: osLabel(o.os), value: o.cost }))} color={(i) => COLORS[i % COLORS.length]} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t('costs.byUser')}</h3>
          <Bars items={d.estimated.byUser.map((u) => ({ label: u.user, value: u.cost }))} color={(i) => COLORS[i % COLORS.length]} />
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">{t('costs.note')}</p>
    </div>
  );
}
