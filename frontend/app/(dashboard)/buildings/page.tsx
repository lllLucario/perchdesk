"use client";

import Link from "next/link";

export default function BuildingsPage() {
  return (
    <div>
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Buildings</span>
      </nav>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Buildings</h1>
      <p className="text-sm text-gray-400">Building selection — coming in PR 2.</p>
    </div>
  );
}
