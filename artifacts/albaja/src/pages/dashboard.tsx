import { Link } from "wouter";
import { useGetTicketStats } from "@workspace/api-client-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Clock, CheckCircle2, Send, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const statusMap: Record<string, { label: string, color: string }> = {
  PENDING: { label: "معلق", color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20" },
  EDITING: { label: "قيد التعديل", color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20" },
  GENERATED: { label: "مولّدة", color: "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20" },
  SENT: { label: "مُرسلة", color: "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20" },
};

export default function Dashboard() {
  const { data: stats, isLoading } = useGetTicketStats();

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة القيادة</h1>
            <p className="text-muted-foreground mt-1">نظرة عامة على التذاكر وحالتها</p>
          </div>
          <Link href="/dashboard/tickets/new">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              إصدار تذكرة جديدة
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي التذاكر</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{isLoading ? "-" : stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">معلقة</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{isLoading ? "-" : stats?.pending || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">قيد التعديل</CardTitle>
              <Edit className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{isLoading ? "-" : stats?.editing || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">مولّدة / جاهزة</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{isLoading ? "-" : stats?.generated || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">أحدث التذاكر</h2>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px] text-right">المرجع</TableHead>
                  <TableHead className="text-right">اسم المسافر</TableHead>
                  <TableHead className="text-right">الوجهة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-left">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : !stats?.recentTickets?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      لا توجد تذاكر حديثة
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium font-mono text-sm">{ticket.bookingReference || "-"}</TableCell>
                      <TableCell>{ticket.passengerName || "غير محدد"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{ticket.flightFrom || "-"}</span>
                          <span className="text-muted-foreground">←</span>
                          <span>{ticket.flightTo || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">{ticket.departureDate || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusMap[ticket.status]?.color || ""}>
                          {statusMap[ticket.status]?.label || ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <Link href={`/dashboard/tickets/${ticket.id}`}>
                          <Button variant="ghost" size="sm">
                            عرض التفاصيل
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
