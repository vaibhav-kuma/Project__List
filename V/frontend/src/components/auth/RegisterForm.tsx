'use client';

import { useState, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Mail, Phone, Eye, EyeOff, Loader2, ChevronLeft, AlertCircle, Check, X, User, Calendar, MessageSquare } from 'lucide-react';

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 5);
  }, [password]);

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const width = password.length === 0 ? 0 : ((strength + 1) / 5) * 100;

  if (password.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength >= 3 ? 'text-green-400' : strength >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
        {strength < 5 ? labels[strength] : labels[4]}
      </p>
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
      ) : (
        <X className="w-3.5 h-3.5 text-gray-600 shrink-0" />
      )}
      <span className={met ? 'text-green-400' : 'text-gray-500'}>{text}</span>
    </div>
  );
}

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    age: '',
    gender: 'male',
    bio: '',
    acceptTerms: false,
    acceptPrivacyPolicy: false,
    parentalConsent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const { register, loading, error } = useAuthStore();

  const passwordReqs = useMemo(() => ({
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  }), [formData.password]);

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (contactMethod === 'email' && !formData.email) {
      newErrors.email = 'Email is required';
    } else if (contactMethod === 'email' && formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (contactMethod === 'phone' && !formData.phone) {
      newErrors.phone = 'Phone is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordReqs.length || !passwordReqs.upper || !passwordReqs.lower || !passwordReqs.number || !passwordReqs.special) {
      newErrors.password = 'Password does not meet requirements';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName || formData.displayName.length < 2) {
      newErrors.displayName = 'Display name must be at least 2 characters';
    }
    if (!formData.age || parseInt(formData.age) < 13) {
      newErrors.age = 'You must be at least 13';
    }
    if (parseInt(formData.age) < 18 && !formData.parentalConsent) {
      newErrors.parentalConsent = 'Parental consent required for users under 18';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the Terms of Service';
    }
    if (!formData.acceptPrivacyPolicy) {
      newErrors.acceptPrivacyPolicy = 'You must accept the Privacy Policy';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    try {
      await register({
        email: contactMethod === 'email' ? formData.email : undefined,
        phone: contactMethod === 'phone' ? formData.phone : undefined,
        password: formData.password,
        displayName: formData.displayName,
        age: parseInt(formData.age),
        gender: formData.gender,
        bio: formData.bio || undefined,
        acceptTerms: formData.acceptTerms,
        acceptPrivacyPolicy: formData.acceptPrivacyPolicy,
        parentalConsent: formData.parentalConsent,
      });
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const isUnder18 = formData.age && parseInt(formData.age) < 18;

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
          step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
        }`}>1</div>
        <div className={`flex-1 h-0.5 rounded transition-all duration-300 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-700'}`} />
        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
          step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-500'
        }`}>2</div>
      </div>

      {/* Step 1: Account Details */}
      <div className={`space-y-5 ${step === 1 ? 'block' : 'hidden'}`}>
        <div className="flex gap-2 bg-gray-800/50 rounded-xl p-1.5">
          <button
            type="button"
            onClick={() => setContactMethod('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              contactMethod === 'email'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
          <button
            type="button"
            onClick={() => setContactMethod('phone')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              contactMethod === 'phone'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Phone className="w-4 h-4" /> Phone
          </button>
        </div>

        {contactMethod === 'email' ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 ${
                errors.email ? 'border-red-500/50' : 'border-gray-700'
              }`}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone number</label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 ${
                errors.phone ? 'border-red-500/50' : 'border-gray-700'
              }`}
            />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a strong password"
              className={`w-full px-4 py-3 pr-12 bg-gray-800/50 border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 ${
                errors.password ? 'border-red-500/50' : 'border-gray-700'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrengthBar password={formData.password} />
          {formData.password.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
              <RequirementItem met={passwordReqs.length} text="8+ characters" />
              <RequirementItem met={passwordReqs.upper} text="Uppercase letter" />
              <RequirementItem met={passwordReqs.lower} text="Lowercase letter" />
              <RequirementItem met={passwordReqs.number} text="Number" />
              <RequirementItem met={passwordReqs.special} text="Special character" />
            </div>
          )}
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm password</label>
          <input
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter your password"
            className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 ${
              errors.confirmPassword ? 'border-red-500/50' : 'border-gray-700'
            }`}
          />
          {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
        >
          Continue
        </button>
      </div>

      {/* Step 2: Profile Details */}
      <div className={`space-y-5 ${step === 2 ? 'block' : 'hidden'}`}>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <User className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Display name
          </label>
          <input
            name="displayName"
            type="text"
            value={formData.displayName}
            onChange={handleChange}
            placeholder="How others see you"
            maxLength={50}
            className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 ${
              errors.displayName ? 'border-red-500/50' : 'border-gray-700'
            }`}
          />
          {errors.displayName && <p className="text-red-400 text-xs mt-1">{errors.displayName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Age
            </label>
            <input
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              placeholder="18"
              min={13}
              max={120}
              className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 ${
                errors.age ? 'border-red-500/50' : 'border-gray-700'
              }`}
            />
            {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Gender</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
            Bio <span className="text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell people a little about yourself..."
            rows={2}
            maxLength={500}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200 resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
        </div>

        {isUnder18 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <h3 className="text-sm font-medium text-yellow-400 mb-2">Parental consent required</h3>
            <p className="text-xs text-yellow-300/70 mb-3">
              Users under 18 need parental consent to use this platform.
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="parentalConsent"
                checked={formData.parentalConsent}
                onChange={handleChange}
                className="mt-0.5 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
              />
              <span className="text-sm text-yellow-300">I have parental consent to use this app</span>
            </label>
            {errors.parentalConsent && <p className="text-red-400 text-xs mt-1">{errors.parentalConsent}</p>}
          </div>
        )}

        <div className="space-y-3 bg-gray-800/30 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              className="mt-0.5 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
              I accept the <a href="/terms" className="text-indigo-400 hover:text-indigo-300 underline">Terms of Service</a>
            </span>
          </label>
          {errors.acceptTerms && <p className="text-red-400 text-xs ml-7">{errors.acceptTerms}</p>}

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              name="acceptPrivacyPolicy"
              checked={formData.acceptPrivacyPolicy}
              onChange={handleChange}
              className="mt-0.5 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0"
            />
            <span className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors">
              I accept the <a href="/privacy" className="text-indigo-400 hover:text-indigo-300 underline">Privacy Policy</a>
            </span>
          </label>
          {errors.acceptPrivacyPolicy && <p className="text-red-400 text-xs ml-7">{errors.acceptPrivacyPolicy}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center justify-center gap-1.5 px-5 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
