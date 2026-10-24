import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full flex justify-center flex-col items-center">
      {/* Logos Strip with heavy gradient masking */}
      <div className="w-full relative h-[120px] sm:h-[160px] flex justify-center flex-col overflow-hidden">
        <div className="absolute inset-0 bg-[#080C0B]/90 backdrop-blur-sm z-10 
          [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_15%,rgba(0,0,0,0)_85%,rgba(0,0,0,1)_100%),linear-gradient(to_bottom,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_50%,rgba(0,0,0,1)_100%)] 
          [-webkit-mask-composite:destination-out] [mask-composite:exclude]" />
        
        <div className="w-full max-w-6xl mx-auto px-6 flex justify-around sm:justify-between items-center opacity-40 z-0">
          <div className="font-[900] text-[16px] sm:text-[22px] md:text-[24px] tracking-wider text-[#8ea79d] font-sans">YOUTUBE</div>
          <div className="font-[900] text-[16px] sm:text-[22px] md:text-[24px] tracking-wider text-[#8ea79d] font-sans">TWITCH</div>
          <div className="font-[900] text-[16px] sm:text-[22px] md:text-[24px] tracking-wider text-[#8ea79d] font-sans">TIKTOK</div>
          <div className="font-[900] text-[16px] sm:text-[22px] md:text-[24px] tracking-wider text-[#8ea79d] font-sans">INSTA</div>
        </div>
      </div>

      {/* Main Bottom Footer */}
      <div className="w-full bg-[#030504] border-t border-[#111815] py-8 sm:py-10 z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <Link href="/" className="flex items-center gap-2.5 text-[14px] font-bold text-white hover:opacity-80 transition-opacity">
              <div className="relative w-5 h-5 rounded-[4px] overflow-hidden flex-shrink-0">
                <Image
                  src="/logo.jpeg"
                  alt="enclips logo"
                  width={20}
                  height={20}
                  className="object-contain w-full h-full rounded-[4px]"
                />
              </div>
              <span>enclips</span>
            </Link>
            <span className="hidden sm:inline text-[#2A3B34]">•</span>
            <div className="text-[12px] text-[#5b6b63] font-medium">
              © {currentYear} enclips. All rights reserved.
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-[#5b6b63] font-medium">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookie Settings</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
