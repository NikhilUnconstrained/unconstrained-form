import { useState } from "react";

// ─── CONFIGURE THESE 4 VALUES ───────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "YOUR_EMAILJS_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_EMAILJS_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY  = "YOUR_EMAILJS_PUBLIC_KEY";
const GOOGLE_SHEET_URL    = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL";
// ────────────────────────────────────────────────────────────────────────

const SECTIONS = ["Client Details","Contract Type","Commercials","Travel & Expenses","Approval & Routing"];

const init = {
  clientName:"",contactName:"",contactEmail:"",engagementDate:"",location:"",
  contractType:"",format:"",sessions:"",instructors:"",sessionDuration:"",scopeNotes:"",
  engagementFee:"",paymentTerms:"",currency:"USD",signingOff:"",billingEntity:"",invoiceTo:"",
  airfare:"",travelers:"1",hotelPerNight:"",nights:"1",dailyFood:"",lunch:"",dinner:"",groundTransport:"",
  craigApproved:"",additionalComments:""
};

export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(init);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  const upd = (k,v) => setForm(f => ({...f,[k]:v}));
  const n = v => parseFloat(v)||0;

  const totalExpenses = () => (
    n(form.airfare)*n(form.travelers) +
    n(form.hotelPerNight)*n(form.nights) +
    (n(form.dailyFood)+n(form.lunch)+n(form.dinner))*n(form.nights)*n(form.travelers) +
    n(form.groundTransport)
  ).toFixed(2);

  const handleGenerate = async () => {
    setLoading(true); setResult(null); setStatus("✦ AI is drafting your emails...");
    const total = totalExpenses();

    const prompt = `You are an assistant for Unconstrained, a training and consulting company led by Craig (CEO).

Generate TWO professional emails based on this engagement data:

1. Internal email to Ritvick (Chief of Staff) and Nikhil (Sales & Marketing Lead)
2. Formal email to Aistra Finance Team requesting contract creation

Engagement Data:
- Client: ${form.clientName} | Contact: ${form.contactName} (${form.contactEmail})
- Date(s): ${form.engagementDate} | Location: ${form.location}
- Contract Type: ${form.contractType} | Format: ${form.format}
- Sessions: ${form.sessions} | Instructors: ${form.instructors} | Duration: ${form.sessionDuration}
- Scope Notes: ${form.scopeNotes||"None"}
- Fee: ${form.currency} ${form.engagementFee} | Payment Terms: ${form.paymentTerms}
- Billing Entity: ${form.billingEntity} | Invoice To: ${form.invoiceTo}
- Signed off by: ${form.signingOff}
- Airfare: ${form.currency} ${form.airfare} x ${form.travelers} traveler(s)
- Hotel: ${form.currency} ${form.hotelPerNight}/night x ${form.nights} night(s)
- Daily Food: ${form.currency} ${form.dailyFood} | Lunch: ${form.currency} ${form.lunch} | Dinner: ${form.currency} ${form.dinner}
- Ground Transport: ${form.currency} ${form.groundTransport}
- Total Estimated Expenses: ${form.currency} ${total}
- Craig Approval: ${form.craigApproved}
- Comments: ${form.additionalComments||"None"}

Format:
---EMAIL 1: INTERNAL (Ritvick + Nikhil)---
Subject: ...
Body: ...

---EMAIL 2: AISTRA FINANCE---
Subject: ...
Body: ...`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:prompt}]
        })
      });
      const data = await res.json();
      const aiEmails = data.content?.map(b=>b.text||"").join("\n")||"Error generating emails.";
      setResult(aiEmails);

      // ── Send email via EmailJS ──────────────────────────────────────
      setStatus("📧 Sending email notifications...");
      if (EMAILJS_SERVICE_ID !== "YOUR_EMAILJS_SERVICE_ID") {
        await fetch(`https://api.emailjs.com/api/v1.0/email/send`, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
              clientName: form.clientName,
              contactName: form.contactName,
              contactEmail: form.contactEmail,
              contractType: form.contractType,
              format: form.format,
              engagementFee: form.engagementFee,
              currency: form.currency,
              craigApproved: form.craigApproved,
              totalExpenses: total,
              aiEmails
            }
          })
        });
      }

      // ── Log to Google Sheets ────────────────────────────────────────
      setStatus("📊 Logging to Google Sheets...");
      if (GOOGLE_SHEET_URL !== "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL") {
        await fetch(GOOGLE_SHEET_URL, {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({...form, totalExpenses: total, aiEmails})
        });
      }

      setStatus("✅ Done! Emails sent and logged to Google Sheets.");
    } catch(e) {
      setResult("Error generating emails. Please try again.");
      setStatus("");
    }
    setLoading(false);
  };

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
  const lbl = "block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide";

  const sections = [
    <div className="space-y-4">
      <div><label className={lbl}>Client / Company Name</label><input className={inp} value={form.clientName} onChange={e=>upd("clientName",e.target.value)} placeholder="e.g. Tata Consultancy Services"/></div>
      <div><label className={lbl}>Primary Contact Name</label><input className={inp} value={form.contactName} onChange={e=>upd("contactName",e.target.value)} placeholder="e.g. Priya Sharma"/></div>
      <div><label className={lbl}>Primary Contact Email</label><input className={inp} value={form.contactEmail} onChange={e=>upd("contactEmail",e.target.value)} placeholder="priya@company.com"/></div>
      <div><label className={lbl}>Engagement Date(s)</label><input className={inp} value={form.engagementDate} onChange={e=>upd("engagementDate",e.target.value)} placeholder="e.g. March 20–21, 2026"/></div>
      <div><label className={lbl}>Location / City</label><input className={inp} value={form.location} onChange={e=>upd("location",e.target.value)} placeholder="e.g. Mumbai"/></div>
    </div>,

    <div className="space-y-4">
      <div><label className={lbl}>Contract Type</label>
        <select className={inp} value={form.contractType} onChange={e=>upd("contractType",e.target.value)}>
          <option value="">Select...</option>
          {["Workshop / Training","Consulting / Advisory","Coaching","AI Workshop – In Person","AI Workshop – Virtual"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      <div><label className={lbl}>Format</label>
        <select className={inp} value={form.format} onChange={e=>upd("format",e.target.value)}>
          <option value="">Select...</option>
          {["In-Person","Virtual","Hybrid"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Sessions</label>
          <select className={inp} value={form.sessions} onChange={e=>upd("sessions",e.target.value)}>
            <option value="">Select...</option>
            {["1","2","3","4","5","6","Custom"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div><label className={lbl}>Instructors</label>
          <select className={inp} value={form.instructors} onChange={e=>upd("instructors",e.target.value)}>
            <option value="">Select...</option>
            {["1","2","3","4","Custom"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div><label className={lbl}>Session Duration</label>
        <select className={inp} value={form.sessionDuration} onChange={e=>upd("sessionDuration",e.target.value)}>
          <option value="">Select...</option>
          {["Half Day","Full Day","90 mins","2 hrs","Custom"].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>
      <div><label className={lbl}>Scope Notes (optional)</label><textarea className={inp} rows={2} value={form.scopeNotes} onChange={e=>upd("scopeNotes",e.target.value)} placeholder="Special requirements..."/></div>
    </div>,

    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><label className={lbl}>Engagement Fee</label><input className={inp} value={form.engagementFee} onChange={e=>upd("engagementFee",e.target.value)} placeholder="e.g. 15000"/></div>
        <div><label className={lbl}>Currency</label>
          <select className={inp} value={form.currency} onChange={e=>upd("currency",e.target.value)}>
            {["USD","INR","AED","GBP"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div><label className={lbl}>Payment Terms</label><input className={inp} value={form.paymentTerms} onChange={e=>upd("paymentTerms",e.target.value)} placeholder="e.g. 50% upfront, 50% on delivery"/></div>
      <div><label className={lbl}>Billing Entity Name</label><input className={inp} value={form.billingEntity} onChange={e=>upd("billingEntity",e.target.value)} placeholder="Legal name for invoice"/></div>
      <div><label className={lbl}>Invoice Addressed To</label><input className={inp} value={form.invoiceTo} onChange={e=>upd("invoiceTo",e.target.value)} placeholder="Name & designation at Aistra Finance"/></div>
      <div><label className={lbl}>Signing Off (Unconstrained)</label><input className={inp} value={form.signingOff} onChange={e=>upd("signingOff",e.target.value)} placeholder="e.g. Craig – CEO, Unconstrained"/></div>
    </div>,

    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Airfare (per person)</label><input className={inp} value={form.airfare} onChange={e=>upd("airfare",e.target.value)} placeholder="0"/></div>
        <div><label className={lbl}>Travelers</label>
          <select className={inp} value={form.travelers} onChange={e=>upd("travelers",e.target.value)}>
            {["1","2","3","4"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl}>Hotel (per night)</label><input className={inp} value={form.hotelPerNight} onChange={e=>upd("hotelPerNight",e.target.value)} placeholder="0"/></div>
        <div><label className={lbl}>Nights</label>
          <select className={inp} value={form.nights} onChange={e=>upd("nights",e.target.value)}>
            {["1","2","3","4","5","6","7"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className={lbl}>Daily Food</label><input className={inp} value={form.dailyFood} onChange={e=>upd("dailyFood",e.target.value)} placeholder="0"/></div>
        <div><label className={lbl}>Lunch</label><input className={inp} value={form.lunch} onChange={e=>upd("lunch",e.target.value)} placeholder="0"/></div>
        <div><label className={lbl}>Dinner</label><input className={inp} value={form.dinner} onChange={e=>upd("dinner",e.target.value)} placeholder="0"/></div>
      </div>
      <div><label className={lbl}>Ground Transport (total)</label><input className={inp} value={form.groundTransport} onChange={e=>upd("groundTransport",e.target.value)} placeholder="0"/></div>
      <div className="bg-indigo-50 rounded-lg p-3 flex justify-between items-center">
        <span className="text-sm font-semibold text-indigo-700">Total Estimated Expenses</span>
        <span className="text-lg font-bold text-indigo-800">{form.currency} {totalExpenses()}</span>
      </div>
    </div>,

    <div className="space-y-4">
      <div><label className={lbl}>Has Craig Approved?</label>
        <select className={inp} value={form.craigApproved} onChange={e=>upd("craigApproved",e.target.value)}>
          <option value="">Select...</option>
          <option>Yes – Craig has signed off</option>
          <option>Pending Craig's approval</option>
        </select>
      </div>
      <div><label className={lbl}>Additional Comments (optional)</label><textarea className={inp} rows={3} value={form.additionalComments} onChange={e=>upd("additionalComments",e.target.value)} placeholder="Any other notes..."/></div>
    </div>
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-2 uppercase tracking-widest">Unconstrained</div>
          <h1 className="text-2xl font-bold text-gray-800">Client Engagement Form</h1>
          <p className="text-sm text-gray-400 mt-1">Fill in details — AI drafts emails, logs to Sheets, notifies team</p>
        </div>

        <div className="flex items-center mb-6 gap-1">
          {SECTIONS.map((s,i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${i<step?"bg-indigo-600 border-indigo-600 text-white":i===step?"border-indigo-600 text-indigo-600 bg-white":"border-gray-200 text-gray-300 bg-white"}`}>
                {i<step?"✓":i+1}
              </div>
              <span className={`text-xs mt-1 text-center leading-tight ${i===step?"text-indigo-600 font-semibold":"text-gray-300"}`}>{s}</span>
            </div>
          ))}
        </div>

        {!result ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-base font-bold text-gray-700 mb-4">{SECTIONS[step]}</h2>
            {sections[step]}
            {status && <p className="text-xs text-indigo-500 mt-3 text-center animate-pulse">{status}</p>}
            <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
              {step>0
                ? <button onClick={()=>setStep(s=>s-1)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">← Back</button>
                : <div/>}
              {step<SECTIONS.length-1
                ? <button onClick={()=>setStep(s=>s+1)} className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">Next →</button>
                : <button onClick={handleGenerate} disabled={loading} className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {loading?"Processing...":"✦ Generate & Send"}
                  </button>}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-gray-700">✅ Emails Ready</h2>
              <button onClick={()=>{navigator.clipboard.writeText(result);setCopied(true);setTimeout(()=>setCopied(false),2000);}} className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-semibold hover:bg-indigo-100">
                {copied?"Copied!":"Copy All"}
              </button>
            </div>
            {status && <p className="text-xs text-green-600 mb-3 font-medium">{status}</p>}
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto leading-relaxed">{result}</pre>
            <button onClick={()=>{setResult(null);setStep(0);setForm(init);setStatus("");}} className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-gray-600">
              ↺ New engagement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
