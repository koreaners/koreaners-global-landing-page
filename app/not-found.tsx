import type { Metadata } from "next";
import Link from "next/link";
import Navigation from "@/components/navigation";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--kn-dark)] px-6 text-center">
      <Navigation />
      <p className="text-sm font-bold uppercase tracking-widest text-[#FF4500]">
        404
      </p>
      <h1 className="mt-4 font-display text-5xl font-black uppercase tracking-tight text-white sm:text-7xl">
        PAGE NOT FOUND
      </h1>
      <p className="mt-4 text-base text-[#A8A29E]">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center gradient-warm text-white rounded-[var(--radius-sm)] px-8 py-3 text-sm font-bold hover:opacity-90 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#FF4500]/20 transition-all duration-300"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
