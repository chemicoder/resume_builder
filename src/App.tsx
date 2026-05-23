import React, { useState, useRef, useEffect } from 'react';
import { initialData } from './data/initialState';
import { ResumeData } from './types';
import Sidebar from './components/Sidebar';
import MinimalResume from './components/templates/MinimalResume';
import ModernResume from './components/templates/ModernResume';
import GridPortfolio from './components/templates/GridPortfolio';
import EuropassResume from './components/templates/EuropassResume';
import HarvardResume from './components/templates/HarvardResume';
import EngineersAustraliaResume from './components/templates/EngineersAustraliaResume';
import CreativePortfolio from './components/templates/CreativePortfolio';
import DeveloperPortfolio from './components/templates/DeveloperPortfolio';
import ExpressiveResume from './components/templates/ExpressiveResume';
import AuthGate from './components/AuthGate';
import { LayoutTemplate, Download, Undo, Redo, ChevronDown, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { loadSharedResume, trackEvent } from './lib/analytics';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

type TemplateType =
  | 'minimal'
  | 'modern'
  | 'portfolio'
  | 'europass'
  | 'harvard'
  | 'engineersaustralia'
  | 'creative'
  | 'developer'
  | 'editorial'
  | 'luxe'
  | 'spectrum'
  | 'timeline'
  | 'compact'
  | 'executive'
  | 'atelier'
  | 'architect'
  | 'consultant'
  | 'magazine'
  | 'neoclassic';

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; group: string }[] = [
  { value: 'minimal', label: 'Minimal', group: 'Professional' },
  { value: 'modern', label: 'Modern', group: 'Professional' },
  { value: 'harvard', label: 'Harvard (Academic)', group: 'Formal' },
  { value: 'europass', label: 'Europass (EU CV)', group: 'Formal' },
  { value: 'engineersaustralia', label: 'Engineers Australia (CDR)', group: 'Formal' },
  { value: 'portfolio', label: 'Grid Portfolio', group: 'Creative' },
  { value: 'creative', label: 'Creative Portfolio', group: 'Creative' },
  { value: 'developer', label: 'Developer Portfolio', group: 'Creative' },
  { value: 'editorial', label: 'Editorial Serif', group: 'Creative' },
  { value: 'luxe', label: 'Luxe Black & Gold', group: 'Creative' },
  { value: 'spectrum', label: 'Spectrum Color', group: 'Creative' },
  { value: 'timeline', label: 'Timeline Pro', group: 'Professional' },
  { value: 'compact', label: 'Compact Mono', group: 'Professional' },
  { value: 'executive', label: 'Executive Slate', group: 'Professional' },
  { value: 'consultant', label: 'Consultant Blue', group: 'Professional' },
  { value: 'architect', label: 'Architect Lines', group: 'Creative' },
  { value: 'atelier', label: 'Atelier Serif', group: 'Creative' },
  { value: 'magazine', label: 'Magazine Mono', group: 'Creative' },
  { value: 'neoclassic', label: 'Neo Classic', group: 'Formal' },
];

