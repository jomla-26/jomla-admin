// إدارة رموز الدخول المؤقتة وطلبات "نسيت كلمة المرور" (لصاحب صلاحية accounts.issue_code)
import React, { useState } from "react";
import { api } from "./api.js";
import { useAction, useFetch } from "./hooks.js";

const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const card = { background: "var(--surface, #fff)", color: "inherit", borderRadius: 16, padding: 20, width: "100%", maxWidth: 420, textAlign: "right", boxShadow: "0 12px 40px rgba(0,0,0,.35)" };

/** زر "إصدار رمز دخول": تأكيد ثم يظهر الرمز مرة واحدة */
export function IssueCodeButton({ accountType, id, name, requestId, onDone, label = "إصدار رمز دخول" }) {
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState(null);
  const [copied, setCopied] = useState(false);
  const issue = useAction(async () => { setRes(await api.issueLoginCode({ accountType, accountId: id, requestId })); });
  const close = () => { setOpen(false); setRes(null); setCopied(false); if (res) onDone?.(); };
  return (
    <>
      <button className="invoice-action-btn" onClick={() => setOpen(true)}>{label}</button>
      {open && (
        <div style={overlay} onClick={close}>
          <div style={card} onClick={(e) => e.stopPropagation()}>
            {!res ? (
              <>
                <h3 style={{ marginTop: 0 }}>رمز دخول مؤقت</h3>
                <p>إصدار رمز دخول مؤقت للحساب: <b>{name}</b></p>
                <p className="hint">الرمز صالح 24 ساعة ويُستعمل مرة واحدة، وبعده يُطلب من صاحب الحساب كلمة مرور جديدة. تأكد إنك تكلم صاحب الحساب فعلاً قبل ما تعطيه الرمز.</p>
                {issue.error && <p className="field-error">{issue.error}</p>}
                <div className="decide-row">
                  <button className="btn-primary" disabled={issue.pending} onClick={() => issue.run().catch(() => {})}>
                    {issue.pending ? "جارٍ الإصدار…" : "إصدار الرمز"}
                  </button>
                  <button className="link-btn" onClick={close}>إلغاء</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ marginTop: 0 }}>الرمز لـ {res.name}</h3>
                <div style={{ font: "700 34px/1.4 monospace", letterSpacing: 6, direction: "ltr", textAlign: "center", padding: 14, borderRadius: 12, background: "rgba(128,128,128,.14)", userSelect: "all" }}>
                  {res.code}
                </div>
                <p className="hint">أعطه لصاحب الحساب ({res.phone}). صالح 24 ساعة، ويظهر هنا مرة واحدة فقط.</p>
                <div className="decide-row">
                  <button className="link-btn" onClick={() => { try { navigator.clipboard?.writeText(res.code); setCopied(true); } catch { /* تجاهل */ } }}>
                    {copied ? "تم النسخ" : "نسخ الرمز"}
                  </button>
                  <button className="btn-primary" onClick={close}>تم</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const TYPE_LABEL = { customer: "عميل", supplier: "مورد", employee: "موظف/مندوب" };

/** شاشة طلبات "نسيت كلمة المرور" */
export function PasswordRequestsView() {
  const { data, loading, error, reload } = useFetch((s) => api.passwordRequests(), []);
  const dismiss = useAction((id) => api.dismissPasswordRequest(id));
  const list = data?.requests ?? [];
  return (
    <div>
      <p className="hint">طلبات أصحاب الحسابات اللي نسيوا كلمة المرور. تواصل مع صاحب الطلب، وبعدها أصدر له رمز دخول مؤقت.</p>
      {error && <p className="field-error">{error}</p>}
      {loading ? <p className="hint">جارٍ التحميل…</p> : !list.length ? (
        <p className="hint">ما فيش طلبات حاليًا</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>الوقت</th><th>الحساب</th><th>النوع</th><th>الرقم</th><th>السبب</th><th></th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td className="cell-muted">{new Date(r.created_at).toLocaleString("ar-LY")}</td>
                  <td className="cell-id">{r.account_name || "—"}</td>
                  <td className="cell-muted">{TYPE_LABEL[r.account_type] || r.account_type}</td>
                  <td className="cell-muted" dir="ltr">{r.phone}</td>
                  <td>{r.reason}</td>
                  <td>
                    <div className="decide-row">
                      {r.account_id && (
                        <IssueCodeButton accountType={r.account_type} id={r.account_id} name={r.account_name || r.phone}
                          requestId={r.id} onDone={reload} />
                      )}
                      <button className="invoice-action-btn" disabled={dismiss.pending}
                        onClick={() => dismiss.run(r.id).then(reload).catch(() => {})}>تجاهل</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
