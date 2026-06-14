import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-2">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="15" cy="20" r="10" stroke="#4A1F55" strokeWidth="4" />
              <circle cx="25" cy="20" r="10" stroke="#4A1F55" strokeWidth="4" />
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