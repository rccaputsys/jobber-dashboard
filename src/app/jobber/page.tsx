// src/app/jobber/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  DollarSign,
  FileText,
  CalendarClock,
  Inbox,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  CreditCard,
  Download,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Check,
  LayoutDashboard,
} from "lucide-react";

/* ================================ Hooks ================================ */

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            // Stagger children
            const children = entry.target.querySelectorAll(".lp-reveal-child");
            children.forEach((child, i) => {
              setTimeout(() => child.classList.add("visible"), i * 100);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function useNavScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);
  return scrolled;
}

/* ================================ Components ================================ */

function ConnectButton({
  children,
  size = "large",
}: {
  children: React.ReactNode;
  size?: "large" | "small";
}) {
  const [loading, setLoading] = useState(false);

  const cls =
    size === "large"
      ? "px-8 py-4 text-[17px] rounded-xl"
      : "px-5 py-2.5 text-sm rounded-lg";

  return (
    <a
      href="/api/jobber/connect"
      onClick={() => setLoading(true)}
      className={`
        inline-flex items-center gap-2.5 font-bold text-white no-underline
        transition-all duration-200 cursor-pointer select-none
        ${cls}
        ${
          loading
            ? "bg-[#334155] shadow-none pointer-events-none opacity-80"
            : "bg-gradient-to-r from-[#3B82F6] to-[#2563EB] shadow-[0_4px_24px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_32px_rgba(59,130,246,0.5)] hover:-translate-y-0.5"
        }
      `}
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      {loading ? (
        <>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="animate-spin"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Connecting...
        </>
      ) : (
        children
      )}
    </a>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center gap-4 py-5 text-left bg-transparent border-none cursor-pointer group"
      >
        <span
          className="text-base font-semibold text-lp-text leading-relaxed"
          style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
        >
          {q}
        </span>
        <ChevronDown
          size={20}
          className={`text-lp-text-muted flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-96 pb-5" : "max-h-0"
        }`}
      >
        <p
          className="text-sm text-lp-text-secondary leading-[1.7] pr-8 m-0"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

function RevealSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useScrollReveal();
  return (
    <div ref={ref} className={`lp-reveal ${className}`}>
      {children}
    </div>
  );
}

/* ================================ Page ================================ */

export default function JobberLanding() {
  const navScrolled = useNavScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Dashboard reveal animation
  useEffect(() => {
    const el = dashboardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = el.querySelector(".lp-dashboard-img");
            img?.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <main
      className="min-h-screen text-[var(--lp-text)]"
      style={{
        fontFamily: "var(--font-dm-sans), sans-serif",
        background:
          "linear-gradient(180deg, var(--lp-bg-1) 0%, var(--lp-bg-2) 40%, var(--lp-bg-3) 100%)",
      }}
    >
      {/* Dot grid texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ============ STICKY NAV ============ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          navScrolled
            ? "bg-[#060B18]/90 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center h-16">
          <img
            src="/AccuInsight_Logo_Dark.svg"
            alt="AccuInsight"
            className="h-7"
          />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollTo("features")}
              className="text-sm font-medium text-lp-text-secondary hover:text-lp-text transition-colors bg-transparent border-none cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-sm font-medium text-lp-text-secondary hover:text-lp-text transition-colors bg-transparent border-none cursor-pointer"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollTo("faq")}
              className="text-sm font-medium text-lp-text-secondary hover:text-lp-text transition-colors bg-transparent border-none cursor-pointer"
            >
              FAQ
            </button>
            <ConnectButton size="small">Start Free Trial</ConnectButton>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden bg-transparent border-none text-lp-text-secondary cursor-pointer p-1"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#060B18]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-4 flex flex-col gap-3">
            <button
              onClick={() => scrollTo("features")}
              className="text-left text-sm font-medium text-lp-text-secondary hover:text-lp-text transition-colors bg-transparent border-none cursor-pointer py-2"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("pricing")}
              className="text-left text-sm font-medium text-lp-text-secondary hover:text-lp-text transition-colors bg-transparent border-none cursor-pointer py-2"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollTo("faq")}
              className="text-left text-sm font-medium text-lp-text-secondary hover:text-lp-text transition-colors bg-transparent border-none cursor-pointer py-2"
            >
              FAQ
            </button>
            <div className="pt-2">
              <ConnectButton size="small">Start Free Trial</ConnectButton>
            </div>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative pt-28 pb-10 md:pt-36 md:pb-16 overflow-hidden">
        {/* Hero glow */}
        <div
          className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(59,130,246,0.12), transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
          {/* Badge */}
          <div className="lp-badge-pulse inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] mb-8">
            <Zap size={14} className="text-lp-accent" />
            <span
              className="text-xs font-semibold tracking-wide uppercase text-lp-accent"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Built for Jobber
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-[32px] md:text-[56px] lg:text-[64px] font-extrabold leading-[1.1] tracking-[-0.03em] max-w-[900px] mx-auto mb-6"
            style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
          >
            You&apos;re booked solid.
            <br />
            <span className="bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] bg-clip-text text-transparent">
              So where&apos;s the money going?
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-base md:text-lg text-lp-text-secondary leading-[1.7] max-w-[640px] mx-auto mb-10">
            AccuInsight connects to your Jobber account and shows you the
            overdue invoices, cold quotes, and scheduling gaps that are quietly
            costing you thousands. One dashboard. No digging through reports.
          </p>

          {/* CTA */}
          <div className="mb-3">
            <ConnectButton>
              Connect Jobber and See Your Numbers
              <ArrowRight size={18} />
            </ConnectButton>
          </div>
          <p className="text-xs text-lp-text-muted">
            Free 14-day trial. No credit card. 2-minute setup.
          </p>

          {/* Dashboard screenshot with 3D perspective + reflection */}
          <div ref={dashboardRef} className="lp-dashboard-frame mt-16 md:mt-20 max-w-[1100px] mx-auto">
            <div className="relative">
              {/* Gradient border frame */}
              <div
                className="rounded-2xl p-[1px] lp-dashboard-img"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(255,255,255,0.06) 50%, rgba(59,130,246,0.15))",
                }}
              >
                <div className="rounded-2xl overflow-hidden bg-[var(--lp-bg-1)]">
                  <img
                    src="/dashboard-full.png"
                    alt="AccuInsight dashboard showing overdue invoices, quote tracking, and scheduling gaps"
                    className="w-full h-auto block"
                  />
                </div>
              </div>

              {/* Reflection effect */}
              <div
                className="absolute -bottom-[40%] left-0 right-0 h-[40%] pointer-events-none overflow-hidden rounded-2xl"
                style={{
                  transform: "scaleY(-1)",
                  maskImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 60%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0.15), transparent 60%)",
                  filter: "blur(4px)",
                }}
              >
                <img
                  src="/dashboard-full.png"
                  alt=""
                  className="w-full h-auto block opacity-30"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROBLEM SECTION ============ */}
      <section className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection className="text-center mb-14">
            <h2
              className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Sound familiar?
            </h2>
          </RevealSection>

          <RevealSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  text: "You sent a quote three weeks ago. Did they ever respond? You can\u2019t remember, and you don\u2019t have time to check.",
                  icon: FileText,
                  color: "var(--lp-amber)",
                  borderColor: "rgba(245,158,11,0.3)",
                },
                {
                  text: "There\u2019s an invoice from last month that still hasn\u2019t been paid. You keep meaning to follow up but it slips through the cracks.",
                  icon: DollarSign,
                  color: "var(--lp-red)",
                  borderColor: "rgba(239,68,68,0.3)",
                },
                {
                  text: "You had a great month but your bank account doesn\u2019t reflect it. You know money is leaking somewhere but you can\u2019t pinpoint where.",
                  icon: TrendingUp,
                  color: "var(--lp-accent)",
                  borderColor: "rgba(59,130,246,0.3)",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="lp-reveal-child rounded-2xl p-7 bg-[var(--lp-card-bg)] border border-[var(--lp-card-border)] transition-all duration-300 hover:border-[var(--lp-card-border-hover)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
                  style={{ borderLeftWidth: 3, borderLeftColor: item.borderColor }}
                >
                  <item.icon
                    size={24}
                    className="mb-4"
                    style={{ color: item.color }}
                  />
                  <p className="text-[15px] text-lp-text-secondary leading-[1.7] m-0">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </RevealSection>

          <RevealSection className="text-center mt-10">
            <p className="text-base text-lp-text-muted max-w-[700px] mx-auto leading-[1.7]">
              Jobber is great at running your business. AccuInsight shows you
              what Jobber doesn&apos;t:{" "}
              <strong className="text-lp-text font-semibold">
                where the money is stuck
              </strong>{" "}
              and what to do about it.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] text-xs font-semibold tracking-wide uppercase text-lp-accent mb-4">
              Features
            </span>
            <h2
              className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Every dollar that&apos;s slipping
              <br className="hidden md:block" /> through the cracks
            </h2>
          </RevealSection>

          {/* Alternating feature rows */}
          <div className="flex flex-col gap-20 md:gap-28">
            {[
              {
                icon: DollarSign,
                iconBg: "rgba(239,68,68,0.12)",
                iconColor: "var(--lp-red)",
                title: "Overdue invoices, sorted by how late they are",
                desc: "You have invoices sitting at 15, 30, even 60+ days. AccuInsight sorts them by age so you know exactly who to call first. One click opens the invoice in Jobber so you can follow up right now.",
                images: ["/feature-invoices.png"],
              },
              {
                icon: FileText,
                iconBg: "rgba(59,130,246,0.12)",
                iconColor: "var(--lp-accent)",
                title: "Quotes that went cold",
                desc: "You spent time on those estimates. AccuInsight tracks which ones were sent but never approved so you can follow up before they hire someone else. See the total dollar amount sitting in unanswered quotes.",
                images: ["/feature-quotes.png", "/feature-quotes-trend.png"],
                reverse: true,
              },
              {
                icon: CalendarClock,
                iconBg: "rgba(245,158,11,0.12)",
                iconColor: "var(--lp-amber)",
                title: "Unscheduled jobs eating your calendar",
                desc: "Jobs that are approved but not on the schedule yet. That\u2019s revenue you\u2019ve already won but aren\u2019t collecting. AccuInsight flags them so nothing falls through.",
                images: ["/feature-unscheduled.png", "/feature-unscheduled-card.png"],
              },
              {
                icon: Inbox,
                iconBg: "rgba(16,185,129,0.12)",
                iconColor: "var(--lp-emerald)",
                title: "Open requests you haven\u2019t responded to",
                desc: "New leads are waiting. AccuInsight shows you pending work requests so you can respond fast and win the job before they call the next guy.",
                images: ["/feature-requests.png", "/feature-requests-card.png"],
                reverse: true,
              },
              {
                icon: TrendingUp,
                iconBg: "rgba(59,130,246,0.12)",
                iconColor: "var(--lp-accent)",
                title: "Trends that tell you what\u2019s coming",
                desc: "See your quote leak, AR aging, and scheduling gaps over time. Know whether things are getting better or worse, not just where they stand today.",
                images: ["/feature-trends.png"],
              },
              {
                icon: LayoutDashboard,
                iconBg: "rgba(124,92,255,0.12)",
                iconColor: "#7c5cff",
                title: "One action list to rule them all",
                desc: "Every overdue invoice, cold quote, unscheduled job, and open request in one sortable, filterable list. Stop switching tabs \u2014 see what needs attention right now.",
                images: ["/feature-actions.png"],
                reverse: true,
              },
            ].map((feature, i) => (
              <RevealSection key={i}>
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center ${
                    feature.reverse ? "md:[direction:rtl]" : ""
                  }`}
                >
                  {/* Text side */}
                  <div
                    className={`lp-reveal-child ${
                      feature.reverse ? "md:[direction:ltr]" : ""
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                      style={{ background: feature.iconBg }}
                    >
                      <feature.icon
                        size={24}
                        style={{ color: feature.iconColor }}
                      />
                    </div>
                    <h3
                      className="text-xl md:text-2xl font-bold tracking-[-0.02em] mb-4"
                      style={{
                        fontFamily: "var(--font-jakarta), sans-serif",
                      }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-[15px] md:text-base text-lp-text-secondary leading-[1.7] m-0">
                      {feature.desc}
                    </p>
                  </div>

                  {/* Screenshot side */}
                  <div
                    className={`lp-reveal-child flex flex-col gap-4 ${
                      feature.reverse ? "md:[direction:ltr]" : ""
                    }`}
                  >
                    {feature.images.map((img, j) => (
                      <div
                        key={j}
                        className="rounded-2xl overflow-hidden border border-[var(--lp-card-border)] shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
                      >
                        <img
                          src={img}
                          alt={feature.title}
                          className="w-full h-auto block"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHO IT'S FOR ============ */}
      <section className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection className="text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] text-xs font-semibold tracking-wide uppercase text-lp-accent mb-4">
              Who it&apos;s for
            </span>
            <h2
              className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em] mb-8"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Built for contractors who run on Jobber
            </h2>

            {/* Industry tags */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {[
                "Lawn Care",
                "Landscaping",
                "HVAC",
                "Plumbing",
                "Electrical",
                "Cleaning",
                "Pest Control",
              ].map((tag) => (
                <span
                  key={tag}
                  className="lp-reveal-child px-4 py-2 rounded-lg bg-[var(--lp-card-bg)] border border-[var(--lp-card-border)] text-sm font-medium text-lp-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-base text-lp-text-secondary max-w-[560px] mx-auto leading-[1.7]">
              You don&apos;t need to be a numbers person. If you can read a bank
              statement, you can use AccuInsight.
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ============ FOUNDER ============ */}
      <section className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection>
            <div className="max-w-[720px] mx-auto relative rounded-2xl p-8 md:p-10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-[0_24px_48px_rgba(0,0,0,0.3)]">
              {/* Quote mark */}
              <div
                className="absolute top-6 left-6 text-5xl leading-none text-lp-accent/20"
                style={{ fontFamily: "Georgia, serif" }}
              >
                &ldquo;
              </div>

              <blockquote className="relative z-10">
                <p className="text-base md:text-[17px] text-lp-text-secondary/80 leading-[1.8] italic mb-6">
                  I ran a lawn care and landscaping company. I was using Jobber
                  every day and had no idea I was sitting on thousands in unpaid
                  invoices and cold quotes. I&apos;d check my bank account and
                  the number never matched what I thought I earned. So I built
                  the dashboard I wished I had. That&apos;s AccuInsight.
                </p>
                <footer className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-white font-bold text-base">
                    R
                  </div>
                  <div>
                    <div
                      className="text-sm font-bold text-lp-text"
                      style={{
                        fontFamily: "var(--font-jakarta), sans-serif",
                      }}
                    >
                      Ryan
                    </div>
                    <div className="text-xs text-lp-text-muted">
                      Founder of AccuInsight &middot; Former lawn care business
                      owner
                    </div>
                  </div>
                </footer>
              </blockquote>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] text-xs font-semibold tracking-wide uppercase text-lp-accent mb-4">
              How it works
            </span>
            <h2
              className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Set it up in 2 minutes. Seriously.
            </h2>
          </RevealSection>

          <RevealSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[900px] mx-auto relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden md:block absolute top-7 left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-[2px] bg-gradient-to-r from-[#3B82F6]/30 via-[#3B82F6]/50 to-[#3B82F6]/30" />

              {[
                {
                  num: "1",
                  title: "Connect your Jobber account",
                  desc: "One-click authorization. No passwords shared.",
                },
                {
                  num: "2",
                  title: "Data syncs automatically",
                  desc: "AccuInsight pulls your invoices, quotes, jobs, and requests.",
                },
                {
                  num: "3",
                  title: "See what needs attention",
                  desc: "Open your dashboard and start collecting, scheduling, and closing.",
                },
              ].map((step, i) => (
                <div key={i} className="lp-reveal-child text-center relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center text-xl font-extrabold text-white mx-auto mb-5 shadow-[0_8px_24px_rgba(59,130,246,0.35)] relative z-10">
                    {step.num}
                  </div>
                  <h3
                    className="text-base font-bold mb-2"
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm text-lp-text-secondary leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] text-xs font-semibold tracking-wide uppercase text-lp-accent mb-4">
              Pricing
            </span>
            <h2
              className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Simple pricing. Cancel anytime.
            </h2>
          </RevealSection>

          <RevealSection>
            <div
              className="max-w-[460px] mx-auto rounded-2xl p-[1px] shadow-[0_24px_64px_rgba(0,0,0,0.4),0_0_0_1px_rgba(59,130,246,0.1)]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.4), rgba(255,255,255,0.06) 50%, rgba(59,130,246,0.2))",
              }}
            >
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-[var(--lp-bg-2)] p-10 text-center">
                <div className="text-sm font-semibold text-lp-text-secondary mb-6">
                  One plan. Everything included.
                </div>

                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span
                    className="text-6xl font-extrabold tracking-[-3px]"
                    style={{
                      fontFamily: "var(--font-jakarta), sans-serif",
                    }}
                  >
                    $29
                  </span>
                  <span className="text-base text-lp-text-muted">/month</span>
                </div>
                <p className="text-sm text-lp-text-muted mb-8">
                  After your free 14-day trial
                </p>

                <div className="flex flex-col gap-3 mb-8 text-left max-w-[280px] mx-auto">
                  {[
                    "No contracts",
                    "No setup fees",
                    "No per-user charges",
                    "Cancel anytime",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-lp-text-secondary"
                    >
                      <Check
                        size={16}
                        className="text-lp-emerald flex-shrink-0"
                      />
                      {item}
                    </div>
                  ))}
                </div>

                <ConnectButton>Start Free Trial</ConnectButton>

                <p className="text-xs text-lp-text-muted mt-5">
                  If AccuInsight helps you collect even one overdue invoice, it
                  pays for itself.
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-24 md:py-36 relative z-10">
        <div className="max-w-[720px] mx-auto px-6">
          <RevealSection className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] text-xs font-semibold tracking-wide uppercase text-lp-accent mb-4">
              FAQ
            </span>
            <h2
              className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em]"
              style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
            >
              Questions?
            </h2>
          </RevealSection>

          <RevealSection>
            <div className="rounded-2xl bg-[var(--lp-card-bg)] border border-[var(--lp-card-border)] px-6 md:px-8">
              <FAQItem
                q="Does AccuInsight replace Jobber?"
                a="No. AccuInsight works alongside Jobber. You keep using Jobber to run your business. AccuInsight just shows you the things Jobber's built-in reports miss — aging invoices, cold quotes, and scheduling gaps."
              />
              <FAQItem
                q="Is my data safe?"
                a="Yes. AccuInsight uses Jobber's official API with read-only access. We never modify your Jobber data. Your information is encrypted in transit and at rest."
              />
              <FAQItem
                q="What happens after the free trial?"
                a="After 14 days, you can subscribe for $29/month to keep using AccuInsight. If you don't subscribe, your account simply stops syncing. No surprise charges."
              />
              <FAQItem
                q="How long does setup take?"
                a="About 2 minutes. Click the connect button, authorize with Jobber, and your dashboard is ready. No downloads, no configuration, no IT department needed."
              />
              <FAQItem
                q="What types of businesses does this work for?"
                a="Any service business running on Jobber: lawn care, landscaping, HVAC, plumbing, electrical, cleaning, pest control, and more. If you send invoices and quotes through Jobber, AccuInsight works for you."
              />
              <FAQItem
                q="Can I export my data?"
                a="Yes. Every section of the dashboard has a CSV export button. Download your overdue invoices, leaking quotes, or unscheduled jobs and bring them to your weekly team meeting."
              />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-24 md:py-36 relative z-10">
        <div className="max-w-[1200px] mx-auto px-6">
          <RevealSection>
            <div
              className="rounded-2xl px-8 py-16 md:py-20 text-center relative overflow-hidden"
              style={{
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              {/* Glow effect */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.1), transparent 70%)",
                }}
              />

              <h2
                className="text-2xl md:text-4xl font-extrabold tracking-[-0.03em] mb-4 relative z-10"
                style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
              >
                Stop guessing. Start knowing.
              </h2>
              <p className="text-base text-lp-text-secondary max-w-[480px] mx-auto mb-8 leading-[1.7] relative z-10">
                You&apos;re already doing the work. AccuInsight makes sure you
                get paid for it.
              </p>
              <div className="relative z-10">
                <ConnectButton>
                  Connect Jobber and See Your Numbers
                  <ArrowRight size={18} />
                </ConnectButton>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-10 border-t border-white/[0.06] relative z-10">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <img
            src="/AccuInsight_Logo_Dark.svg"
            alt="AccuInsight"
            className="h-5 mx-auto mb-4 opacity-40"
          />
          <p className="text-xs text-lp-text-muted mb-2">
            &copy; 2026 OwnerView. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 text-xs">
            <a
              href="/privacy"
              className="text-lp-text-muted hover:text-lp-text-secondary transition-colors no-underline"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-lp-text-muted hover:text-lp-text-secondary transition-colors no-underline"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
