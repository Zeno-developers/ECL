import { useState } from 'react'
import { Plus, Trash2, Edit3, Copy, Check, Globe, Shield, Activity, Clock } from 'lucide-react'
import { toast } from 'react-toastify'
import DashboardShell from '../components/dashboard/DashboardShell'

const WebhooksPage = () => {
  const [webhooks, setWebhooks] = useState([
    {
      id: '1',
      name: 'New Member Registration',
      url: 'https://api.elchurch.site/webhooks/members',
      events: ['member.created', 'member.updated'],
      secret: 'whsec_123456',
      status: 'active',
      createdAt: new Date('2024-01-15'),
      lastDelivery: new Date('2024-12-14'),
      successRate: 98.5
    },
    {
      id: '2',
      name: 'Donation Notifications',
      url: 'https://api.elchurch.site/webhooks/donations',
      events: ['donation.received', 'donation.refunded'],
      secret: 'whsec_789012',
      status: 'active',
      createdAt: new Date('2024-02-20'),
      lastDelivery: new Date('2024-12-13'),
      successRate: 99.2
    }
  ])

  const [copiedSecret, setCopiedSecret] = useState(null)

  const copyToClipboard = (text, secretId) => {
    navigator.clipboard.writeText(text)
    setCopiedSecret(secretId)
    setTimeout(() => setCopiedSecret(null), 2000)
    toast.success('Webhook secret copied to clipboard')
  }

  const deleteWebhook = (webhookId) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) return
    setWebhooks((prev) => prev.filter((wh) => wh.id !== webhookId))
    toast.success('Webhook deleted successfully')
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-warm-charcoal/[0.07] pb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">WEBHOOKS</h1>
            <p className="mt-1 text-sm text-warm-muted">Configure webhooks to receive real-time notifications from your church management system.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90 shrink-0">
            <Plus size={13} />
            CREATE WEBHOOK
          </button>
        </div>

        {/* Webhooks List */}
        <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-charcoal/[0.07]">
            <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">YOUR WEBHOOKS</p>
          </div>

          {webhooks.length === 0 ? (
            <div className="p-12 text-center">
              <Globe size={36} className="mx-auto text-warm-gold/30 mb-4" />
              <p className="text-sm font-semibold text-warm-espresso mb-1">No Webhooks</p>
              <p className="text-xs text-warm-muted mb-4">Create your first webhook to receive real-time updates</p>
              <button className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.18em] text-warm-espresso transition hover:opacity-90">
                <Plus size={13} />
                CREATE WEBHOOK
              </button>
            </div>
          ) : (
            <div className="divide-y divide-warm-charcoal/[0.05]">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-6 hover:bg-warm-ivory transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-sm font-semibold text-warm-espresso">{webhook.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] ${
                          webhook.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {webhook.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1">
                          <p className="text-xs text-warm-muted"><span className="font-semibold text-warm-plum">URL:</span> {webhook.url}</p>
                          <p className="text-xs text-warm-muted"><span className="font-semibold text-warm-plum">Events:</span> {webhook.events.join(', ')}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-warm-muted">
                          <div className="flex items-center gap-1.5">
                            <Activity size={13} className="text-warm-gold" />
                            {webhook.successRate}% success
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-warm-gold" />
                            {webhook.lastDelivery.toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-semibold text-warm-plum">Webhook Secret</p>
                            <p className="text-[10px] text-warm-muted mt-0.5">Use this secret to verify webhook signatures</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(webhook.secret, webhook.id)}
                            className="text-warm-muted hover:text-warm-charcoal transition-colors p-1"
                          >
                            {copiedSecret === webhook.id ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <code className="text-xs text-warm-espresso font-mono mt-2 block">{webhook.secret}</code>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button className="p-2 rounded-lg text-warm-muted hover:text-warm-charcoal hover:bg-warm-ivory transition-colors">
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="p-2 rounded-lg text-warm-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documentation */}
        <div className="rounded-2xl border border-warm-gold/20 bg-warm-gold/[0.04] p-6 space-y-4">
          <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">WEBHOOK DOCUMENTATION</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-warm-plum mb-2">PAYLOAD STRUCTURE</p>
              <pre className="rounded-xl border border-warm-gold/20 bg-white p-3 text-[11px] text-warm-espresso font-mono overflow-x-auto">
{`{
  "event": "member.created",
  "data": {
    "id": "mem_123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2024-12-14T10:30:00Z"
}`}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] text-warm-plum mb-2">SIGNATURE VERIFICATION</p>
              <p className="text-xs text-warm-plum mb-3">
                Verify webhook signatures using your webhook secret to ensure authenticity.
              </p>
              <div className="flex items-center gap-2 text-xs text-warm-plum">
                <Shield size={14} className="text-warm-gold" />
                <span>All webhooks are signed with HMAC-SHA256</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default WebhooksPage
