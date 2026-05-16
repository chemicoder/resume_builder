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
import { LayoutTemplate, Download, Undo, Redo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';

type TemplateType = 'minimal' | 'modern' | 'portfolio' | 'europass' | 'harvard' | 'engineersaustralia' | 'creative' | 'developer';

export default function App() {
  const [data, setData] = useState<ResumeData>(initialData);
  const [past, setPast] = useState<ResumeData[]>([]);
  const [future, setFuture] = useState<ResumeData[]>([]);
  const [template, setTemplate] = useState<TemplateType>('minimal');
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
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
              projects: parsed.data.projects || []
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
              projects: parsed.projects || []
            });
          }
        }
      } catch (e) {
        console.error("Failed to parse resume from URL", e);
      }
    }
  }, []);

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
    } catch (error) {
      console.error('Failed to generate PDF', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleExportDocx = async () => {
    try {
      const { exportResumeDocx } = await import('./lib/exportDocx');
      await exportResumeDocx(data, template);
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
      default:
        return <MinimalResume data={data} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar - Form */}
      <div className="print:hidden h-full">
        <Sidebar data={data} onChange={handleDataChange} template={template} />
      </div>

      {/* Main Content - Preview */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative print:overflow-visible print:h-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 overflow-x-auto print:hidden">
          <div className="flex items-center gap-4 min-w-max">
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <LayoutTemplate size={20} />
              <span>Template:</span>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              <button
                onClick={() => setTemplate('minimal')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'minimal' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Minimal
              </button>
              <button
                onClick={() => setTemplate('modern')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'modern' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Modern
              </button>
              <button
                onClick={() => setTemplate('portfolio')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'portfolio' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Portfolio
              </button>
              <button
                onClick={() => setTemplate('europass')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'europass' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Europass
              </button>
              <button
                onClick={() => setTemplate('harvard')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'harvard' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Harvard
              </button>
              <button
                onClick={() => setTemplate('engineersaustralia')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'engineersaustralia' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Engineers Australia
              </button>
              <button
                onClick={() => setTemplate('creative')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'creative' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Creative Portfolio
              </button>
              <button
                onClick={() => setTemplate('developer')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  template === 'developer' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dev Portfolio
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4 shrink-0">
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
