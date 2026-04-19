import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Book, 
  MoreVertical,
  Edit3, 
  X,
  Camera,
  Share2,
  Users,
  Check,
  Loader2,
  PlusCircle,
  Search,
  User,
  Info,
  Calendar,
  Layers,
  FileText,
  HardDrive,
  Trash2,
  AlertCircle,
  Cloud
} from 'lucide-react';
import { useNotebookStore } from '../../store/notebookStore';
import { Notebook } from '../../types/notebook';
import { shareFile, loadToken, getFileMetadata, getFilePermissions } from '../../lib/googleDrive';
import { supabase } from '../../supabase/client';

export const NotebookSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    notebooks, 
    addNotebook, 
    updateNotebook, 
    notebookFileIds, 
    deleteNotebook, 
    isLoading: isStoreLoading 
  } = useNotebookStore();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');

  // UI States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sharingNotebookId, setSharingNotebookId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'reader' | 'writer'>('reader');
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Info Modal States
  const [infoNotebook, setInfoNotebook] = useState<{ notebook: Notebook; metadata: any; permissions: any[] } | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // User Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Click Outside Listener for Menus
  useEffect(() => {
    const handleClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleCreate = () => {
    if (newNotebookName.trim()) {
      addNotebook(newNotebookName);
      setNewNotebookName('');
      setIsCreateModalOpen(false);
    }
  };

  const handleSelect = (nb: Notebook) => {
    const slug = nb.name.replace(/\s+/g, '');
    navigate(`/notebooks/${slug}`);
  };

  const handleUpdateCover = async (id: string, method: 'url' | 'upload') => {
    setActiveMenuId(null);
    if (method === 'url') {
      const url = prompt('Enter Cover Image URL:');
      if (url) updateNotebook(id, { coverImage: url });
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (file) {
          try {
            const { uploadFileToDrive } = await import('../../lib/googleDrive');
            const result = await uploadFileToDrive(file, `cover_${id}_${Date.now()}`, file.type, true);
            updateNotebook(id, { coverImage: result.url });
          } catch (error) {
            console.error('Cover upload failed:', error);
            alert('Failed to upload cover image. Please check your Drive connection.');
          }
        }
      };
      input.click();
    }
  };

  const handleShowInfo = async (nb: Notebook) => {
    setActiveMenuId(null);
    setIsLoadingInfo(true);
    setErrorMessage(null);
    try {
      const fileId = notebookFileIds[nb.id];
      if (!fileId) throw new Error('File ID missing. Wait for Drive sync to complete.');
      
      const [metadata, permissions] = await Promise.all([
        getFileMetadata(fileId),
        getFilePermissions(fileId)
      ]);
      setInfoNotebook({ notebook: nb, metadata, permissions });
    } catch (e: any) {
      console.error('Failed to load notebook info:', e);
      alert(e.message || 'Failed to load details. Ensure you are connected to Google Drive.');
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim() || !sharingNotebookId) return;
    setIsSharing(true);
    setShareStatus('idle');
    setErrorMessage(null);
    try {
      const fileId = notebookFileIds[sharingNotebookId];
      if (!fileId) throw new Error('Notebook file ID not found. Please try again after sync.');
      
      await shareFile(fileId, shareEmail, shareRole);
      setShareStatus('success');
      setTimeout(() => {
        setSharingNotebookId(null);
        setShareEmail('');
        setSearchQuery('');
        setShareStatus('idle');
      }, 2000);
    } catch (error: any) {
      console.error('Sharing failed:', error);
      setShareStatus('error');
      setErrorMessage(error.message || 'Sharing failed. Please check the email and permissions.');
    } finally {
      setIsSharing(false);
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return 'N/A';
    const b = parseInt(bytes);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // User Search Effect
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearchingUsers(true);
      try {
        const { data, error } = await supabase.rpc('search_collaborators', { search_query: searchQuery });
        if (error) throw error;
        setSearchResults(data || []);
      } catch (e) {
        console.error('User search failed:', e);
      } finally {
        setIsSearchingUsers(false);
      }
    };
    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-8 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
              Archived <span className="text-indigo-600">Notebooks</span>
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 opacity-60">
              Personal Creative Vault & Planning Suites
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="group flex items-center justify-center gap-4 bg-slate-900 text-white px-8 py-4 rounded-[2rem] hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-slate-200"
          >
            <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-black uppercase tracking-widest">New Notebook</span>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {notebooks.map((nb) => (
            <div key={nb.id} className="group relative">
              <div 
                onClick={() => handleSelect(nb)}
                className="relative aspect-[1/1.414] bg-white rounded-[3rem] shadow-xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 group-hover:border-indigo-100"
              >
                <NotebookCardImage src={nb.coverImage} name={nb.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2 truncate">{nb.name}</h3>
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <span>{nb.sections.length + nb.sectionGroups.reduce((acc, g) => acc + g.sections.length, 0)} Sections</span>
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <span>{new Date(nb.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* More / Actions Menu Trigger */}
                <div className="absolute top-6 right-6 z-10">
                  <div className="relative">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setActiveMenuId(activeMenuId === nb.id ? null : nb.id); 
                      }}
                      className="p-3 bg-white/90 backdrop-blur-md text-slate-900 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-95"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {activeMenuId === nb.id && (
                      <div 
                        className="absolute right-0 mt-3 w-56 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-3 mb-2 border-b border-slate-50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notebook Actions</p>
                        </div>
                        <MenuAction icon={<Camera size={16} />} label="Change Cover" onClick={() => handleUpdateCover(nb.id, 'upload')} />
                        <MenuAction icon={<Share2 size={16} />} label="Share Suite" onClick={() => setSharingNotebookId(nb.id)} />
                        <MenuAction icon={<Info size={16} />} label="Details & Meta" onClick={() => handleShowInfo(nb)} isLoading={isLoadingInfo} />
                        <div className="h-px bg-slate-50 my-2" />
                        <MenuAction icon={<Trash2 size={16} />} label="Delete Permanently" onClick={() => { if(confirm('Delete this notebook?')) deleteNotebook(nb.id); }} danger />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {notebooks.length === 0 && !isStoreLoading && (
            <div className="col-span-full py-20 text-center space-y-6 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-100">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Book size={48} className="text-slate-200" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Your Library is Empty</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Start by creating your first creative suite</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-slate-900 text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl"
              >
                Create First Notebook
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Modal */}
      {infoNotebook && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl"><Info size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Notebook <span className="text-indigo-600">Details</span></h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">System Metadata & Permissions</p>
                </div>
              </div>
              <button onClick={() => setInfoNotebook(null)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Archive Structure</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox icon={<Layers size={14} />} value={infoNotebook.notebook.sectionGroups.length} label="Groups" />
                    <StatBox icon={<Book size={14} />} value={infoNotebook.notebook.sections.length + infoNotebook.notebook.sectionGroups.reduce((acc, g) => acc + g.sections.length, 0)} label="Sections" />
                    <StatBox icon={<FileText size={14} />} value={infoNotebook.notebook.sections.reduce((acc, s) => acc + s.pages.length, 0) + infoNotebook.notebook.sectionGroups.reduce((acc, g) => acc + g.sections.reduce((ac, s) => ac + s.pages.length, 0), 0)} label="Pages" />
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">File Information</h3>
                  <div className="space-y-3">
                    <InfoRow icon={<HardDrive size={16} />} label="Vault Size" value={formatSize(infoNotebook.metadata.size)} />
                    <InfoRow icon={<Calendar size={16} />} label="Created On" value={new Date(infoNotebook.metadata.createdTime).toLocaleDateString()} />
                    <InfoRow icon={<User size={16} />} label="Creator" value={infoNotebook.metadata.owners?.[0]?.displayName || 'You'} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">People with Access</h3>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-full uppercase tracking-widest">
                    {infoNotebook.permissions.length} Collaborators
                  </span>
                </div>
                <div className="bg-slate-50 rounded-[2rem] p-4 max-h-[350px] overflow-auto border border-slate-100 space-y-2">
                  {infoNotebook.permissions.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl overflow-hidden flex items-center justify-center">
                        {p.photoLink ? <img src={p.photoLink} className="w-full h-full object-cover" /> : <User className="text-indigo-400" size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest truncate">{p.displayName || p.emailAddress?.split('@')[0]}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em] truncate">{p.emailAddress}</p>
                      </div>
                      <div className="px-2 py-1 bg-slate-50 rounded-lg">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    setSharingNotebookId(infoNotebook.notebook.id);
                    setInfoNotebook(null);
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Manage Invitations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sharing Modal */}
      {sharingNotebookId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Users size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Share <span className="text-indigo-600">Notebook</span></h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                    {notebooks.find(nb => nb.id === sharingNotebookId)?.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setSharingNotebookId(null)} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-10 space-y-8">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4">
                <Cloud className="text-indigo-600 shrink-0" size={24} />
                <p className="text-xs font-bold text-indigo-900/60 leading-relaxed uppercase tracking-tight">
                  Sharing <span className="text-indigo-600 font-black">only this specific archive</span>. Safe & isolated.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex gap-3 text-rose-600 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="text-[10px] font-bold uppercase tracking-widest leading-tight">{errorMessage}</p>
                </div>
              )}

              <div className="relative space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Collaborator Name or Email</label>
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search by name or type email..."
                    value={searchQuery || shareEmail}
                    onChange={(e) => { const val = e.target.value; setSearchQuery(val); setShareEmail(val); setShowResults(true); }}
                    onFocus={() => setShowResults(true)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-12 py-4 text-sm font-black uppercase tracking-widest focus:border-indigo-600 focus:bg-white outline-none transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  {isSearchingUsers && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={20} />}
                </div>

                {showResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-[110] overflow-hidden">
                    {searchResults.map((u) => (
                      <button key={u.id} onClick={() => { setShareEmail(u.email); setSearchQuery(u.full_name || u.username); setShowResults(false); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left group">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><User size={20} /></div>}</div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{u.full_name || u.username}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.1em]">{u.email}</p>
                        </div>
                        <PlusCircle size={18} className="text-slate-200 group-hover:text-indigo-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShareRole('reader')} className={`py-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 ${shareRole === 'reader' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <Book size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Viewer</span>
                </button>
                <button onClick={() => setShareRole('writer')} className={`py-4 rounded-2xl border-2 transition-all flex items-center justify-center gap-3 ${shareRole === 'writer' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                  <Edit3 size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Editor</span>
                </button>
              </div>

              <button onClick={handleShare} disabled={isSharing || !shareEmail} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 disabled:opacity-50">
                {isSharing ? <Loader2 className="animate-spin" size={20} /> : (shareStatus === 'success' ? <Check size={20} /> : <Share2 size={20} />)}
                {shareStatus === 'success' ? 'Access Granted' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">New <span className="text-indigo-600">Suite</span></h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Name your creative workspace</p>
            </div>
            <input autoFocus type="text" placeholder="E.G. RAMA SCHOOL" value={newNotebookName} onChange={(e) => setNewNotebookName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-black uppercase tracking-widest focus:border-indigo-600 focus:bg-white outline-none transition-all text-center" />
            <div className="flex gap-3">
              <button onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleCreate} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100">Initialize</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuAction = ({ icon, label, onClick, danger, isLoading }: any) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-[10px] font-black uppercase tracking-widest transition-all ${danger ? 'text-rose-500 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-50'} ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
  >
    {isLoading ? <Loader2 className="animate-spin" size={16} /> : icon}
    {label}
  </button>
);

const StatBox = ({ icon, value, label }: any) => (
  <div className="bg-slate-50 p-4 rounded-2xl text-center space-y-1">
    <div className="text-indigo-500 mb-1 flex justify-center">{icon}</div>
    <p className="text-lg font-black text-slate-900">{value}</p>
    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
  </div>
);

const InfoRow = ({ icon, label, value }: any) => (
  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
    <div className="flex items-center gap-3 text-slate-600">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{value}</span>
  </div>
);

const NotebookCardImage = ({ src, name }: { src?: string; name: string }) => {
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let currentUrl = src || '';
    if (currentUrl.includes('drive.google.com')) {
      const token = loadToken();
      if (token) {
        const fileId = currentUrl.split('id=')[1]?.split('&')[0];
        if (fileId) {
          fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { 
            headers: { Authorization: `Bearer ${token.access_token}` } 
          })
          .then(res => res.blob())
          .then(blob => { 
            if (isMounted.current) {
              const url = URL.createObjectURL(blob); 
              setProxyUrl(url); 
            }
          })
          .catch(err => { 
            console.error('Failed to proxy cover image:', err); 
            if (isMounted.current) setProxyUrl(currentUrl); 
          });
        } else setProxyUrl(currentUrl);
      } else setProxyUrl(currentUrl);
    } else setProxyUrl(currentUrl);

    return () => { 
      isMounted.current = false;
      if (proxyUrl && proxyUrl.startsWith('blob:')) URL.revokeObjectURL(proxyUrl); 
    };
  }, [src]);

  if (!src) return (
    <div className="w-full h-full bg-slate-50 flex items-center justify-center">
      <Book size={64} className="text-slate-200" strokeWidth={1} />
    </div>
  );
  
  return (
    <img 
      src={proxyUrl || src} 
      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
      alt={name} 
      onError={(e: any) => { 
        e.target.src = 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=800'; 
      }} 
    />
  );
};
