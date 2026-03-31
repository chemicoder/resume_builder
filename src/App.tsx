import React, { useState, useRef } from 'react';
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
import { Printer, LayoutTemplate, Download, FileText, Undo, Redo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';
// @ts-ignore
import html2pdf from 'html2pdf.js';

type TemplateType = 'minimal' | 'modern' | 'portfolio' | 'europass' | 'harvard' | 'engineersaustralia' | 'creative' | 'developer';

export default function App() {
  const [data, setData] = useState<ResumeData>(initialData);
  const [past, setPast] = useState<ResumeData[]>([]);
  const [future, setFuture] = useState<ResumeData[]>([]);
  const [template, setTemplate] = useState<TemplateType>('minimal');
  const componentRef = useRef<HTMLDivElement>(null);

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

  const handleExportPdf = () => {
    if (!componentRef.current) return;
    
    const element = componentRef.current;
    const opt = {
      margin:       0,
      filename:     `${data.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in' as const, format: 'a4', orientation: 'portrait' as const }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const handleExportDocx = async () => {
    if (!componentRef.current) return;
    
    const primaryColor = data.theme?.primary || '#2563eb';
    const accentColor = data.theme?.accent || '#3b82f6';

    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Resume</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.5; font-size: 11pt; }
            h1 { font-size: 24pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4pt; color: ${primaryColor}; }
            h2 { font-size: 14pt; margin-bottom: 12pt; color: ${accentColor}; }
            h3 { font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1pt solid ${primaryColor}; color: ${primaryColor}; padding-bottom: 2pt; margin-top: 16pt; margin-bottom: 8pt; }
            h4 { font-size: 11pt; font-weight: bold; margin: 0; color: ${accentColor}; }
            p { margin: 0 0 8pt 0; }
            .contact-info { font-size: 10pt; color: #555; margin-bottom: 16pt; }
            .job-meta { font-size: 10pt; color: #666; font-style: italic; }
            .job-company { font-size: 10pt; font-weight: bold; color: #333; }
            ul { margin-top: 4pt; margin-bottom: 8pt; padding-left: 20pt; }
            li { font-size: 10pt; margin-bottom: 2pt; }
            .tech { font-size: 9pt; color: #666; font-style: italic; }
          </style>
        </head>
        <body>
          <h1>${data.personalInfo.fullName}</h1>
          <h2>${data.personalInfo.jobTitle}</h2>
          <div class="contact-info">
            ${data.personalInfo.email ? `Email: ${data.personalInfo.email} | ` : ''}
            ${data.personalInfo.phone ? `Phone: ${data.personalInfo.phone} | ` : ''}
            ${data.personalInfo.location ? `Location: ${data.personalInfo.location}` : ''}
            <br/>
            ${data.personalInfo.website ? `Website: ${data.personalInfo.website} | ` : ''}
            ${data.personalInfo.linkedin ? `LinkedIn: ${data.personalInfo.linkedin} | ` : ''}
            ${data.personalInfo.github ? `GitHub: ${data.personalInfo.github}` : ''}
          </div>

          ${data.personalInfo.summary ? `
            <h3>Summary</h3>
            <p>${data.personalInfo.summary}</p>
          ` : ''}

          ${data.experience.length > 0 ? `
            <h3>Experience</h3>
            ${data.experience.map(exp => `
              <div>
                <h4>${exp.role}</h4>
                <p><span class="job-company">${exp.company}</span> | <span class="job-meta">${exp.startDate} - ${exp.endDate}</span></p>
                <ul>
                  ${exp.description.split('\n').filter(l => l.trim()).map(l => `<li>${l.replace(/^[•\-\*]\s*/, '')}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          ` : ''}

          ${data.projects.length > 0 ? `
            <h3>Projects</h3>
            ${data.projects.map(proj => `
              <div>
                <h4>${proj.name} ${proj.link ? `(${proj.link})` : ''}</h4>
                <p>${proj.description}</p>
                ${proj.technologies.length > 0 ? `<p class="tech">Technologies: ${proj.technologies.join(', ')}</p>` : ''}
              </div>
            `).join('')}
          ` : ''}

          ${data.education.length > 0 ? `
            <h3>Education</h3>
            ${data.education.map(edu => `
              <div>
                <h4>${edu.degree}</h4>
                <p><span class="job-company">${edu.institution}</span> | <span class="job-meta">${edu.startDate} - ${edu.endDate}</span></p>
                <p>${edu.description}</p>
              </div>
            `).join('')}
          ` : ''}

          ${data.skills.length > 0 ? `
            <h3>Skills</h3>
            <p>${data.skills.join(' • ')}</p>
          ` : ''}
        </body>
      </html>
    `;
    
    try {
      const result = await asBlob(htmlString);
      const blob = result instanceof Blob ? result : new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `${data.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.docx`);
    } catch (error) {
      console.error('Failed to export DOCX:', error);
      const fallbackBlob = new Blob(['\ufeff', htmlString], { type: 'application/msword' });
      saveAs(fallbackBlob, `${data.personalInfo.fullName.replace(/\s+/g, '_')}_Resume.doc`);
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
        <Sidebar data={data} onChange={handleDataChange} />
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
              onClick={handleExportDocx}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <FileText size={18} />
              Export DOCX
            </button>
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </header>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-200/50 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div ref={componentRef} className="w-full max-w-[1000px] transition-all duration-300 ease-in-out print:max-w-none print:w-full">
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
                  {renderTemplate()}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
