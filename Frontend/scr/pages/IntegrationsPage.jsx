import { useState } from 'react'
import { Package, Check, X, Settings, ExternalLink, Zap, Users } from 'lucide-react'
import DashboardShell from '../components/dashboard/DashboardShell'

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState([
    { id: '1', name: 'Mailchimp', description: 'Sync members with your Mailchimp audience', category: 'Marketing', status: 'connected', connectedSince: new Date('2024-03-15'), logo: '📧' },
    { id: '2', name: 'Stripe', description: 'Process donations and payments securely', category: 'Payments', status: 'connected', connectedSince: new Date('2024-02-10'), logo: '💳' },
    { id: '3', name: 'Google Calendar', description: 'Sync events with Google Calendar', category: 'Calendar', status: 'available', logo: '📅' },
    { id: '4', name: 'Slack', description: 'Send announcements to Slack channels', category: 'Communication', status: 'available', logo: '💬' },
    { id: '5', name: 'QuickBooks', description: 'Export financial data to QuickBooks', category: 'Accounting', status: 'coming_soon', logo: '📊' },
    { id: '6', name: 'Zapier', description: 'Connect with 5,000+ apps through Zapier', category: 'Automation', status: 'available', logo: '⚡' },
  ])

  const categories = [
    { id: 'all', name: 'All' },
    { id: 'connected', name: 'Connected' },
    { id: 'available', name: 'Available' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'payments', name: 'Payments' },
    { id: 'communication', name: 'Communication' },
  ]

  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredIntegrations = integrations.filter((integration) => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'connected') return integration.status === 'connected'
    if (selectedCategory === 'available') return integration.status === 'available'
    return integration.category.toLowerCase() === selectedCategory
  })

  const connectIntegration = (id) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: 'connected', connectedSince: new Date() } : i))
  }

  const disconnectIntegration = (id) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: 'available', connectedSince: null } : i))
  }

  const statusBadge = (status) => {
    const map = {
      connected: 'bg-emerald-500/10 text-emerald-700',
      available: 'bg-warm-gold/10 text-warm-plum',
      coming_soon: 'bg-warm-charcoal/[0.05] text-warm-muted',
    }
    const labels = { connected: 'Connected', available: 'Available', coming_soon: 'Coming Soon' }
    return (
      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] ${map[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">INTEGRATIONS</h1>
          <p className="mt-1 text-sm text-warm-muted">Connect your church management system with your favorite tools and services.</p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                selectedCategory === category.id
                  ? 'bg-warm-gold/[0.08] text-warm-plum border border-warm-gold/20'
                  : 'border border-warm-charcoal/[0.07] bg-white text-warm-muted hover:text-warm-charcoal shadow-sm'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        {filteredIntegrations.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={36} className="mx-auto text-warm-gold/30 mb-4" />
            <p className="text-sm font-semibold text-warm-espresso mb-1">No integrations found</p>
            <p className="text-xs text-warm-muted">Try selecting a different category</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integration.logo}</span>
                    <div>
                      <p className="text-sm font-semibold text-warm-espresso">{integration.name}</p>
                      {statusBadge(integration.status)}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-warm-muted">{integration.description}</p>

                <div className="flex items-center justify-between text-[10px] text-warm-muted">
                  <span>{integration.category}</span>
                  {integration.connectedSince && (
                    <span>Since {integration.connectedSince.toLocaleDateString()}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  {integration.status === 'connected' && (
                    <>
                      <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory py-2 text-xs font-semibold text-warm-muted transition hover:text-warm-charcoal">
                        <Settings size={12} />
                        Configure
                      </button>
                      <button
                        onClick={() => disconnectIntegration(integration.id)}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-red-600 transition hover:bg-red-100"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                  {integration.status === 'available' && (
                    <button
                      onClick={() => connectIntegration(integration.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-warm-gold py-2 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90"
                    >
                      <Check size={12} />
                      CONNECT
                    </button>
                  )}
                  {integration.status === 'coming_soon' && (
                    <button disabled className="flex-1 rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory py-2 text-xs text-warm-muted cursor-not-allowed">
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Build Your Own */}
        <div className="rounded-2xl border border-warm-gold/20 bg-warm-gold/[0.04] p-8 text-center space-y-4">
          <Zap size={32} className="mx-auto text-warm-gold" />
          <h2 className="text-xl font-black tracking-tighter text-warm-charcoal">BUILD YOUR OWN INTEGRATION</h2>
          <p className="text-sm text-warm-plum max-w-2xl mx-auto">
            Use our comprehensive REST API to build custom integrations tailored to your church's specific needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="/api-docs"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-warm-gold px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90"
            >
              <ExternalLink size={13} />
              VIEW API DOCS
            </a>
            <a
              href="/api-keys"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-warm-gold/20 bg-white px-6 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-plum transition hover:bg-warm-gold/[0.04]"
            >
              <Users size={13} />
              MANAGE API KEYS
            </a>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default IntegrationsPage
