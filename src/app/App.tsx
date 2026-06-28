import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Package,
  MessageSquareText,
  Landmark,
  CalendarDays,
  FileText,
  ReceiptText,
  Receipt,
  Search,
  Bell,
  MoreHorizontal,
  X,
  LogOut,
  ScrollText,
  Wrench,
  Settings,
  Store,
} from "lucide-react";
import { PwaStatus } from "./components/PwaStatus";
import { SeineLogo } from "./components/SeineLogo";
import { SyncStatus } from "./components/SyncStatus";
import { SignInPage } from "./components/SignInPage";
import { NotificationBadge, NotificationsPanel, useNotifications } from "./components/NotificationsPanel";
import { NotificationSettings } from "./components/NotificationSettings";
import { shouldShowDailyReminder, showDailyReminder } from "./notifications";
import { RefreshCw } from "lucide-react";
import { OverviewPage } from "./pages/CorePages";
import { INITIAL_CLIENTS as CLIENTS, INITIAL_INVENTORY as INVENTORY, INITIAL_PROJECTS as PROJECTS } from "./data";
import { isAuthConfigured, useSession, signOut } from "./auth";
import { apiRequest, ApiError } from "./api";
import type { Page } from "./data";

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

const AccountingPage = lazy(() =>
  import("./components/AccountingPage").then((module) => ({ default: module.AccountingPage })),
);

const ReplyTemplatesPage = lazy(() =>
  import("./components/ReplyTemplatesPage").then((module) => ({ default: module.ReplyTemplatesPage })),
);

const ClientsPage = lazy(() => import("./components/ClientsPage").then((module) => ({ default: module.ClientsPage })));

const ProjectsPage = lazy(() =>
  import("./components/ProjectsPage").then((module) => ({ default: module.ProjectsPage })),
);

const InventoryPage = lazy(() =>
  import("./components/InventoryPage").then((module) => ({ default: module.InventoryPage })),
);

const EventsPage = lazy(() => import("./components/EventsPage").then((module) => ({ default: module.EventsPage })));

const QuotesPage = lazy(() => import("./components/QuotesPage").then((module) => ({ default: module.QuotesPage })));

const InvoicesPage = lazy(() => import("./components/InvoicesPage").then((module) => ({ default: module.InvoicesPage })));

const ExpensesPage = lazy(() => import("./components/ExpensesPage").then((module) => ({ default: module.ExpensesPage })));

const CertificatesPage = lazy(() =>
  import("./components/CertificatesPage").then((module) => ({ default: module.CertificatesPage })),
);

const RepairsPage = lazy(() => import("./components/RepairsPage").then((module) => ({ default: module.RepairsPage })));

const SettingsPage = lazy(() => import("./components/SettingsPage").then((module) => ({ default: module.SettingsPage })));

const ConsignmentPage = lazy(() =>
  import("./components/ConsignmentPage").then((module) => ({ default: module.ConsignmentPage })),
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "clients", label: "Clients", icon: Users },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "quotes", label: "Quotes", icon: FileText },
  { id: "invoices", label: "Invoices", icon: ReceiptText },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "accounting", label: "Accounting", icon: Landmark },
  { id: "certificates", label: "Certificates", icon: ScrollText },
  { id: "repairs", label: "Repairs", icon: Wrench },
  { id: "replies", label: "Reply Templates", icon: MessageSquareText },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "consignment", label: "Consignment", icon: Store },
] as const;

const MOBILE_NAV = NAV.filter(({ id }) => ["overview", "projects", "inventory", "clients"].includes(id));

const PAGE_PATH: Record<Page, string> = {
  overview: "/",
  projects: "/projects",
  clients: "/clients",
  inventory: "/inventory",
  events: "/events",
  quotes: "/quotes",
  invoices: "/invoices",
  expenses: "/expenses",
  accounting: "/accounting",
  certificates: "/certificates",
  repairs: "/repairs",
  replies: "/replies",
  settings: "/settings",
  consignment: "/consignment",
};

