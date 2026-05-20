import { useState } from "react";
import { useLocation } from "wouter";
import { UploadCloud, FileType, FileEdit, Loader2, ArrowRight } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCreateTicket } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function NewTicket() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  
  const createTicket = useCreateTicket();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast({ title: "صيغة غير مدعومة", description: "الرجاء رفع ملف PDF فقط", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/tickets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload");
      }

      const data = await res.json();
      if (data.ticket?.id) {
        toast({ title: "تم رفع الملف بنجاح", description: "جاري تحويلك إلى صفحة التعديل" });
        setLocation(`/dashboard/tickets/${data.ticket.id}`);
      }
    } catch (err) {
      toast({ title: "خطأ في الرفع", description: "حدث خطأ أثناء معالجة الملف.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualEntry = () => {
    setIsCreatingManual(true);
    createTicket.mutate(
      { data: {} },
      {
        onSuccess: (data) => {
          if (data.ticket?.id) {
            setLocation(`/dashboard/tickets/${data.ticket.id}`);
          }
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر إنشاء التذكرة", variant: "destructive" });
          setIsCreatingManual(false);
        }
      }
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">إصدار تذكرة جديدة</h1>
            <p className="text-muted-foreground">اختر طريقة إدخال بيانات التذكرة</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-border/50 border-2 hover:border-primary/50 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileType className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>رفع ملف PDF</CardTitle>
              <CardDescription>
                قم برفع تذكرة الطيران الأصلية وسيتم استخراج البيانات تلقائياً
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/50 transition-colors">
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium mb-1">
                  {isUploading ? "جاري الرفع والمعالجة..." : "اسحب الملف هنا أو انقر للاختيار"}
                </p>
                <p className="text-xs text-muted-foreground">PDF فقط (الحد الأقصى 5MB)</p>
                {isUploading && <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-4" />}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 border-2 hover:border-secondary/50 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <FileEdit className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle>إدخال يدوي</CardTitle>
              <CardDescription>
                قم بإدخال جميع بيانات التذكرة بشكل يدوي بالكامل
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pt-4">
              <Button 
                size="lg" 
                className="w-full bg-secondary hover:bg-secondary/90 text-white" 
                onClick={handleManualEntry}
                disabled={isCreatingManual}
              >
                {isCreatingManual ? (
                  <Loader2 className="h-5 w-5 animate-spin ml-2" />
                ) : (
                  <FileEdit className="h-5 w-5 ml-2" />
                )}
                إنشاء تذكرة فارغة
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
