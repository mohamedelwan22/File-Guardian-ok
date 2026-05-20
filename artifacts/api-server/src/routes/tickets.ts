import { Router } from "express";
import { db, ticketsTable, companiesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../middlewares/auth.js";
import { uploadFile } from "../lib/supabase.js";
import { extractTextFromPDF } from "../lib/pdf-reader.js";
import { generateTicketPDF } from "../lib/pdf-generator.js";

const router = Router();

type AuthRequest = Parameters<typeof requireAuth>[0] & {
  user?: { id: string; companyId?: string | null; role: string };
};

function paramId(req: AuthRequest): string {
  const v = (req as { params: Record<string, string | string[]> }).params.id;
  return Array.isArray(v) ? v[0] : v;
}

// GET /api/tickets/stats
router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const all = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.companyId, user.companyId))
      .orderBy(desc(ticketsTable.createdAt));

    const recent = all.slice(0, 5);
    const recentWithNames = await Promise.all(recent.map(async (t) => {
      const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, t.createdBy) });
      return { ...t, userName: u?.name ?? null };
    }));

    res.json({
      total: all.length,
      pending: all.filter(t => t.status === "PENDING").length,
      editing: all.filter(t => t.status === "EDITING").length,
      generated: all.filter(t => t.status === "GENERATED").length,
      sent: all.filter(t => t.status === "SENT").length,
      recentTickets: recentWithNames,
    });
  } catch (e: unknown) {
    req.log.error(e, "getTicketStats error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// GET /api/tickets
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const tickets = await db.select().from(ticketsTable)
      .where(eq(ticketsTable.companyId, user.companyId))
      .orderBy(desc(ticketsTable.createdAt));

    const withNames = await Promise.all(tickets.map(async (t) => {
      const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, t.createdBy) });
      return { ...t, userName: u?.name ?? null };
    }));

    res.json({ tickets: withNames, total: withNames.length });
  } catch (e: unknown) {
    req.log.error(e, "listTickets error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/tickets
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const body = req.body as { passengerName?: string };
    const [ticket] = await db.insert(ticketsTable).values({
      id: randomUUID(),
      companyId: user.companyId,
      createdBy: user.id,
      originalFileUrl: null,
      rawText: null,
      passengerName: body.passengerName ?? null,
      status: "EDITING",
      updatedAt: new Date(),
    }).returning();

    res.status(201).json({ success: true, ticket: { ...ticket, userName: null } });
  } catch (e: unknown) {
    req.log.error(e, "createTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/tickets/upload
router.post("/upload", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }

    const chunks: Buffer[] = [];
    let fileBuffer: Buffer | null = null;

    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const Busboy = require("busboy");

    await new Promise<void>((resolve, reject) => {
      const bb = Busboy({ headers: req.headers });
      bb.on("file", (_fieldname: string, stream: NodeJS.ReadableStream) => {
        stream.on("data", (chunk: Buffer) => chunks.push(chunk));
        stream.on("end", () => { fileBuffer = Buffer.concat(chunks); });
      });
      bb.on("close", resolve);
      bb.on("error", reject);
      req.pipe(bb);
    });

    if (!fileBuffer || (fileBuffer as Buffer).length === 0) {
      res.status(400).json({ error: "يجب رفع ملف PDF" });
      return;
    }

    const rawText = await extractTextFromPDF(fileBuffer as Buffer);
    const bucket = process.env.SUPABASE_BUCKET || "tickets";
    const fileUrl = await uploadFile(
      bucket,
      `tickets/${user.companyId}/${randomUUID()}.pdf`,
      fileBuffer as Buffer,
      "application/pdf"
    );

    const [ticket] = await db.insert(ticketsTable).values({
      id: randomUUID(),
      companyId: user.companyId,
      createdBy: user.id,
      originalFileUrl: fileUrl,
      rawText,
      status: "EDITING",
      updatedAt: new Date(),
    }).returning();

    res.json({ success: true, ticket: { ...ticket, userName: null } });
  } catch (e: unknown) {
    req.log.error(e, "uploadTicket error");
    res.status(500).json({ error: `فشل رفع الملف: ${(e as Error).message}` });
  }
});

