import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Lightbulb, X } from 'lucide-react';

/**
 * Lightweight, dependency-free guided tour overlay.
 * - Auto-opens once per user (storageKey) unless dismissed.
 * - Persists completion/snooze state in localStorage.
 * - Provides a small launcher chip so users can re-open later.
 */
export default function OnboardingCoachmarks({
  steps = [],
  storageKey = 'onboarding_demo',
  autoOpen = true,
  showLauncher = true,
  title = 'Welcome tour',
  snoozeDays = 7,
}) {
  const normalizedSteps = useMemo(
    () => (steps.length ? steps : [{ title: 'Welcome', body: 'Explore the dashboard with quick tips.' }]),
    [steps]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Restore persisted state
  useEffect(() => {
    if (!autoOpen) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setIsOpen(true);
        return;
      }
      const parsed = JSON.parse(raw);
      const { status, timestamp } = parsed || {};
      const ts = timestamp ? new Date(timestamp).getTime() : 0;
      const now = Date.now();
      const snoozeWindow = snoozeDays * 24 * 60 * 60 * 1000;

      if (status === 'done') {
        setIsOpen(false);
      } else if (status === 'snoozed' && ts && now - ts > snoozeWindow) {
        setIsOpen(true);
      } else if (!status) {
        setIsOpen(true);
      }
    } catch (error) {
      console.warn('OnboardingCoachmarks: failed to read state', error);
      setIsOpen(true);
    }
  }, [autoOpen, storageKey, snoozeDays]);

  const persist = (status) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ status, timestamp: new Date().toISOString() }));
    } catch (error) {
      console.warn('OnboardingCoachmarks: failed to persist state', error);
    }
  };

  const close = (status = 'done') => {
    persist(status);
    setIsOpen(false);
  };

  const gotoNext = () => setStepIndex((prev) => Math.min(prev + 1, normalizedSteps.length - 1));
  const gotoPrev = () => setStepIndex((prev) => Math.max(prev - 1, 0));

  const current = normalizedSteps[stepIndex] || {};

  return (
    <>
      {showLauncher && !isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          <Lightbulb size={16} />
          Quick tour
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => close('snoozed')}
          />

          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/25">
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Lightbulb size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                  {title}
                </p>
                <h3 className="text-lg font-bold text-slate-900">{current.title || 'Welcome'}</h3>
                {current.badge && (
                  <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                    {current.badge}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => close('done')}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close tour"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-slate-600 leading-6">{current.body || current.description}</p>
              {current.tip && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  {current.tip}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <div className="text-xs font-semibold text-slate-500">
                Step {stepIndex + 1} / {normalizedSteps.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => close('snoozed')}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={gotoPrev}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 transition disabled:opacity-40 hover:bg-slate-100"
                >
                  <ArrowLeft size={14} />
                  Back
                </button>
                {stepIndex === normalizedSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => close('done')}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-amber-400"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={gotoNext}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    Next
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
