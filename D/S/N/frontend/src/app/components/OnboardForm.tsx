"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, User, Mail, Phone, Linkedin, Globe, Briefcase, MapPin, DollarSign, Loader2, CheckCircle2, X, Plus } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const WORK_TYPES = ["remote", "hybrid", "onsite", "any"];

const COMMON_QUESTIONS = [
  "Are you authorized to work in the US?",
  "Years of experience?",
  "Willing to relocate?",
  "Expected salary?"
];

interface AnswerPair {
  id: string;
  question: string;
  answer: string;
}

export default function OnboardForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", linkedin_url: "", website: "",
    title: "", location: "", salary_min: "", work_type: "remote", max_applications: 10,
  });

  const [answers, setAnswers] = useState<AnswerPair[]>(
    COMMON_QUESTIONS.map((q, i) => ({ id: String(i), question: q, answer: "" }))
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const updateAnswer = (id: string, field: "question" | "answer", value: string) => {
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const addAnswer = () => {
    const newId = String(Date.now());
    setAnswers((prev) => [...prev, { id: newId, question: "", answer: "" }]);
  };

  const removeAnswer = (id: string) => {
    setAnswers((prev) => prev.filter((a) => a.id !== id));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);

    const fd = new FormData();
    fd.append("full_name", form.full_name);
    fd.append("email", form.email);
    fd.append("phone", form.phone);
    fd.append("linkedin_url", form.linkedin_url);
    fd.append("website", form.website);
    fd.append("job_preferences", JSON.stringify({
      title: form.title,
      location: form.location,
      salary_min: form.salary_min ? parseInt(form.salary_min, 10) : null,
      work_type: form.work_type,
      max_applications: form.max_applications,
    }));
    
    const answerBank = answers.map((a) => ({ question: a.question, answer: a.answer }));
    fd.append("answer_bank", JSON.stringify(answerBank));

    if (uploadedFile) fd.append("resume", uploadedFile);

    try {
      const res = await fetch(`${API}/api/onboard`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? "Onboarding failed");

      localStorage.setItem("user_id", json.user_id);
      setDone(true);
      setTimeout(() => router.push("/agent"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 fade-in-up">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <p className="text-lg font-semibold text-white">Profile created!</p>
        <p className="text-sm text-slate-400">Redirecting to agent…</p>
      </div>
    );
  }

  const inputCls = "w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all";
  const labelCls = "flex items-center gap-2 text-xs font-medium text-slate-400 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      {/* Personal info */}
      <section className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white">Personal Information</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}><User className="h-3.5 w-3.5" /> Full Name *</label>
            <input required className={inputCls} placeholder="Jane Doe" value={form.full_name} onChange={set("full_name")} />
          </div>
          <div>
            <label className={labelCls}><Mail className="h-3.5 w-3.5" /> Email *</label>
            <input required type="email" className={inputCls} placeholder="jane@example.com" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className={labelCls}><Phone className="h-3.5 w-3.5" /> Phone</label>
            <input type="tel" className={inputCls} placeholder="+1 555 000 0000" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className={labelCls}><Linkedin className="h-3.5 w-3.5" /> LinkedIn URL</label>
            <input className={inputCls} placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={set("linkedin_url")} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}><Globe className="h-3.5 w-3.5" /> Portfolio / Website</label>
            <input className={inputCls} placeholder="https://yoursite.com" value={form.website} onChange={set("website")} />
          </div>
        </div>
      </section>

      {/* Job preferences */}
      <section className="glass rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-white">Job Preferences</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}><Briefcase className="h-3.5 w-3.5" /> Target Job Title *</label>
            <input required className={inputCls} placeholder="Software Engineer" value={form.title} onChange={set("title")} />
          </div>
          <div>
            <label className={labelCls}><MapPin className="h-3.5 w-3.5" /> Preferred Location</label>
            <input className={inputCls} placeholder="Remote / New York, NY" value={form.location} onChange={set("location")} />
          </div>
          <div>
            <label className={labelCls}><DollarSign className="h-3.5 w-3.5" /> Minimum Salary (USD/yr)</label>
            <input type="number" min={0} step={1000} className={inputCls} placeholder="80000" value={form.salary_min} onChange={set("salary_min")} />
          </div>
        </div>

        {/* Work Type Radio Buttons */}
        <div className="pt-2">
          <label className={labelCls}><Briefcase className="h-3.5 w-3.5" /> Work Type</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WORK_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="work_type"
                  value={type}
                  checked={form.work_type === type}
                  onChange={set("work_type")}
                  className="w-4 h-4 text-indigo-600 bg-white/[0.04] border-white/[0.12] cursor-pointer"
                />
                <span className="text-sm text-slate-300">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Max Applications Slider */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <label className={labelCls}><Briefcase className="h-3.5 w-3.5" /> Max Applications Per Run</label>
            <span className="text-sm font-semibold text-indigo-400">{form.max_applications}</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={form.max_applications}
            onChange={(e) => setForm((p) => ({ ...p, max_applications: parseInt(e.target.value, 10) }))}
            className="w-full h-2 bg-white/[0.08] rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${((form.max_applications - 5) / 45) * 100}%, rgba(255, 255, 255, 0.08) ${((form.max_applications - 5) / 45) * 100}%, rgba(255, 255, 255, 0.08) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5</span>
            <span>50</span>
          </div>
        </div>
      </section>

      {/* Resume upload */}
      <section className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Resume</h2>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-10 cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 ring-1 ring-indigo-500/30">
            <Upload className="h-5 w-5 text-indigo-400" />
          </div>
          {fileName ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-400">{fileName}</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-white">Drop your resume here or click to upload</p>
              <p className="text-xs text-slate-500">PDF, DOCX — parsed automatically by GPT-4</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setFileName(file.name);
              setUploadedFile(file);
            }
          }}
        />
      </section>

      {/* Screening Answers Bank */}
      <section className="glass rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Screening Answers Bank</h2>
        <p className="text-xs text-slate-400">Provide answers to common screening questions. These will be used when applying.</p>
        
        <div className="space-y-3">
          {answers.map((pair, idx) => (
            <div key={pair.id} className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-400 block mb-1">{`Question ${idx + 1}`}</label>
                <input
                  type="text"
                  placeholder="e.g., Are you authorized to work in the US?"
                  value={pair.question}
                  onChange={(e) => updateAnswer(pair.id, "question", e.target.value)}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all"
                />
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-400 block mb-1">Answer</label>
                <input
                  type="text"
                  placeholder="Your answer"
                  value={pair.answer}
                  onChange={(e) => updateAnswer(pair.id, "answer", e.target.value)}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => removeAnswer(pair.id)}
                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20 hover:border-red-500/30 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addAnswer}
          className="w-full flex items-center justify-center gap-2 mt-3 px-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition-all text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Another Answer
        </button>
      </section>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Creating profile…" : "🚀 Start Auto-Applying"}
      </button>
    </form>
  );
}
