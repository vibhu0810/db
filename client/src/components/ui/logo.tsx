import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ showText = true, size = "md", className, ...props }: LogoProps) {
  // Define size dimensions
  const sizes = {
    sm: { container: "h-7", logo: "h-6", text: "text-sm" },
    md: { container: "h-8", logo: "h-7", text: "text-base" },
    lg: { container: "h-10", logo: "h-9", text: "text-lg" }
  };

  return (
    <div className={cn("flex items-center gap-2", sizes[size].container, className)} {...props}>
      <div className="flex items-center">
        {/* SVG Logo based on the provided Digital Gratified logo */}
        <svg 
          viewBox="0 0 85 85" 
          className={cn("text-primary", sizes[size].logo)} 
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M40 0H0V85h40C65.4 85 85 65.4 85 40S65.4 0 40 0zm0 65H20V20h20c13.8 0 25 11.2 25 25S53.8 65 40 65z" />
        </svg>
        
        {/* Company name */}
        {showText && (
          <span className={cn("text-primary font-bold ml-1", sizes[size].text)}>
            Gratified
          </span>
        )}
      </div>
    </div>
  );
}