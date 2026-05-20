import puppeteer from "puppeteer";

export interface TicketData {
  passengerName?: string | null;
  ticketNumber?: string | null;
  bookingReference?: string | null;
  flightFrom?: string | null;
  flightTo?: string | null;
  departureDate?: string | null;
  departureTime?: string | null;
  arrivalDate?: string | null;
  arrivalTime?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  cabinClass?: string | null;
  baggageAllowance?: string | null;
  gate?: string | null;
  price?: string | null;
  currency?: string | null;
  issueDate?: string | null;
}

export interface CompanyData {
  name: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  travelNotes?: string | null;
}

export async function generateTicketPDF(
  ticket: TicketData,
  company: CompanyData,
  hidePrice = false
): Promise<Buffer> {
  const notes = company.travelNotes
    ? company.travelNotes.split("\n").filter(Boolean)
    : [];

  const barcodeH = [32,18,45,28,52,15,38,22,48,12,35,42,20,55,25,40,18,50,30,44,16,36,24,47,21,39,28,53,14,37];

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Cairo',Arial,sans-serif; background:#f5f5f5; direction:rtl; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .wrap { width:794px; min-height:1123px; margin:0 auto; background:#fff; display:flex; flex-direction:column; }
  .hdr { background:linear-gradient(135deg,${company.primaryColor},${company.secondaryColor}); padding:32px 40px; display:flex; justify-content:space-between; align-items:center; position:relative; overflow:hidden; }
  .hdr::before { content:''; position:absolute; top:-40px; left:-40px; width:180px; height:180px; background:rgba(255,255,255,.08); border-radius:50%; }
  .co-name { font-size:26px; font-weight:900; color:#fff; margin-bottom:4px; }
  .co-sub { font-size:13px; color:rgba(255,255,255,.85); }
  .co-logo { width:90px; height:90px; background:rgba(255,255,255,.15); border-radius:16px; display:flex; align-items:center; justify-content:center; border:2px solid rgba(255,255,255,.3); font-size:28px; font-weight:900; color:#fff; }
  .co-logo img { width:70px; height:70px; object-fit:contain; }
  .badge { background:${company.primaryColor}; color:#fff; text-align:center; padding:12px; font-size:13px; font-weight:700; letter-spacing:3px; }
  .body { padding:32px 40px; flex:1; }
  .pax { background:linear-gradient(135deg,#fafafa,#f0f0f0); border-radius:16px; padding:20px 24px; margin-bottom:24px; border-right:5px solid ${company.primaryColor}; display:flex; justify-content:space-between; align-items:center; }
  .pax-name { font-size:22px; font-weight:900; }
  .pax-lbl { font-size:11px; color:#888; margin-bottom:4px; letter-spacing:1px; text-transform:uppercase; }
  .refs { display:flex; gap:10px; }
  .ref-box { background:#fff; border:1.5px solid #e0e0e0; border-radius:10px; padding:8px 14px; text-align:center; }
  .ref-val { font-size:14px; font-weight:700; color:${company.primaryColor}; }
  .ref-lbl { font-size:10px; color:#999; margin-top:2px; }
  .route { background:linear-gradient(135deg,${company.primaryColor}20,${company.secondaryColor}20); border-radius:20px; padding:28px 32px; margin-bottom:24px; border:1.5px solid ${company.primaryColor}40; }
  .route-row { display:flex; align-items:center; justify-content:space-between; }
  .iata { font-size:44px; font-weight:900; line-height:1; }
  .iata-lbl { font-size:13px; color:#666; margin-top:4px; }
  .arrow { flex:1; display:flex; flex-direction:column; align-items:center; padding:0 20px; }
  .line { width:100%; height:2px; background:linear-gradient(to left,${company.primaryColor},${company.secondaryColor}); position:relative; margin:8px 0; }
  .line::after { content:'✈'; position:absolute; top:-12px; left:50%; transform:translateX(-50%) scaleX(-1); font-size:20px; color:${company.primaryColor}; }
  .al-badge { background:#fff; border-radius:8px; padding:4px 12px; font-size:12px; font-weight:700; color:${company.primaryColor}; border:1.5px solid ${company.primaryColor}40; margin-top:6px; }
  .times { display:flex; justify-content:space-between; margin-top:16px; padding-top:16px; border-top:1.5px dashed ${company.primaryColor}40; }
  .time-blk { text-align:center; }
  .time-val { font-size:28px; font-weight:900; }
  .time-dt { font-size:12px; color:#666; margin-top:4px; }
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
  .card { background:#fafafa; border-radius:12px; padding:14px 16px; border:1.5px solid #ececec; }
  .card .lbl { font-size:10px; color:#999; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .card .val { font-size:15px; font-weight:700; }
  .price-sec { background:linear-gradient(135deg,${company.primaryColor},${company.secondaryColor}); border-radius:14px; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; color:#fff; }
  .price-lbl { font-size:14px; opacity:.9; }
  .price-amt { font-size:32px; font-weight:900; }
  .barcode { display:flex; align-items:center; gap:20px; background:#fafafa; border-radius:14px; padding:16px 24px; margin-bottom:24px; border:1.5px dashed #ddd; }
  .bars { display:flex; gap:2px; align-items:flex-end; }
  .bars span { display:inline-block; background:#1A1A1A; width:3px; border-radius:1px; }
  .tkt-num { font-size:13px; color:#888; letter-spacing:2px; font-weight:600; }
  .notes { background:#fff8f0; border-radius:14px; padding:20px 24px; margin-bottom:24px; border:1.5px solid ${company.primaryColor}40; }
  .notes-ttl { font-size:14px; font-weight:700; color:${company.primaryColor}; margin-bottom:12px; }
  .notes-list { list-style:none; }
  .notes-list li { font-size:12px; color:#555; padding:5px 0 5px 18px; position:relative; line-height:1.6; padding-right:18px; }
  .notes-list li::before { content:'•'; position:absolute; right:4px; color:${company.primaryColor}; font-weight:bold; }
  .ftr { background:#1A1A1A; padding:20px 40px; display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
  .ftr-brand { color:#fff; font-size:13px; font-weight:700; }
  .ftr-badge { background:${company.primaryColor}; color:#fff; padding:6px 14px; border-radius:8px; font-size:11px; font-weight:700; }
  .ftr-contact { color:#888; font-size:11px; text-align:left; }
  .ftr-contact span { display:block; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div>
      <div class="co-name">${company.name}</div>
      <div class="co-sub">تذكرة سفر إلكترونية — Electronic Ticket</div>
    </div>
    <div class="co-logo">
      ${company.logoUrl ? `<img src="${company.logoUrl}" alt="logo"/>` : "✈"}
    </div>
  </div>
  <div class="badge">تذكرة طيران إلكترونية ● ELECTRONIC AIRLINE TICKET</div>
  <div class="body">
    <div class="pax">
      <div>
        <div class="pax-lbl">اسم المسافر / Passenger Name</div>
        <div class="pax-name">${ticket.passengerName || "—"}</div>
      </div>
      <div class="refs">
        ${ticket.bookingReference ? `<div class="ref-box"><div class="ref-val">${ticket.bookingReference}</div><div class="ref-lbl">رقم الحجز / PNR</div></div>` : ""}
        ${ticket.ticketNumber ? `<div class="ref-box"><div class="ref-val">${ticket.ticketNumber}</div><div class="ref-lbl">رقم التذكرة</div></div>` : ""}
      </div>
    </div>
    <div class="route">
      <div class="route-row">
        <div>
          <div class="iata">${ticket.flightFrom || "—"}</div>
          <div class="iata-lbl">المغادرة / Departure</div>
        </div>
        <div class="arrow">
          <div class="line"></div>
          <div class="al-badge">${ticket.airline || ""} ${ticket.flightNumber || ""}</div>
        </div>
        <div style="text-align:left">
          <div class="iata">${ticket.flightTo || "—"}</div>
          <div class="iata-lbl">الوصول / Arrival</div>
        </div>
      </div>
      <div class="times">
        <div class="time-blk">
          <div class="time-val">${ticket.departureTime || "—"}</div>
          <div class="time-dt">${ticket.departureDate || ""}</div>
        </div>
        <div class="time-blk"><div style="font-size:12px;color:#888">مدة الرحلة</div></div>
        <div class="time-blk">
          <div class="time-val">${ticket.arrivalTime || "—"}</div>
          <div class="time-dt">${ticket.arrivalDate || ""}</div>
        </div>
      </div>
    </div>
    <div class="grid">
      <div class="card"><div class="lbl">درجة السفر</div><div class="val">${ticket.cabinClass || "—"}</div></div>
      <div class="card"><div class="lbl">الأمتعة المسموح</div><div class="val">${ticket.baggageAllowance || "—"}</div></div>
      <div class="card"><div class="lbl">بوابة الصعود</div><div class="val">${ticket.gate || "—"}</div></div>
      <div class="card"><div class="lbl">تاريخ الإصدار</div><div class="val">${ticket.issueDate || "—"}</div></div>
      <div class="card"><div class="lbl">رقم الرحلة</div><div class="val">${ticket.flightNumber || "—"}</div></div>
      <div class="card"><div class="lbl">شركة الطيران</div><div class="val">${ticket.airline || "—"}</div></div>
    </div>
    ${!hidePrice && ticket.price ? `
    <div class="price-sec">
      <div class="price-lbl">إجمالي السعر / Total Fare</div>
      <div><span style="font-size:16px;opacity:.85;margin-left:6px">${ticket.currency || ""}</span><span class="price-amt">${ticket.price}</span></div>
    </div>` : ""}
    <div class="barcode">
      <div class="bars">
        ${barcodeH.map(h => `<span style="height:${h}px"></span>`).join("")}
      </div>
      <div class="tkt-num">${ticket.ticketNumber || ""}</div>
    </div>
    ${notes.length ? `
    <div class="notes">
      <div class="notes-ttl">تعليمات السفر الهامة</div>
      <ul class="notes-list">
        ${notes.map(n => `<li>${n}</li>`).join("")}
      </ul>
    </div>` : ""}
  </div>
  <div class="ftr">
    <div class="ftr-brand">${company.name}</div>
    <div class="ftr-badge">صادرة إلكترونياً</div>
    <div class="ftr-contact">
      ${company.phone ? `<span>${company.phone}</span>` : ""}
      ${company.email ? `<span>${company.email}</span>` : ""}
      ${company.website ? `<span>${company.website}</span>` : ""}
    </div>
  </div>
</div>
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdfBuf);
  } finally {
    await browser.close();
  }
}
