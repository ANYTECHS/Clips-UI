"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { LogOut, Bell, Zap, Menu, X, ArrowRight, Sparkles } from "lucide-react";
import Logo from "@/components/shared/Logo";
import UserAvatar from "@/components/shared/UserAvatar";

interface NavbarProps {
  variant?: "landing" | "dashboard";
  sticky?: boolean;
}

export default function Navbar({ variant = "landing", sticky = false }: NavbarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const landingLinks = [
    { label: "Docs", href: "/docs", disabled: false },
    { label: "Showcase", href: "/ai-projects", disabled: false },
    { label: "Pricing", href: "#", disabled: true },
  ];

  const dashboardLinks = [
    { label: "Dashboard", href: "/dashboard", disabled: false },
    { label: "Create Clips", href: "/clips", disabled: false },
    { label: "AI Feed", href: "/ai-projects", disabled: false },
    { label: "Marketplace", href: "/agent-marketplace", disabled: false },
  ];

  const isDashboard = variant === "dashboard" || !!user;
  const navLinks = isDashboard ? dashboardLinks : landingLinks;

  return (
    <nav
      className={`w-full z-50 transition-all duration-300 ${
        sticky
          ? "sticky top-0 bg-[#060908]/85 backdrop-blur-2xl border-b border-white/[0.06]"
          : "relative bg-[#060908]/60 backdrop-blur-lg border-b border-white/[0.05]"
      }`}
    >
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-6">
          <Logo size={34} />
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand/[0.08] border border-brand/20 text-brand text-[10px] font-mono font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            AI v2.0
          </div>
        </div>

        {/* Center Navigation - Desktop */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-white/[0.02] border border-white/[0.05]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            if (link.disabled) {
              return (
                <div
                  key={link.label}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-[0.12em] text-[#4A5D54] cursor-not-allowed select-none"
                  title="Coming soon"
                >
                  <span>{link.label}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/[0.04] border border-white/5 text-[#5A6F65] font-semibold lowercase tracking-normal">
                    soon
                  </span>
                </div>
              );
            }
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative px-4 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-[0.12em] transition-all duration-200 ${
                  isActive
                    ? "bg-brand/10 text-brand shadow-[inset_0_0_12px_rgba(0,229,143,0.15)] border border-brand/20"
                    : "text-[#8E9F97] hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {!user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center text-[13px] font-bold text-[#8E9F97] hover:text-white px-3.5 py-2 rounded-full transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="relative group overflow-hidden inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-black px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all shadow-[0_0_20px_rgba(0,229,143,0.25)] hover:shadow-[0_0_30px_rgba(0,229,143,0.4)] transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/clips"
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand text-[12px] font-bold hover:bg-brand/20 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 fill-brand" />
                <span>New Clip</span>
              </Link>

              <button
                className="p-2.5 rounded-full bg-white/[0.03] border border-white/5 text-[#8E9F97] hover:text-white transition-all relative group"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-brand rounded-full ring-2 ring-[#060908]" />
              </button>

              <div className="relative flex items-center gap-3 pl-3 border-l border-white/10" ref={dropdownRef}>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[13px] font-bold text-white leading-none mb-1">
                    {user?.username || user?.profile?.username || user?.fullName || "Creator"}
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-brand/90 uppercase tracking-wider">
                    PRO CREATOR
                  </span>
                </div>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="User profile"
                  className="rounded-full ring-2 ring-transparent hover:ring-brand/30 transition-all"
                >
                  <UserAvatar user={user} className="cursor-pointer" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 bg-[#0E1512] border border-white/10 rounded-2xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-200 z-50 backdrop-blur-xl">
                    <div className="px-3 py-2.5 border-b border-white/5 mb-1 sm:hidden">
                      <p className="text-xs font-bold text-white truncate">
                        {user?.username || user?.fullName || "Creator"}
                      </p>
                      <p className="text-[10px] text-[#5A6F65] truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#A1B3AA] hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-[#A1B3AA] hover:text-white hover:bg-white/[0.04] rounded-xl transition-colors"
                    >
                      Settings
                    </Link>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-[#8E9F97] hover:text-white transition-colors p-2 rounded-xl bg-white/[0.03] border border-white/5"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-brand" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden w-full bg-[#080D0B] border-b border-white/10 px-6 py-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              if (link.disabled) {
                return (
                  <div
                    key={link.label}
                    className="flex items-center justify-between py-2 text-[13px] font-bold uppercase tracking-wider text-[#3D4F46]"
                  >
                    <span>{link.label}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5 text-[#4D6357] font-semibold lowercase tracking-normal">
                      soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-xl text-[13px] font-bold uppercase tracking-wider transition-colors ${
                    isActive ? "bg-brand/10 text-brand" : "text-[#8E9F97] hover:text-white hover:bg-white/[0.03]"
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {!user && (
              <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl border border-white/10 text-white font-bold text-sm"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-xl bg-brand text-black font-extrabold text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
