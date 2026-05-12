import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function AircraftTrackerScreen() {
  const [aircraft, setAircraft] = useState([]);
  const [company, setCompany] = useState(null);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);

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

  const [maintenanceForm, setMaintenanceForm] = useState({
    item_name: "",
    category: "maintenance",
    interval_type: "hours",
    last_completed_date: "",
    last_completed_tach: "",
    interval_hours: "",
    interval_months: "",
    due_tach: "",
    due_date: "",
    warning_percent: "5",
    notes: "",
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

  async function loadMaintenanceEvents(aircraftId) {
    const { data, error } = await supabase
      .from("aircraft_maintenance_events")
      .select("*")
      .eq("aircraft_id", aircraftId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setMaintenanceEvents(data || []);
  }

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadDocuments(aircraftId) {
  const { data, error } = await supabase
    .from("aircraft_documents")
    .select("*")
    .eq("aircraft_id", aircraftId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  setDocuments(data || []);
}

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
  loadMaintenanceEvents(plane.id);
  loadDocuments(plane.id);
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

  async function addMaintenanceEvent() {
    if (!selectedAircraft || !company) return;

    const { error } = await supabase.from("aircraft_maintenance_events").insert({
      company_id: company.id,
      aircraft_id: selectedAircraft.id,
      item_name: maintenanceForm.item_name.trim(),
      category: maintenanceForm.category,
      interval_type: maintenanceForm.interval_type,
      last_completed_date: maintenanceForm.last_completed_date || null,
      last_completed_tach: maintenanceForm.last_completed_tach
        ? Number(maintenanceForm.last_completed_tach)
        : null,
      interval_hours: maintenanceForm.interval_hours
        ? Number(maintenanceForm.interval_hours)
        : null,
      interval_months: maintenanceForm.interval_months
        ? Number(maintenanceForm.interval_months)
        : null,
      due_tach: maintenanceForm.due_tach
        ? Number(maintenanceForm.due_tach)
        : null,
      due_date: maintenanceForm.due_date || null,
      warning_percent: Number(maintenanceForm.warning_percent || 5),
      notes: maintenanceForm.notes.trim(),
      status: "active",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMaintenanceForm({
      item_name: "",
      category: "maintenance",
      interval_type: "hours",
      last_completed_date: "",
      last_completed_tach: "",
      interval_hours: "",
      interval_months: "",
      due_tach: "",
      due_date: "",
      warning_percent: "5",
      notes: "",
    });

    loadMaintenanceEvents(selectedAircraft.id);
  }

  async function closeMaintenanceEvent(id) {
    const { error } = await supabase
      .from("aircraft_maintenance_events")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadMaintenanceEvents(selectedAircraft.id);
  }

  function getMaintenanceStatus(item) {
    const currentTach = Number(selectedAircraft?.current_tach || 0);

    if (item.due_tach && currentTach >= Number(item.due_tach)) {
      return {
        color: "red",
        label: "Overdue",
        reason: `${item.item_name} overdue by ${(
          currentTach - Number(item.due_tach)
        ).toFixed(1)} hours`,
      };
    }

    if (item.due_date) {
      const today = new Date();
      const dueDate = new Date(item.due_date);
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      if (today > dueDate) {
        return {
          color: "red",
          label: "Overdue",
          reason: `${item.item_name} overdue by date`,
        };
      }

      const daysRemaining = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining <= 30) {
        return {
          color: "yellow",
          label: "Upcoming",
          reason: `${item.item_name} due in ${daysRemaining} days`,
        };
      }
    }

    if (item.due_tach && item.interval_hours) {
      const hoursRemaining = Number(item.due_tach) - currentTach;
      const warningHours =
        Number(item.interval_hours) * (Number(item.warning_percent || 5) / 100);

      if (hoursRemaining <= warningHours) {
        return {
          color: "yellow",
          label: "Upcoming",
          reason: `${item.item_name} due in ${hoursRemaining.toFixed(1)} hours`,
        };
      }
    }

    return {
      color: "green",
      label: "Good",
      reason: `${item.item_name} is not due`,
    };
  }

  const maintenanceDrivers = useMemo(() => {
    return maintenanceEvents
      .map((item) => ({
        ...item,
        computed: getMaintenanceStatus(item),
      }))
      .filter((item) => item.computed.color !== "green");
  }, [maintenanceEvents, selectedAircraft]);

  const aircraftStatus = useMemo(() => {
    if (
      discrepancies.some((item) => item.is_grounding || item.severity === "red")
    ) {
      return {
        color: "red",
        label: "Red",
        message:
          "Aircraft has a grounding discrepancy or is overdue for service/inspection.",
      };
    }

    if (maintenanceDrivers.some((item) => item.computed.color === "red")) {
      return {
        color: "red",
        label: "Red",
        message:
          "Aircraft has a grounding discrepancy or is overdue for service/inspection.",
      };
    }

    if (discrepancies.some((item) => item.severity === "yellow")) {
      return {
        color: "yellow",
        label: "Yellow",
        message: "Aircraft has open discrepancies or upcoming attention items.",
      };
    }

    if (maintenanceDrivers.some((item) => item.computed.color === "yellow")) {
      return {
        color: "yellow",
        label: "Yellow",
        message: "Aircraft has open discrepancies or upcoming attention items.",
      };
    }

    return {
      color: "green",
      label: "Green",
      message: "All systems good. No open discrepancies or upcoming maintenance.",
    };
  }, [discrepancies, maintenanceDrivers]);


  async function uploadAircraftDocument(event) {
  const file = event.target.files?.[0];

  if (!file || !selectedAircraft || !company) return;

  try {
    setUploadingDocument(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${selectedAircraft.tail_number}_${Date.now()}.${fileExt}`;

    const filePath = `${company.id}/${selectedAircraft.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("aircraft-documents")
      .upload(filePath, file);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { error: dbError } = await supabase
      .from("aircraft_documents")
      .insert({
        company_id: company.id,
        aircraft_id: selectedAircraft.id,
        title: file.name,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        document_type: "general",
        related_type: "aircraft",
      });

    if (dbError) {
      alert(dbError.message);
      return;
    }

    loadDocuments(selectedAircraft.id);
  } finally {
    setUploadingDocument(false);
  }
}

  function showDiscrepancyDetails(item) {
    alert(
      `${item.title || "Untitled Discrepancy"}\n\n` +
        `Category: ${item.category}\n` +
        `Severity: ${item.severity}\n` +
        `Grounding: ${item.is_grounding ? "Yes" : "No"}\n\n` +
        `${item.description || "No description provided."}`
    );
  }

  function editDiscrepancy(item) {
    setDiscrepancyForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "other",
      severity: item.severity || "yellow",
      is_grounding: item.is_grounding || false,
    });

    alert(
      "Discrepancy loaded into the form below. Edit it, then save as a new entry for now."
    );
  }

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
                  setMaintenanceEvents([]);
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
                  <div className={`status-title ${aircraftStatus.color}`}>
                    {aircraftStatus.label}
                  </div>
                  <div className="status-message">{aircraftStatus.message}</div>
                </div>
              </section>

              <section className="card">
                <h2 className="section-title">Status Drivers</h2>
                <p className="section-text">
                  These are the items forcing the aircraft status color.
                </p>

                {discrepancies.length === 0 && maintenanceDrivers.length === 0 ? (
                  <div className="empty-small">
                    No open discrepancies or upcoming maintenance items.
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
                            Discrepancy · {item.category} ·{" "}
                            {item.is_grounding ? "Grounding" : "Non-grounding"}
                          </div>

                          <div className="status-item-description">
                            {item.description}
                          </div>
                        </div>

                        <div className="status-actions">
                          <button className="small-button" onClick={() => showDiscrepancyDetails(item)}>
                            Details
                          </button>
                          <button className="small-button edit-button" onClick={() => editDiscrepancy(item)}>
                            Edit
                          </button>
                          <button className="small-button close-button" onClick={() => closeDiscrepancy(item.id)}>
                            Close
                          </button>
                        </div>
                      </div>
                    ))}

                    {maintenanceDrivers.map((item) => (
                      <div className="status-item" key={item.id}>
                        <div>
                          <div className={`severity-dot ${item.computed.color}`} />
                        </div>

                        <div className="status-item-body">
                          <div className="status-item-title">{item.item_name}</div>
                          <div className="status-item-meta">
                            Maintenance · {item.category} · {item.computed.label}
                          </div>
                          <div className="status-item-description">
                            {item.computed.reason}
                          </div>
                        </div>

                        <div className="status-actions">
                          <button
                            className="small-button close-button"
                            onClick={() => closeMaintenanceEvent(item.id)}
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card">
                <h2 className="section-title">Add Maintenance Event</h2>
                <p className="section-text">
                  Track recurring or one-time maintenance requirements such as oil
                  changes, annual inspections, IFR/static checks, ELT batteries,
                  engine events, or propeller events.
                </p>

           <div className="maintenance-grid">
  <input className="input" placeholder="Item Name, e.g. Oil Change" value={maintenanceForm.item_name} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, item_name: e.target.value })} />

  <select className="input" value={maintenanceForm.category} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, category: e.target.value })}>
    <option value="maintenance">Maintenance</option>
    <option value="inspection">Inspection</option>
    <option value="certification">Certification</option>
    <option value="engine">Engine</option>
    <option value="propeller">Propeller</option>
    <option value="avionics">Avionics</option>
    <option value="other">Other</option>
  </select>

  <select className="input" value={maintenanceForm.interval_type} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, interval_type: e.target.value })}>
    <option value="hours">Hours</option>
    <option value="months">Months / Date</option>
    <option value="both">Hours and Date</option>
  </select>

  <div>
    <div className="field-label">Last Completed Date</div>
    <input className="input" type="date" value={maintenanceForm.last_completed_date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, last_completed_date: e.target.value })} />
  </div>

  <div>
    <div className="field-label">Last Completed Tach</div>
    <input className="input" placeholder="e.g. 3673" value={maintenanceForm.last_completed_tach} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, last_completed_tach: e.target.value })} />
  </div>

  <div>
    <div className="field-label">Interval Hours</div>
    <input className="input" placeholder="e.g. 50" value={maintenanceForm.interval_hours} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, interval_hours: e.target.value })} />
  </div>

  <div>
    <div className="field-label">Interval Months</div>
    <input className="input" placeholder="e.g. 12" value={maintenanceForm.interval_months} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, interval_months: e.target.value })} />
  </div>

  <div>
    <div className="field-label">Due Tach</div>
    <input className="input" placeholder="Auto or manual" value={maintenanceForm.due_tach} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, due_tach: e.target.value })} />
  </div>

  <div>
    <div className="field-label">Due Date</div>
    <input className="input" type="date" value={maintenanceForm.due_date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, due_date: e.target.value })} />
  </div>

  <div>
    <div className="field-label">Yellow Warning Threshold (%)</div>
    <input className="input" placeholder="e.g. 5" value={maintenanceForm.warning_percent} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, warning_percent: e.target.value })} />
  </div>
