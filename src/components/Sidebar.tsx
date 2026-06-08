import React, { useState, useMemo } from 'react';
import { Language, LanguageLevel, LanguageSkills, ResumeData } from '../types';
import { User, Briefcase, GraduationCap, Code, FolderGit2, Plus, Trash2, Sparkles, Upload, Image as ImageIcon, Loader2, FileText, Palette, Link, Share2, Copy, Languages as LanguagesIcon, UserCheck } from 'lucide-react';
import { generateSummaryAI, generateProjectDescriptionAI, parseDocumentAI, tailorResumeAI } from '../lib/gemini';
import { createSharedResume, trackEvent } from '../lib/analytics';
import { FONT_OPTIONS } from '../lib/fonts';
import { parseResumeLocally } from '../lib/resumeParse';
import type { Entitlement } from '../lib/entitlements';
import { SALES_EMAIL } from '../lib/entitlements';
import { useToast } from './Toast';
import { copyToClipboard } from '../lib/clipboard';
import { QRCodeSVG } from 'qrcode.react';
import LZString from 'lz-string';

import * as mammoth from 'mammoth';

interface SidebarProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  template: string;
  entitlement: Entitlement;
}

function stripEmpty(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(stripEmpty).filter(val => val !== null && val !== undefined && val !== '');
  } else if (typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const key in obj) {
      const val = stripEmpty(obj[key]);
      if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0) && !(typeof val === 'object' && Object.keys(val).length === 0)) {
        newObj[key] = val;
      }
    }
    return newObj;
  }
  return obj;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function Sidebar({ data, onChange, template, entitlement }: SidebarProps) {
  const toast = useToast();
  const aiEnabled = entitlement.aiAccess;
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatingProjectIndex, setGeneratingProjectIndex] = useState<number | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  const handleTailorResume = async () => {
    if (!aiEnabled) {
      toast(`Tailoring is a paid AI feature. Email ${SALES_EMAIL} to enable AI access.`, 'info');
      return;
    }
    if (!data.targetJob?.description) {
      toast('Please provide a job description to tailor the resume.', 'info');
      return;
    }
    setIsTailoring(true);
    try {
      const { updatedResume, atsScore } = await tailorResumeAI(data, data.targetJob.description, data.targetJob.url);
      onChange({
        ...updatedResume,
        atsScore,
        targetJob: data.targetJob
      });
      trackEvent('ai_tailor', { template, metadata: { atsScore } });
      toast(`Resume tailored. ATS match score: ${atsScore}/100.`, 'success');
    } catch (error) {
      console.error(error);
      toast(getErrorMessage(error, 'Failed to tailor resume. Please try again.'), 'error');
    } finally {
      setIsTailoring(false);
    }
  };

  const fallbackShareUrl = useMemo(() => {
    const dataToShare = { ...data };
    if (dataToShare.personalInfo) {
      dataToShare.personalInfo = { ...dataToShare.personalInfo };
      delete dataToShare.personalInfo.profilePicture;
    }
    const strippedData = stripEmpty(dataToShare);
    const payload = { data: strippedData, template };
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    return `${window.location.origin}${window.location.pathname}#${compressed}`;
  }, [data, template]);

  const activeShareUrl = shareUrl || fallbackShareUrl;

  const handleCreateShare = async () => {
    setIsCreatingShare(true);
    try {
      const shared = await createSharedResume(data, template);
      setShareUrl(shared.url);
      setShowQR(true);
      trackEvent('share_created', { template, metadata: { slug: shared.slug, mode: shared.mode || 'server' } });
      toast('Share link created.', 'success');
    } catch (error) {
      console.error('Failed to create server share link', error);
      setShareUrl('');
      setShowQR(true);
      trackEvent('share_created', { template, metadata: { mode: 'legacy_hash_fallback' } });
      toast('Created an offline share link (server unavailable).', 'info');
    } finally {
      setIsCreatingShare(false);
    }
  };

  const handlePersonalInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [e.target.name]: e.target.value }
    });
  };

  const handleArrayChange = (field: keyof ResumeData, index: number, key: string, value: string) => {
    const newArray = [...(data[field] as any[])];
    newArray[index] = { ...newArray[index], [key]: value };
    onChange({ ...data, [field]: newArray });
  };

  const addArrayItem = (field: keyof ResumeData, defaultItem: any) => {
    onChange({ ...data, [field]: [...(data[field] as any[]), { ...defaultItem, id: Date.now().toString() }] });
  };

  const removeArrayItem = (field: keyof ResumeData, index: number) => {
    const newArray = [...(data[field] as any[])];
    newArray.splice(index, 1);
    onChange({ ...data, [field]: newArray });
  };

  // Split comma-separated input into a clean array. We keep a single trailing
  // empty entry while the user is mid-type (so the comma they just pressed
  // isn't deleted under their cursor), but drop empties everywhere else so
  // templates never render stray bullets / "•  •" separators.
  const splitCsv = (value: string): string[] => {
    const parts = value.split(',').map((s) => s.trim());
    return parts.filter((part, index) => part !== '' || index === parts.length - 1);
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, skills: splitCsv(e.target.value) });
  };

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({
          ...data,
          personalInfo: { ...data.personalInfo, profilePicture: reader.result as string }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []) as File[];
    // Reset the input so re-uploading the same file fires the change again.
    e.currentTarget.value = '';
    if (files.length === 0) return;

    setIsParsing(true);
    try {
      if (aiEnabled) {
        // AI path: package all files (PDFs, images, certificates) and let
        // Gemini extract fields. This is the full-fidelity option.
        const filePromises = files.map(async file => {
          if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const blob = new Blob([result.value], { type: 'text/plain' });
            return new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ base64, mimeType: 'text/plain' });
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
          return new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({ base64, mimeType: file.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        const processedFiles = await Promise.all(filePromises);
        const parsedData = await parseDocumentAI(data, processedFiles);
        onChange(parsedData);
        trackEvent('ai_import', { template, metadata: { source: 'upload', fileCount: files.length } });
        toast(`Extracted details from ${files.length} file${files.length > 1 ? 's' : ''}.`, 'success');
      } else {
        // Free path: a local heuristic parser handles a single resume PDF or
        // DOCX file. Only one file at a time, and only resume-shaped inputs.
        if (files.length > 1) {
          toast(`Multi-file extraction is a paid AI feature. Free import accepts a single PDF or Word file. Email ${SALES_EMAIL} for bulk import.`, 'info');
          return;
        }
        const file = files[0];
        const lowerName = file.name.toLowerCase();
        const isResumeFormat =
          file.type === 'application/pdf' ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          lowerName.endsWith('.pdf') ||
          lowerName.endsWith('.docx');
        if (!isResumeFormat) {
          toast(`Free import supports PDF or Word resumes only. Images, certificates, and transcripts require AI — email ${SALES_EMAIL}.`, 'info');
          return;
        }
        const parsed = await parseResumeLocally(file, data);
        onChange(parsed);
        trackEvent('ai_import', { template, metadata: { source: 'upload_local', fileCount: 1 } });
        toast('Imported from your resume. Review the fields and adjust as needed.', 'success');
      }
    } catch (error) {
      console.error("Failed to parse documents", error);
      toast(getErrorMessage(error, 'Failed to parse documents. Please try again.'), 'error');
    } finally {
      setIsParsing(false);
    }
  };

  const handleUrlImport = async () => {
    if (!documentUrl) return;
    if (!aiEnabled) {
      toast(`URL import uses AI extraction, a paid feature. Email ${SALES_EMAIL} to enable AI access.`, 'info');
      return;
    }
    setIsParsing(true);
    try {
      const parsedData = await parseDocumentAI(data, undefined, documentUrl);
      onChange(parsedData);
      trackEvent('ai_import', { template, metadata: { source: 'url' } });
      setDocumentUrl('');
      toast('Imported details from the link.', 'success');
    } catch (error) {
      console.error("Failed to parse URL", error);
      const message = getErrorMessage(error, "Failed to extract data from URL. Please try again.");
      if (documentUrl.includes('linkedin.com')) {
        toast("LinkedIn blocks automated access. On your profile, use 'More' → 'Save to PDF' and upload the PDF instead.", 'error');
      } else {
        toast(message, 'error');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!aiEnabled) {
      toast(`Summary generation is a paid AI feature. Email ${SALES_EMAIL} to enable AI access.`, 'info');
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const summary = await generateSummaryAI(data.personalInfo.jobTitle, data.skills, data.experience);
      if (summary) {
        onChange({
          ...data,
          personalInfo: { ...data.personalInfo, summary }
        });
        trackEvent('ai_summary', { template });
      }
    } catch (error) {
      console.error(error);
      toast(getErrorMessage(error, 'Failed to generate summary.'), 'error');
    }
    setIsGeneratingSummary(false);
  };

  const handleGenerateProjectDesc = async (index: number) => {
    if (!aiEnabled) {
      toast(`Project description AI is a paid feature. Email ${SALES_EMAIL} to enable AI access.`, 'info');
      return;
    }
    const proj = data.projects[index];
    setGeneratingProjectIndex(index);
    try {
      const desc = await generateProjectDescriptionAI(proj.name, proj.technologies);
      if (desc) {
        handleArrayChange('projects', index, 'description', desc);
        trackEvent('ai_project', { template });
      }
    } catch (error) {
      console.error(error);
      toast(getErrorMessage(error, 'Failed to generate project description.'), 'error');
    }
    setGeneratingProjectIndex(null);
  };

  return (
    <div className="w-full md:w-[450px] h-full overflow-y-auto bg-white border-r border-gray-200 p-6 space-y-8">
      
      {/* Share Section */}
      <section className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3 text-purple-800 font-semibold w-full">
          <Share2 size={18} />
          <h3>Share Resume</h3>
        </div>
        {!showQR ? (
          <button
            onClick={handleCreateShare}
            disabled={isCreatingShare}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-colors text-sm font-medium mb-2"
          >
            {isCreatingShare ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            {isCreatingShare ? 'Creating Share Link...' : 'Generate Share Link & QR Code'}
          </button>
        ) : (
          <>
            {activeShareUrl.length <= 2900 ? (
              <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm mb-3 inline-flex flex-col items-center self-center">
                <QRCodeSVG value={activeShareUrl} size={140} level="M" marginSize={2} />
              </div>
            ) : (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-700 text-xs shadow-sm mb-3 w-full text-center">
                Resume data is too large for a QR code. Use the copy link button below.
              </div>
            )}
            <p className="text-xs text-purple-600 mb-3 text-center">Recipients open this link in preview mode with a one-click "Download PDF" button — no edits required.</p>
            <button
              onClick={async () => {
                const ok = await copyToClipboard(activeShareUrl);
                toast(ok ? 'Link copied to clipboard.' : 'Could not copy automatically — select and copy the link manually.', ok ? 'success' : 'error');
              }}
              className="w-full flex items-center justify-center gap-2 bg-white border border-purple-200 text-purple-700 py-2 rounded hover:bg-purple-100 transition-colors text-sm font-medium"
            >
              <Copy size={14} />
              Copy Share Link
            </button>
          </>
        )}
      </section>

      {/* Import Section */}
      <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-blue-800 font-semibold">
            <FileText size={18} />
            <h3>Smart Import</h3>
          </div>
          <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${aiEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
            {aiEnabled ? 'AI enabled' : 'Free mode'}
          </span>
        </div>
        <p className="text-xs text-blue-600 mb-3">
          {aiEnabled
            ? 'Upload multiple PDFs or images (resumes, transcripts, certificates) or provide a link to auto-fill the form using AI.'
            : 'Free import: upload a single resume in PDF or Word format to auto-fill the form. We extract text locally — no AI is used.'}
        </p>

        <div className="space-y-3">
          <label className="flex items-center justify-center gap-2 w-full bg-white border border-blue-200 text-blue-600 py-2 rounded cursor-pointer hover:bg-blue-50 transition-colors">
            {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="text-sm font-medium">
              {isParsing ? 'Parsing Documents...' : aiEnabled ? 'Upload Documents (AI)' : 'Upload Resume (PDF / Word)'}
            </span>
            <input
              type="file"
              multiple={aiEnabled}
              accept={aiEnabled ? 'application/pdf,image/*,.doc,.docx,.txt' : 'application/pdf,.pdf,.docx'}
              className="hidden"
              onChange={handleResumeUpload}
              disabled={isParsing}
            />
          </label>

          <div className="flex gap-2">
            <input
              type="url"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder={aiEnabled ? 'Paste LinkedIn or Portfolio URL' : 'URL import requires AI access'}
              className="flex-1 p-2 text-sm border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isParsing || !aiEnabled}
              title={aiEnabled ? undefined : 'URL extraction is a paid AI feature'}
            />
            <button
              onClick={handleUrlImport}
              disabled={isParsing || !documentUrl || !aiEnabled}
              className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
              title={aiEnabled ? undefined : 'URL extraction is a paid AI feature'}
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
            </button>
          </div>
          {documentUrl.includes('linkedin.com') && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              Note: LinkedIn often blocks automated access. If the import fails or is incomplete, please use the "Save to PDF" option on your LinkedIn profile and upload the PDF instead.
            </p>
          )}
          {!aiEnabled && (
            <p className="text-[11px] text-gray-600 bg-white/60 border border-blue-100 rounded p-2 leading-relaxed">
              <span className="font-semibold text-gray-800">AI extraction is a paid feature.</span> Unlock multi-file upload (images, transcripts, certificates), URL import (LinkedIn), AI summary writing, and ATS tailoring by contacting <a href={`mailto:${SALES_EMAIL}`} className="text-blue-700 underline">{SALES_EMAIL}</a>.
            </p>
          )}
        </div>
      </section>

      {/* Theme & Settings */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800">
          <Palette size={20} />
          <h2>Theme & Settings</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Primary Color</label>
              <input
                type="color"
                value={data.theme?.primary || '#2563eb'}
                onChange={(e) => onChange({...data, theme: {...data.theme, primary: e.target.value}})}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Accent Color</label>
              <input
                type="color"
                value={data.theme?.accent || '#3b82f6'}
                onChange={(e) => onChange({...data, theme: {...data.theme, accent: e.target.value}})}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Body Text Color <span className="text-gray-400">(optional)</span></label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={data.theme?.bodyText || '#1f2937'}
                  onChange={(e) => onChange({...data, theme: {...data.theme, bodyText: e.target.value}})}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <span className="text-xs text-gray-500 font-mono flex-1 truncate">
                  {data.theme?.bodyText || 'Template default'}
                </span>
                {data.theme?.bodyText && (
                  <button
                    type="button"
                    onClick={() => {
                      const { bodyText: _bodyText, ...rest } = data.theme;
                      onChange({...data, theme: rest as typeof data.theme});
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 whitespace-nowrap"
                    title="Reset to template default"
                  >
                    Reset
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Overrides the body text color across the resume. Headings still use Primary/Accent.</p>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Font Family <span className="text-gray-400">(optional)</span></label>
            <div className="flex items-center gap-2">
              <select
                value={data.theme?.fontFamily || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) {
                    const { fontFamily: _fontFamily, ...rest } = data.theme;
                    onChange({ ...data, theme: rest as typeof data.theme });
                  } else {
                    onChange({ ...data, theme: { ...data.theme, fontFamily: value } });
                  }
                }}
                className="flex-1 p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">— Template default —</option>
                {(['Sans-serif', 'Serif', 'Monospace', 'Display'] as const).map((group) => (
                  <optgroup key={group} label={group}>
                    {FONT_OPTIONS.filter((o) => o.group === group).map((o) => (
                      <option key={o.value} value={o.value} style={{ fontFamily: o.css }}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Applies to preview, PDF, and Word. Word-installed fonts give the best DOCX results.</p>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.showQrCode || false} 
                onChange={(e) => onChange({...data, showQrCode: e.target.checked})} 
                className="rounded text-blue-600 focus:ring-blue-500" 
              />
              <span className="text-sm text-gray-700">Show QR Code in Header</span>
            </label>
            {data.showQrCode && (
              <div className="space-y-3 mt-3 pl-6 border-l-2 border-gray-100">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">QR Code Link</label>
                  <input 
                    type="text" 
                    value={data.qrCodeLink || ''} 
                    onChange={(e) => onChange({...data, qrCodeLink: e.target.value})} 
                    placeholder="https://linkedin.com/in/yourprofile" 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">QR Code Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={data.theme?.qrCodeColor || '#000000'} 
                      onChange={(e) => onChange({...data, theme: {...data.theme, qrCodeColor: e.target.value}})} 
                      className="w-8 h-8 rounded cursor-pointer" 
                    />
                    <span className="text-xs text-gray-500 font-mono">{data.theme?.qrCodeColor || '#000000'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Personal Info */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800">
          <User size={20} />
          <h2>Personal Information</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
              {data.personalInfo.profilePicture ? (
                <img src={data.personalInfo.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={24} className="text-gray-400" />
              )}
            </div>
            <label className="flex-1 bg-gray-50 border border-gray-200 text-gray-600 py-2 px-3 rounded cursor-pointer hover:bg-gray-100 transition-colors text-sm text-center">
              Upload Profile Picture
              <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
            </label>
          </div>

          <input type="text" name="fullName" value={data.personalInfo.fullName} onChange={handlePersonalInfoChange} placeholder="Full Name" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" name="jobTitle" value={data.personalInfo.jobTitle} onChange={handlePersonalInfoChange} placeholder="Job Title" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <input type="email" name="email" value={data.personalInfo.email} onChange={handlePersonalInfoChange} placeholder="Email" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            <input type="text" name="phone" value={data.personalInfo.phone} onChange={handlePersonalInfoChange} placeholder="Phone" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <input type="text" name="location" value={data.personalInfo.location} onChange={handlePersonalInfoChange} placeholder="Location" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          
          <div className="relative">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-500">Professional Summary</span>
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                title={aiEnabled ? undefined : `Paid feature — contact ${SALES_EMAIL}`}
              >
                {isGeneratingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate with AI{!aiEnabled && <span className="ml-1 text-[9px] uppercase tracking-wide text-amber-600 font-semibold">PAID</span>}
              </button>
            </div>
            <textarea name="summary" value={data.personalInfo.summary} onChange={handlePersonalInfoChange} placeholder="Professional Summary" rows={4} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>

          <input type="text" name="website" value={data.personalInfo.website || ''} onChange={handlePersonalInfoChange} placeholder="Website URL" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" name="linkedin" value={data.personalInfo.linkedin || ''} onChange={handlePersonalInfoChange} placeholder="LinkedIn URL" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          <input type="text" name="github" value={data.personalInfo.github || ''} onChange={handlePersonalInfoChange} placeholder="GitHub URL" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </section>

      {/* Experience */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <Briefcase size={20} />
            <h2>Experience</h2>
          </div>
          <button onClick={() => addArrayItem('experience', { company: '', role: '', startDate: '', endDate: '', description: '' })} className="text-blue-600 hover:text-blue-800 p-1">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-6">
          {(data.experience || []).map((exp, index) => (
            <div key={exp.id} className="p-4 border border-gray-200 rounded-lg relative group bg-gray-50">
              <button onClick={() => removeArrayItem('experience', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
              <div className="space-y-3">
                <input type="text" value={exp.company} onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)} placeholder="Company" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                <input type="text" value={exp.role} onChange={(e) => handleArrayChange('experience', index, 'role', e.target.value)} placeholder="Role" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={exp.startDate} onChange={(e) => handleArrayChange('experience', index, 'startDate', e.target.value)} placeholder="Start Date" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  <input type="text" value={exp.endDate} onChange={(e) => handleArrayChange('experience', index, 'endDate', e.target.value)} placeholder="End Date" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
                <textarea value={exp.description} onChange={(e) => handleArrayChange('experience', index, 'description', e.target.value)} placeholder="Description" rows={3} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <GraduationCap size={20} />
            <h2>Education</h2>
          </div>
          <button onClick={() => addArrayItem('education', { institution: '', degree: '', startDate: '', endDate: '', description: '' })} className="text-blue-600 hover:text-blue-800 p-1">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-6">
          {(data.education || []).map((edu, index) => (
            <div key={edu.id} className="p-4 border border-gray-200 rounded-lg relative group bg-gray-50">
              <button onClick={() => removeArrayItem('education', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
              <div className="space-y-3">
                <input type="text" value={edu.institution} onChange={(e) => handleArrayChange('education', index, 'institution', e.target.value)} placeholder="Institution" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                <input type="text" value={edu.degree} onChange={(e) => handleArrayChange('education', index, 'degree', e.target.value)} placeholder="Degree" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={edu.startDate} onChange={(e) => handleArrayChange('education', index, 'startDate', e.target.value)} placeholder="Start Date" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  <input type="text" value={edu.endDate} onChange={(e) => handleArrayChange('education', index, 'endDate', e.target.value)} placeholder="End Date" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                </div>
                <textarea value={edu.description} onChange={(e) => handleArrayChange('education', index, 'description', e.target.value)} placeholder="Description" rows={2} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800">
          <Code size={20} />
          <h2>Skills</h2>
        </div>
        <textarea 
          value={(data.skills || []).join(', ')} 
          onChange={handleSkillsChange} 
          placeholder="React, Node.js, TypeScript (comma separated)" 
          rows={3} 
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
        />
      </section>

      {/* Projects */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <FolderGit2 size={20} />
            <h2>Projects</h2>
          </div>
          <button onClick={() => addArrayItem('projects', { name: '', description: '', link: '', technologies: [] })} className="text-blue-600 hover:text-blue-800 p-1">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-6">
          {(data.projects || []).map((proj, index) => (
            <div key={proj.id} className="p-4 border border-gray-200 rounded-lg relative group bg-gray-50">
              <button onClick={() => removeArrayItem('projects', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
              <div className="space-y-3">
                <input type="text" value={proj.name} onChange={(e) => handleArrayChange('projects', index, 'name', e.target.value)} placeholder="Project Name" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                <input type="text" value={proj.link || ''} onChange={(e) => handleArrayChange('projects', index, 'link', e.target.value)} placeholder="Project Link" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-500">Description</span>
                    <button
                      onClick={() => handleGenerateProjectDesc(index)}
                      disabled={generatingProjectIndex === index}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                      title={aiEnabled ? undefined : `Paid feature — contact ${SALES_EMAIL}`}
                    >
                      {generatingProjectIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generate with AI{!aiEnabled && <span className="ml-1 text-[9px] uppercase tracking-wide text-amber-600 font-semibold">PAID</span>}
                    </button>
                  </div>
                  <textarea value={proj.description} onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value)} placeholder="Description" rows={3} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" />
                </div>

                <input 
                  type="text" 
                  value={(proj.technologies || []).join(', ')} 
                  onChange={(e) => {
                    const newArray = [...data.projects];
                    newArray[index] = { ...newArray[index], technologies: splitCsv(e.target.value) };
                    onChange({ ...data, projects: newArray });
                  }}
                  placeholder="Technologies (comma separated)" 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Languages */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <LanguagesIcon size={20} />
            <h2>Languages</h2>
          </div>
          <button onClick={() => addArrayItem('languages', { name: '', level: 'B2' })} className="text-blue-600 hover:text-blue-800 p-1">
            <Plus size={20} />
          </button>
        </div>
        <div className="space-y-3">
          {(data.languages || []).map((lang, index) => (
            <LanguageRow
              key={lang.id}
              lang={lang}
              onNameChange={(name) => handleArrayChange('languages', index, 'name', name)}
              onLevelChange={(level) => handleArrayChange('languages', index, 'level', level)}
              onSkillsChange={(skills: LanguageSkills | undefined) => {
                const next = [...(data.languages || [])];
                if (skills) {
                  next[index] = { ...next[index], skills };
                } else {
                  const { skills: _omit, ...rest } = next[index];
                  next[index] = rest;
                }
                onChange({ ...data, languages: next });
              }}
              onRemove={() => removeArrayItem('languages', index)}
            />
          ))}
        </div>
      </section>

      {/* References (optional)
          Visibility convention:
            - data.references === undefined → section hidden from resume entirely
            - data.references === []        → section shows "Available on request"
            - data.references === [refs]    → section shows the references */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
            <UserCheck size={20} />
            <h2>References <span className="text-xs font-normal text-gray-400">(optional)</span></h2>
          </div>
          <button
            onClick={() => addArrayItem('references', { name: '', role: '', organization: '', email: '', phone: '' })}
            disabled={data.references === undefined}
            className="text-blue-600 hover:text-blue-800 p-1 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Add reference"
            title={data.references === undefined ? 'Enable the section first' : 'Add reference'}
          >
            <Plus size={20} />
          </button>
        </div>
        <label className="flex items-start gap-2 mb-3 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={data.references !== undefined}
            onChange={(e) => onChange({ ...data, references: e.target.checked ? (data.references || []) : undefined })}
            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
          />
          <span>
            Show References section in the resume
            <span className="block text-xs text-gray-500 mt-0.5">
              Uncheck to omit this section entirely. When checked but empty, the resume shows "Available on request".
            </span>
          </span>
        </label>
        {data.references !== undefined && (
          <div className="space-y-6">
            {data.references.map((ref, index) => (
              <div key={ref.id} className="p-4 border border-gray-200 rounded-lg relative group bg-gray-50">
                <button onClick={() => removeArrayItem('references', index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={16} />
                </button>
                <div className="space-y-3">
                  <input type="text" value={ref.name} onChange={(e) => handleArrayChange('references', index, 'name', e.target.value)} placeholder="Full name" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={ref.role} onChange={(e) => handleArrayChange('references', index, 'role', e.target.value)} placeholder="Role / title" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                    <input type="text" value={ref.organization} onChange={(e) => handleArrayChange('references', index, 'organization', e.target.value)} placeholder="Organization" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="email" value={ref.email} onChange={(e) => handleArrayChange('references', index, 'email', e.target.value)} placeholder="Email" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                    <input type="text" value={ref.phone} onChange={(e) => handleArrayChange('references', index, 'phone', e.target.value)} placeholder="Phone" className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ATS Optimization Section */}
      <section className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold">
            <Sparkles size={18} />
            <h3>ATS Optimization</h3>
          </div>
          <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded ${aiEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {aiEnabled ? 'AI enabled' : 'Paid feature'}
          </span>
        </div>
        <p className="text-xs text-emerald-600 mb-3">Tailor your resume to a specific job description to improve your ATS match score.</p>
        {!aiEnabled && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-3 leading-relaxed">
            ATS scoring &amp; tailoring uses AI and requires an active plan. Email <a href={`mailto:${SALES_EMAIL}`} className="underline font-semibold">{SALES_EMAIL}</a> to unlock.
          </p>
        )}

        {data.atsScore !== undefined && (
          <div className="mb-4 bg-white p-3 rounded border border-emerald-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Current ATS Score:</span>
            <span className={`text-lg font-bold ${data.atsScore >= 80 ? 'text-emerald-600' : data.atsScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
              {data.atsScore}/100
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Job URL (Optional)</label>
            <input
              type="url"
              value={data.targetJob?.url || ''}
              onChange={(e) => onChange({ ...data, targetJob: { ...data.targetJob, description: data.targetJob?.description || '', url: e.target.value } })}
              placeholder="https://company.com/jobs/123"
              className="w-full p-2 text-sm border border-emerald-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
              disabled={isTailoring}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Job Description</label>
            <textarea
              value={data.targetJob?.description || ''}
              onChange={(e) => onChange({ ...data, targetJob: { ...data.targetJob, url: data.targetJob?.url, description: e.target.value } })}
              placeholder="Paste the full job description here..."
              className="w-full p-2 text-sm border border-emerald-200 rounded focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px] resize-y"
              disabled={isTailoring}
            />
          </div>
          <button
            onClick={handleTailorResume}
            disabled={isTailoring || !data.targetJob?.description || !aiEnabled}
            className="w-full bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            title={aiEnabled ? undefined : `Paid feature — contact ${SALES_EMAIL}`}
          >
            {isTailoring ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span className="text-sm font-medium">{isTailoring ? 'Tailoring Resume...' : aiEnabled ? 'Tailor Resume & Get Score' : 'Tailor Resume (Paid)'}</span>
          </button>
        </div>
      </section>

    </div>
  );
}

const LEVEL_OPTIONS: { value: LanguageLevel; label: string }[] = [
  { value: 'A1', label: 'A1 (Beginner)' },
  { value: 'A2', label: 'A2 (Elementary)' },
  { value: 'B1', label: 'B1 (Intermediate)' },
  { value: 'B2', label: 'B2 (Upper Intermediate)' },
  { value: 'C1', label: 'C1 (Advanced)' },
  { value: 'C2', label: 'C2 (Proficient)' },
  { value: 'Native', label: 'Native' },
];

const SKILL_FIELDS: { key: keyof LanguageSkills; label: string; group: string }[] = [
  { key: 'listening', label: 'Listening', group: 'Understanding' },
  { key: 'reading', label: 'Reading', group: 'Understanding' },
  { key: 'spokenInteraction', label: 'Interaction', group: 'Speaking' },
  { key: 'spokenProduction', label: 'Production', group: 'Speaking' },
  { key: 'writing', label: 'Writing', group: 'Writing' },
];

interface LanguageRowProps {
  lang: Language;
  onNameChange: (name: string) => void;
  onLevelChange: (level: string) => void;
  onSkillsChange: (skills: LanguageSkills | undefined) => void;
  onRemove: () => void;
}

const LanguageRow: React.FC<LanguageRowProps> = ({ lang, onNameChange, onLevelChange, onSkillsChange, onRemove }) => {
  const [expanded, setExpanded] = useState(Boolean(lang.skills));
  const skills = lang.skills || {};

  const setSkill = (key: keyof LanguageSkills, value: string) => {
    const nextValue = value ? (value as LanguageLevel) : undefined;
    const next: LanguageSkills = { ...skills, [key]: nextValue };
    // If every sub-skill is unset, drop the object entirely so templates
    // know to fall back to the overall level.
    const isEmpty = SKILL_FIELDS.every(({ key: k }) => !next[k]);
    onSkillsChange(isEmpty ? undefined : next);
  };

  return (
    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 group">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={lang.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Language (e.g. English)"
          className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
        />
        <select
          value={lang.level}
          onChange={(e) => onLevelChange(e.target.value)}
          className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
        >
          {LEVEL_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1" aria-label="Remove language">
          <Trash2 size={16} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-blue-600 hover:text-blue-800 mt-2"
      >
        {expanded ? 'Hide per-skill levels' : 'Set per-skill levels (CEFR)'}
      </button>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Override individual CEFR sub-skill levels (used by Europass). Leave a row blank to fall back to the overall level above.</p>
          <div className="grid grid-cols-2 gap-2">
            {SKILL_FIELDS.map(({ key, label, group }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wide text-gray-500">
                  <span className="text-gray-400">{group}:</span> {label}
                </label>
                <select
                  value={skills[key] || ''}
                  onChange={(e) => setSkill(key, e.target.value)}
                  className="p-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white text-xs"
                >
                  <option value="">— same as overall ({lang.level}) —</option>
                  {LEVEL_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.value}</option>))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
