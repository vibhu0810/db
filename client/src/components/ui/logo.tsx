import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  showText?: boolean;
  showProduct?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ 
  showText = true, 
  showProduct = false, 
  size = "md", 
  className, 
  ...props 
}: LogoProps) {
  // Define size dimensions
  const sizes = {
    sm: { container: "h-7", logo: "h-6", text: "text-sm", product: "text-xs" },
    md: { container: "h-8", logo: "h-7", text: "text-base", product: "text-xs" },
    lg: { container: "h-12", logo: "h-10", text: "text-xl", product: "text-sm" }
  };

  return (
    <div className={cn("flex items-center gap-2", sizes[size].container, className)} {...props}>
      <div className="flex flex-col">
        <div className="flex items-center">
          {/* SVG Logo based on the provided Digital Gratified logo */}
          <svg 
            viewBox="0 0 500 500" 
            className={cn("text-primary", sizes[size].logo)} 
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M371.5,0H0v500h371.5c93.1,0,128.5-111.9,128.5-250S464.6,0,371.5,0z M325,325H125V175h200
            c47.2,0,75,32.8,75,75S372.2,325,325,325z" />
          </svg>
          
          {/* Company name */}
          {showText && (
            <span className={cn("text-primary font-bold ml-2", sizes[size].text)}>
              Gratified
            </span>
          )}
        </div>
        
        {/* Product name */}
        {showProduct && (
          <div className={cn("text-blue-600 font-medium ml-1 -mt-1", sizes[size].product)}>
            SaaSxLinks.ai
          </div>
        )}
      </div>
    </div>
  );
}