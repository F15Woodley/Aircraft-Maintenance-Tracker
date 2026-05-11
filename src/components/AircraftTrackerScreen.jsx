import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function AircraftTrackerScreen() {
  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    tail_number: "",
    make: "",
    model: "",
    current_tach: "",
    total_time: "",
    flightaware_url: "",
  });

  async function loadAircraft() {
    setLoading(true);

    const { data, error } = await supabase
      .from("aircraft")
      .select("*")
      .order("tail_number");

    if (error) {
      alert(error.message);
    } else {
      setAircraft(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAircraft();
  }, []);

  async function handleAddAircraft(e) {
    e.preventDefault();

    const payload = {
      tail_number: form.tail_number.trim().toUpperCase(),
      make: form.make.trim(),
      model: form.model.trim(),
      current_tach: Number(form.current_tach || 0),
      total_time: Number(form.total_time || 0),
      flightaware_url: form.flightaware_url.trim(),
    };

    const { error } = await supabase.from("aircraft").insert(payload);

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

    loadAircraft();
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this aircraft?")) return;

    const { error } = await supabase.from("aircraft").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadAircraft();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" />

            <div>
              <div className="brand-title">
                Sky <span>Sensei</span>
              </div>
              <div className="brand-subtitle">
                Aircraft Intelligence Platform
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="pill">Fleet Ops</div>
            <div className="pill">Maintenance</div>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="hero">
          <div className="hero-card">
            <div className="hero-eyebrow">AI Mentor for Safer Flying</div>
            <h1>Aircraft Maintenance Tracker</h1>
            <p>
              Track aircraft status, tach time, total time, inspections,
              oil changes, and FlightAware links from a centralized fleet
              dashboard.
            </p>
          </div>

          <div className="card status-panel">
            <div className="status-number">{aircraft.length}</div>
            <div className="status-label">Aircraft in Fleet</div>

            <div style={{ marginTop: 22 }}>
              <div className="status-number status-good">
                {aircraft.length}
              </div>
              <div className="status-label">Currently Active</div>
            </div>
          </div>
        </section>

        <section className="card form-card">
          <div className="section-heading">
            <div>
              <h2>Add Aircraft</h2>
              <p>Create a new aircraft record for this company.</p>
            </div>
          </div>

          <form onSubmit={handleAddAircraft} className="form-grid">
            <input
              className="input"
              placeholder="Tail Number"
              value={form.tail_number}
              onChange={(e) =>
                setForm({ ...form, tail_number: e.target.value })
              }
              required
            />

            <input
              className="input"
              placeholder="Make"
              value={form.make}
              onChange={(e) => setForm({ ...form, make: e.target.value })}
            />

            <input
              className="input"
              placeholder="Model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />

            <input
              className="input"
              placeholder="Current Tach"
              type="number"
              step="0.1"
              value={form.current_tach}
              onChange={(e) =>
                setForm({ ...form, current_tach: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="Total Time"
              type="number"
              step="0.1"
              value={form.total_time}
              onChange={(e) =>
                setForm({ ...form, total_time: e.target.value })
              }
            />

            <input
              className="input"
              placeholder="FlightAware URL"
              value={form.flightaware_url}
              onChange={(e) =>
                setForm({ ...form, flightaware_url: e.target.value })
              }
            />

            <button className="primary-button" type="submit">
              Add Aircraft
            </button>
          </form>
        </section>

        <section style={{ marginTop: 26 }}>
          <div className="section-heading">
            <div>
              <h2>Fleet</h2>
              <p>Aircraft currently registered in this company workspace.</p>
            </div>
          </div>

          {loading ? (
            <div className="card empty-state">Loading aircraft...</div>
          ) : aircraft.length === 0 ? (
            <div className="card empty-state">No aircraft added yet.</div>
          ) : (
            <div className="grid fleet-grid">
              {aircraft.map((plane) => (
                <div key={plane.id} className="card aircraft-card">
                  <div className="aircraft-content">
                    <div className="aircraft-top">
                      <div>
                        <h3>{plane.tail_number}</h3>
                        <div className="aircraft-type">
                          {plane.make} {plane.model}
                        </div>
                      </div>

                      <div className="status-pill">
                        <span className="status-dot" />
                        Active
                      </div>
                    </div>

                    <div className="metric-row">
                      <div className="metric">
                        <div className="metric-label">Current Tach</div>
                        <div className="metric-value">
                          {Number(plane.current_tach || 0).toFixed(1)}
                        </div>
                      </div>

                      <div className="metric">
                        <div className="metric-label">Total Time</div>
                        <div className="metric-value">
                          {Number(plane.total_time || 0).toFixed(1)}
                        </div>
                      </div>
                    </div>

                    <div className="card-actions">
                      {plane.flightaware_url ? (
                        <a
                          href={plane.flightaware_url}
                          target="_blank"
                          rel="noreferrer"
                          className="link-button"
                        >
                          Open FlightAware
                        </a>
                      ) : (
                        <span className="status-label">
                          No FlightAware link
                        </span>
                      )}

                      <button
                        className="danger-button"
                        onClick={() => handleDelete(plane.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
