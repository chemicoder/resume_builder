import React, { useState, useMemo } from 'react';
import { ResumeData } from '../types';
import { User, Briefcase, GraduationCap, Code, FolderGit2, Plus, Trash2, Sparkles, Upload, Image as ImageIcon, Loader2, FileText, Palette, Link, Share2, Copy } from 'lucide-react';
import { generateSummaryAI, generateProjectDescriptionAI, parseDocumentAI, tailorResumeAI } from '../lib/gemini';
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function Sidebar({ data, onChange, template }: SidebarProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatingProjectIndex, setGeneratingProjectIndex] = useState<number | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);

  const handleTailorResume = async () => {
    if (!data.targetJob?.description) {
      alert("Please provide a job description to tailor the resume.");
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
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, "Failed to tailor resume. Please try again."));
    } finally {
      setIsTailoring(false);
    }
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
    const files = Array.from(e.currentTarget.files ?? []) as File[];
    if (files.length === 0) return;
    
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
      onChange(parsedData);
    } catch (error) {
      console.error("Failed to parse documents", error);
      alert(getErrorMessage(error, "Failed to parse documents. Please try again."));
    } finally {
      setIsParsing(false);
    }
  };

  const handleUrlImport = async () => {
    if (!documentUrl) return;
    setIsParsing(true);
    try {
      const parsedData = await parseDocumentAI(data, undefined, documentUrl);
      onChange(parsedData);
      setDocumentUrl('');
    } catch (error) {
      console.error("Failed to parse URL", error);
      const message = getErrorMessage(error, "Failed to extract data from URL. Please try again.");
      if (message.includes('Gemini API key')) {
        alert(message);
      } else if (documentUrl.includes('linkedin.com')) {
        alert("Failed to extract data from LinkedIn. LinkedIn blocks automated access. Please go to your LinkedIn profile, click 'More' -> 'Save to PDF', and upload the PDF instead.");
      } else {
        alert(message);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateSummary = async () => {
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
      alert(getErrorMessage(error, "Failed to generate summary."));
    }
    setIsGeneratingSummary(false);
  };

  const handleGenerateProjectDesc = async (index: number) => {
    const proj = data.projects[index];
    setGeneratingProjectIndex(index);
    try {
      const desc = await generateProjectDescriptionAI(proj.name, proj.technologies);
      if (desc) {
        handleArrayChange('projects', index, 'description', desc);
      }
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, "Failed to generate project description."));
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

      {/* ATS Optimization Section */}
      <section className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
        <div className="flex items-center gap-2 mb-2 text-emerald-800 font-semibold">
          <Sparkles size={18} />
          <h3>ATS Optimization</h3>
        </div>
        <p className="text-xs text-emerald-600 mb-3">Tailor your resume to a specific job description to improve your ATS match score.</p>
        
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
            disabled={isTailoring || !data.targetJob?.description}
            className="w-full bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isTailoring ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span className="text-sm font-medium">{isTailoring ? 'Tailoring Resume...' : 'Tailor Resume & Get Score'}</span>
          </button>
        </div>
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
          {documentUrl.includes('linkedin.com') && (
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              Note: LinkedIn often blocks automated access. If the import fails or is incomplete, please use the "Save to PDF" option on your LinkedIn profile and upload the PDF instead.
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
                    >
                      {generatingProjectIndex === index ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Generate with AI
                    </button>
                  </div>
                  <textarea value={proj.description} onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value)} placeholder="Description" rows={3} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" />
                </div>

                <input 
                  type="text" 
                  value={(proj.technologies || []).join(', ')} 
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
