import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const emptyComponent = { component_type: "engine", position: "", make: "", model: "", serial_number: "" };
const emptyFinding = { item_name: "", category: "maintenance", item_type: "inspection", interval_type: "hours", interval_hours: "", interval_months: "", source_title: "", source_url: "", applicability_text: "", component_id: "" };

export default function MaintenanceOnboarding({ aircraft, company, onApproved }) {
  const [components, setComponents] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [componentForm, setComponentForm] = useState(emptyComponent);
  const [findingForm, setFindingForm] = useState(emptyFinding);
  const [reviews, setReviews] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const [c, p] = await Promise.all([
      supabase.from("aircraft_components").select("*").eq("aircraft_id", aircraft.id).order("created_at"),
      supabase.from("maintenance_proposals").select("*").eq("aircraft_id", aircraft.id).order("created_at", { ascending: false }),
    ]);
    if (c.error || p.error) { setMessage(c.error?.message || p.error?.message); return; }
    setComponents(c.data || []);
    setProposals(p.data || []);
  }

  useEffect(() => {
    let live = true;
    Promise.all([
      supabase.from("aircraft_components").select("*").eq("aircraft_id", aircraft.id).order("created_at"),
      supabase.from("maintenance_proposals").select("*").eq("aircraft_id", aircraft.id).order("created_at", { ascending: false }),
    ]).then(([c, p]) => {
      if (!live) return;
      if (c.error || p.error) { setMessage(c.error?.message || p.error?.message); return; }
      setComponents(c.data || []); setProposals(p.data || []);
    });
    return () => { live = false; };
  }, [aircraft.id]);

  async function addComponent() {
    if (!company?.id || !componentForm.make.trim() || !componentForm.model.trim()) {
      setMessage("Component make and model are required."); return;
    }
    setBusy(true);
    const { error } = await supabase.from("aircraft_components").insert({
      ...componentForm, company_id: company.id, aircraft_id: aircraft.id,
      make: componentForm.make.trim(), model: componentForm.model.trim(),
      serial_number: componentForm.serial_number.trim(), position: componentForm.position.trim(),
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setComponentForm(emptyComponent); setMessage("Component saved."); refresh();
  }

  async function searchCatalog() {
    setBusy(true); setMessage("");
    const products = [
      { type: "airframe", component: null, make: aircraft.make, model: aircraft.model, serial: aircraft.serial_number },
      ...components.map((c) => ({ type: c.component_type, component: c.id, make: c.make, model: c.model, serial: c.serial_number })),
    ];
    const findings = [];
    for (const product of products) {
      const { data, error } = await supabase.from("requirements_catalog").select("*")
        .eq("product_type", product.type).ilike("make", product.make.trim()).ilike("model", product.model.trim());
      if (error) { setBusy(false); setMessage(error.message); return; }
      for (const row of data || []) {
        // Serial ranges cannot be safely ordered as arbitrary strings. Retain as candidate
        // and require a person to read the source's exact applicability statement.
        findings.push({ company_id: company.id, aircraft_id: aircraft.id,
          component_id: product.component, catalog_id: row.id, item_name: row.item_name,
          category: row.category, item_type: row.item_type, interval_type: row.interval_type,
          interval_hours: row.interval_hours, interval_months: row.interval_months,
          source_title: row.source_title, source_url: row.source_url,
          source_revision: row.source_revision, applicability_text:
            `${row.applicability_text}\nInstalled serial: ${product.serial || "not supplied"}; catalog serial range: ${row.serial_from || "unspecified"}–${row.serial_to || "unspecified"}.`,
        });
      }
    }
    const existing = new Set(proposals.filter((p) => p.catalog_id).map((p) => `${p.catalog_id}:${p.component_id || "airframe"}`));
    const newFindings = findings.filter((p) => !existing.has(`${p.catalog_id}:${p.component_id || "airframe"}`));
    const { error } = newFindings.length
      ? await supabase.from("maintenance_proposals").insert(newFindings)
      : { error: null };
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setMessage(`${newFindings.length} sourced candidates added. ${findings.length === 0 ? "No matching catalog entries yet; add a source finding below." : "Review each source and serial applicability."}`);
    refresh();
  }

  async function addFinding() {
    if (!findingForm.item_name.trim() || !findingForm.source_title.trim() || !findingForm.source_url.trim() || !findingForm.applicability_text.trim()) {
      setMessage("Item, source title, source URL, and applicability text are required."); return;
    }
    try { const url = new URL(findingForm.source_url); if (!["https:", "http:"].includes(url.protocol)) throw Error(); }
    catch { setMessage("Enter a valid source URL."); return; }
    setBusy(true);
    const { error } = await supabase.from("maintenance_proposals").insert({
      company_id: company.id, aircraft_id: aircraft.id,
      component_id: findingForm.component_id || null,
      item_name: findingForm.item_name.trim(), category: findingForm.category,
      item_type: findingForm.item_type, interval_type: findingForm.interval_type,
      interval_hours: findingForm.interval_hours ? Number(findingForm.interval_hours) : null,
      interval_months: findingForm.interval_months ? Number(findingForm.interval_months) : null,
      source_title: findingForm.source_title.trim(), source_url: findingForm.source_url.trim(),
      applicability_text: findingForm.applicability_text.trim(),
    });
    setBusy(false);
    if (error) { setMessage(error.message); return; }
    setFindingForm(emptyFinding); setMessage("Finding recorded for review."); refresh();
  }

  async function review(proposal, decision) {
    const values = reviews[proposal.id] || {};
    if (!values.reason?.trim()) { setMessage("Record the applicability decision and source review notes first."); return; }
    setBusy(true);
    if (decision === "approved") {
      const { error } = await supabase.rpc("approve_maintenance_proposal", {
        p_proposal_id: proposal.id, p_last_date: values.lastDate || null,
        p_last_tach: values.lastTach === "" || values.lastTach == null ? null : Number(values.lastTach),
        p_review_reason: values.reason.trim(),
      });
      setBusy(false);
      if (error) { setMessage(error.message); return; }
      onApproved?.(); setMessage("Approved requirement added to the active maintenance schedule.");
    } else {
      const { error } = await supabase.from("maintenance_proposals").update({
        review_status: "rejected", review_reason: values.reason.trim(), reviewed_at: new Date().toISOString(),
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      }).eq("id", proposal.id).eq("review_status", "candidate");
      setBusy(false);
      if (error) { setMessage(error.message); return; }
      setMessage("Finding retained as rejected with its reason.");
    }
    refresh();
  }

  const updateReview = (id, field, value) => setReviews((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  return <div className="collapsible-form">
    <h3>Requirements onboarding — {aircraft.tail_number}</h3>
    <p className="section-text">Airframe: {aircraft.make} {aircraft.model}, serial {aircraft.serial_number || "not entered"}. Enter installed configuration, find sourced candidates, and verify applicability before approving. A catalog match is not an AD compliance determination.</p>
    {message && <p role="status" className="section-text">{message}</p>}
    <h4>1. Installed components and modifications</h4>
    <div className="form-grid">
      <select className="input" value={componentForm.component_type} onChange={(e) => setComponentForm({ ...componentForm, component_type: e.target.value })}>
        <option value="engine">Engine</option><option value="propeller">Propeller</option><option value="appliance">Appliance</option><option value="stc">STC</option>
      </select>
      <input className="input" placeholder="Position (left/right/etc.)" value={componentForm.position} onChange={(e) => setComponentForm({ ...componentForm, position: e.target.value })} />
      <input className="input" placeholder="Manufacturer" value={componentForm.make} onChange={(e) => setComponentForm({ ...componentForm, make: e.target.value })} />
      <input className="input" placeholder="Exact model" value={componentForm.model} onChange={(e) => setComponentForm({ ...componentForm, model: e.target.value })} />
      <input className="input" placeholder="Serial number" value={componentForm.serial_number} onChange={(e) => setComponentForm({ ...componentForm, serial_number: e.target.value })} />
    </div>
    <button className="secondary-button" disabled={busy} onClick={addComponent}>Save component</button>
    {components.map((c) => <p className="section-text" key={c.id}>{c.component_type} {c.position}: {c.make} {c.model} · S/N {c.serial_number || "unentered"}</p>)}
    <h4>2. Research candidates</h4>
    <button className="secondary-button" disabled={busy || !company?.id} onClick={searchCatalog}>Find matching catalog entries</button>
    <p className="section-text">The catalog must be populated with vetted, current source records before automated matches appear. Exact applicability and recurring intervals still require review.</p>
    <h4>Add a source finding</h4>
    <div className="form-grid">
      <input className="input" placeholder="Requirement title" value={findingForm.item_name} onChange={(e) => setFindingForm({ ...findingForm, item_name: e.target.value })} />
      <select className="input" value={findingForm.component_id} onChange={(e) => setFindingForm({ ...findingForm, component_id: e.target.value })}><option value="">Airframe</option>{components.map((c) => <option key={c.id} value={c.id}>{c.component_type} {c.position} · {c.model}</option>)}</select>
      <select className="input" value={findingForm.category} onChange={(e) => setFindingForm({ ...findingForm, category: e.target.value })}><option value="maintenance">Maintenance</option><option value="inspection">Inspection</option><option value="ad">AD</option></select>
      <select className="input" value={findingForm.interval_type} onChange={(e) => setFindingForm({ ...findingForm, interval_type: e.target.value })}><option value="hours">Hours</option><option value="months">Months</option><option value="both">Both</option></select>
      <input className="input" type="number" min="0" placeholder="Interval hours (if verified)" value={findingForm.interval_hours} onChange={(e) => setFindingForm({ ...findingForm, interval_hours: e.target.value })} />
      <input className="input" type="number" min="0" placeholder="Interval months (if verified)" value={findingForm.interval_months} onChange={(e) => setFindingForm({ ...findingForm, interval_months: e.target.value })} />
      <input className="input" placeholder="Source document and revision" value={findingForm.source_title} onChange={(e) => setFindingForm({ ...findingForm, source_title: e.target.value })} />
      <input className="input" type="url" placeholder="Source URL" value={findingForm.source_url} onChange={(e) => setFindingForm({ ...findingForm, source_url: e.target.value })} />
      <textarea className="input" placeholder="Applicability statement, including serial range" value={findingForm.applicability_text} onChange={(e) => setFindingForm({ ...findingForm, applicability_text: e.target.value })} />
    </div>
    <button className="secondary-button" disabled={busy} onClick={addFinding}>Add candidate</button>
    <h4>3. Review and activate</h4>
    {proposals.length === 0 && <p className="section-text">No candidates yet.</p>}
    {proposals.map((p) => <div className="card" key={p.id}>
      <h4>{p.item_name} · {p.review_status}</h4>
      <p className="section-text">{p.applicability_text}</p>
      <p className="section-text">Interval: {p.interval_hours ? `${p.interval_hours} hours` : "hours unverified"}{p.interval_type === "both" ? " and " : ""}{p.interval_type !== "hours" ? (p.interval_months ? `${p.interval_months} months` : "months unverified") : ""}</p>
      <a href={p.source_url} target="_blank" rel="noopener noreferrer">{p.source_title} ↗</a>
      {p.review_status === "candidate" && <div className="form-grid">
        <textarea className="input" placeholder="Reviewer applicability decision, evidence, and method" value={reviews[p.id]?.reason || ""} onChange={(e) => updateReview(p.id, "reason", e.target.value)} />
        <input className="input" type="date" aria-label="Last completed date" value={reviews[p.id]?.lastDate || ""} onChange={(e) => updateReview(p.id, "lastDate", e.target.value)} />
        <input className="input" type="number" aria-label="Last completed tach" placeholder="Last completed tach" value={reviews[p.id]?.lastTach || ""} onChange={(e) => updateReview(p.id, "lastTach", e.target.value)} />
        <button className="primary-button" disabled={busy} onClick={() => review(p, "approved")}>Approve and schedule</button>
        <button className="secondary-button" disabled={busy} onClick={() => review(p, "rejected")}>Not applicable / reject</button>
      </div>}
      {p.review_status !== "candidate" && <p className="section-text">Review: {p.review_reason}</p>}
    </div>)}
  </div>;
}
