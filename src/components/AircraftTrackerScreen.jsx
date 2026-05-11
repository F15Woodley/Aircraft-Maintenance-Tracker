import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function AircraftTrackerScreen() {
  const [aircraft, setAircraft] = useState([]);
  const [company, setCompany] = useState(null);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);

  const [form, setForm] = useState({
    tail_number: "",
    make: "",
    model: "",
    current_tach: "",
    total_time: "",
    flightaware_url: "",
  });

  const [discrepancyForm, setDiscrepancyForm] = useState({
    title: "",
    description: "",
    category: "other",
    severity: "yellow",
    is_grounding: false,
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

  async function loadDiscrepancies(aircraftId) {
    const { data, error } = await supabase
      .from("aircraft_discrepancies")
      .select("*")
      .eq("aircraft_id", aircraftId)
      .eq("status", "open")
      .order("reported_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setDiscrepancies(data || []);
  }

  useEffect(() => {
    loadCompany();
  }, []);

  async function addAircraft() {
    if (!company?.id) {
      alert("Company is still loading. Try again in a moment.");
      return;
    }

    const { error } = await supabase.from("aircraft").insert({
      company_id: company.id,
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

  function openAircraftDashboard(plane) {
    setSelectedAircraft(plane);
    loadDiscrepancies(plane.id);
  }

  async function addDiscrepancy() {
    if (!selectedAircraft || !company) return;

    const isRed =
      discrepancyForm.severity === "red" || discrepancyForm.is_grounding;

    const { error } = await supabase.from("aircraft_discrepancies").insert({
      company_id: company.id,
      aircraft_id: selectedAircraft.id,
      title: discrepancyForm.title.trim(),
      description: discrepancyForm.description.trim(),
      category: discrepancyForm.category,
      severity: isRed ? "red" : discrepancyForm.severity,
      is_grounding: discrepancyForm.is_grounding,
      status: "open",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setDiscrepancyForm({
      title: "",
      description: "",
      category: "other",
      severity: "yellow",
      is_grounding: false,
    });

    loadDiscrepancies(selectedAircraft.id);
  }

  async function closeDiscrepancy(id) {
    const { error } = await supabase
      .from("aircraft_discrepancies")
      .update({
        status: "closed",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadDiscrepancies(selectedAircraft.id);
  }

  const aircraftStatus = useMemo(() => {
    if (discrepancies.some((item) => item.is_grounding || item.severity === "red")) {
      return {
        color: "red",
        label: "Red",
        message: "Aircraft has a grounding or red discrepancy.",
      };
    }

    if (discrepancies.some((item) => item.severity === "yellow")) {
      return {
        color: "yellow",
        label: "Yellow",
        message: "Aircraft has open discrepancies or upcoming attention items.",
      };
    }

    return {
      color: "green",
      label: "Green",
      message: "All systems good. No open discrepancies.",
    };
  }, [discrepancies]);

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
          {!selectedAircraft ? (
            <>
              <section className="hero-grid">
                <div className="card">
                  <div className="eyebrow">AI MENTOR FOR SAFER FLYING</div>
                  <h1 className="hero-title">Aircraft Maintenance Tracker</h1>
                  <p className="hero-text">
                    Track aircraft status, tach time, total time, inspections,
                    oil changes, discrepancies, and FlightAware links from a
                    centralized fleet dashboard.
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
                  Select an aircraft to open its operational dashboard.
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

                        <button
                          className="link-button"
                          onClick={() => openAircraftDashboard(plane)}
                        >
                          Open Dashboard
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <button
                className="back-button"
                onClick={() => {
                  setSelectedAircraft(null);
                  setDiscrepancies([]);
                }}
              >
                ← Back to Fleet
              </button>

              <section className="hero-grid">
                <div className="card">
                  <div className="eyebrow">AIRCRAFT DASHBOARD</div>
                  <h1 className="hero-title">{selectedAircraft.tail_number}</h1>
                  <p className="hero-text">
                    {selectedAircraft.make} {selectedAircraft.model}
                  </p>

                  <div className="metrics dashboard-metrics">
                    <div>
                      <div className="metric-label">Current Tach</div>
                      <div className="metric-value">
                        {selectedAircraft.current_tach || 0}
                      </div>
                    </div>
                    <div>
                      <div className="metric-label">Total Time</div>
                      <div className="metric-value">
                        {selectedAircraft.total_time || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`card status-card ${aircraftStatus.color}`}>
                  <div className={`status-light ${aircraftStatus.color}`} />
                  <div className="status-title">{aircraftStatus.label}</div>
                  <div className="status-message">{aircraftStatus.message}</div>
                </div>
              </section>

              <section className="card">
                <h2 className="section-title">Status Drivers</h2>
                <p className="section-text">
                  These are the items forcing the aircraft status color.
                </p>

                {discrepancies.length === 0 ? (
                  <div className="empty-small">
                    No open discrepancies. Aircraft status is green unless
                    maintenance items later drive a warning.
                  </div>
                ) : (
                  <div className="status-list">
                    {discrepancies.map((item) => (
                      <div className="status-item" key={item.id}>
                        <div>
                          <div className={`severity-dot ${item.severity}`} />
                        </div>

                        <div className="status-item-body">
                          <div className="status-item-title">
                            {item.title || "Untitled Discrepancy"}
                          </div>

                          <div className="status-item-meta">
                            {item.category} · {item.is_grounding ? "Grounding" : "Non-grounding"}
                          </div>

                          <div className="status-item-description">
                            {item.description}
                          </div>
                        </div>

                        <button
                          className="small-button"
                          onClick={() => closeDiscrepancy(item.id)}
                        >
                          Close
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card">
                <h2 className="section-title">Add Discrepancy</h2>
                <p className="section-text">
                  Add freeform pilot or maintenance notes. Photo and voice
                  capture will be added next.
                </p>

                <div className="form-grid">
                  <input
                    className="input"
                    placeholder="Short Title"
                    value={discrepancyForm.title}
                    onChange={(e) =>
                      setDiscrepancyForm({
                        ...discrepancyForm,
                        title: e.target.value,
                      })
                    }
                  />

                  <select
                    className="input"
                    value={discrepancyForm.category}
                    onChange={(e) =>
                      setDiscrepancyForm({
                        ...discrepancyForm,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="airframe">Airframe</option>
                    <option value="avionics">Avionics</option>
                    <option value="electrical">Electrical</option>
                    <option value="engine">Engine</option>
                    <option value="propeller">Propeller</option>
                    <option value="landing_gear">Landing Gear</option>
                    <option value="environmental">Environmental / Cabin</option>
                    <option value="fuel">Fuel System</option>
                    <option value="hydraulic">Hydraulic System</option>
                    <option value="documentation">Documentation</option>
                    <option value="other">Other</option>
                  </select>

                  <select
                    className="input"
                    value={discrepancyForm.severity}
                    onChange={(e) =>
                      setDiscrepancyForm({
                        ...discrepancyForm,
                        severity: e.target.value,
                      })
                    }
                  >
                    <option value="yellow">Yellow — Non-grounding</option>
                    <option value="red">Red — Grounding / Do Not Fly</option>
                  </select>
                </div>

                <textarea
                  className="input textarea"
                  placeholder="Describe the discrepancy..."
                  value={discrepancyForm.description}
                  onChange={(e) =>
                    setDiscrepancyForm({
                      ...discrepancyForm,
                      description: e.target.value,
                    })
                  }
                />

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={discrepancyForm.is_grounding}
                    onChange={(e) =>
                      setDiscrepancyForm({
                        ...discrepancyForm,
                        is_grounding: e.target.checked,
                        severity: e.target.checked ? "red" : discrepancyForm.severity,
                      })
                    }
                  />
                  Grounding item / aircraft should not fly
                </label>

                <button className="primary-button" onClick={addDiscrepancy}>
                  Save Discrepancy
                </button>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
