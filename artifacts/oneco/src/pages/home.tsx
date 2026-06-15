import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-2">
            <svg width="50" height="38" viewBox="0 0 50 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="logo-mask-home">
                  <rect width="50" height="36" fill="white"/>
                  <circle cx="33" cy="18" r="15" fill="black"/>
                </mask>
              </defs>
              <g mask="url(#logo-mask-home)">
                <circle cx="17" cy="18" r="14" fill="#4A1F55"/>
                <circle cx="17" cy="18" r="7" fill="white"/>
              </g>
              <circle cx="33" cy="18" r="14" stroke="#1a1a1a" strokeWidth="5.5" fill="none"/>
            </svg>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">OnePulse</h1>
          </div>
          <p className="text-xl text-muted-foreground">Porteføljestyring og gevinstrealisering</p>
        </div>
        
        <div className="pt-8">
          <Link href="/sign-in" className="w-full inline-flex">
            <Button size="lg" className="w-full text-lg h-12">
              Logg inn
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}