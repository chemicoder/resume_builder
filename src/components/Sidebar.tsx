import React, { useState } from 'react';
import { ResumeData } from '../types';
import { User, Briefcase, GraduationCap, Code, FolderGit2, Plus, Trash2, Sparkles, Upload, Image as ImageIcon, Loader2, FileText, Palette, Link } from 'lucide-react';
import { generateSummaryAI, generateProjectDescriptionAI, parseDocumentAI } from '../lib/gemini';

interface SidebarProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

export default function Sidebar({ data, onChange }: SidebarProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [generatingProjectIndex, setGeneratingProjectIndex] = useState<number | null>(null);
  const [documentUrl, setDocumentUrl] = useState('');

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
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const parsedData = await parseDocumentAI(data, { base64, mimeType: file.type });
        // Preserve profile picture if it exists and wasn't updated
        if (data.personalInfo.profilePicture && !parsedData.personalInfo.profilePicture) {
          parsedData.personalInfo.profilePicture = data.personalInfo.profilePicture;
        }
        onChange(parsedData);
        setIsParsing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Failed to parse document", error);
      setIsParsing(false);
      alert("Failed to parse document. Please try again.");
    }
  };

  const handleUrlImport = async () => {
    if (!documentUrl) return;
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

  return (
    <div className="w-full md:w-[450px] h-full overflow-y-auto bg-white border-r border-gray-200 p-6 space-y-8">
      
      {/* Import Section */}
      <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold">
          <FileText size={18} />
          <h3>Import Existing Resume</h3>
        </div>
        <p className="text-xs text-blue-600 mb-3">Upload a PDF or Image of your resume, degree, transcript, or provide a link to auto-fill the form using AI.</p>
        
        <div className="space-y-3">
          <label className="flex items-center justify-center gap-2 w-full bg-white border border-blue-200 text-blue-600 py-2 rounded cursor-pointer hover:bg-blue-50 transition-colors">
            {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="text-sm font-medium">{isParsing ? 'Parsing Document...' : 'Upload PDF / Image'}</span>
            <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleResumeUpload} disabled={isParsing} />
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
