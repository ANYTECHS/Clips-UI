import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-3xl font-bold mb-4">404 - Page Not Found</h2>
      <p className="text-gray-400 mb-6">Could not find requested resource</p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-brand text-black font-semibold rounded-full hover:bg-brand-hover transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
