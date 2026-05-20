import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Plane, LayoutDashboard, Settings, LogOut, FileText, Plus, Menu } from "lucide-react";
import { useGetMe, logout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false, queryKey: ["me"] } });

  useEffect(() => {
    if (isError && !isLoading) {
      setLocation("/login");
    }
  }, [isError, isLoading, setLocation]);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/");
    } catch (e) {
      toast({ title: "حدث خطأ", description: "تعذر تسجيل الخروج", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Plane className="h-8 w-8 animate-bounce text-primary" /></div>;
  }

  if (!user) return null;

  const NavLinks = () => (
    <>
      <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
        <LayoutDashboard className="h-5 w-5" />
        لوحة القيادة
      </Link>
      <Link href="/dashboard/tickets/new" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
        <Plus className="h-5 w-5" />
        إصدار تذكرة
      </Link>
      <Link href="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted">
        <Settings className="h-5 w-5" />
        الإعدادات
      </Link>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden border-l border-border bg-card md:block md:w-64">
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
              <Plane className="h-6 w-6" />
              <span>منصة البجع</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium gap-1">
              <NavLinks />
            </nav>
          </div>
          <div className="mt-auto p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {user.name?.charAt(0) || "U"}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header & Content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium mt-8">
                <NavLinks />
              </nav>
              <Button variant="outline" className="mt-auto justify-start gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </Button>
            </SheetContent>
          </Sheet>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary mx-auto">
              <Plane className="h-6 w-6" />
              <span>منصة البجع</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
