import { Router } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

type AuthRequest = Parameters<typeof requireAuth>[0] & { user?: { companyId?: string | null; role: string } };

// GET /api/company
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(404).json({ error: "لا توجد شركة مرتبطة بهذا المستخدم" });
      return;
    }
    const company = await db.query.companiesTable.findFirst({
      where: eq(companiesTable.id, user.companyId),
    });
    if (!company) {
      res.status(404).json({ error: "الشركة غير موجودة" });
      return;
    }
    res.json(company);
  } catch (e: unknown) {
    req.log.error(e, "getCompany error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PATCH /api/company
router.patch("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) {
      res.status(403).json({ error: "غير مصرح" });
      return;
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      res.status(403).json({ error: "غير مسموح لك بتعديل إعدادات الشركة" });
      return;
    }
    const allowed = ["name", "logoUrl", "primaryColor", "secondaryColor", "email", "phone", "website", "address", "travelNotes"] as const;
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }
    const [updated] = await db
      .update(companiesTable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(data as any)
      .where(eq(companiesTable.id, user.companyId))
      .returning();
    res.json(updated);
  } catch (e: unknown) {
    req.log.error(e, "updateCompany error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

export default router;
