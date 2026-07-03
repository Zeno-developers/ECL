import { DollarSign } from 'lucide-react'
import GivingAdmin from '../components/giving/GivingAdmin'
import DashboardShell from '../components/dashboard/DashboardShell'

export default function DonationsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-6">
        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <div className="flex items-center gap-3">
            <DollarSign size={20} className="text-warm-gold" />
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">GIVING REPORTS</h1>
              <p className="mt-1 text-sm text-warm-muted">Review SnapScan and offline gifts.</p>
            </div>
          </div>
        </div>
        <GivingAdmin />
      </div>
    </DashboardShell>
  )
}
