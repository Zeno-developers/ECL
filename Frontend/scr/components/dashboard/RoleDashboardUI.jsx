import { ArrowLeft, RefreshCw } from 'lucide-react'

export function DashboardPage({ children }) {
  return <div className="min-h-screen">{children}</div>
}

export function DashboardHero({
  icon: Icon,
  title,
  subtitle,
  onBack,
  backLabel = 'Back',
  onRefresh,
  refreshing = false,
  badge,
  logoUrl = '/images/logo.png',
  useLogo = true,
}) {
  return (
    <div className="border-b border-warm-charcoal/[0.07]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {useLogo && logoUrl ? (
              <img src={logoUrl} alt="" className="h-9 w-9 object-contain opacity-50" />
            ) : Icon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory">
                <Icon size={18} className="text-warm-gold" />
              </div>
            ) : null}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-warm-charcoal leading-tight">
                  {title}
                </h1>
                {badge ? (
                  <span className="rounded-full border border-warm-gold/20 bg-warm-gold/[0.08] px-3 py-1 text-[9px] font-bold tracking-[0.2em] text-warm-plum">
                    {badge.toUpperCase()}
                  </span>
                ) : null}
              </div>
              {subtitle ? (
                <p className="mt-2 max-w-xl text-sm text-warm-muted">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {typeof onRefresh === 'function' ? (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-white text-warm-muted shadow-sm transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal disabled:opacity-40"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            ) : null}
            {typeof onBack === 'function' ? (
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-2.5 text-xs font-semibold tracking-[0.1em] text-warm-muted shadow-sm transition hover:border-warm-charcoal/[0.12] hover:text-warm-charcoal"
              >
                <ArrowLeft size={14} />
                {backLabel}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardContent({ children }) {
  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 space-y-6">
      {children}
    </div>
  )
}

export function DashboardStatGrid({ stats = [] }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 sm:p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl xl:text-3xl font-black tabular-nums text-warm-charcoal break-words">{stat.value}</p>
                <p className="mt-2 text-[9px] font-bold tracking-[0.18em] text-warm-gold/70 uppercase">
                  {stat.label}
                </p>
                {stat.helper ? (
                  <p className="mt-1 text-[10px] text-warm-muted">{stat.helper}</p>
                ) : null}
              </div>
              {Icon ? (
                <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory text-warm-gold">
                  <Icon size={15} />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardPanel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 sm:p-6 shadow-sm ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {Icon ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-warm-charcoal/[0.07] bg-warm-ivory text-warm-gold">
              <Icon size={13} />
            </div>
          ) : null}
          <p className="text-[9px] font-bold tracking-[0.22em] text-warm-gold/70 uppercase">{title}</p>
        </div>
        {action || null}
      </div>
      {children}
    </div>
  )
}

export function DashboardActionGrid({ actions = [], columns = 'grid-cols-1 sm:grid-cols-2' }) {
  return (
    <div className={`grid ${columns} gap-2 sm:gap-3`}>
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.disabled}
            className="group flex w-full items-center gap-3 rounded-xl border border-warm-charcoal/[0.07] bg-white px-4 py-3.5 text-left transition hover:border-warm-gold/20 hover:bg-warm-gold/[0.04] disabled:opacity-40"
          >
            {Icon ? (
              <Icon size={14} className="shrink-0 text-warm-muted transition group-hover:text-warm-gold" />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.1em] text-warm-muted transition group-hover:text-warm-charcoal">
                {action.label}
              </p>
              {action.description ? (
                <p className="mt-0.5 text-[10px] text-warm-muted/70 truncate">{action.description}</p>
              ) : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function DashboardFooter() {
  return (
    <div className="border-t border-warm-charcoal/[0.07] pt-8 text-center">
      <p className="text-[9px] font-semibold tracking-[0.2em] text-warm-muted">
        © {new Date().getFullYear()} ETERNAL LOVE CHURCH
      </p>
    </div>
  )
}

export function ChurchBrandingBanner() {
  return null
}
