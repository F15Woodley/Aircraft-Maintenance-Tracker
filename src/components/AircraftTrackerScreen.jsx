import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function AircraftTrackerScreen() {
  const [aircraft, setAircraft] = useState([]);
  const [company, setCompany] = useState(null);

  const [form, setForm] = useState({
    tail_number: "",
    make: "",
    model: "",
    current_tach: "",
    total_time: "",
    flightaware_url: "",
  });

async function loadCompany() {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setCompany(data);
  loadAircraft(data.id);
}
  
async function loadAircraft(companyId) {
  const { data, error } = await supabase
    .from("aircraft")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  setAircraft(data || []);
}

useEffect(() => {
  loadCompany();
}, []);

  async function addAircraft() {
    const { error } = await supabase.from("aircraft").insert({
      company_id: company?.id,
      tail_number: form.tail_number.trim().toUpperCase(),
      make: form.make.trim(),
      model: form.model.trim(),
      current_tach: Number(form.current_tach || 0),
      total_time: Number(form.total_time || 0),
      flightaware_url: form.flightaware_url.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      tail_number: "",
      make: "",
      model: "",
      current_tach: "",
      total_time: "",
      flightaware_url: "",
    });

    loadAircraft(company.id);
  }

  <div className="company-name">
  {company?.name || "Aircraft Maintenance Tracker"}
</div>

  return (
    <div className="app-shell">
      <div className="dashboard">
        <div className="topbar">
  <div className="company-name">
    {company?.name || "Aircraft Maintenance Tracker"}
  </div>

  <div className="topbar-actions">
    <button className="nav-button">Fleet Ops</button>
    <button className="nav-button">Maintenance</button>
  </div>
</div>

        <main className="content">
          <section className="hero-grid">
            <div className="card">
              <div className="eyebrow">AI MENTOR FOR SAFER FLYING</div>
              <h1 className="hero-title">Aircraft Maintenance Tracker</h1>
              <p className="hero-text">
                Track aircraft status, tach time, total time, inspections, oil
                changes, and FlightAware links from a centralized fleet dashboard.
              </p>
            </div>

            <div className="card">
              <div className="stat-number">{aircraft.length}</div>
              <div className="stat-label">Aircraft in Fleet</div>
              <div className="stat-divider" />
              <div className="stat-number green">{aircraft.length}</div>
              <div className="stat-label">Currently Active</div>
            </div>
          </section>

          <section className="card">
            <h2 className="section-title">Add Aircraft</h2>
            <p className="section-text">
              Create a new aircraft record for this company.
            </p>

            <div className="form-grid">
              <input className="input" placeholder="Tail Number" value={form.tail_number} onChange={(e) => setForm({ ...form, tail_number: e.target.value })} />
              <input className="input" placeholder="Make" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
              <input className="input" placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              <input className="input" placeholder="Current Tach" value={form.current_tach} onChange={(e) => setForm({ ...form, current_tach: e.target.value })} />
              <input className="input" placeholder="Total Time" value={form.total_time} onChange={(e) => setForm({ ...form, total_time: e.target.value })} />
              <input className="input" placeholder="FlightAware URL" value={form.flightaware_url} onChange={(e) => setForm({ ...form, flightaware_url: e.target.value })} />
            </div>

            <button className="primary-button" onClick={addAircraft}>
              Add Aircraft
            </button>
          </section>

          <section className="fleet-section">
            <h2 className="section-title">Fleet</h2>
            <p className="section-text">
              Aircraft currently registered in this company workspace.
            </p>

            {aircraft.length === 0 ? (
              <div className="card empty-state">No aircraft added yet.</div>
            ) : (
              <div className="aircraft-row">
                {aircraft.map((plane) => (
                  <div className="card aircraft-card" key={plane.id}>
                    <div>
                      <div className="aircraft-title">{plane.tail_number}</div>
                      <div className="aircraft-subtitle">
                        {plane.make} {plane.model}
                      </div>
                    </div>

                    <div className="metrics">
                      <div>
                        <div className="metric-label">Current Tach</div>
                        <div className="metric-value">{plane.current_tach || 0}</div>
                      </div>
                      <div>
                        <div className="metric-label">Total Time</div>
                        <div className="metric-value">{plane.total_time || 0}</div>
                      </div>
                    </div>

                    {plane.flightaware_url && (
                      <a className="link-button" href={plane.flightaware_url} target="_blank" rel="noreferrer">
                        FlightAware
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