export default function App() {
  const [data, setData] = useState<ResumeData>(initialData);
  const [past, setPast] = useState<ResumeData[]>([]);
  const [future, setFuture] = useState<ResumeData[]>([]);
  const [template, setTemplate] = useState<TemplateType>('minimal');
  const [session, setSession] = useState<Session | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  // Preview mode: read-only view shown when someone opens a shared link.
  // No sidebar, prominent "Download PDF" CTA, plus "Edit this resume" to exit.
  const [previewMode, setPreviewMode] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const trackedInitialView = useRef(false);
  const isLegacyShareHash = () => {
    const hash = window.location.hash.slice(1);
    return Boolean(hash && !hash.includes('access_token=') && !hash.includes('error=') && !hash.includes('type='));
  };

  const applySharedData = (sharedData: Partial<ResumeData>, sharedTemplate?: string) => {
    setData({
      ...initialData,
      ...sharedData,
      personalInfo: { ...initialData.personalInfo, ...(sharedData.personalInfo || {}) },
      experience: sharedData.experience || [],
      education: sharedData.education || [],
      skills: sharedData.skills || [],
      projects: sharedData.projects || [],
      languages: sharedData.languages || [],
      // references stays undefined when not present in the payload (section
      // hidden); only when explicitly an array (possibly empty) do we show.
      references: sharedData.references,
    });

    if (sharedTemplate) {
      setTemplate(sharedTemplate as TemplateType);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedSlug = params.get('share');

    if (sharedSlug) {
      loadSharedResume(sharedSlug)
        .then((shared) => {
          applySharedData(shared.data, shared.template);
          setPreviewMode(true);
          trackEvent('shared_open', { template: shared.template, metadata: { slug: shared.slug, source: 'server' } });
        })
        .catch((error) => {
          console.error('Failed to load shared resume', error);
          alert('This shared resume could not be loaded.');
        });
      return;
    }

    const hash = isLegacyShareHash() ? window.location.hash.slice(1) : '';
    if (hash) {
      try {
        const decoded = LZString.decompressFromEncodedURIComponent(hash);
        if (decoded) {
          const parsed = JSON.parse(decoded);
          if (parsed.data && parsed.template) {
            setData({
              ...initialData,
              ...parsed.data,
              personalInfo: { ...initialData.personalInfo, ...(parsed.data.personalInfo || {}) },
              experience: parsed.data.experience || [],
              education: parsed.data.education || [],
              skills: parsed.data.skills || [],
              projects: parsed.data.projects || [],
              languages: parsed.data.languages || [],
              // Preserve undefined (section hidden) vs array (section visible).
              references: parsed.data.references,
            });
            setTemplate(parsed.template as TemplateType);
          } else {
            setData({
              ...initialData,
              ...parsed,
              personalInfo: { ...initialData.personalInfo, ...(parsed.personalInfo || {}) },
              experience: parsed.experience || [],
              education: parsed.education || [],
              skills: parsed.skills || [],
              projects: parsed.projects || [],
              languages: parsed.languages || [],
              references: parsed.references,
            });
          }
          // Any shared hash → boot in preview mode.
          setPreviewMode(true);
        }
      } catch (e) {
        console.error("Failed to parse resume from URL", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsCheckingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data: sessionData }) => {
      setSession(sessionData.session);
      setIsCheckingAuth(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsCheckingAuth(false);
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (trackedInitialView.current) return;
    trackedInitialView.current = true;
    trackEvent('page_view', { template });
  }, [template]);

  const handleExitPreview = () => {
    setPreviewMode(false);
    // Clear the hash so refreshing or copying the URL doesn't re-enter preview.
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
  };

  const handleDataChange = (newData: ResumeData) => {
    setPast(prev => [...prev, data]);
    setData(newData);
    setFuture([]);
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture(prev => [data, ...prev]);
    setData(previous);
    setPast(newPast);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast(prev => [...prev, data]);
    setData(next);
    setFuture(newFuture);
  };

  const handleExportPdf = async () => {
    if (!componentRef.current) return;
    
    try {
      const { exportResumePdf } = await import('./lib/exportPdf');
      await exportResumePdf(componentRef.current, data.personalInfo.fullName);
      trackEvent('export_pdf', { template });
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportDocx = async () => {
    try {
      const { exportResumeDocx } = await import('./lib/exportDocx');
      await exportResumeDocx(data, template);
      trackEvent('export_docx', { template });
    } catch (error) {
      console.error('Failed to generate DOCX', error);
      alert('Failed to generate Word document. Please try again.');
    }
  };

  const renderTemplate = () => {
    switch (template) {
      case 'minimal':
        return <MinimalResume data={data} />;
      case 'modern':
        return <ModernResume data={data} />;
      case 'portfolio':
        return <GridPortfolio data={data} />;
      case 'europass':
        return <EuropassResume data={data} />;
      case 'harvard':
        return <HarvardResume data={data} />;
      case 'engineersaustralia':
        return <EngineersAustraliaResume data={data} />;
      case 'creative':
        return <CreativePortfolio data={data} />;
      case 'developer':
        return <DeveloperPortfolio data={data} />;
      case 'editorial':
        return <ExpressiveResume data={data} variant="editorial" />;
      case 'luxe':
        return <ExpressiveResume data={data} variant="luxe" />;
      case 'spectrum':
        return <ExpressiveResume data={data} variant="spectrum" />;
      case 'timeline':
        return <ExpressiveResume data={data} variant="timeline" />;
      case 'compact':
        return <ExpressiveResume data={data} variant="compact" />;
      case 'executive':
        return <ExpressiveResume data={data} variant="executive" />;
      case 'atelier':
        return <ExpressiveResume data={data} variant="atelier" />;
      case 'architect':
        return <ExpressiveResume data={data} variant="architect" />;
      case 'consultant':
        return <ExpressiveResume data={data} variant="consultant" />;
      case 'magazine':
        return <ExpressiveResume data={data} variant="magazine" />;
      case 'neoclassic':
        return <ExpressiveResume data={data} variant="neoclassic" />;
      default:
        return <MinimalResume data={data} />;
    }
  };

  const isSharedPreview = previewMode || Boolean(new URLSearchParams(window.location.search).get('share')) || isLegacyShareHash();

  if (!isSharedPreview && isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center font-sans text-gray-600">
        Checking access...
      </div>
    );
  }

  if (!isSharedPreview && !session) {
    return <AuthGate />;
  }

  if (previewMode) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans print:h-auto print:overflow-visible print:bg-white">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-gray-700 font-semibold truncate">
              {data.personalInfo.fullName ? `${data.personalInfo.fullName} — Resume` : 'Shared Resume'}
            </div>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExitPreview}
              className="text-sm text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 font-medium transition-colors"
            >
              Edit this resume
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-gray-200/50 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div className="w-full max-w-[1000px] print:max-w-none print:w-full">
            <div className="print:w-full print:h-full">
              <div ref={componentRef} data-resume-export-container>
                {renderTemplate()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar - Form */}
      <div className="print:hidden h-full">
        <Sidebar data={data} onChange={handleDataChange} template={template} />
      </div>

      {/* Main Content - Preview */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative print:overflow-visible print:h-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-700 font-semibold shrink-0">
              <LayoutTemplate size={20} />
              <span>Template</span>
            </div>
            <div className="relative">
              <select
                value={template}
                onChange={(e) => {
                  const nextTemplate = e.target.value as TemplateType;
                  setTemplate(nextTemplate);
                  trackEvent('template_change', { template: nextTemplate });
                }}
                className="appearance-none bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-800 text-sm font-medium rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[220px]"
              >
                {['Professional', 'Formal', 'Creative'].map((group) => (
                  <optgroup key={group} label={group}>
                    {TEMPLATE_OPTIONS.filter((o) => o.group === group).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
            {session?.user?.email && (
              <div className="hidden lg:block text-xs text-gray-500 max-w-[180px] truncate mr-2">
                {session.user.email}
              </div>
            )}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2">
              <button
                onClick={handleUndo}
                disabled={past.length === 0}
                className="p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Undo"
              >
                <Undo size={18} />
              </button>
              <button
                onClick={handleRedo}
                disabled={future.length === 0}
                className="p-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                title="Redo"
              >
                <Redo size={18} />
              </button>
            </div>
            
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Download size={18} />
              Export PDF
            </button>
            <button
              onClick={handleExportDocx}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Download size={18} />
              Export DOCX
            </button>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-200/50 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div className="w-full max-w-[1000px] transition-all duration-300 ease-in-out print:max-w-none print:w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={template}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="print:shadow-none print:m-0"
              >
                <div className="print:w-full print:h-full">
                  <div ref={componentRef} data-resume-export-container>
                    {renderTemplate()}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
