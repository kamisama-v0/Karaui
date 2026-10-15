"use client";

import { Globe, Mail } from "lucide-react";
import { type TeamMember, TeamSection, type TeamSocialLink } from "@/components/motion/team-section";

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  );
}

/** Fake portrait: gradient backdrop with a soft head-and-shoulders silhouette. */
function Portrait({ from, to, tone }: { from: string; to: string; tone: string }) {
  return (
    <svg viewBox="0 0 160 200" preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      <rect width="160" height="200" fill={from} />
      <circle cx="130" cy="30" r="70" fill={to} opacity="0.7" />
      <ellipse cx="80" cy="200" rx="62" ry="58" fill={tone} />
      <circle cx="80" cy="96" r="30" fill={tone} />
    </svg>
  );
}

function socials(handle: string): TeamSocialLink[] {
  return [
    { label: "GitHub", href: `#${handle}-github`, icon: <GitHubGlyph /> },
    { label: "Website", href: `#${handle}-site`, icon: <Globe aria-hidden /> },
    { label: "Email", href: `#${handle}-mail`, icon: <Mail aria-hidden /> },
  ];
}

const MEMBERS: TeamMember[] = [
  {
    id: "mara",
    name: "Mara Okafor",
    role: "Head of Design",
    department: "Design",
    location: "Lisbon",
    bio: "Mara leads the design system and obsesses over easing curves. Before Northwind she shaped interfaces for two transit apps.",
    photo: <Portrait from="#f6c9a8" to="#f39a7b" tone="#5b3a2e" />,
    socials: socials("mara"),
  },
  {
    id: "jonas",
    name: "Jonas Lind",
    role: "Staff Engineer",
    department: "Engineering",
    location: "Stockholm",
    bio: "Jonas works on rendering performance and the animation runtime. He keeps a spreadsheet of every dropped frame he has ever fixed.",
    socials: socials("jonas"),
  },
  {
    id: "priya",
    name: "Priya Varma",
    role: "Product Manager",
    department: "Product",
    location: "Bengaluru",
    bio: "Priya turns customer interviews into roadmaps and has a habit of prototyping in the meeting itself.",
    photo: <Portrait from="#bcd7f5" to="#8fb2ea" tone="#2d3550" />,
    socials: socials("priya"),
  },
  {
    id: "theo",
    name: "Theo Easton",
    role: "Frontend Engineer",
    department: "Engineering",
    location: "Toronto",
    bio: "Theo builds accessible components and writes the keyboard tests nobody else wants to write.",
    photo: <Portrait from="#cfe7cf" to="#9fd0a6" tone="#2f4a36" />,
    socials: socials("theo"),
  },
  {
    id: "aiko",
    name: "Aiko Kimura",
    role: "Brand Designer",
    department: "Design",
    location: "Osaka",
    bio: "Aiko draws the illustrations, picks the type and maintains the motion guidelines for marketing.",
    socials: socials("aiko"),
  },
  {
    id: "ruth",
    name: "Ruth Bellamy",
    role: "Developer Advocate",
    department: "Product",
    location: "Bristol",
    bio: "Ruth runs the community, writes the guides and answers more questions per day than anyone on the team.",
    photo: <Portrait from="#e7d3f3" to="#c6a4e8" tone="#3e2c52" />,
    socials: socials("ruth"),
  },
];

export function TeamSectionPreview() {
  return (
    <div className="h-[440px] w-full max-w-[40rem] overflow-y-auto px-1 py-2 [scrollbar-color:var(--border-strong)_transparent] [scrollbar-width:thin]">
      <TeamSection
        members={MEMBERS}
        columns={3}
        heading="Meet the team"
        description="A small, remote team building motion-first interface components."
      />
    </div>
  );
}
