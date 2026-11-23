import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ImagePlus,
  LogOut,
  Settings,
  Shield,
  UserRound,
  Video,
  X,
} from 'lucide-react';
import Avatar from '../common/Avatar.jsx';
import useAuthStore from '../../store/authStore.js';
import { authApi } from '../../services/api.js';

const makeForm = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  about: user?.about || '',
  currentPassword: '',
});

const makePasswordForm = () => ({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Could not update your profile.';

function PasswordField({ label, name, value, onChange, visible, onToggle, autoComplete }) {
  return (
    <label className="block text-xs font-medium text-slate-300" htmlFor={name}>
      {label}
      <span className="relative mt-1.5 block">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={name === 'newPassword' || name === 'confirmPassword' ? 6 : undefined}
          required
          className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5 pr-11 text-sm text-white outline-none focus:border-lagoon-400"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-white"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          title={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}

export default function UserProfileCard({ user, onLogout }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [passwordEditorOpen, setPasswordEditorOpen] = useState(false);
  const [form, setForm] = useState(() => makeForm(user));
  const [passwordForm, setPasswordForm] = useState(makePasswordForm);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [awaitingEmailVerification, setAwaitingEmailVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const fileInputRef = useRef(null);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !saving) closeSettings();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen, saving]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(photo);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photo]);

  const openEditor = () => {
    setForm(makeForm(user));
    setPhoto(null);
    setEmailOtp('');
    setPendingEmail('');
    setAwaitingEmailVerification(false);
    setPasswordEditorOpen(false);
    setEditOpen(true);
  };

  const closeSettings = () => {
    if (saving) return;
    setSettingsOpen(false);
    setEditOpen(false);
    setPasswordEditorOpen(false);
    setAwaitingEmailVerification(false);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const togglePasswordVisibility = (name) => {
    setVisiblePasswords((current) => ({ ...current, [name]: !current[name] }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    const emailChanged =
      form.email.trim().toLowerCase() !== user?.email?.toLowerCase();

    if (emailChanged && !form.currentPassword) {
      toast.error('Enter your current password to change your email.');
      return;
    }

    const formData = new FormData();
    formData.append('name', form.name);
    formData.append('email', form.email);
    formData.append('about', form.about);
    if (emailChanged) formData.append('currentPassword', form.currentPassword);
    if (photo) formData.append('avatar', photo);

    setSaving(true);
    try {
      const response = await authApi.updateProfile(formData);
      const data = response.data?.data || response.data;
      setUser(data.user);
      setForm(makeForm(data.user));

      if (data.emailVerificationRequired) {
        setPendingEmail(data.pendingEmail);
        setAwaitingEmailVerification(true);
        toast.success(`Verification code sent to ${data.pendingEmail}.`);
      } else {
        setEditOpen(false);
        toast.success('Profile updated successfully.');
      }
      setPhoto(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm(makePasswordForm());
      setPasswordEditorOpen(false);
      setVisiblePasswords({});
      toast.success('Password changed successfully.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEmail = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(emailOtp)) {
      toast.error('Enter the 6-digit verification code.');
      return;
    }

    setSaving(true);
    try {
      const response = await authApi.verifyProfileEmail(emailOtp);
      const data = response.data?.data || response.data;
      setUser(data.user);
      setForm(makeForm(data.user));
      setAwaitingEmailVerification(false);
      setEditOpen(false);
      toast.success('Email address updated successfully.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Avatar name={user?.name} src={user?.avatar} online />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{user?.name || 'Guest user'}</p>
        <p className="truncate text-xs text-slate-400">{user?.email || 'Not signed in'}</p>
      </div>
      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        className="rounded-lg p-2 text-slate-400 hover:bg-ink-700 hover:text-white"
        aria-label="Settings"
        title="Settings"
      >
        <Settings size={18} />
      </button>
      <button
        type="button"
        onClick={onLogout}
        className="rounded-lg p-2 text-slate-400 hover:bg-ink-700 hover:text-white"
        aria-label="Log out"
        title="Log out"
      >
        <LogOut size={18} />
      </button>

      {settingsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSettings();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-ink-600 bg-ink-800 text-white shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-ink-600 px-5 py-4">
              <div>
                <h2 id="settings-title" className="text-lg font-semibold">
                  {passwordEditorOpen ? 'Change password' : editOpen ? 'Edit profile' : 'Settings'}
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {passwordEditorOpen
                    ? 'Choose a new password for your account'
                    : editOpen
                      ? 'Update your Connectly account details'
                      : 'Your Connectly account and call settings'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (passwordEditorOpen) {
                    setPasswordEditorOpen(false);
                    setPasswordForm(makePasswordForm());
                    setVisiblePasswords({});
                  } else if (editOpen && !awaitingEmailVerification) {
                    setEditOpen(false);
                  } else {
                    closeSettings();
                  }
                }}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-700 hover:text-white disabled:opacity-50"
                aria-label={editOpen ? 'Go back' : 'Close settings'}
              >
                {editOpen && !awaitingEmailVerification ? <ArrowLeft size={18} /> : <X size={18} />}
              </button>
            </header>

            {editOpen ? (
              passwordEditorOpen ? (
                <form onSubmit={handleChangePassword} className="space-y-4 p-5">
                  <PasswordField
                    label="Current password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordFieldChange}
                    visible={Boolean(visiblePasswords.currentPassword)}
                    onToggle={() => togglePasswordVisibility('currentPassword')}
                    autoComplete="current-password"
                  />
                  <PasswordField
                    label="New password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordFieldChange}
                    visible={Boolean(visiblePasswords.newPassword)}
                    onToggle={() => togglePasswordVisibility('newPassword')}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    label="Confirm new password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordFieldChange}
                    visible={Boolean(visiblePasswords.confirmPassword)}
                    onToggle={() => togglePasswordVisibility('confirmPassword')}
                    autoComplete="new-password"
                  />
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordEditorOpen(false);
                        setPasswordForm(makePasswordForm());
                        setVisiblePasswords({});
                      }}
                      disabled={saving}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-ink-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-lagoon-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lagoon-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </form>
              ) : awaitingEmailVerification ? (
                <form onSubmit={handleVerifyEmail} className="space-y-4 p-5">
                  <p className="text-sm leading-relaxed text-slate-300">
                    Enter the 6-digit code sent to <span className="font-medium text-white">{pendingEmail}</span> to finish changing your email.
                  </p>
                  <label className="block text-xs font-medium text-slate-300" htmlFor="profile-email-otp">
                    Verification code
                    <input
                      id="profile-email-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={emailOtp}
                      onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, ''))}
                      className="mt-1.5 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lagoon-400"
                      placeholder="6-digit code"
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-lg bg-lagoon-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lagoon-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Verifying...' : 'Verify email'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4 p-5">
                  <div className="flex items-center gap-4">
                    <Avatar name={form.name || user?.name} src={photoPreview || user?.avatar} size="lg" />
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(event) => {
                          setPhoto(event.target.files?.[0] || null);
                          event.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-ink-700"
                      >
                        <ImagePlus size={15} />
                        Change profile photo
                      </button>
                      <p className="mt-1.5 text-[10px] text-slate-500">Image up to 5 MB</p>
                    </div>
                  </div>

                  <label className="block text-xs font-medium text-slate-300" htmlFor="profile-name">
                    Username
                    <input
                      id="profile-name"
                      name="name"
                      value={form.name}
                      onChange={handleFieldChange}
                      maxLength={60}
                      autoComplete="name"
                      required
                      className="mt-1.5 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lagoon-400"
                    />
                  </label>

                  <label className="block text-xs font-medium text-slate-300" htmlFor="profile-email">
                    Email
                    <input
                      id="profile-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleFieldChange}
                      autoComplete="email"
                      required
                      className="mt-1.5 w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lagoon-400"
                    />
                    {form.email.trim().toLowerCase() !== user?.email?.toLowerCase() && (
                      <span className="mt-1 block text-[10px] text-amber-300">A verification code will be sent to the new email.</span>
                    )}
                  </label>

                  <label className="block text-xs font-medium text-slate-300" htmlFor="profile-about">
                    About
                    <textarea
                      id="profile-about"
                      name="about"
                      value={form.about}
                      onChange={handleFieldChange}
                      maxLength={150}
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-lg border border-ink-600 bg-ink-900 px-3 py-2.5 text-sm text-white outline-none focus:border-lagoon-400"
                    />
                    <span className="mt-1 block text-right text-[10px] text-slate-500">{form.about.length}/150</span>
                  </label>

                  {form.email.trim().toLowerCase() !== user?.email?.toLowerCase() && (
                    <PasswordField
                      label="Current password (required to change email)"
                      name="currentPassword"
                      value={form.currentPassword}
                      onChange={handleFieldChange}
                      visible={Boolean(visiblePasswords.emailCurrentPassword)}
                      onToggle={() => togglePasswordVisibility('emailCurrentPassword')}
                      autoComplete="current-password"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPasswordForm(makePasswordForm());
                      setVisiblePasswords({});
                      setPasswordEditorOpen(true);
                    }}
                    className="w-full rounded-lg border border-ink-600 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-ink-700"
                  >
                    Change password
                  </button>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditOpen(false)}
                      disabled={saving}
                      className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-ink-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-lagoon-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lagoon-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="space-y-5 p-5">
                <section aria-labelledby="settings-account-title">
                  <h3 id="settings-account-title" className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <UserRound size={16} className="text-lagoon-400" />
                    Account
                  </h3>
                  <div className="flex items-center gap-3 rounded-xl bg-ink-900 p-3">
                    <Avatar name={user?.name} src={user?.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{user?.name || 'Guest user'}</p>
                      <p className="truncate text-xs text-slate-400">{user?.email || 'No email available'}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-ink-600 px-3 py-2.5">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">About</p>
                    <p className="mt-1 break-words text-sm text-slate-300">{user?.about || 'No about information added.'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={openEditor}
                    className="mt-3 w-full rounded-lg bg-lagoon-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-lagoon-400"
                  >
                    Edit profile
                  </button>
                </section>

                <section aria-labelledby="settings-privacy-title">
                  <h3 id="settings-privacy-title" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Shield size={16} className="text-lagoon-400" />
                    Privacy
                  </h3>
                  <p className="rounded-xl bg-ink-900 p-3 text-xs leading-relaxed text-slate-300">
                    Your email and profile details are shown to people in Connectly. Your password is never shown.
                  </p>
                </section>

                <section aria-labelledby="settings-calls-title">
                  <h3 id="settings-calls-title" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Video size={16} className="text-lagoon-400" />
                    Calls
                  </h3>
                  <p className="rounded-xl bg-ink-900 p-3 text-xs leading-relaxed text-slate-300">
                    Audio and video calls use your browser microphone and camera permissions. Manage access in your browser site settings.
                  </p>
                </section>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
