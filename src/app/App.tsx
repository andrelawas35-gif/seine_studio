import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, FolderOpen, Users, Package, MessageSquareText, Landmark,
  Search, Bell, MoreHorizontal, X,
} from "lucide-react";
import { PwaStatus } from "./components/PwaStatus";
import { ClientsPage, InventoryPage, OverviewPage, ProjectsPage } from "./pages/CorePages";
import {
  INITIAL_CLIENTS as CLIENTS,
  INITIAL_INVENTORY as INVENTORY,
  INITIAL_PROJECTS as PROJECTS,
} from "./data";
import type { Page } from "./data";

const AccountingPage = lazy(() =>
  import("./components/AccountingPage").then((module) => ({ default: module.AccountingPage })),
);

const ReplyTemplatesPage = lazy(() =>
  import("./components/ReplyTemplatesPage").then((module) => ({ default: module.ReplyTemplatesPage })),
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview",   label: "Overview",     icon: LayoutDashboard },
  { id: "projects",   label: "Projects",     icon: FolderOpen },
  { id: "clients",    label: "Clients",      icon: Users },
  { id: "inventory",  label: "Inventory",    icon: Package },
  { id: "accounting", label: "Accounting",   icon: Landmark },
  { id: "replies",    label: "Reply Templates", icon: MessageSquareText },
] as const;

const MOBILE_NAV = NAV.filter(({ id }) => ["overview", "projects", "inventory", "clients"].includes(id));

const PAGE_PATH: Record<Page, string> = {
  overview: "/",
  projects: "/projects",
  clients: "/clients",
  inventory: "/inventory",
  accounting: "/accounting",
  replies: "/replies",
};

function pageFromPath(pathname: string): Page {
  if (pathname === "/") return "overview";
  const page = Object.entries(PAGE_PATH).find(([, path]) => path !== "/" && pathname.startsWith(path));
  return (page?.[0] as Page | undefined) ?? "overview";
}
function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <aside className="hidden md:flex w-52 flex-shrink-0 flex-col h-full" style={{ background: "var(--foreground)" }}>
      <div className="px-5 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 overflow-hidden bg-white" aria-hidden="true">
            <img
              src="/brand/seine-logo-source.png"
              alt=""
              className="h-full w-full object-cover"
              style={{ objectPosition: "50% 63%" }}
            />
          </div>
          <div>
            <p className="text-white text-xs font-medium tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
              Seine Studio
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "#6A5B44" }}>Manila</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id as Page)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-all duration-100"
              style={{
                background: active ? "rgba(184,151,90,0.12)" : "transparent",
                color: active ? "var(--accent)" : "var(--sidebar-muted)",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--sidebar-hover)";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "var(--sidebar-muted)";
              }}
            >
              <Icon size={14} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[11px] tracking-wide font-medium">{label}</span>
              {active && <span className="ml-auto w-1 h-1 rounded-full" style={{ background: "var(--accent)" }} />}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--sidebar-deep)" }}>
            <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>Yo</span>
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: "var(--sidebar-hover)" }}>Designer</p>
            <p className="text-[9px]" style={{ color: "#3A3020" }}>Manila, PH</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = page === "accounting" || page === "replies";

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMoreOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="More navigation" onClick={(event) => event.stopPropagation()} className="absolute inset-x-3 bottom-20 border border-border bg-[#FAF7F0] p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between px-2"><p className="font-serif text-sm">More</p><button type="button" aria-label="Close menu" onClick={() => setMoreOpen(false)} className="min-h-11 min-w-11"><X className="mx-auto" size={16} /></button></div>
            {NAV.filter(({ id }) => id === "accounting" || id === "replies").map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => { setPage(id); setMoreOpen(false); }} className="flex min-h-12 w-full items-center gap-3 border-t border-border px-3 text-left text-[11px] text-foreground">
                <Icon size={16} className="text-[#B8975A]" />{label}
              </button>
            ))}
          </section>
        </div>
      )}
      <nav aria-label="Primary navigation" className="md:hidden fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#17140F] px-1 pt-1" style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}>
        {MOBILE_NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return <button key={id} type="button" aria-current={active ? "page" : undefined} onClick={() => setPage(id)} className="min-h-14 flex flex-col items-center justify-center gap-1 px-1" style={{ color: active ? "var(--accent-bright)" : "var(--sidebar-nav)" }}><Icon size={17} strokeWidth={active ? 2 : 1.5} /><span className="text-[8px] tracking-wide">{label === "Overview" ? "Home" : label}</span></button>;
        })}
        <button type="button" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)} className="min-h-14 flex flex-col items-center justify-center gap-1 px-1" style={{ color: moreActive ? "var(--accent-bright)" : "var(--sidebar-nav)" }}><MoreHorizontal size={17} /><span className="text-[8px] tracking-wide">More</span></button>
      </nav>
    </>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const PAGE_TITLE: Record<Page, string> = {
  overview:  "Overview",
  projects:  "Projects",
  clients:   "Clients",
  inventory: "Inventory",
  accounting: "Accounting",
  replies:   "Reply Templates",
};

function TopBar({ page }: { page: Page }) {
  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-4 md:px-7 bg-card flex-shrink-0">
      <p
        className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-medium"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {PAGE_TITLE[page]}
      </p>
      <div className="flex items-center gap-2.5">
        <div className="relative hidden sm:block">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-7 pr-3 py-1.5 text-[11px] rounded border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 w-44 transition-all"
          />
        </div>
        <button className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
      </div>
    </header>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageFromPath(location.pathname);
  const setPage = (nextPage: Page) => navigate(PAGE_PATH[nextPage]);

  return (
    <div
      className="flex min-h-dvh h-dvh overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif", background: "var(--background)" }}
    >
      <PwaStatus />
      <Sidebar page={page} setPage={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar page={page} />
        <main
          className="flex-1 overflow-auto p-4 pb-24 md:p-7"
          style={{ scrollbarWidth: "none" }}
        >
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/projects/:projectId?" element={<ProjectsPage />} />
            <Route path="/clients/:clientId?" element={<ClientsPage />} />
            <Route path="/inventory/:itemId?" element={<InventoryPage />} />
            <Route
              path="/accounting"
              element={
                <Suspense fallback={<div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Accounting" />}>
                  <AccountingPage projects={PROJECTS} clients={CLIENTS} inventory={INVENTORY} />
                </Suspense>
              }
            />
            <Route
              path="/replies"
              element={
                <Suspense fallback={<div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Reply Templates" />}>
                  <ReplyTemplatesPage clients={CLIENTS} projects={PROJECTS} inventory={INVENTORY} />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <MobileNav page={page} setPage={setPage} />
    </div>
  );
}
