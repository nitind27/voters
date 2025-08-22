"use client"
import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

import { ThemeProvider } from "@/context/ThemeContext";

import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <ThemeProvider>
        <div className="relative flex lg:flex-row w-full h-screen justify-center flex-col  dark:bg-gray-900 sm:p-0">

          <div className="lg:w-1/2 w-full h-full bg-brand-950 dark:bg-white/5 lg:grid items-center hidden">
            <div className="relative items-center justify-center  flex z-1">
              {/* <!-- ===== Common Grid Shape Start ===== --> */}
              <GridShape />
              <div className="flex flex-col items-center max-w-xs">
                <div className="text-white text-[30px]">
                  MDM
                </div>
                <div className="text-white text-[30px] md:whitespace-nowrap">

                  (Voters)
                </div>

                <img
                  width={500}
                  height={50}
                  src="./images/login/logo.png"
                  alt="Logo"
                />

                <p className="text-center text-gray-400 dark:text-white/60 text-2xl">
                  Voters Schemes
                </p>
                <p className="text-center text-gray-400 dark:text-white/60 text-sm fixed bottom-10">
                  Developed by WeClocks Technology Pvt Ltd
                </p>
              </div>
            </div>
          </div>
          {children}
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
