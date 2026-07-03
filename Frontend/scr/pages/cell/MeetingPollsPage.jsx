import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Calendar, CheckCircle2, Clock3, MapPin, RefreshCw, Users, Zap, XCircle } from 'lucide-react';
import { attendanceAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import DashboardShell from '../../components/dashboard/DashboardShell';

const inputCls = 'w-full rounded-xl border border-warm-charcoal/[0.1] bg-warm-ivory px-4 py-3 text-sm text-warm-charcoal placeholder-warm-muted focus:border-warm-gold/40 focus:outline-none focus:bg-white resize-none'

export default function MeetingPollsPage() {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [pollDetails, setPollDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ response_status: 'going', excuse_text: '' });
  const [confirmedAttendees, setConfirmedAttendees] = useState(new Set());

  const canConfirm = ['cell_leader', 'admin', 'pastor', 'superadmin', 'elder'].includes(user?.role);
  const canGenerate = ['admin', 'pastor', 'superadmin'].includes(user?.role);

  const [generating, setGenerating] = useState(false);
  const [lastGenerateResult, setLastGenerateResult] = useState(null);

  useEffect(() => { loadPolls(); }, []);

  const loadPolls = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getMyMeetingPolls();
      setPolls(response?.data || []);
      if (response?.data?.length) {
        await loadPollDetails(response.data[0].id);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load meeting polls');
    } finally {
      setLoading(false);
    }
  };

  const loadPollDetails = async (pollId) => {
    setSelectedPoll(pollId);
    const summary = polls.find((item) => item.id === pollId);
    if (summary) {
      setForm({ response_status: summary.response_status || 'going', excuse_text: summary.excuse_text || '' });
    }

    if (!canConfirm) { setPollDetails(null); return; }

    try {
      const response = await attendanceAPI.getMeetingPoll(pollId);
      const detail = response?.data || null;
      setPollDetails(detail);
      const next = new Set((detail?.responses || []).filter((item) => item.attendance_status === 'confirmed').map((item) => Number(item.id)));
      setConfirmedAttendees(next);
    } catch (error) {
      toast.error(error.message || 'Failed to load poll detail');
    }
  };

  const selectedSummary = useMemo(() => polls.find((item) => item.id === selectedPoll) || null, [polls, selectedPoll]);

  const handleRespond = async () => {
    if (!selectedPoll) return;
    if (form.response_status === 'not_going' && !form.excuse_text.trim()) {
      toast.error('Please add a reason if you are not going');
      return;
    }
    try {
      setSubmitting(true);
      await attendanceAPI.respondToMeetingPoll(selectedPoll, {
        response_status: form.response_status,
        excuse_text: form.response_status === 'not_going' ? form.excuse_text.trim() : null,
      });
      toast.success('Meeting response saved');
      await loadPolls();
    } catch (error) {
      toast.error(error.message || 'Failed to save your response');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleConfirmed = (userId) => {
    setConfirmedAttendees((current) => {
      const next = new Set(current);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleGeneratePolls = async () => {
    try {
      setGenerating(true);
      setLastGenerateResult(null);
      const response = await attendanceAPI.generateMeetingPolls();
      const result = response?.data || {};
      setLastGenerateResult(result);
      toast.success(`Generated ${result.created ?? 0} poll(s) for ${result.target_date}`);
      await loadPolls();
    } catch (error) {
      toast.error(error.message || 'Failed to generate meeting polls');
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmAttendance = async () => {
    if (!selectedPoll) return;
    try {
      setSubmitting(true);
      await attendanceAPI.confirmMeetingPollAttendance(selectedPoll, { attendees: Array.from(confirmedAttendees) });
      toast.success('Leader confirmation saved');
      await loadPollDetails(selectedPoll);
      await loadPolls();
    } catch (error) {
      toast.error(error.message || 'Failed to confirm attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-32">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-warm-charcoal/10 border-t-warm-gold" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-8 space-y-6">

        <div className="border-b border-warm-charcoal/[0.07] pb-8">
          <h1 className="text-3xl font-black tracking-tighter text-warm-charcoal">MEETING POLLS</h1>
          <p className="mt-2 text-sm text-warm-muted">
            RSVP for upcoming meetings and confirm attendance after they finish.
          </p>
        </div>

        {canGenerate && (
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-warm-gold/70" />
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">ADMIN — GENERATE POLLS</p>
            </div>
            <p className="text-sm text-warm-muted mb-4">
              Generates RSVP polls for every cell whose meeting day is <strong>tomorrow</strong>. Members receive an in-app notification and email. Skips cells that already have a poll for that date.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleGeneratePolls}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
              >
                <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generating...' : "Generate Tomorrow's Polls"}
              </button>
              {lastGenerateResult && (
                <p className="text-xs text-warm-muted">
                  Created <span className="font-semibold text-warm-charcoal">{lastGenerateResult.created}</span> poll(s),
                  emailed <span className="font-semibold text-warm-charcoal">{lastGenerateResult.emailed}</span> member(s)
                  for <span className="font-semibold text-warm-charcoal">{lastGenerateResult.target_date}</span>.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Poll list */}
          <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-warm-muted" />
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">MY MEETING POLLS</p>
            </div>
            <div className="space-y-2">
              {polls.map((poll) => (
                <button
                  key={poll.id}
                  onClick={() => loadPollDetails(poll.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedPoll === poll.id
                      ? 'border-warm-gold/30 bg-warm-gold/[0.06]'
                      : 'border-warm-charcoal/15 hover:border-warm-charcoal/25 hover:bg-warm-ivory'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-warm-espresso">{poll.title}</p>
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-amber-700 bg-amber-500/10">
                      {poll.response_status || 'no_response'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-warm-muted">{poll.cell_name || 'Cell meeting'} · {poll.meeting_date}</p>
                </button>
              ))}
              {!polls.length && <p className="text-sm text-warm-muted py-4 text-center">No meeting polls yet.</p>}
            </div>
          </div>

          <div className="space-y-6">
            {/* My response */}
            <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70 mb-4">MY RESPONSE</p>
              {selectedSummary ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3 mb-5">
                    {[
                      { icon: Clock3, value: selectedSummary.meeting_time || 'Time TBC' },
                      { icon: Calendar, value: selectedSummary.meeting_date },
                      { icon: MapPin, value: selectedSummary.meeting_location || 'Cell venue' },
                    ].map(({ icon: Icon, value }) => (
                      <div key={value} className="rounded-xl border border-warm-charcoal/[0.07] bg-warm-ivory p-3 text-xs text-warm-muted">
                        <Icon size={14} className="mb-2 text-warm-gold" />
                        {value}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {['going', 'not_going', 'no_response'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setForm((c) => ({ ...c, response_status: status }))}
                        className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                          form.response_status === status
                            ? 'bg-warm-gold/10 border border-warm-gold/30 text-warm-plum'
                            : 'border border-warm-charcoal/20 bg-white text-warm-charcoal/60 hover:text-warm-charcoal hover:border-warm-charcoal/30'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {form.response_status === 'not_going' && (
                    <textarea
                      value={form.excuse_text}
                      onChange={(e) => setForm((c) => ({ ...c, excuse_text: e.target.value }))}
                      rows={3}
                      placeholder="Tell your leader why you will not be attending"
                      className={`${inputCls} mb-4`}
                    />
                  )}

                  <button
                    onClick={handleRespond}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-warm-gold px-5 py-2.5 text-xs font-bold tracking-[0.12em] text-warm-espresso transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save My Response'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-warm-muted py-4">Select a poll to respond.</p>
              )}
            </div>

            {/* Leader confirmation */}
            {canConfirm && pollDetails && (
              <div className="rounded-2xl border border-warm-charcoal/[0.07] bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={14} className="text-warm-muted" />
                  <p className="text-xs font-bold tracking-[0.18em] text-warm-gold/70">LEADER CONFIRMATION</p>
                </div>
                <div className="space-y-2">
                  {(pollDetails.responses || []).map((person) => {
                    const isConfirmed = confirmedAttendees.has(Number(person.id));
                    return (
                      <button
                        key={person.id}
                        onClick={() => toggleConfirmed(Number(person.id))}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                          isConfirmed
                            ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
                            : 'border-warm-charcoal/[0.07] hover:border-warm-charcoal/[0.12] hover:bg-warm-ivory'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-warm-espresso">{person.first_name} {person.last_name}</p>
                          <p className="text-xs text-warm-muted mt-0.5">
                            RSVP: {person.response_status || 'no_response'}
                            {person.excuse_text ? ` · ${person.excuse_text}` : ''}
                          </p>
                        </div>
                        {isConfirmed
                          ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                          : <XCircle size={16} className="text-warm-muted shrink-0" />
                        }
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleConfirmAttendance}
                  disabled={submitting}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-5 py-2.5 text-xs font-bold transition hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Confirm Final Attendance'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
