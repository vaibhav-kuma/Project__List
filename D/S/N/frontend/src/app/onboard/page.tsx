import OnboardForm from "../components/OnboardForm";
import { BotIcon } from "lucide-react";

export const metadata = { title: "Get Started – AutoApply AI" };

export default function OnboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Hero */}
      <div className="mb-10 text-center fade-in-up">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/20">
          <BotIcon className="h-7 w-7 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Set Up Your <span className="gradient-text">Auto-Apply Profile</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          Fill in your details once. Our AI agent will search, score, and apply
          to jobs autonomously — while you focus on what matters.
        </p>
      </div>
      <OnboardForm />
    </div>
  );
}
