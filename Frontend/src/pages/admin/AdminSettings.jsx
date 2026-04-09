import {
    Activity,
    Bell,
    CreditCard,
    Database,
    Globe,
    Lock,
    Save,
    Search,
    Settings as SettingsIcon,
    Shield,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

const API_BASE_URL = `${import.meta.env.VITE_URL}/admin/settings`;

const AdminSettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        platformName: '',
        supportEmail: '',
        contactNumber: '',
        logoUrl: '',
        faviconUrl: '',
        maintenanceMode: false,
        timezone: 'UTC',
        defaultDuration: 60,
        allowPaidContests: true,
        minEntryFee: 0,
        maxParticipantsLimit: 1000,
        autoStart: false,
        autoEnd: true,
        defaultCutOff: 50,
        defaultQuestionsPerContest: 20,
        difficultyLevels: ['easy', 'medium', 'hard'],
        negativeMarking: false,
        marksPerQuestion: 1,
        timePerQuestion: 60,
        tabSwitchLimit: 3,
        forceFullscreen: false,
        maxLoginAttempts: 5,
        sessionTimeout: 1440,
        allowRegistration: true,
        emailVerification: false,
        otpLogin: true,
        gateway: 'RazorPay',
        apiKey: '',
        secretKey: '',
        currency: 'INR',
        platformCommission: 10,
        enableWallet: false,
        metaDescription: '',
        googleAnalyticsId: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(API_BASE_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.success) {
                setSettings(json.data);
            }
        } catch (error) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(API_BASE_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Settings saved successfully');
                setSettings(json.data);
            } else {
                toast.error(json.error?.message || 'Failed to save settings');
            }
        } catch (error) {
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Globe },
        { id: 'contest', label: 'Contest Defaults', icon: Activity },
        { id: 'question', label: 'Question Rules', icon: Database },
        { id: 'proctoring', label: 'Proctoring & Security', icon: Shield },
        { id: 'user', label: 'User & Auth', icon: Users },
        { id: 'payment', label: 'Payments', icon: CreditCard },
        { id: 'seo', label: 'SEO & Analytics', icon: Search }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <SettingsIcon className="w-6 h-6 text-purple-600" />
                        Admin Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure global platform behavior and proctoring rules</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                    {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Tabs Sidebar */}
                <aside className="lg:w-64 shrink-0">
                    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Content Area */}
                <main className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 lg:p-8">
                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">General Platform Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Platform Name" value={settings.platformName} onChange={(v) => handleChange('platformName', v)} />
                                <FormField label="Support Email" type="email" value={settings.supportEmail} onChange={(v) => handleChange('supportEmail', v)} />
                                <FormField label="Contact Number" value={settings.contactNumber} onChange={(v) => handleChange('contactNumber', v)} />
                                <FormField label="System Timezone" value={settings.timezone} onChange={(v) => handleChange('timezone', v)} />
                                <FormField label="Logo URL" value={settings.logoUrl} onChange={(v) => handleChange('logoUrl', v)} />
                                <FormField label="Favicon URL" value={settings.faviconUrl} onChange={(v) => handleChange('faviconUrl', v)} />
                            </div>
                            <ToggleField 
                                label="Maintenance Mode" 
                                description="When active, users will see a maintenance screen and won't be able to join contests." 
                                value={settings.maintenanceMode} 
                                onChange={(v) => handleChange('maintenanceMode', v)} 
                                warning
                            />
                        </div>
                    )}

                    {activeTab === 'contest' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">Default Contest Parameters</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Default Duration (Min)" type="number" value={settings.defaultDuration} onChange={(v) => handleChange('defaultDuration', v)} />
                                <FormField label="Min Entry Fee (INR)" type="number" value={settings.minEntryFee} onChange={(v) => handleChange('minEntryFee', v)} />
                                <FormField label="Max Participant Limit" type="number" value={settings.maxParticipantsLimit} onChange={(v) => handleChange('maxParticipantsLimit', v)} />
                                <FormField label="Default Cut-Off (%)" type="number" value={settings.defaultCutOff} onChange={(v) => handleChange('defaultCutOff', v)} />
                            </div>
                            <div className="space-y-4">
                                <ToggleField label="Allow Paid Contests" value={settings.allowPaidContests} onChange={(v) => handleChange('allowPaidContests', v)} />
                                <ToggleField label="Auto-Start Contest" description="Automatically set status to 'ongoing' when start time is reached." value={settings.autoStart} onChange={(v) => handleChange('autoStart', v)} />
                                <ToggleField label="Auto-End Contest" description="Automatically end contest when duration expires." value={settings.autoEnd} onChange={(v) => handleChange('autoEnd', v)} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'question' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">Global Question Rules</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label="Questions per Contest" type="number" value={settings.defaultQuestionsPerContest} onChange={(v) => handleChange('defaultQuestionsPerContest', v)} />
                                <FormField label="Marks per Question" type="number" value={settings.marksPerQuestion} onChange={(v) => handleChange('marksPerQuestion', v)} />
                                <FormField label="Time per Question (Sec)" type="number" value={settings.timePerQuestion} onChange={(v) => handleChange('timePerQuestion', v)} />
                            </div>
                            <ToggleField label="Negative Marking" description="Apply penalty for incorrect answers by default." value={settings.negativeMarking} onChange={(v) => handleChange('negativeMarking', v)} />
                        </div>
                    )}

                    {activeTab === 'proctoring' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">Proctoring & Anti-Cheat Settings</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField 
                                    label="Tab Switching Limit" 
                                    type="number" 
                                    description="Max times a user can switch tabs before disqualification."
                                    value={settings.tabSwitchLimit} 
                                    onChange={(v) => handleChange('tabSwitchLimit', v)} 
                                />
                                <FormField 
                                    label="Max Login Attempts" 
                                    type="number" 
                                    value={settings.maxLoginAttempts} 
                                    onChange={(v) => handleChange('maxLoginAttempts', v)} 
                                />
                                <FormField 
                                    label="Session Timeout (Min)" 
                                    type="number" 
                                    value={settings.sessionTimeout} 
                                    onChange={(v) => handleChange('sessionTimeout', v)} 
                                />
                            </div>
                            <ToggleField 
                                label="Force Fullscreen Mode" 
                                description="Participants must remain in fullscreen mode during the entire contest." 
                                value={settings.forceFullscreen} 
                                onChange={(v) => handleChange('forceFullscreen', v)} 
                                warning
                            />
                        </div>
                    )}

                    {activeTab === 'user' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">User Registration & Auth</h2>
                            <div className="space-y-4">
                                <ToggleField label="Allow New Registrations" value={settings.allowRegistration} onChange={(v) => handleChange('allowRegistration', v)} />
                                <ToggleField label="Enforce Email Verification" value={settings.emailVerification} onChange={(v) => handleChange('emailVerification', v)} />
                                <ToggleField label="Enable OTP Login" value={settings.otpLogin} onChange={(v) => handleChange('otpLogin', v)} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">Payment Configuration</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Gateway</label>
                                    <select 
                                        value={settings.gateway} 
                                        onChange={(e) => handleChange('gateway', e.target.value)}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none dark:text-white"
                                    >
                                        <option value="RazorPay">RazorPay</option>
                                        <option value="Stripe">Stripe</option>
                                    </select>
                                </div>
                                <FormField label="Currency Code" value={settings.currency} onChange={(v) => handleChange('currency', v)} />
                                <FormField label="Platform Commission (%)" type="number" value={settings.platformCommission} onChange={(v) => handleChange('platformCommission', v)} />
                                <FormField label="API Key" type="password" value={settings.apiKey} onChange={(v) => handleChange('apiKey', v)} />
                                <FormField label="Secret Key" type="password" value={settings.secretKey} onChange={(v) => handleChange('secretKey', v)} />
                            </div>
                            <ToggleField label="Enable Wallet System" value={settings.enableWallet} onChange={(v) => handleChange('enableWallet', v)} />
                        </div>
                    )}

                    {activeTab === 'seo' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-4">SEO & Site Analytics</h2>
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Meta Description</label>
                                    <textarea 
                                        rows={4} 
                                        value={settings.metaDescription} 
                                        onChange={(e) => handleChange('metaDescription', e.target.value)}
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none dark:text-white resize-none"
                                        placeholder="Describe your platform for search engines..."
                                    />
                                </div>
                                <FormField label="Google Analytics ID" placeholder="UA-XXXXXXXXX-X" value={settings.googleAnalyticsId} onChange={(v) => handleChange('googleAnalyticsId', v)} />
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

// Helper Components
const FormField = ({ label, type = "text", value, onChange, description, placeholder = "" }) => (
    <div className="space-y-1.5 text-left">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <input 
            type={type} 
            value={value || ''} 
            onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none dark:text-white"
            placeholder={placeholder}
        />
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
    </div>
);

const ToggleField = ({ label, description, value, onChange, warning }) => (
    <div className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
        value 
            ? warning ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/50' : 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/50'
            : 'bg-slate-50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800'
    }`}>
        <div className="text-left">
            <h4 className={`text-sm font-bold ${value ? warning ? 'text-amber-700 dark:text-amber-400' : 'text-purple-700 dark:text-purple-400' : 'text-slate-700 dark:text-slate-300'}`}>{label}</h4>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
        </div>
        <button
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 ${
                value ? (warning ? 'bg-amber-500' : 'bg-purple-600') : 'bg-slate-300 dark:bg-slate-700'
            }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    value ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    </div>
);

export default AdminSettings;
