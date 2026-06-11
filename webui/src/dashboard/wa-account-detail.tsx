import { type ReactNode, useState } from 'react';
import { Fingerprint, KeyRound, Shield, UserRound } from 'lucide-react';
import { WAAccountStatus } from '../proto/byte/v/forge/waapp/v1/profile';
import type { ClientProfile, WAAccount } from '../proto/byte/v/forge/waapp/v1/profile';
import { submitWaRegistrationOTP, waAccountID } from './wa-api';
import { WaAccountProfileSettings } from './wa-account-profile-settings';
import { WaAccountSecurityPanel } from './wa-account-security';
import { WaDeviceFingerprintPanel } from './wa-device-fingerprint';
import { Badge, Button, Input } from './ui';

type Props = { account: WAAccount; profiles: ClientProfile[]; profilesLoading: boolean; busy: boolean; onDone: (message: string) => void; onError: (message: string) => void; onAvatarChanged: () => void };

export function WaAccountDetail({ account, profiles, profilesLoading, busy, onDone, onError, onAvatarChanged }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">个人信息</h2>
        <Badge variant="outline">{account.status || 'UNKNOWN'}</Badge>
      </header>
      <div className="divide-y divide-border">
        {isRegistrationPending(account) && <ManualOtpSubmit account={account} busy={busy} onDone={onDone} onError={onError} />}
        <InfoSection icon={<UserRound size={16} />} title="资料"><WaAccountProfileSettings account={account} onDone={onDone} onError={onError} onAvatarChanged={onAvatarChanged} /></InfoSection>
        <InfoSection title="基础信息"><InfoGrid account={account} /></InfoSection>
        <InfoSection icon={<Shield size={16} />} title="安全"><WaAccountSecurityPanel account={account} onDone={onDone} onError={onError} /></InfoSection>
        <InfoSection icon={<Fingerprint size={16} />} title="设备指纹"><WaDeviceFingerprintPanel profiles={profiles} loading={profilesLoading} /></InfoSection>
      </div>
    </section>
  );
}

function InfoSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <section className="grid gap-3 p-5"><h3 className="inline-flex items-center gap-2 text-sm font-semibold">{icon}{title}</h3>{children}</section>;
}

function isRegistrationPending(account: WAAccount) {
  return account.status === WAAccountStatus.WA_ACCOUNT_STATUS_PENDING_REGISTRATION;
}

function ManualOtpSubmit({ account, busy, onDone, onError }: { account: WAAccount; busy: boolean; onDone: (message: string) => void; onError: (message: string) => void }) {
  const [otp, setOtp] = useState('');
  async function submit() {
    try {
      const resp = await submitWaRegistrationOTP(account, otp);
      if (resp.error_message || resp.success === false) throw new Error(resp.error_message || 'OTP 提交失败');
      setOtp('');
      onDone('OTP 已提交');
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  }
  return <section className="grid gap-3 p-5"><h3 className="inline-flex items-center gap-2 text-sm font-semibold"><KeyRound size={15} />提交注册 OTP</h3><div className="flex gap-2"><Input value={otp} onChange={(event) => setOtp(event.target.value)} inputMode="numeric" autoComplete="one-time-code" type="password" placeholder="验证码" /><Button disabled={busy || !otp.trim()} onClick={() => void submit()}>提交</Button></div></section>;
}

function InfoGrid({ account }: { account: WAAccount }) {
  const rows = [
    ['账号 ID', waAccountID(account)],
    ['手机号', account.phone?.e164_number || '-'],
    ['国家', account.phone?.country_iso2 || '-'],
    ['拨号码', account.phone?.country_calling_code || '-'],
    ['更新时间', formatTime(account.audit?.updated_at)],
  ];
  return <dl className="grid gap-2 sm:grid-cols-2">{rows.map(([label, value]) => <InfoRow key={label} label={label} value={value} />)}</dl>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-muted/50 px-3 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 truncate font-mono text-xs">{value}</dd></div>;
}

function formatTime(value?: string) {
  if (!value) return '-';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? value : time.toLocaleString();
}
