import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import RequireSubscription from "./routes/RequireSubscription";
import Billing from "./pages/Billing";
import RequireAuth from "./routes/RequireAuth";
import RoomsNew from "./pages/RoomsNew";
import RoomEditor from "./pages/RoomEditor";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import RequireAdmin from "./routes/RequireAdmin";

const queryClient = new QueryClient();

const App = () => {
  const [openCmd, setOpenCmd] = useState(false);
  const [theme, setTheme] = useState<"light"|"dark">(() => {
    try { return (localStorage.getItem("themeVariant") as "light"|"dark") || "light"; } catch { return "light"; }
  });

  // Apply theme classes to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.classList.remove("dark");
    if (theme === "dark") root.classList.add("dark");
    try { localStorage.setItem("themeVariant", theme); } catch {}
  }, [theme]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/dashboard"
                element={
                  <RequireSubscription>
                    <Dashboard />
                  </RequireSubscription>
                }
              />
              <Route
                path="/billing"
                element={
                  <RequireAuth>
                    <Billing />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin"
                element={
                  <RequireAuth>
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  </RequireAuth>
                }
              />
              <Route
                path="/rooms/new"
                element={
                  <RequireSubscription>
                    <RoomsNew />
                  </RequireSubscription>
                }
              />
              <Route
                path="/rooms/:id"
                element={
                  <RequireSubscription>
                    <RoomEditor />
                  </RequireSubscription>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          {/* Single Global Theme Button (Light/Dark) */}
          <div className="fixed top-4 right-4 z-40">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">Theme</Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <div className="space-y-1">
                  <Button size="sm" variant={theme === "light" ? "default" : "ghost"} className="w-full justify-start" onClick={() => setTheme("light")}>Light</Button>
                  <Button size="sm" variant={theme === "dark" ? "default" : "ghost"} className="w-full justify-start" onClick={() => setTheme("dark")}>Dark</Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <CommandDialog open={openCmd} onOpenChange={setOpenCmd}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                <CommandItem onSelect={() => (window.location.href = "/dashboard")}>Go to Dashboard<CommandShortcut>G D</CommandShortcut></CommandItem>
                <CommandItem onSelect={() => (window.location.href = "/rooms/new")}>Create Room<CommandShortcut>R N</CommandShortcut></CommandItem>
                <CommandItem onSelect={() => (window.location.href = "/docs")}>Open Docs<CommandShortcut>D</CommandShortcut></CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Theme">
                <CommandItem onSelect={() => setTheme("light")}>Light</CommandItem>
                <CommandItem onSelect={() => setTheme("dark")}>Dark</CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
          <footer className="border-t border-border text-sm text-muted-foreground py-2 px-4 flex items-center justify-between">
            <span>
              Made and owned by Rohan
            </span>
            <div className="flex items-center gap-3">
              <a className="text-foreground/70 hover:text-primary transition-colors" href="https://github.com/" target="_blank" rel="noreferrer" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.93 5.3.93 11.57c0 4.86 3.15 8.98 7.51 10.43.55.1.75-.24.75-.53 0-.26-.01-1.14-.02-2.07-3.05.66-3.7-1.3-3.7-1.3-.5-1.27-1.22-1.6-1.22-1.6-.99-.67.08-.66.08-.66 1.1.08 1.68 1.12 1.68 1.12.98 1.68 2.58 1.2 3.2.92.1-.72.38-1.2.68-1.48-2.43-.28-4.99-1.22-4.99-5.43 0-1.2.43-2.18 1.12-2.95-.11-.28-.49-1.43.11-2.98 0 0 .93-.3 3.05 1.13a10.6 10.6 0 0 1 5.55 0c2.12-1.43 3.05-1.13 3.05-1.13.6 1.55.22 2.7.11 2.98.69.77 1.12 1.75 1.12 2.95 0 4.22-2.57 5.14-5.01 5.41.39.33.73.98.73 1.98 0 1.43-.01 2.58-.01 2.93 0 .29.2.63.76.53a10.66 10.66 0 0 0 7.5-10.43C23.07 5.3 18.27.5 12 .5Z"/></svg>
              </a>
              <a className="text-foreground/70 hover:text-primary transition-colors" href="/resume.pdf" target="_blank" rel="noreferrer" aria-label="Resume">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.105.895 2 2 2h12a2 2 0 0 0 2-2V8zm0 2 6 6h-6z"/></svg>
              </a>
              <a className="text-foreground/70 hover:text-primary transition-colors" href="https://www.linkedin.com/" target="_blank" rel="noreferrer" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.73-2.46 5.06 0 6 3.33 6 7.66V24h-5v-6.9c0-1.64-.03-3.75-2.3-3.75-2.3 0-2.65 1.8-2.65 3.64V24H8z"/></svg>
              </a>
              <a className="text-foreground/70 hover:text-primary transition-colors" href="https://leetcode.com/" target="_blank" rel="noreferrer" aria-label="LeetCode">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 3 7 9.5l4 4L9.5 15 5 10.5 12 3.5 13.5 3zm2 6 3.5 3.5L15 16.5l-2-2 3.5-3.5z"/></svg>
              </a>
            </div>
          </footer>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
