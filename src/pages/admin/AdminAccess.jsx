import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { useAdminAuth } from '../../context/AdminAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { getShops } from '../../services/shopService.js';
import { emailKey, ROLES } from '../../services/adminAuth/index.js';
import { Badge, Button, ConfirmDialog, ErrorState, InfoNote, Input, Select, SkeletonList } from '../../components/ui/index.js';
import DataTable from '../../components/admin/DataTable.jsx';
import { PlusIcon } from '../../components/icons/Icons.jsx';
import { formatDate } from '../../utils/format.js';
import a from './admin.module.css';
import s from './AdminAccess.module.css';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Access (superadmin only): who may open the admin panel.
 * Invite by Gmail address with a role (and, for a shop owner, their shop);
 * deactivate / reactivate, change shop, remove. Writes go straight to
 * Firestore adminUsers, where the security rules allow them only for an active
 * superadmin — the same rule this page is behind.
 */
export default function AdminAccess() {
  const { admin, access } = useAdminAuth();
  const { showToast } = useToast();
  const users = useAsync(() => access.list(), []);
  const shops = useAsync(() => getShops({ includeInactive: true }), []);
  const [form, setForm] = useState({ email: '', role: ROLES.SHOP_OWNER, shopId: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);
  const [removing, setRemoving] = useState(null);

  const shopName = useMemo(() => Object.fromEntries((shops.data || []).map((x) => [x.id, x.name])), [shops.data]);
  const shopOptions = (shops.data || []).map((x) => ({ value: x.id, label: x.name }));

  const fail = (e) => showToast(e?.code === 'permission-denied' ? t('errors.ADMIN_FORBIDDEN') : t(`errors.${e?.code || 'NETWORK'}`, {}) || t('errors.SERVER'), { type: 'error' });

  const invite = async (e) => {
    e.preventDefault();
    const email = emailKey(form.email);
    const er = {};
    if (!EMAIL.test(email)) er.email = t('admin.access.invalidEmail');
    if (form.role === ROLES.SHOP_OWNER && !form.shopId) er.shopId = t('admin.access.shopRequired');
    if (!er.email && (users.data || []).some((u) => u.email === email)) {
      setErrors({ email: t('admin.access.duplicate') });
      return;
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    setSaving(true);
    try {
      await access.create({
        email,
        role: form.role,
        ...(form.role === ROLES.SHOP_OWNER ? { shopId: form.shopId } : {}),
        active: true,
        invitedBy: admin.email,
      });
      showToast(t('admin.access.invited', { email }), { type: 'success' });
      setForm({ email: '', role: ROLES.SHOP_OWNER, shopId: '' });
      users.reload();
    } catch (err) {
      if (err?.code === 'DUPLICATE') setErrors({ email: t('admin.access.duplicate') });
      else fail(err);
    } finally {
      setSaving(false);
    }
  };

  const change = async (user, patch) => {
    setBusy(user.email);
    try {
      await access.update(user.email, patch);
      showToast(t('admin.access.saved'), { type: 'success' });
      users.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    const user = removing;
    setRemoving(null);
    setBusy(user.email);
    try {
      await access.remove(user.email);
      showToast(t('admin.access.saved'), { type: 'success' });
      users.reload();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const rows = (users.data || []).slice().sort((x, y) => (x.role === y.role ? x.email.localeCompare(y.email) : x.role === ROLES.SUPERADMIN ? -1 : 1));

  const columns = [
    {
      key: 'email',
      header: t('admin.access.email'),
      render: (u) => (
        <span className={s.email}>
          {u.email}
          {u.email === admin.email && <span className={a.muted}> ({t('admin.access.you')})</span>}
        </span>
      ),
    },
    { key: 'role', header: t('admin.access.role'), render: (u) => t(`admin.access.roles.${u.role}`) },
    {
      key: 'shop',
      header: t('admin.access.shop'),
      render: (u) =>
        u.role !== ROLES.SHOP_OWNER ? (
          '—'
        ) : (
          <Select
            className={s.shopSelect}
            label={t('admin.access.changeShop')}
            hideLabel
            value={u.shopId || ''}
            disabled={busy === u.email}
            onChange={(e) => e.target.value && change(u, { shopId: e.target.value })}
            options={[...(shopName[u.shopId] ? [] : [{ value: u.shopId || '', label: t('admin.access.unknownShop') }]), ...shopOptions]}
          />
        ),
    },
    {
      key: 'status',
      header: t('admin.access.status'),
      render: (u) => <Badge tone={u.active ? 'success' : 'neutral'}>{u.active ? t('admin.access.active') : t('admin.access.inactive')}</Badge>,
    },
    { key: 'last', header: t('admin.access.lastLogin'), render: (u) => (u.lastLoginAt ? formatDate(u.lastLoginAt) : t('admin.access.never')) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) =>
        u.email === admin.email ? (
          <span className={a.muted}>{t('admin.access.selfLocked')}</span>
        ) : (
          <span className={s.actions}>
            <Button size="sm" variant="outline" loading={busy === u.email} onClick={() => change(u, { active: !u.active })}>
              {u.active ? t('admin.access.deactivate') : t('admin.access.reactivate')}
            </Button>
            <Button size="sm" variant="ghost" className={s.remove} disabled={busy === u.email} onClick={() => setRemoving(u)}>
              {t('admin.access.remove')}
            </Button>
          </span>
        ),
    },
  ];

  return (
    <>
      <div className={a.head}>
        <div>
          <h1 className={a.title}>{t('admin.access.title')}</h1>
          <p className={a.muted}>{t('admin.access.subtitle')}</p>
        </div>
      </div>

      <InfoNote tone="info">{t('admin.access.note')}</InfoNote>

      <form className={`${a.block} ${s.form}`} onSubmit={invite} noValidate>
        <h2 className={a.blockTitle}>{t('admin.access.invite')}</h2>
        <div className={s.formRow}>
          <Input
            label={t('admin.access.email')}
            required
            type="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="name@gmail.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />
          <Select
            label={t('admin.access.role')}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, shopId: e.target.value === ROLES.SHOP_OWNER ? f.shopId : '' }))}
            options={[ROLES.SHOP_OWNER, ROLES.SUPERADMIN].map((r) => ({ value: r, label: t(`admin.access.roles.${r}`) }))}
          />
          {form.role === ROLES.SHOP_OWNER && (
            <Select
              label={t('admin.access.shop')}
              required
              placeholder={t('admin.access.choose')}
              value={form.shopId}
              onChange={(e) => setForm((f) => ({ ...f, shopId: e.target.value }))}
              options={shopOptions}
              error={errors.shopId}
            />
          )}
        </div>
        <p className={a.muted}>{t(`admin.access.roleHelp.${form.role}`)}</p>
        <Button type="submit" iconLeft={<PlusIcon size={18} />} loading={saving}>
          {t('admin.access.save')}
        </Button>
      </form>

      <div className={s.table}>
        {users.loading ? (
          <SkeletonList count={3} />
        ) : users.error ? (
          <ErrorState error={users.error} onRetry={users.reload} />
        ) : !rows.length ? (
          <p className={a.muted}>{t('admin.access.empty')}</p>
        ) : (
          <DataTable caption={t('admin.access.title')} columns={columns} rows={rows} rowKey={(u) => u.email} />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        title={removing ? t('admin.access.removeTitle', { email: removing.email }) : ''}
        message={t('admin.access.removeBody')}
        confirmLabel={t('admin.access.remove')}
        tone="danger"
        onClose={() => setRemoving(null)}
        onConfirm={remove}
      />
    </>
  );
}
