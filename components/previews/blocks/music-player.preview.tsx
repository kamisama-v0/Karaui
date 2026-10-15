"use client";

import { MusicPlayer, type MusicTrack } from "@/components/motion/music-player";

const TRACKS: MusicTrack[] = [
  { id: "t1", title: "Glass Harbor", artist: "Northern Lines", album: "Low Tide", duration: 214 },
  { id: "t2", title: "Paper Satellites", artist: "Mira Vale", album: "Orbitals", duration: 187 },
  { id: "t3", title: "Late Bloom", artist: "The Quiet Hours", album: "Fieldnotes", duration: 242 },
  { id: "t4", title: "Neon Rain", artist: "Kito & Sable", album: "City Hum", duration: 199 },
  { id: "t5", title: "Slow Orbit", artist: "Ada Wren", album: "Driftwood", duration: 228 },
];

export function MusicPlayerPreview() {
  return (
    <div className="flex w-full justify-center py-2">
      <MusicPlayer tracks={TRACKS} />
    </div>
  );
}
