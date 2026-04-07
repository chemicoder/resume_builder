import React, { useState, useMemo } from 'react';
import { ResumeData } from '../types';
import { User, Briefcase, GraduationCap, Code, FolderGit2, Plus, Trash2, Sparkles, Upload, Image as ImageIcon, Loader2, FileText, Palette, Link, Share2, Copy, Target, BarChart2, Wand2 } from 'lucide-react';
import { generateSummaryAI, generateProjectDescriptionAI, parseDocumentAI, calculateATSScore, alignResumeToJob, ATSScoreResult, getStoredApiKey, setStoredApiKey } from '../lib/gemini';
import { QRCodeSVG } from 'qrcode.react';
import LZString from 'lz-string';

import * as mammoth from 'mammoth';

interface SidebarProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
  template: string;
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

export default function Sidebar({ data, onChange, template }: SidebarProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatingProjectIndex, setGeneratingProjectIndex] = useState<number | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [atsScore, setAtsScore] = useState<ATSScoreResult | null>(null);
  const [isCalculatingATS, setIsCalculatingATS] = useState(false);
  const [jobInput, setJobInput] = useState('');
  const [isAligningResume, setIsAligningResume] = useState(false);
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKey.trim());
    setApiKey(apiKey.trim());
    setShowApiKeyInput(false);
  };

  const requireApiKey = (): boolean => {
    if (!getStoredApiKey()) {
      setShowApiKeyInput(true);
      return false;
    }
    return true;
  };

  const shareUrl = useMemo(() => {
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

  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...data, skills: e.target.value.split(',').map(s => s.trim()) });
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
    const files = Array.from<File>(e.target.files || []);
    if (files.length === 0) return;
    if (!requireApiKey()) return;
    
    setIsParsing(true);
    try {
      const filePromises = files.map(async file => {
        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
          try {
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
          } catch (e) {
            console.error("Failed to parse DOCX", e);
            throw e;
          }
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
      
      // Preserve profile picture if it exists and wasn't updated
      if (data.personalInfo.profilePicture && !parsedData.personalInfo.profilePicture) {
        parsedData.personalInfo.profilePicture = data.personalInfo.profilePicture;
      }
      onChange(parsedData);
    } catch (error) {
      console.error("Failed to parse documents", error);
      alert("Failed to parse documents. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleUrlImport = async () => {
    if (!documentUrl) return;
    if (!requireApiKey()) return;
    setIsParsing(true);
    try {
      const parsedData = await parseDocumentAI(data, undefined, documentUrl);
      if (data.personalInfo.profilePicture && !parsedData.personalInfo.profilePicture) {
        parsedData.personalInfo.profilePicture = data.personalInfo.profilePicture;
      }
      onChange(parsedData);
      setDocumentUrl('');
    } catch (error) {
      console.error("Failed to parse URL", error);
      alert("Failed to extract data from URL. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!requireApiKey()) return;
    setIsGeneratingSummary(true);
    try {
      const summary = await generateSummaryAI(data.personalInfo.jobTitle, data.skills, data.experience);
      if (summary) {
        onChange({
          ...data,
          personalInfo: { ...data.personalInfo, summary }
        });
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate summary.");
    }
    setIsGeneratingSummary(false);
  };

  const handleGenerateProjectDesc = async (index: number) => {
    if (!requireApiKey()) return;
    const proj = data.projects[index];
    setGeneratingProjectIndex(index);
    try {
      const desc = await generateProjectDescriptionAI(proj.name, proj.technologies);
      if (desc) {
        handleArrayChange('projects', index, 'description', desc);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate project description.");
    }
    setGeneratingProjectIndex(null);
  };

  const handleCalculateATS = async () => {
    if (!requireApiKey()) return;
    setIsCalculatingATS(true);
    try {
      const result = await calculateATSScore(data, jobInput || undefined);
      setAtsScore(result);
    } catch (error) {
      console.error(error);
      alert("Failed to calculate ATS score. Please try again.");
    } finally {
      setIsCalculatingATS(false);
    }
  };

  const handleAlignResume = async () => {
    if (!jobInput.trim()) {
      alert("Please enter a job description or job URL first.");
      return;
    }
    if (!requireApiKey()) return;
    setIsAligningResume(true);
    try {
      const result = await alignResumeToJob(data, jobInput);
      const updatedExperience = data.experience.map(exp => {
        const updated = result.experience?.find((e: { id: string; description: string }) => e.id === exp.id);
        return updated ? { ...exp, description: updated.description } : exp;
      });
      onChange({
        ...data,
        personalInfo: { ...data.personalInfo, summary: result.summary || data.personalInfo.summary },
        experience: updatedExperience,
      });
    } catch (error) {
      console.error(error);
      alert("Failed to align resume. Please try again.");
    } finally {
      setIsAligningResume(false);
    }
  };

  return (
    <div className="w-full md:w-[450px] h-full overflow-y-auto bg-white border-r border-gray-200 p-6 space-y-8">

      {/* Gemini API Key Section */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
            <Sparkles size={16} />
            <span>Gemini AI Key</span>
          </div>
          <button
            onClick={() => setShowApiKeyInput(v => !v)}
            aria-label={getStoredApiKey() ? 'Change API key' : 'Open API key input form'}
            className="text-xs text-blue-600 hover:underline"
          >
            {getStoredApiKey() ? 'Change' : 'Set up'}
          </button>
        </div>
        {!getStoredApiKey() && !showApiKeyInput && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            A Gemini API key is required for AI features (Smart Import, ATS Score, AI suggestions). <button onClick={() => setShowApiKeyInput(true)} className="underline font-medium">Add your key</button> to enable them. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">aistudio.google.com</a>.
          </p>
        )}
        {showApiKeyInput && (
          <div className="space-y-2 mt-2">
            <p className="text-xs text-gray-500">Your key is stored only in your browser's local storage and is never sent anywhere except directly to Google's API.</p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKey.trim()}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Save Key
              </button>
              <button
                onClick={() => setShowApiKeyInput(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {getStoredApiKey() && !showApiKeyInput && (
          <p className="text-xs text-green-700 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
            API key configured
          </p>
        )}
      </section>

      {/* Job Alignment Section */}
      <section className="bg-green-50 p-4 rounded-lg border border-green-100">
        <div className="flex items-center gap-2 mb-2 text-green-800 font-semibold">
          <Wand2 size={18} />
          <h3>Align Resume to Job</h3>
        </div>
        <p className="text-xs text-green-700 mb-3">Paste a job description or a job posting URL. AI will rewrite your summary and experience to match the role.</p>
        <textarea
          value={jobInput}
          onChange={(e) => setJobInput(e.target.value)}
          placeholder="Paste job description text or a job posting URL here…"
          rows={5}
          disabled={isAligningResume}
          className="w-full p-2 text-sm border border-green-200 rounded focus:ring-2 focus:ring-green-500 outline-none resize-none mb-3"
        />
        <button
          onClick={handleAlignResume}
          disabled={isAligningResume || !jobInput.trim()}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {isAligningResume ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          {isAligningResume ? 'Aligning Resume…' : 'Align Resume to Job'}
        </button>
      </section>

      {/* ATS Score Section */}
      <section className="bg-orange-50 p-4 rounded-lg border border-orange-100">
        <div className="flex items-center gap-2 mb-2 text-orange-800 font-semibold">
          <Target size={18} />
          <h3>ATS Score</h3>
        </div>
        <p className="text-xs text-orange-700 mb-3">
          {jobInput.trim() ? 'Score is calculated against the job description above.' : 'Analyze your resume\'s ATS compatibility. Add a job description above for a targeted score.'}
        </p>
        {atsScore && (
          <div className="mb-4">
            {/* Overall score ring */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0 ${atsScore.overall >= 75 ? 'bg-green-500' : atsScore.overall >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                {Math.round(atsScore.overall)}
              </div>
              <div>
                <p className={`font-semibold text-sm ${atsScore.overall >= 75 ? 'text-green-700' : atsScore.overall >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                  {atsScore.overall >= 75 ? 'Good ATS Match' : atsScore.overall >= 50 ? 'Needs Improvement' : 'Poor ATS Match'}
                </p>
                <p className="text-xs text-gray-500">out of 100</p>
              </div>
            </div>
            {/* Breakdown bars */}
            <div className="space-y-2 mb-4">
              {(Object.entries(atsScore.breakdown) as [string, number][]).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-gray-600 capitalize">{key}</span>
                    <span className="text-xs font-semibold text-gray-700">{Math.round(value)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, Math.round(value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Suggestions */}
            {atsScore.suggestions.length > 0 && (
              <div className="bg-white rounded-lg border border-orange-100 p-3">
                <div className="flex items-center gap-1 mb-2 text-orange-700">
                  <BarChart2 size={13} />
                  <span className="text-xs font-semibold">Suggestions</span>
                </div>
                <ul className="space-y-1">
                  {atsScore.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                      <span className="text-orange-400 shrink-0">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleCalculateATS}
          disabled={isCalculatingATS}
          className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-2 rounded hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {isCalculatingATS ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
          {isCalculatingATS ? 'Analyzing Resume…' : atsScore ? 'Re-analyze ATS Score' : 'Calculate ATS Score'}
        </button>
      </section>

      {/* Share Section */}
      <section className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-3 text-purple-800 font-semibold w-full">
          <Share2 size={18} />
          <h3>Share Resume</h3>
        </div>
        {!showQR ? (
          <button
            onClick={() => setShowQR(true)}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition-colors text-sm font-medium mb-2"
          >
            <Share2 size={14} />
            Generate Share Link & QR Code
          </button>
        ) : (
          <>
            {shareUrl.length <= 2900 ? (
              <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm mb-3 w-full flex justify-center">
                <QRCodeSVG value={shareUrl} size={200} level="L" />
              </div>
            ) : (
              <div className="bg-white p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm shadow-sm mb-3 w-full text-center">
                Resume data is too large for a QR code. Please use the copy link button below.
              </div>
            )}
            <p className="text-xs text-purple-600 mb-3 text-center">Scan to open this exact resume on any device.</p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                alert('Link copied to clipboard!');
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
        <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold">
          <FileText size={18} />
          <h3>Smart Import</h3>
        </div>
        <p className="text-xs text-blue-600 mb-3">Upload multiple PDFs or Images (resumes, transcripts, certificates) or provide a link to auto-fill the form using AI.</p>
        
        <div className="space-y-3">
          <label className="flex items-center justify-center gap-2 w-full bg-white border border-blue-200 text-blue-600 py-2 rounded cursor-pointer hover:bg-blue-50 transition-colors">
            {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="text-sm font-medium">{isParsing ? 'Parsing Documents...' : 'Upload Documents'}</span>
            <input type="file" multiple accept="application/pdf,image/*,.doc,.docx,.txt" className="hidden" onChange={handleResumeUpload} disabled={isParsing} />
          </label>

          <div className="flex gap-2">
            <input 
              type="url" 
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="Paste LinkedIn or Portfolio URL" 
              className="flex-1 p-2 text-sm border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={isParsing}
            />
            <button 
              onClick={handleUrlImport}
              disabled={isParsing || !documentUrl}
              className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Link size={16} />}
            </button>
          </div>
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
              >
                {isGeneratingSummary ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate with AI
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
          {data.experience.map((exp, index) => (
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
          {data.education.map((edu, index) => (
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
          value={data.skills.join(', ')} 
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
          {data.projects.map((proj, index) => (
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
                    >
                      {generatingProjectIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generate with AI
                    </button>
                  </div>
                  <textarea value={proj.description} onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value)} placeholder="Description" rows={3} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" />
                </div>

                <input 
                  type="text" 
                  value={proj.technologies.join(', ')} 
                  onChange={(e) => {
                    const newArray = [...data.projects];
                    newArray[index] = { ...newArray[index], technologies: e.target.value.split(',').map(t => t.trim()) };
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

    </div>
  );
}
