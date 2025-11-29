import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useSearch, type SearchResult } from '@/hooks/useSearch';
import { Search, Moon, Sun, Bell, LogOut, User, Gamepad2, BookOpen, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults, isLoading: isSearching } = useSearch(searchQuery);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    navigate(result.url);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'game':
        return <Gamepad2 className="h-4 w-4" />;
      case 'concept':
        return <BookOpen className="h-4 w-4" />;
      case 'section':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getResultLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'game':
        return 'Jeu';
      case 'concept':
        return 'Concept';
      case 'section':
        return 'Section';
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'A';
  const userEmail = user?.email || 'admin@rulesmaster.com';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Search */}
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Rechercher... (⌘K)"
          className="pl-10 pr-10"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {/* Search Results Dropdown */}
        {isSearchOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 rounded-lg border bg-popover shadow-lg overflow-hidden">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Recherche...
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 text-left hover:bg-accent transition-colors',
                      'border-b last:border-b-0'
                    )}
                  >
                    <div className="mt-0.5 text-muted-foreground">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {getResultLabel(result.type)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Aucun résultat pour "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 ml-2 px-2">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">{userInitial}</span>
              </div>
              <span className="text-sm font-medium hidden md:block">{userEmail}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="h-4 w-4 mr-2" />
              {userEmail}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}