</div>
                <textarea
                  className="input textarea"
                  placeholder="Maintenance notes..."
                  value={maintenanceForm.notes}
                  onChange={(e) =>
                    setMaintenanceForm({
                      ...maintenanceForm,
                      notes: e.target.value,
                    })
                  }
                />

                <button className="primary-button" onClick={addMaintenanceEvent}>
                  Save Maintenance Event
                </button>
              </section>

              <section className="card">
  <h2 className="section-title">Aircraft Documents</h2>

  <p className="section-text">
    Upload annual inspections, invoices, discrepancy photos,
    registrations, logbook images, and maintenance records.
  </p>

  <div className="document-upload-row">
    <label className="upload-button">
      {uploadingDocument ? "Uploading..." : "Upload Document"}

      <input
        type="file"
        hidden
        onChange={uploadAircraftDocument}
      />
    </label>
  </div>

  {documents.length === 0 ? (
    <div className="empty-small">
      No aircraft documents uploaded yet.
    </div>
  ) : (
    <div className="document-list">
      {documents.map((doc) => {
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("aircraft-documents")
          .getPublicUrl(doc.file_path);

        return (
          <div className="document-item" key={doc.id}>
            <div>
              <div className="document-title">{doc.title}</div>

              <div className="document-meta">
                {doc.file_type || "Unknown type"}
              </div>
            </div>

            <a
              className="small-button"
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </div>
        );
      })}
    </div>
  )}
