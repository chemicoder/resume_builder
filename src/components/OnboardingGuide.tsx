import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  LayoutTemplate,
  Palette,
  FileText,
  Download,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
} from 'lucide-react';

const STORAGE_KEY = 'resume_builder.onboarding.v1';

interface Step {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  body: React.ReactNode;
  tone: 'info' | 'warn';
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    tone: 'info',
    title: 'Welcome to Resume Builder',
    body: (
      <>
        <p>Build a polished resume in minutes. Pick a template, fill in your details on the left, and watch the preview update live.</p>
        <p className="mt-3 text-sm text-gray-500">A quick tour follows — feel free to skip it.</p>
      </>
    ),
  },
  {
    icon: LayoutTemplate,
    tone: 'info',
    title: 'Pick a template',
    body: (
      <>
        <p>Use the <span className="font-semibold">Template</span> dropdown at the top to switch between Professional, Formal, and Creative layouts.</p>
        <p className="mt-2 text-sm text-gray-600">Your data stays the same — only the visual layout changes, so you can try as many as you like.</p>
      </>
    ),
  },
  {
    icon: Palette,
    tone: 'info',
    title: 'Customize colors',
    body: (
      <>
        <p>Open <span className="font-semibold">Theme &amp; Settings</span> in the sidebar to pick your <em>Primary</em> and <em>Accent</em> colors for headings.</p>
        <p className="mt-2">Need to tweak text legibility? Use the new <span className="font-semibold">Body Text Color</span> control to override body text across the resume. Hit <span className="font-semibold">Reset</span> to return to the template default.</p>
      </>
    ),
  },
  {
    icon: FileText,
    tone: 'info',
    title: 'Bullet points: just hit Enter',
    body: (
      <>
        <p>In <span className="font-semibold">Experience</span>, <span className="font-semibold">Projects</span>, and similar description fields, press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">Enter</kbd> at the end of a line to start a new bullet.</p>
        <p className="mt-2">Each line becomes its own bullet point in the preview, the PDF, and the Word file. You don&apos;t need to type <code className="font-mono text-xs">•</code> or <code className="font-mono text-xs">-</code> yourself — they get stripped automatically.</p>
      </>
    ),
  },
  {
    icon: Download,
    tone: 'info',
    title: 'Export to PDF — the safe default',
    body: (
      <>
        <p>The blue <span className="font-semibold">Export PDF</span> button captures the preview exactly as you see it. This is the best choice for sending out applications.</p>
        <p className="mt-2 text-sm text-gray-600">PDFs preserve fonts, colors, sidebars and layout faithfully across every template.</p>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    tone: 'warn',
    title: 'A note about Word (.docx) export',
    body: (
      <>
        <p>The <span className="font-semibold">Export DOCX</span> button gives you an <em>editable</em> Word file — handy if a recruiter asks for one.</p>
        <p className="mt-2"><span className="font-semibold">But:</span> Word can&apos;t reproduce every CSS effect from the preview. Templates with heavy backgrounds, gradients, or complex sidebars (Creative, Developer, Luxe, Spectrum, Midnight…) are <em>approximated</em> in the DOCX, not pixel-perfect.</p>
        <p className="mt-2"><span className="font-semibold">For the cleanest Word output, use the <span className="text-blue-700">Minimal</span> or <span className="text-blue-700">Harvard</span> template.</span> If you only need to share or print, stick with PDF.</p>
      </>
    ),
  },
  {
    icon: CheckCircle2,
    tone: 'info',
    title: "You're set",
    body: (
      <>
        <p>That&apos;s the tour. A few extras worth knowing:</p>
        <ul className="mt-2 space-y-1.5 text-sm text-gray-700 list-disc list-inside">
          <li><span className="font-semibold">Smart Import</span> — upload an existing resume / LinkedIn PDF and the AI fills the form for you.</li>
          <li><span className="font-semibold">ATS Optimization</span> — paste a job description to tailor your resume and get a match score.</li>
          <li><span className="font-semibold">Share Resume</span> — generate a link &amp; QR code so others can view (and one-click download) your resume.</li>
        </ul>
        <p className="mt-3 text-sm text-gray-500">You can re-open this guide anytime from the <span className="font-semibold">?</span> button in the top bar.</p>
      </>
    ),
  },
];

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
}

export default function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const isWarn = current.tone === 'warn';

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        >
          <div className={`px-6 pt-6 pb-4 ${isWarn ? 'bg-amber-50' : 'bg-gradient-to-br from-blue-50 to-purple-50'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center ${isWarn ? 'bg-amber-200 text-amber-800' : 'bg-white text-blue-600 shadow-sm'}`}>
                  <Icon size={22} />
                </div>
                <h2 className={`text-xl font-bold ${isWarn ? 'text-amber-900' : 'text-gray-900'}`}>
                  {current.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 -m-1"
                aria-label="Close guide"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="px-6 py-6 text-gray-700 leading-relaxed min-h-[180px]">
            {current.body}
          </div>

          <div className="px-6 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStep(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                {isLast ? 'Get started' : 'Next'}
                {!isLast && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Returns true if the user has never been shown the onboarding flow before. */
export function shouldAutoShowOnboarding(): boolean {
  try {
    return !window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

/** Mark the onboarding as seen so it doesn't auto-show again. */
export function markOnboardingSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  } catch {
    // localStorage unavailable — silently ignore; the user will see the
    // guide again next session, which is an acceptable degradation.
  }
}