// GET /api/tickets/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const id = paramId(req);
    const ticket = await db.query.ticketsTable.findFirst({
      where: eq(ticketsTable.id, id),
    });
    if (!ticket || ticket.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    const u = await db.query.usersTable.findFirst({ where: eq(usersTable.id, ticket.createdBy) });
    res.json({ success: true, ticket: { ...ticket, userName: u?.name ?? null } });
  } catch (e: unknown) {
    req.log.error(e, "getTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// PATCH /api/tickets/:id
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const id = paramId(req);
    const existing = await db.query.ticketsTable.findFirst({ where: eq(ticketsTable.id, id) });
    if (!existing || existing.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    const allowed = [
      "passengerName","ticketNumber","bookingReference","flightFrom","flightTo",
      "departureDate","departureTime","arrivalDate","arrivalTime","airline","flightNumber",
      "cabinClass","baggageAllowance","gate","price","currency","issueDate","hidePrice",
    ] as const;
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) {
      if (k in body) data[k] = body[k];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [updated] = await db.update(ticketsTable).set(data as any).where(eq(ticketsTable.id, id)).returning();
    res.json({ success: true, ticket: { ...updated, userName: null } });
  } catch (e: unknown) {
    req.log.error(e, "updateTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// DELETE /api/tickets/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const id = paramId(req);
    const existing = await db.query.ticketsTable.findFirst({ where: eq(ticketsTable.id, id) });
    if (!existing || existing.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }
    await db.delete(ticketsTable).where(eq(ticketsTable.id, id));
    res.json({ success: true });
  } catch (e: unknown) {
    req.log.error(e, "deleteTicket error");
    res.status(500).json({ error: "خطأ في الخادم" });
  }
});

// POST /api/tickets/:id/generate
router.post("/:id/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    if (!user.companyId) { res.status(403).json({ error: "غير مصرح" }); return; }
    const id = paramId(req);

    const ticket = await db.query.ticketsTable.findFirst({ where: eq(ticketsTable.id, id) });
    if (!ticket || ticket.companyId !== user.companyId) {
      res.status(404).json({ error: "التذكرة غير موجودة" });
      return;
    }

    const company = await db.query.companiesTable.findFirst({ where: eq(companiesTable.id, user.companyId) });
    if (!company) { res.status(404).json({ error: "الشركة غير موجودة" }); return; }

    const pdfBuf = await generateTicketPDF(
      {
        passengerName: ticket.passengerName,
        ticketNumber: ticket.ticketNumber,
        bookingReference: ticket.bookingReference,
        flightFrom: ticket.flightFrom,
        flightTo: ticket.flightTo,
        departureDate: ticket.departureDate,
        departureTime: ticket.departureTime,
        arrivalDate: ticket.arrivalDate,
        arrivalTime: ticket.arrivalTime,
        airline: ticket.airline,
        flightNumber: ticket.flightNumber,
        cabinClass: ticket.cabinClass,
        baggageAllowance: ticket.baggageAllowance,
        gate: ticket.gate,
        price: ticket.price,
        currency: ticket.currency,
        issueDate: ticket.issueDate,
      },
      {
        name: company.name,
        logoUrl: company.logoUrl,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        phone: company.phone,
        email: company.email,
        website: company.website,
        address: company.address,
        travelNotes: company.travelNotes,
      },
      ticket.hidePrice
    );

    const bucket = process.env.SUPABASE_BUCKET || "tickets";
    const url = await uploadFile(
      bucket,
      `generated/${user.companyId}/${randomUUID()}.pdf`,
      pdfBuf,
      "application/pdf"
    );

    const [updated] = await db.update(ticketsTable)
      .set({ generatedFileUrl: url, status: "GENERATED", updatedAt: new Date() })
      .where(eq(ticketsTable.id, id))
      .returning();

    res.json({ success: true, ticket: { ...updated, userName: null } });
  } catch (e: unknown) {
    req.log.error(e, "generateTicketPdf error");
    res.status(500).json({ error: `فشل توليد التذكرة: ${(e as Error).message}` });
  }
});

export default router;
