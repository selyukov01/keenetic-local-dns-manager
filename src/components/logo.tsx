import React from "react";

export type LogoType = "full" | "short" | "short2" | "icon" | "brand";

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  type?: LogoType;
  className?: string;
}

const logoMap: Record<Exclude<LogoType, "brand">, string> = {
  full: "/logo_full.svg",
  short: "/logo_short.svg",
  short2: "/logo_short2.svg",
  icon: "/logo_icon.svg",
};

function useResponsiveLogoType(initial: LogoType = "full") {
  const [type, setType] = React.useState<LogoType>(initial);

  React.useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 512) {
        setType("icon");
      } else if (width < 768) {
        setType("short2");
      } else if (width < 1024) {
        setType("short");
      } else {
        setType("full");
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return type;
}

export const Logo: React.FC<LogoProps> = ({ type, className = "h-7", ...props }) => {
  const invertDark = "dark:invert dark:filter";
  if (type === "brand") {
    return (
      <img
        src="/logo_brand.svg"
        alt="Logo"
        className={[className, invertDark].join(" ")}
        {...props}
      />
    );
  }
  const responsiveType = useResponsiveLogoType(type ?? "full");
  return (
    <img
      src={logoMap[responsiveType as Exclude<LogoType, "brand">]}
      alt="Logo"
      className={[(responsiveType === "short2" ? "h-9" : className), invertDark].join(" ")}
      {...props}
    />
  );
};

export default Logo;
