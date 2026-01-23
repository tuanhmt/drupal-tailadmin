"use client";

import Image from "next/image";

type LogoProps = {
  /** "full" shows full logo; "icon" shows compact for collapsed sidebar */
  variant?: "full" | "icon";
  className?: string;
};

const SRC = {
  full: { light: "/images/logo/logo-panda.png", dark: "/images/logo/logo-panda.png" },
  icon: "/images/logo/logo-icon.svg",
};

export default function Logo({ variant = "full", className = "" }: LogoProps) {
  const isIcon = variant === "icon";
  const width = isIcon ? 32 : 150;
  const height = isIcon ? 32 : 40;

  const imageClass = "shrink-0 select-none object-contain";

  if (isIcon) {
    return (
      <span className={`flex items-center justify-center ${className}`}>
        <Image
          src={SRC.icon}
          alt="Logo"
          width={width}
          height={height}
          className={imageClass}
          priority
        />
      </span>
    );
  }

  return (
    <span className={`flex items-center justify-center ${className}`}>
      <Image
        src={SRC.full.light}
        alt="Logo"
        width={width}
        height={height}
        className={`${imageClass} dark:hidden`}
        priority
      />
      <Image
        src={SRC.full.dark}
        alt="Logo"
        width={width}
        height={height}
        className={`hidden ${imageClass} dark:block`}
        priority
      />
    </span>
  );
}
