import { Lock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const Header = () => (
  <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
    <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 group">
        <div className="relative">
          <Shield className="w-7 h-7 text-primary animate-pulse-glow" />
          <Lock className="w-3.5 h-3.5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <span className="font-mono text-xl font-bold tracking-wider text-foreground">
          CODER<span className="text-primary">_</span>
        </span>
      </Link>
      <span className="text-xs font-mono text-muted-foreground hidden sm:block">
        encrypted notepad
      </span>
    </div>
  </header>
);

export default Header;
