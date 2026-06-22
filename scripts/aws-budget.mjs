// One-off: AWS Budget "gitvm-monthly-50" (50 USD/mois) avec alertes email.
// Notifs : 50% (25$), 80% (40$) reels + 100% (50$) previsionnel -> email.
import { AwsClient } from 'aws4fetch';

const ACCOUNT = process.env.AWS_ACCOUNT_ID || '437659978697';
const EMAIL = process.env.BUDGET_EMAIL || 't@prudhomme.li';
const c = new AwsClient({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
  service: 'budgets',
});

const sub = [{ SubscriptionType: 'EMAIL', Address: EMAIL }];
const body = {
  AccountId: ACCOUNT,
  Budget: {
    BudgetName: 'gitvm-monthly-50',
    BudgetLimit: { Amount: '50', Unit: 'USD' },
    TimeUnit: 'MONTHLY',
    BudgetType: 'COST',
  },
  NotificationsWithSubscribers: [
    { Notification: { NotificationType: 'ACTUAL', ComparisonOperator: 'GREATER_THAN', Threshold: 50, ThresholdType: 'PERCENTAGE' }, Subscribers: sub },
    { Notification: { NotificationType: 'ACTUAL', ComparisonOperator: 'GREATER_THAN', Threshold: 80, ThresholdType: 'PERCENTAGE' }, Subscribers: sub },
    { Notification: { NotificationType: 'FORECASTED', ComparisonOperator: 'GREATER_THAN', Threshold: 100, ThresholdType: 'PERCENTAGE' }, Subscribers: sub },
  ],
};

async function call(target, payload) {
  const r = await c.fetch('https://budgets.amazonaws.com/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': `AWSBudgetServiceGateway.${target}` },
    body: JSON.stringify(payload),
  });
  return { ok: r.ok, status: r.status, text: await r.text() };
}

let r = await call('CreateBudget', body);
if (!r.ok && /DuplicateRecord/i.test(r.text)) {
  // Already exists -> update limit + (re)create notifications best effort.
  console.log('Budget existe deja, mise a jour…');
  const upd = await call('UpdateBudget', { AccountId: ACCOUNT, NewBudget: body.Budget });
  console.log('UpdateBudget:', upd.status, upd.text.slice(0, 200));
  for (const n of body.NotificationsWithSubscribers) {
    const cn = await call('CreateNotification', { AccountId: ACCOUNT, BudgetName: body.Budget.BudgetName, Notification: n.Notification, Subscribers: n.Subscribers });
    console.log('CreateNotification', n.Notification.Threshold + '%:', cn.ok ? 'ok' : cn.text.slice(0, 120));
  }
} else {
  console.log(r.ok ? '✅ Budget cree (50$/mois, alertes -> ' + EMAIL + ')' : 'ERR ' + r.status + ': ' + r.text.slice(0, 400));
}
