import { HeroSection } from "@/components/sections/HeroSection";
import { AboutSection } from "@/components/sections/AboutSection";
import { SkillsSection } from "@/components/sections/SkillsSection";
import { ProjectsSection } from "@/components/sections/ProjectsSection";
import { ArchitectureSection } from "@/components/sections/ArchitectureSection";
import { ActivitySection } from "@/components/sections/ActivitySection";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { ContactSection } from "@/components/sections/ContactSection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ArchitectureSection />
      <ActivitySection />
      <ExperienceSection />
      <ContactSection />
    </>
  );
}
