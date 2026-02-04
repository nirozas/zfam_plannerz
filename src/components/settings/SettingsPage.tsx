import React, { useState, useEffect } from 'react';
import { Save, User, ArrowLeft, Loader2, Camera, ShieldCheck, Mail, Database, FileText, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlannerStore } from '../../store/plannerStore';
import './SettingsPage.css';

const SettingsPage: React.FC = () => {
    const { user, userProfile, userStats, updateProfile, uploadAvatar, fetchUserStats, fetchUserProfile } = usePlannerStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
    });

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) {
            navigate('/auth');
            return;
        }

        const init = async () => {
            await fetchUserProfile();
            await fetchUserStats();
        };
        init();
    }, [user, navigate, fetchUserProfile, fetchUserStats]);

    useEffect(() => {
        if (userProfile) {
            setFormData({
                username: userProfile.username || '',
                full_name: userProfile.full_name || '',
            });
        }
    }, [userProfile]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            await updateProfile(formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            await uploadAvatar(file);
            setMessage({ type: 'success', text: 'Avatar updated successfully!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Avatar upload failed' });
        } finally {
            setUploadingAvatar(false);
        }
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <div className="header-left">
                    <button className="back-btn" onClick={() => navigate('/homepage')}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1>Account Settings</h1>
                </div>
                {userProfile?.role === 'admin' && (
                    <div className="admin-badge">
                        <ShieldCheck size={16} /> Admin Mode
                    </div>
                )}
            </header>

            <main className="settings-content">
                {/* Profile Header Card */}
                <div className="settings-card profile-header-card glass-card">
                    <div className="avatar-section">
                        <div className="avatar-wrapper">
                            {userProfile?.avatar_url ? (
                                <img src={userProfile.avatar_url} alt="Avatar" className="user-avatar-large" />
                            ) : (
                                <div className="avatar-placeholder-large">
                                    {formData.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
                                </div>
                            )}
                            <button
                                className="avatar-edit-btn"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleAvatarUpload}
                                accept="image/*"
                            />
                        </div>
                        <div className="profile-identity">
                            <h2>{formData.full_name || 'Your Name'}</h2>
                            <p className="profile-role">
                                {userProfile?.role === 'admin' ? 'Administrator' : 'Premium User'}
                                <span className="dot">•</span>
                                {user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="settings-grid">
                    {/* Main Form */}
                    <div className="settings-card main-settings glass-card">
                        <h3>Personal Information</h3>
                        <form onSubmit={handleUpdateProfile}>
                            <div className="form-group">
                                <label><Mail size={16} /> Email Address</label>
                                <input type="text" value={user?.email || ''} disabled className="input-disabled" />
                                <p className="input-hint">Email cannot be changed.</p>
                            </div>

                            <div className="form-group">
                                <label><User size={16} /> Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your full name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Username</label>
                                <div className="input-icon">
                                    <span className="at-symbol">@</span>
                                    <input
                                        type="text"
                                        placeholder="unique_username"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            {message && (
                                <div className={`message ${message.type}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="settings-card stats-card glass-card">
                        <h3>Your Statistics</h3>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <div className="stat-icon planners">
                                    <Database size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">{userStats?.totalPlanners || 0}</div>
                                    <div className="stat-label">Notebooks</div>
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-icon pages">
                                    <FileText size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">{userStats?.totalPages || 0}</div>
                                    <div className="stat-label">Total Pages</div>
                                </div>
                            </div>
                            <div className="stat-item">
                                <div className="stat-icon assets">
                                    <ImageIcon size={20} />
                                </div>
                                <div className="stat-info">
                                    <div className="stat-value">{userStats?.totalAssets || 0}</div>
                                    <div className="stat-label">Stock Assets</div>
                                </div>
                            </div>
                        </div>

                        <div className="stats-footer">
                            <p>Data synced with Supabase Realtime</p>
                            <button className="btn-refresh" onClick={() => fetchUserStats()}>Refresh Stats</button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
