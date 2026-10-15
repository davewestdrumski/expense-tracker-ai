import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
      <Link href="/" className="mt-6 text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to dashboard →
      </Link>
    </div>
  );
}
