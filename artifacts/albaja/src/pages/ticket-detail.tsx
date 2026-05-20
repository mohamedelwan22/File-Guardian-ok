import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/dashboard-layout";
import { 
  useGetTicket, getGetTicketQueryKey, 
  useUpdateTicket,
  useGetCompany
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  ArrowRight, Save, FileText, ChevronDown, 
  CheckCircle2, Download, Share2, Loader2 
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const ticketSchema = z.object({
  passengerName: z.string().nullable().optional(),
  ticketNumber: z.string().nullable().optional(),
  bookingReference: z.string().nullable().optional(),
  flightFrom: z.string().nullable().optional(),
  flightTo: z.string().nullable().optional(),
  departureDate: z.string().nullable().optional(),
  departureTime: z.string().nullable().optional(),
  arrivalDate: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  airline: z.string().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  cabinClass: z.string().nullable().optional(),
  baggageAllowance: z.string().nullable().optional(),
  gate: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  hidePrice: z.boolean().optional()
});

const statusMap: Record<string, { label: string, color: string }> = {
  PENDING: { label: "معلق", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  EDITING: { label: "قيد التعديل", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  GENERATED: { label: "مولّدة", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  SENT: { label: "مُرسلة", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

export default function TicketDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: ticketRes, isLoading } = useGetTicket(id || "", { 
    query: { enabled: !!id, queryKey: getGetTicketQueryKey(id || "") } 
  });
  
  const ticket = ticketRes?.ticket;
  
  const updateTicket = useUpdateTicket();

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      passengerName: "",
      ticketNumber: "",
      bookingReference: "",
      flightFrom: "",
      flightTo: "",
      departureDate: "",
      departureTime: "",
      arrivalDate: "",
      arrivalTime: "",
      airline: "",
      flightNumber: "",
      cabinClass: "",
      baggageAllowance: "",
      gate: "",
      price: "",
      currency: "USD",
      issueDate: "",
      hidePrice: false
    }
  });

  useEffect(() => {
    if (ticket) {
      form.reset({
        passengerName: ticket.passengerName || "",
        ticketNumber: ticket.ticketNumber || "",
        bookingReference: ticket.bookingReference || "",
        flightFrom: ticket.flightFrom || "",
        flightTo: ticket.flightTo || "",
        departureDate: ticket.departureDate || "",
        departureTime: ticket.departureTime || "",
        arrivalDate: ticket.arrivalDate || "",
        arrivalTime: ticket.arrivalTime || "",
        airline: ticket.airline || "",
        flightNumber: ticket.flightNumber || "",
        cabinClass: ticket.cabinClass || "",
        baggageAllowance: ticket.baggageAllowance || "",
        gate: ticket.gate || "",
        price: ticket.price || "",
        currency: ticket.currency || "USD",
        issueDate: ticket.issueDate || "",
        hidePrice: ticket.hidePrice || false
      });
    }
  }, [ticket, form]);

  const onSubmit = (values: z.infer<typeof ticketSchema>) => {
    if (!id) return;
    updateTicket.mutate(
      { id, data: values },
      {
        onSuccess: (data) => {
          toast({ title: "تم الحفظ", description: "تم حفظ بيانات التذكرة بنجاح" });
          queryClient.setQueryData(getGetTicketQueryKey(id), data);
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر حفظ التذكرة", variant: "destructive" });
        }
      }
    );
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/tickets/${id}/generate`, { method: "POST" });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      toast({ title: "تم توليد التذكرة", description: "الملف جاهز للتحميل" });
      queryClient.setQueryData(getGetTicketQueryKey(id), data);
    } catch (e) {
      toast({ title: "خطأ", description: "فشل في توليد الـ PDF", variant: "destructive" });
    }
  };

  if (isLoading) return <DashboardLayout><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;
  if (!ticket) return <DashboardLayout><div>التذكرة غير موجودة</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">تعديل التذكرة</h1>
                <Badge variant="outline" className={statusMap[ticket.status]?.color}>
                  {statusMap[ticket.status]?.label || ticket.status}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono text-sm mt-1">{ticket.id}</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={form.handleSubmit(onSubmit)} disabled={updateTicket.isPending} className="flex-1 sm:flex-none">
              {updateTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Save className="h-4 w-4 ml-2" />}
              حفظ
            </Button>
            <Button onClick={handleGeneratePdf} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white">
              توليد PDF
            </Button>
          </div>
        </div>

        {ticket.status === "GENERATED" && ticket.generatedFileUrl && (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <h3 className="font-bold text-lg text-green-500">التذكرة جاهزة</h3>
                  <p className="text-sm text-green-600/80">تم إنشاء الملف بصيغة PDF بالهوية البصرية الخاصة بك</p>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none border-green-500/50 text-green-500 hover:bg-green-500/10" asChild>
                  <a href={ticket.generatedFileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 ml-2" /> تحميل
                  </a>
                </Button>
                <Button className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#20bd5a] text-white" asChild>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`مرحباً، إليك تذكرة السفر الخاصة بك:\n${window.location.origin}${ticket.generatedFileUrl}`)}`} target="_blank" rel="noopener noreferrer">
                    <Share2 className="h-4 w-4 ml-2" /> مشاركة واتساب
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>بيانات التذكرة</CardTitle>
                <CardDescription>قم بتعبئة أو تعديل البيانات ليتم إدراجها في التذكرة النهائية</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="passengerName" render={({ field }) => (
                        <FormItem><FormLabel>اسم المسافر</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="bookingReference" render={({ field }) => (
                        <FormItem><FormLabel>مرجع الحجز (PNR)</FormLabel><FormControl><Input dir="ltr" className="text-left font-mono uppercase" {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="ticketNumber" render={({ field }) => (
                        <FormItem><FormLabel>رقم التذكرة</FormLabel><FormControl><Input dir="ltr" className="text-left font-mono" {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="airline" render={({ field }) => (
                        <FormItem><FormLabel>شركة الطيران</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-border">
                      <FormField control={form.control} name="flightFrom" render={({ field }) => (
                        <FormItem><FormLabel>من (محطة المغادرة)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="flightTo" render={({ field }) => (
                        <FormItem><FormLabel>إلى (محطة الوصول)</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="departureDate" render={({ field }) => (
                          <FormItem><FormLabel>تاريخ المغادرة</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="departureTime" render={({ field }) => (
                          <FormItem><FormLabel>وقت المغادرة</FormLabel><FormControl><Input type="time" {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField control={form.control} name="arrivalDate" render={({ field }) => (
                          <FormItem><FormLabel>تاريخ الوصول</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="arrivalTime" render={({ field }) => (
                          <FormItem><FormLabel>وقت الوصول</FormLabel><FormControl><Input type="time" {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      <FormField control={form.control} name="flightNumber" render={({ field }) => (
                        <FormItem><FormLabel>رقم الرحلة</FormLabel><FormControl><Input dir="ltr" className="text-left font-mono" {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="cabinClass" render={({ field }) => (
                        <FormItem><FormLabel>الدرجة</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="Economy / Business" /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="baggageAllowance" render={({ field }) => (
                        <FormItem><FormLabel>الوزن المسموح</FormLabel><FormControl><Input {...field} value={field.value || ""} placeholder="20KG / 2PC" /></FormControl></FormItem>
                      )} />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border">
                      <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>السعر</FormLabel><FormControl><Input type="number" dir="ltr" className="text-left" {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="currency" render={({ field }) => (
                        <FormItem><FormLabel>العملة</FormLabel><FormControl><Input dir="ltr" className="text-left" {...field} value={field.value || ""} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="hidePrice" render={({ field }) => (
                        <FormItem className="flex flex-col justify-end pb-2">
                          <div className="flex items-center gap-2">
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="mb-0">إخفاء السعر في التذكرة</FormLabel>
                          </div>
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  النص المستخرج
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Collapsible defaultOpen className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">النص الخام من ملف الـ PDF</span>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="bg-muted p-4 rounded-md text-xs font-mono whitespace-pre-wrap max-h-[400px] overflow-auto text-left" dir="ltr">
                      {ticket.rawText || "لا يوجد نص مستخرج"}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {ticket.originalFileUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">الملف الأصلي</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" asChild>
                    <a href={ticket.originalFileUrl} target="_blank" rel="noopener noreferrer">
                      عرض الملف المرفوع
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
