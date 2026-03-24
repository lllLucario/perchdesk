"use client";

import Link from "next/link";
import { use } from "react";

export default function SpacesInBuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <Link href="/buildings" className="hover:text-gray-700">Buildings</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Building {id}</span>
      </nav>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Spaces in Building</h1>
      <p className="text-sm text-gray-400">Space selection for building {id} — coming in PR 2.</p>
    </div>
  );
}