function pageFromPath(pathname: string): Page {
  if (pathname === "/") return "overview";
  const page = Object.entries(PAGE_PATH).find(([, path]) => path !== "/" && pathname.startsWith(path));
  return (page?.[0] as Page | undefined) ?? "overview";
}
function Sidebar({
  page,
  setPage,
  userName,
  userInitials,
  userRole,
}: {
  page: Page;
  setPage: (p: Page) => void;
  userName: string;
  userInitials: string;
  userRole: string;
}) {
  return (
    <aside className="hidden md:flex w-52 flex-shrink-0 flex-col h-full" style={{ background: "var(--foreground)" }}>
      <div className="px-5 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <SeineLogo size={30} variant="light" className="flex-shrink-0" />
          <div>
            <p
              className="text-white text-[15px] leading-none tracking-wide"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Seine Studio
            </p>
            <p className="mt-1 text-[11px] tracking-[0.22em] uppercase" style={{ color: "#6A5B44" }}>
              Manila
            </p>
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
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--sidebar-deep)" }}
          >
            <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
              {userInitials}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium" style={{ color: "var(--sidebar-hover)" }}>
              {userName}
            </p>
            <p className="text-[9px]" style={{ color: "#3A3020" }}>
              {userRole}
            </p>
          </div>
          {isAuthConfigured && (
            <button
              type="button"
              onClick={() => void signOut()}
              title="Sign out"
              className="p-1 text-[#3A3020] hover:text-white transition-colors"
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = page === "events" || page === "quotes" || page === "invoices" || page === "expenses" || page === "accounting" || page === "certificates" || page === "repairs" || page === "replies" || page === "settings" || page === "consignment";

  return (
    <>
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMoreOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-3 bottom-20 border border-border bg-[#FAF7F0] p-3 shadow-xl"
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="font-serif text-sm">More</p>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="min-h-11 min-w-11"
              >
                <X className="mx-auto" size={16} />
              </button>
            </div>
            {NAV.filter(({ id }) => id === "events" || id === "quotes" || id === "invoices" || id === "expenses" || id === "accounting" || id === "certificates" || id === "repairs" || id === "replies" || id === "settings" || id === "consignment").map(
              ({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPage(id);
                    setMoreOpen(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-3 border-t border-border px-3 text-left text-[11px] text-foreground"
                >
                  <Icon size={16} className="text-[#B8975A]" />
                  {label}
                </button>
              ),
            )}
          </section>
        </div>
      )}
      <nav
        aria-label="Primary navigation"
        className="md:hidden fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#17140F] px-1 pt-1"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      >
        {MOBILE_NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setPage(id)}
              className="min-h-14 flex flex-col items-center justify-center gap-1 px-1"
              style={{ color: active ? "var(--accent-bright)" : "var(--sidebar-nav)" }}
            >
              <Icon size={17} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[8px] tracking-wide">{label === "Overview" ? "Home" : label}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
          className="min-h-14 flex flex-col items-center justify-center gap-1 px-1"
          style={{ color: moreActive ? "var(--accent-bright)" : "var(--sidebar-nav)" }}
        >
          <MoreHorizontal size={17} />
          <span className="text-[8px] tracking-wide">More</span>
        </button>
      </nav>
    </>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const PAGE_TITLE: Record<Page, string> = {
  overview: "Overview",
  projects: "Projects",
  clients: "Clients",
  inventory: "Inventory",
  events: "Events & Pop-ups",
  quotes: "Quotes",
  invoices: "Invoices",
  expenses: "Expenses",
  accounting: "Accounting",
  certificates: "Certificates",
  repairs: "Repairs",
  replies: "Reply Templates",
  settings: "Settings",
  consignment: "Consignment",
};

function TopBar({
  page,
  notificationCount,
  onNotificationsClick,
}: {
  page: Page;
  notificationCount: number;
  onNotificationsClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border flex items-center justify-between px-4 md:px-7 bg-card flex-shrink-0 md:relative">
      {/* Mobile (no sidebar): lead with the Seine mark so the header is branded,
          not generic. The page name reads as an eyebrow beneath the wordmark. */}
      <div className="flex items-center gap-2.5 md:hidden">
        <SeineLogo size={26} className="flex-shrink-0" />
        <div className="leading-none">
          <p className="text-[13px] tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
            Seine Studio
          </p>
          <p className="mt-0.5 text-[11px] tracking-[0.18em] uppercase text-muted-foreground">
            {PAGE_TITLE[page]}
          </p>
        </div>
      </div>
      {/* Desktop: sidebar already carries the brand, so keep the bar quiet. */}
      <p
        className="hidden md:block text-[12px] tracking-[0.2em] uppercase text-muted-foreground font-medium"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {PAGE_TITLE[page]}
      </p>
      <div className="flex items-center gap-2.5">
        <SyncStatus />
        <button
          type="button"
          onClick={() => {
            // Brief refresh animation before reload
            document.body.style.opacity = "0.6";
            document.body.style.transition = "opacity 150ms";
            setTimeout(() => window.location.reload(), 200);
          }}
          className="md:hidden min-h-11 min-w-11 flex items-center justify-center text-muted-foreground active:text-foreground transition-colors"
          aria-label="Refresh page"
        >
          <RefreshCw size={15} />
        </button>
        <div className="relative hidden sm:block">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-7 pr-3 py-1.5 text-[11px] rounded border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 w-44 transition-all"
          />
        </div>
        <NotificationBadge count={notificationCount} onClick={onNotificationsClick} />
      </div>
    </header>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

// ─── App ──────────────────────────────────────────────────────────────────────

function userDisplayInfo(session: ReturnType<typeof useSession>) {
  if (session.data?.user) {
    const user = session.data.user;
    const displayName = user.name || user.email || "User";
    const parts = displayName.split(/\s+/);
    const initials =
      parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : displayName.slice(0, 2).toUpperCase();
    return { userName: displayName, userInitials: initials, userRole: "Manila, PH" };
  }
  return { userName: "Designer", userInitials: "Yo", userRole: "Manila, PH" };
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = pageFromPath(location.pathname);
  const setPage = (nextPage: Page) => navigate(PAGE_PATH[nextPage]);
  const session = useSession();
  const [authorizedRole, setAuthorizedRole] = useState<"owner" | "developer" | null>(null);
  const [authorizationPending, setAuthorizationPending] = useState(isAuthConfigured);
  const [authorizationError, setAuthorizationError] = useState<string | undefined>();
  // Track transient auth failures separately so we can show a retry UI without
  // clearing authorizedRole (which would bounce the user to SignInPage).
  const [transientAuthError, setTransientAuthError] = useState<string | undefined>();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const { notifications, refresh: refreshNotifications } = useNotifications();

  // Timeout: if session loading takes > 10 seconds, show sign-in with error
  useEffect(() => {
    if (!isAuthConfigured) return;
    const timer = setTimeout(() => setLoadingTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthConfigured || !session.data?.user) {
      setAuthorizedRole(null);
      setAuthorizationPending(false);
      return;
    }

    let active = true;
    setAuthorizationPending(true);
    apiRequest<{ data: { role: "owner" | "developer" } }>("/me")
      .then((response) => {
        if (!active) return;
        setAuthorizedRole(response.data.role);
        setAuthorizationError(undefined);
        setTransientAuthError(undefined);
      })
      .catch(async (caught) => {
        if (!active) return;
        const isApiErr = caught instanceof ApiError;
        // Only sign out and clear the role on a hard 403 (forbidden) or a 401
        // that survived the token-refresh retry in apiRequest. On transient
        // errors (network blip, 5xx, non-JSON), keep the current authorizedRole
        // so the auth gate doesn't bounce to SignInPage. Show a dismissable
        // inline error instead — the user can retry without re-authenticating.
        const hardAuthFailure =
          isApiErr && (caught.status === 403 || caught.status === 401);
        const msg = isApiErr ? caught.message : "Could not reach the server.";

        if (hardAuthFailure) {
          setAuthorizationError(
            caught.status === 403
              ? "This email is not authorized for Seine Studio."
              : msg,
          );
          setAuthorizedRole(null);
          await signOut();
        } else {
          // Transient error — keep the role intact so we don't bounce the user.
          // If role was never set (first load), show a retryable error instead
          // of forcing SignInPage.
          setTransientAuthError(msg);
        }
      })
      .finally(() => {
        if (active) setAuthorizationPending(false);
      });
    return () => {
      active = false;
    };
  }, [session.data?.user?.id]);

  useEffect(() => {
    if (authorizedRole) refreshNotifications();
  }, [authorizedRole, refreshNotifications]);

  // Daily reminder check: runs when the app loads and the user is authorized
  useEffect(() => {
    if (!authorizedRole) return;
    const checkAndRemind = async () => {
      if (!USE_API) return;
      try {
        const res = await apiRequest<{
          data: { dailyReminder: boolean; lastRemindedAt: string | null };
        }>("/notifications/status");
        if (shouldShowDailyReminder(res.data.dailyReminder, res.data.lastRemindedAt)) {
          showDailyReminder();
          // Update server last-reminded timestamp
          await apiRequest("/notifications/preferences", {
            method: "PATCH",
            body: JSON.stringify({}),
          }).catch(() => {});
        }
      } catch {
        // Best-effort — don't block the app on notification failures
      }
    };
    void checkAndRemind();
  }, [authorizedRole]);

  if (isAuthConfigured && (!authorizedRole || authorizationPending)) {
    if (authorizationPending && !loadingTimedOut) {
      return (
        <div
          className="flex min-h-dvh items-center justify-center"
          style={{ fontFamily: "'DM Sans', sans-serif", background: "var(--background)" }}
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground animate-pulse">Loading session…</p>
        </div>
      );
    }
    // Transient auth error on first load (role never set) — show a retry
    // screen instead of SignInPage since the session cookie is still valid.
    if (transientAuthError && !authorizedRole) {
      return (
        <div
          className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6"
          style={{ fontFamily: "'DM Sans', sans-serif", background: "var(--background)" }}
        >
          <p className="text-[13px] text-muted-foreground text-center max-w-xs">{transientAuthError}</p>
          <button
            onClick={() => {
              setTransientAuthError(undefined);
              setAuthorizationPending(true);
              // Force a fresh session check — the effect will re-run on session.data?.user?.id change,
              // but if the session hasn't changed we trigger manually.
              window.location.reload();
            }}
            className="px-5 py-2.5 text-[12px] uppercase tracking-[0.12em] bg-primary text-primary-foreground"
          >
            Retry
          </button>
        </div>
      );
    }
    const error = loadingTimedOut
      ? "Sign-in is taking too long. Check your connection and try again."
      : authorizationError;
    return <SignInPage initialError={error} />;
  }

  const { userName, userInitials } = userDisplayInfo(session);
  const userRole = authorizedRole ? (authorizedRole === "owner" ? "Owner" : "Developer") : "Manila, PH";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: "var(--background)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <PwaStatus />
      <Sidebar page={page} setPage={setPage} userName={userName} userInitials={userInitials} userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
        <TopBar page={page} notificationCount={notifications.length} onNotificationsClick={() => setShowNotifications(true)} />
        <main
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 pb-28 md:p-7"
          style={{
            overscrollBehaviorY: "contain",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "max(7rem, calc(7rem + env(safe-area-inset-bottom, 0px)))",
          }}
        >
          {transientAuthError && (
            <div className="mb-4 flex items-start gap-3 rounded-sm border border-amber-400/30 bg-amber-50/80 px-4 py-3 text-[12px] text-amber-900">
              <span className="flex-1">{transientAuthError}</span>
              <button
                onClick={() => setTransientAuthError(undefined)}
                className="text-amber-600 hover:text-amber-800"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route
              path="/projects/:projectId?"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Projects" />
                  }
                >
                  <ProjectsPage />
                </Suspense>
              }
            />
            <Route
              path="/clients/:clientId?"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Clients" />
                  }
                >
                  <ClientsPage />
                </Suspense>
              }
            />
            <Route
              path="/inventory/:itemId?"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Inventory" />
                  }
                >
                  <InventoryPage />
                </Suspense>
              }
            />
            <Route
              path="/events/:eventId?"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Events" />
                  }
                >
                  <EventsPage />
                </Suspense>
              }
            />
            <Route
              path="/accounting"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Accounting" />
                  }
                >
                  <AccountingPage projects={PROJECTS} clients={CLIENTS} inventory={INVENTORY} />
                </Suspense>
              }
            />
            <Route
              path="/replies"
              element={
                <Suspense
                  fallback={
                    <div
                      className="h-40 animate-pulse border border-border bg-card"
                      aria-label="Loading Reply Templates"
                    />
                  }
                >
                  <ReplyTemplatesPage clients={CLIENTS} projects={PROJECTS} inventory={INVENTORY} />
                </Suspense>
              }
            />
            <Route
              path="/quotes"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Quotes" />
                  }
                >
                  <QuotesPage />
                </Suspense>
              }
            />
            <Route
              path="/invoices"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Invoices" />
                  }
                >
                  <InvoicesPage />
                </Suspense>
              }
            />
            <Route
              path="/expenses"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Expenses" />
                  }
                >
                  <ExpensesPage />
                </Suspense>
              }
            />
            <Route
              path="/certificates"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Certificates" />
                  }
                >
                  <CertificatesPage />
                </Suspense>
              }
            />
            <Route
              path="/repairs"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Repairs" />
                  }
                >
                  <RepairsPage />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Settings" />
                  }
                >
                  <SettingsPage />
                </Suspense>
              }
            />
            <Route
              path="/consignment/:consignmentId?"
              element={
                <Suspense
                  fallback={
                    <div className="h-40 animate-pulse border border-border bg-card" aria-label="Loading Consignment" />
                  }
                >
                  <ConsignmentPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <MobileNav page={page} setPage={setPage} />
      {showNotifications && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => {
            setShowNotifications(false);
            refreshNotifications();
          }}
          onSettingsClick={() => setShowNotificationSettings(true)}
        />
      )}
      {showNotificationSettings && (
        <NotificationSettings onClose={() => setShowNotificationSettings(false)} />
      )}
    </div>
  );
}
