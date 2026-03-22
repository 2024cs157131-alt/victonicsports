const KEY = 'ajtips_vip'

export function getAccess(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

export function hasAccess(id: string): boolean {
  const a = getAccess(); return !!a[id] && a[id] > Date.now()
}

export function grantAccess(id: string, days: number): void {
  const a = getAccess()
  a[id] = Date.now() + days * 86400000
  localStorage.setItem(KEY, JSON.stringify(a))
}

export function expiryLabel(id: string): string {
  const a = getAccess(); const ts = a[id]
  if (!ts || ts <= Date.now()) return ''
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

export function anyAccess(): boolean {
  return ['premium','basic','draws','correct','sportpesa','mega','betika'].some(hasAccess)
}

export function durationDays(d: string): number {
  return ({ DAILY:1, WEEKLY:7, MONTHLY:30 } as any)[d.toUpperCase()] ?? 7
}

declare global { interface Window { PaystackPop: any } }

export function openPaystack(opts: {
  email: string; amount: number; currency?: string
  ref: string; pkgId: string; duration: string
  onSuccess: (ref: string) => void; onClose: () => void
}) {
  const h = window.PaystackPop.setup({
    key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    email:    opts.email,
    amount:   opts.amount,
    currency: opts.currency ?? 'KES',
    ref:      opts.ref,
    metadata: { pkg_id: opts.pkgId, duration: opts.duration },
    callback: (r: any) => opts.onSuccess(r.reference),
    onClose:  opts.onClose,
  })
  h.openIframe()
}

export function genRef(pkgId: string): string {
  return `AJTIPS_${pkgId.toUpperCase()}_${Date.now()}_${Math.floor(Math.random()*9999)}`
}
