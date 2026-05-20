import { useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { useGetCompany, useUpdateCompany, getGetCompanyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

const companySchema = z.object({
  name: z.string().min(1, "اسم الشركة مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح").nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  primaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "يجب أن يكون كود لون سداسي (Hex)").optional(),
  secondaryColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "يجب أن يكون كود لون سداسي (Hex)").optional(),
  travelNotes: z.string().nullable().optional()
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: company, isLoading } = useGetCompany();
  const updateCompany = useUpdateCompany();

  const form = useForm<z.infer<typeof companySchema>>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      primaryColor: "#F7931E",
      secondaryColor: "#00AEEF",
      travelNotes: ""
    }
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || "",
        address: company.address || "",
        primaryColor: company.primaryColor || "#F7931E",
        secondaryColor: company.secondaryColor || "#00AEEF",
        travelNotes: company.travelNotes || ""
      });
    }
  }, [company, form]);

  const onSubmit = (values: z.infer<typeof companySchema>) => {
    updateCompany.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          toast({ title: "تم الحفظ", description: "تم تحديث إعدادات الشركة بنجاح" });
          queryClient.setQueryData(getGetCompanyQueryKey(), data);
        },
        onError: () => {
          toast({ title: "خطأ", description: "تعذر حفظ الإعدادات", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) return <DashboardLayout><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">إعدادات الشركة</h1>
          <p className="text-muted-foreground">تكوين الهوية البصرية ومعلومات التواصل التي ستظهر في التذاكر</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الهوية البصرية</CardTitle>
                <CardDescription>اسم الشركة والألوان الأساسية</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>اسم الشركة</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="primaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>اللون الأساسي</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10" {...field} />
                        <Input dir="ltr" className="text-left font-mono" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="secondaryColor" render={({ field }) => (
                  <FormItem>
                    <FormLabel>اللون الثانوي</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 p-1 h-10" {...field} />
                        <Input dir="ltr" className="text-left font-mono" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>معلومات التواصل</CardTitle>
                <CardDescription>طرق التواصل والعنوان</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl><Input type="email" dir="ltr" className="text-left" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="website" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>الموقع الإلكتروني</FormLabel>
                    <FormControl><Input dir="ltr" className="text-left" {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>العنوان</FormLabel>
                    <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ملاحظات السفر</CardTitle>
                <CardDescription>الشروط والأحكام التي تظهر أسفل كل تذكرة</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="travelNotes" render={({ field }) => (
                  <FormItem>
                    <FormControl><Textarea className="min-h-[150px]" {...field} value={field.value || ""} /></FormControl>
                    <FormDescription>تظهر هذه الملاحظات لجميع العملاء في التذكرة المولدة</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="ml-2 h-5 w-5" />}
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
