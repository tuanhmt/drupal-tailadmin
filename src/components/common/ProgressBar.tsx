// components/ProgressBar.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Configure NProgress with showSpinner enabled
NProgress.configure({
  showSpinner: true,
  minimum: 0.08,
  easing: "ease",
  speed: 500,
  trickle: true,
  trickleSpeed: 200,
});

export default function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Start progress bar when route changes
    NProgress.start();

    // Complete progress bar after route change
    const timer = setTimeout(() => {
      NProgress.done();
    }, 200);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname, searchParams]);

  return null;
}