</section>

              <section className="card">
                <h2 className="section-title">Add Discrepancy</h2>
                <p className="section-text">
                  Add freeform pilot or maintenance notes. Photo and voice capture
                  will be added next.
                </p>

                <div className="form-grid">
                  <input className="input" placeholder="Short Title" value={discrepancyForm.title} onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, title: e.target.value })} />

                  <select className="input" value={discrepancyForm.category} onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, category: e.target.value })}>
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

                  <select className="input" value={discrepancyForm.severity} onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, severity: e.target.value })}>
                    <option value="yellow">Yellow — Non-grounding</option>
                    <option value="red">Red — Grounding / Do Not Fly</option>
                  </select>
                </div>

                <textarea className="input textarea" placeholder="Describe the discrepancy..." value={discrepancyForm.description} onChange={(e) => setDiscrepancyForm({ ...discrepancyForm, description: e.target.value })} />

                <div className="discrepancy-actions">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={discrepancyForm.is_grounding}
                      onChange={(e) =>
                        setDiscrepancyForm({
                          ...discrepancyForm,
                          is_grounding: e.target.checked,
                          severity: e.target.checked
                            ? "red"
                            : discrepancyForm.severity,
                        })
                      }
                    />
                    Grounding item / aircraft should not fly
                  </label>

                  <button className="primary-button" onClick={addDiscrepancy}>
                    Save Discrepancy
                  </button>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
