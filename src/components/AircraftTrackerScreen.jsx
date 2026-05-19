import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import "../App.css";

export default function AircraftTrackerScreen() {
  const [aircraft, setAircraft] = useState([]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [company, setCompany] = useState(null);
  const [selectedAircraft, setSelectedAircraft] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [maintenanceEvents, setMaintenanceEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showDiscrepancyForm, setShowDiscrepancyForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [showAircraftForm, setShowAircraftForm] = useState(false);
  const [flightLogs, setFlightLogs] = useState([]);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [savingFlight, setSavingFlight] = useState(false);
  const [selectedFlightLog, setSelectedFlightLog] = useState(null);
  const [editingFlightId, setEditingFlightId] = useState(null);
  const [showFlightDetails, setShowFlightDetails] = useState(false);
  const [addFlightDiscrepancy, setAddFlightDiscrepancy] = useState(false);
  const [aircraftToDelete, setAircraftToDelete] = useState("");

  const [flightDiscrepancyForm, setFlightDiscrepancyForm] = useState({
    title: "",
    description: "",
    category: "other",
    severity: "yellow",
    is_grounding: false,
  });
  
  const [flightForm, setFlightForm] = useState({
    pilot: "",
    copilot: "",
    flight_date: "",
    departure: "",
    destination: "",
    hobbs_out: "",
    hobbs_in: "",
    tach_out: "",
    tach_in: "",
    flight_time: "",
    landings: "",
    notes: "",
  });

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
    flight_log_id: null,
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

async function loadSession() {
  const { data } = await supabase.auth.getSession();

  setSession(data.session);

  if (data.session?.user?.id) {
    loadProfile(data.session.user.id);
  }
}

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, companies(*)")
    .eq("id", userId)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  setProfile(data);
  setCompany(data.companies);
  loadAircraft(data.company_id);
}

async function loadFlightLogs(aircraftId) {
  if (!aircraftId) return;

  const { data, error } = await supabase
    .from("flight_logs")
    .select(`
      *,
      aircraft_discrepancies (
        id,
        severity,
        is_grounding,
        status
      )
    `)
    .eq("aircraft_id", aircraftId)
    .order("flight_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading flight logs:", error);
    return;
  }

  setFlightLogs(data || []);
}

async function signIn() {
  const { error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password: authPassword,
  });

  if (error) {
    alert(error.message);
    return;
  }

  loadSession();
}

async function signOut() {
  await supabase.auth.signOut();
  setSession(null);
  setProfile(null);
  setCompany(null);
  setAircraft([]);
  setSelectedAircraft(null);
}
  
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

function isAdmin() {
  return profile?.role === "admin";
}

function isMaintenance() {
  return profile?.role === "maintenance";
}

function isPilot() {
  return profile?.role === "pilot";
}

function canAddDiscrepancy() {
  return isAdmin() || isMaintenance() || isPilot();
}

function canCloseDiscrepancy() {
  return isAdmin() || isMaintenance();
}

function canManageMaintenance() {
  return isAdmin() || isMaintenance();
}

function canUploadDocuments() {
  return isAdmin() || isMaintenance() || isPilot();
}

function openFlightDetails(flight) {
  setSelectedFlightLog(flight);
  setEditingFlightId(null);
  setShowFlightDetails(true);
}

  function startEditFlight(flight) {
  setFlightForm({
    pilot: flight.pilot || "",
    copilot: flight.copilot || "",
    flight_date: flight.flight_date || "",
    departure: flight.departure || "",
    destination: flight.destination || "",
    hobbs_out: flight.hobbs_out || "",
    hobbs_in: flight.hobbs_in || "",
    tach_out: flight.tach_out || "",
    tach_in: flight.tach_in || "",
    flight_time: flight.flight_time || "",
    landings: flight.landings || "",
    notes: flight.notes || "",
  });

  setEditingFlightId(flight.id);
  setShowFlightDetails(false);
  setShowFlightForm(true);
}
  
  function getFlightStatusColor(flight) {
  const linkedDiscrepancies =
    flight.aircraft_discrepancies?.filter((item) => item.status === "open") || [];

  if (
    linkedDiscrepancies.some(
      (item) => item.is_grounding || item.severity === "red"
    )
  ) {
    return "red";
  }

  if (linkedDiscrepancies.length > 0) {
    return "yellow";
  }

  return "green";
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
  loadSession();
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



function openAircraftDashboard(plane) {
  setSelectedAircraft(plane);
  loadDiscrepancies(plane.id);
  loadMaintenanceEvents(plane.id);
  loadDocuments(plane.id);
  loadFlightLogs(plane.id)
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
    setShowAircraftForm(false);
  }

 async function deleteAircraft() {
  if (!aircraftToDelete) {
    alert("Select an aircraft to delete.");
    return;
  }

  const plane = aircraft.find((item) => item.id === aircraftToDelete);

  const confirmed = window.confirm(
    `Delete ${plane?.tail_number || "this aircraft"}?\n\nThis will permanently delete the aircraft and related records.`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("aircraft")
    .delete()
    .eq("id", aircraftToDelete);

  if (error) {
    alert(error.message);
    return;
  }

  setAircraftToDelete("");
  loadAircraft(company.id);
} 
  
  async function addDiscrepancy() {
    if (!selectedAircraft || !company) return;

    const isRed =
      discrepancyForm.severity === "red" || discrepancyForm.is_grounding;

const { error } = await supabase.from("aircraft_discrepancies").insert({
  company_id: company.id,
  aircraft_id: selectedAircraft.id,
  flight_log_id: discrepancyForm.flight_log_id || null,
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
      flight_log_id: null,
    });

    loadDiscrepancies(selectedAircraft.id);
    setShowDiscrepancyForm(false);
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
    setShowMaintenanceForm(false);
  }

async function closeMaintenanceEvent(id) {
  const completedDate = window.prompt(
    "Enter completed date as YYYY-MM-DD, or leave blank for today:",
    new Date().toISOString().slice(0, 10)
  );

  if (completedDate === null) return;

  const completedTach = window.prompt(
    "Enter completed tach time, or leave blank if not applicable:",
    selectedAircraft?.current_tach || ""
  );

  if (completedTach === null) return;

  const { error } = await supabase
    .from("aircraft_maintenance_events")
    .update({
      status: "completed",
      last_completed_date: completedDate || new Date().toISOString().slice(0, 10),
      last_completed_tach: completedTach ? Number(completedTach) : null,
    })
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
          "Aircraft has grounding discrepancy or overdue maintenance.",
      };
    }

    if (maintenanceDrivers.some((item) => item.computed.color === "red")) {
      return {
        color: "red",
        label: "Red",
        message:
          "Aircraft grounded or maintenance overdue.",
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

async function saveFlightLog() {
  if (!selectedAircraft?.id) {
    alert("No aircraft selected.");
    return;
  }

  if (!flightForm.flight_date) {
    alert("Flight date is required.");
    return;
  }

  setSavingFlight(true);

  const hobbsOut = flightForm.hobbs_out ? Number(flightForm.hobbs_out) : null;
  const hobbsIn = flightForm.hobbs_in ? Number(flightForm.hobbs_in) : null;
  const tachOut = flightForm.tach_out ? Number(flightForm.tach_out) : null;
  const tachIn = flightForm.tach_in ? Number(flightForm.tach_in) : null;

  const calculatedFlightTime =
    hobbsOut !== null && hobbsIn !== null
      ? hobbsIn - hobbsOut
      : tachOut !== null && tachIn !== null
      ? tachIn - tachOut
      : flightForm.flight_time
      ? Number(flightForm.flight_time)
      : null;

  const { data: newFlight, error } = await supabase
    .from("flight_logs")
    .insert([
      {
        aircraft_id: selectedAircraft.id,
        pilot: flightForm.pilot || null,
        copilot: flightForm.copilot?.trim() ? flightForm.copilot.trim() : null,
        flight_date: flightForm.flight_date,
        departure: flightForm.departure || null,
        destination: flightForm.destination || null,
        hobbs_out: hobbsOut,
        hobbs_in: hobbsIn,
        tach_out: tachOut,
        tach_in: tachIn,
        flight_time: calculatedFlightTime,
        landings: flightForm.landings ? Number(flightForm.landings) : 0,
        notes: flightForm.notes || null,
      },
    ])
    .select()
    .single();

  if (error) {
    setSavingFlight(false);
    alert(error.message);
    return;
  }

  if (addFlightDiscrepancy && flightDiscrepancyForm.title.trim()) {
    const isRed =
      flightDiscrepancyForm.severity === "red" ||
      flightDiscrepancyForm.is_grounding;

    const { error: discrepancyError } = await supabase
      .from("aircraft_discrepancies")
      .insert({
        company_id: company.id,
        aircraft_id: selectedAircraft.id,
        flight_log_id: newFlight.id,
        title: flightDiscrepancyForm.title.trim(),
        description: flightDiscrepancyForm.description.trim(),
        category: flightDiscrepancyForm.category,
        severity: isRed ? "red" : flightDiscrepancyForm.severity,
        is_grounding: flightDiscrepancyForm.is_grounding,
        status: "open",
      });

    if (discrepancyError) {
      setSavingFlight(false);
      alert(discrepancyError.message);
      return;
    }
  }

  setFlightForm({
    pilot: "",
    copilot: "",
    flight_date: "",
    departure: "",
    destination: "",
    hobbs_out: "",
    hobbs_in: "",
    tach_out: "",
    tach_in: "",
    flight_time: "",
    landings: "",
    notes: "",
  });

  setAddFlightDiscrepancy(false);

  setFlightDiscrepancyForm({
    title: "",
    description: "",
    category: "other",
    severity: "yellow",
    is_grounding: false,
  });

  setSavingFlight(false);
  setShowFlightForm(false);

  loadFlightLogs(selectedAircraft.id);
  loadDiscrepancies(selectedAircraft.id);
}

  if (!session) {
  return (
    <div className="app-shell">
      <div className="dashboard">
        <main className="content">
          <section className="card">
            <div className="eyebrow">SECURE ACCESS</div>
            <h1 className="hero-title">Aircraft Maintenance Tracker</h1>
            <p className="section-text">
              Sign in to access your company aircraft, maintenance records,
              discrepancies, and documents.
            </p>

            <div className="form-grid">
              <input
                className="input"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />

              <input
                className="input"
                placeholder="Password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
              />
            </div>

            <button className="primary-button" onClick={signIn}>
              Sign In
            </button>
          </section>
        </main>
      </div>
    </div>
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
<button
  className="nav-button"
  onClick={() => {
    setSelectedAircraft(null);
    setDiscrepancies([]);
    setMaintenanceEvents([]);
    setDocuments([]);
  }}
>
  Fleet Ops
</button>
        <button className="nav-button">Maintenance</button>
        <button className="nav-button" onClick={signOut}>
          Sign Out
        </button>
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

<section className="card">
  <div className="section-header-row">
    <div>
      <h2 className="section-title">Aircraft Management</h2>
      <p className="section-text">
        Add aircraft only when onboarding a new fleet asset.
      </p>
    </div>

    <button
      className="secondary-button"
      onClick={() => setShowAircraftForm(!showAircraftForm)}
    >
      {showAircraftForm ? "Cancel" : "＋ Add Aircraft"}
    </button>
  </div>

  {showAircraftForm && (
    <div className="collapsible-form">
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
    </div>
  )}

<div className="danger-zone">
  <h3>Delete Aircraft</h3>
  <p>Select an aircraft to permanently remove it from the fleet.</p>

  <div className="form-grid">
    <select
      className="input"
      value={aircraftToDelete}
      onChange={(e) => setAircraftToDelete(e.target.value)}
    >
      <option value="">Select aircraft...</option>
      {aircraft.map((plane) => (
        <option key={plane.id} value={plane.id}>
          {plane.tail_number} — {plane.make} {plane.model}
        </option>
      ))}
    </select>

    <button className="danger-button" onClick={deleteAircraft}>
      Delete Aircraft
    </button>
  </div>
</div>
  
</section>
            </>
          ) : (
            <>
              
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
                        {canCloseDiscrepancy() && (
                          <button className="small-button close-button" onClick={() => closeDiscrepancy(item.id)}>
                            Close
                          </button>
                        )}
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
                          className="small-button"
                          onClick={() => showMaintenanceDetails(item)}
                        >
                          Details
                        </button>
                      
                        <button
                          className="small-button close-button"
                          onClick={() => closeMaintenanceEvent(item.id)}
                        >
                          Mark Complete
                        </button>
                      </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card">
  <div className="section-header-row">
    <div>
      <h2 className="section-title">Flight Log</h2>
      <p className="section-text">
        Recent sorties, flight hours, landings, and crew tracking.
      </p>
    </div>

<button
  className="small-button"
  onClick={() => {
    const latestFlight = flightLogs[0];

    if (!showFlightForm && latestFlight) {
      setFlightForm((prev) => ({
        ...prev,
        hobbs_out: latestFlight.hobbs_in || "",
        tach_out: latestFlight.tach_in || "",
        departure: latestFlight.destination || "",
      }));
    }

    setShowFlightForm(!showFlightForm);
  }}
>
  {showFlightForm ? "Close" : "+ Add Flight"}
</button>
  </div>

  {showFlightForm && (
    <>
     <div className="flight-form-grid">
      <input
        className="input"
        placeholder="Pilot"
        value={flightForm.pilot}
        onChange={(e) =>
          setFlightForm({ ...flightForm, pilot: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Co-Pilot"
        value={flightForm.copilot}
        onChange={(e) =>
          setFlightForm({ ...flightForm, copilot: e.target.value })
        }
      />

      <input
        className="input"
        type="date"
        value={flightForm.flight_date}
        onChange={(e) =>
          setFlightForm({ ...flightForm, flight_date: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Departure"
        value={flightForm.departure}
        onChange={(e) =>
          setFlightForm({
            ...flightForm,
            departure: e.target.value.toUpperCase(),
          })
        }
      />

      <input
        className="input"
        placeholder="Destination"
        value={flightForm.destination}
        onChange={(e) =>
          setFlightForm({
            ...flightForm,
            destination: e.target.value.toUpperCase(),
          })
        }
      />

      <input
        className="input"
        placeholder="Hobbs Out"
        value={flightForm.hobbs_out}
        onChange={(e) =>
          setFlightForm({ ...flightForm, hobbs_out: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Hobbs In"
        value={flightForm.hobbs_in}
        onChange={(e) =>
          setFlightForm({ ...flightForm, hobbs_in: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Tach Out"
        value={flightForm.tach_out}
        onChange={(e) =>
          setFlightForm({ ...flightForm, tach_out: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Tach In"
        value={flightForm.tach_in}
        onChange={(e) =>
          setFlightForm({ ...flightForm, tach_in: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Flight Hours"
        value={flightForm.flight_time}
        onChange={(e) =>
          setFlightForm({ ...flightForm, flight_time: e.target.value })
        }
      />

      <input
        className="input"
        placeholder="Landings"
        value={flightForm.landings}
        onChange={(e) =>
          setFlightForm({ ...flightForm, landings: e.target.value })
        }
      />

      <textarea
        className="input"
        placeholder="Notes"
        value={flightForm.notes}
        onChange={(e) =>
          setFlightForm({ ...flightForm, notes: e.target.value })
        }
      />
</div>

  <div className="flight-form-actions">
  <button
    className="primary-button"
    onClick={saveFlightLog}
    disabled={savingFlight}
  >
    {savingFlight ? "Saving..." : "Save Flight"}
  </button>

  <button
    className="secondary-button flight-discrepancy-button"
    type="button"
    onClick={() => setAddFlightDiscrepancy(!addFlightDiscrepancy)}
  >
    {addFlightDiscrepancy ? "Remove Discrepancy" : "+ Add Discrepancy to Flight"}
  </button>
    </div>
      </>
  )}

{addFlightDiscrepancy && (
  <div className="collapsible-form">
    <div className="form-grid">
      <input
        className="input"
        placeholder="Discrepancy Title"
        value={flightDiscrepancyForm.title}
        onChange={(e) =>
          setFlightDiscrepancyForm({
            ...flightDiscrepancyForm,
            title: e.target.value,
          })
        }
      />

      <select
        className="input"
        value={flightDiscrepancyForm.category}
        onChange={(e) =>
          setFlightDiscrepancyForm({
            ...flightDiscrepancyForm,
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
        <option value="fuel">Fuel System</option>
        <option value="other">Other</option>
      </select>

      <select
        className="input"
        value={flightDiscrepancyForm.severity}
        onChange={(e) =>
          setFlightDiscrepancyForm({
            ...flightDiscrepancyForm,
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
      placeholder="Describe discrepancy from this flight..."
      value={flightDiscrepancyForm.description}
      onChange={(e) =>
        setFlightDiscrepancyForm({
          ...flightDiscrepancyForm,
          description: e.target.value,
        })
      }
    />
  </div>
)}
                
  {flightLogs.length === 0 ? (
    <div className="empty-small">
      No flight logs recorded yet.
    </div>
  ) : (
 <div className="flight-log-table">
  <div className="flight-log-header">
    <div>Status</div>
    <div>Date</div>
    <div>Route</div>
    <div>Crew</div>
    <div>Hobbs</div>
    <div>Tach</div>
    <div>Time</div>
    <div>Landings</div>
    <div>Actions</div>
  </div>

{flightLogs.slice(0, 3).map((flight) => (
  <div
    className="flight-log-row"
    key={flight.id}
  >
      <div>
        <span
  className={`flight-status-dot ${getFlightStatusColor(flight)}`}
  title={
    getFlightStatusColor(flight) === "green"
      ? "No linked discrepancies"
      : getFlightStatusColor(flight) === "yellow"
      ? "Linked non-grounding discrepancy"
      : "Linked grounding or red discrepancy"
  }
/>
      </div>

      <div>{flight.flight_date || "—"}</div>

      <div>
        <strong>{flight.departure || "—"} → {flight.destination || "—"}</strong>
      </div>

      <div>
        {flight.pilot || "—"}
        {flight.copilot ? ` / ${flight.copilot}` : ""}
      </div>

      <div>
        {flight.hobbs_out || "—"} → {flight.hobbs_in || "—"}
      </div>

      <div>
        {flight.tach_out || "—"} → {flight.tach_in || "—"}
      </div>

      <div>{flight.flight_time || "—"} hrs</div>

      <div>{flight.landings || 0}</div>
<div>
<button
  type="button"
  className="small-button"
  onMouseDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFlightLog(flight);
    setShowFlightDetails(true);
  }}
>
  Details
</button>
</div>
          
    </div>
  ))}
</div>
  )}
</section>

                {canAddDiscrepancy() && (
            <section className="card">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">Discrepancies</h2>
                <p className="section-text">
                  Add freeform pilot or maintenance notes. Photo and voice capture will be added next.
                </p>
              </div>
            
              <button
                className="secondary-button"
                onClick={() => setShowDiscrepancyForm(!showDiscrepancyForm)}
              >
                {showDiscrepancyForm ? "Cancel" : "+ Add Discrepancy"}
              </button>
            </div>

{showDiscrepancyForm && (
  <div className="collapsible-form">
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
              severity: e.target.checked ? "red" : discrepancyForm.severity,
            })
          }
        />
        Grounding item / aircraft should not fly
      </label>

      <button className="primary-button" onClick={addDiscrepancy}>
        Save Discrepancy
      </button>
    </div>
  </div>
)}
              </section>
              )}

   {canManageMaintenance() && (
  <section className="card">
    <div className="section-header-row">
      <div>
        <h2 className="section-title">Maintenance</h2>
        <p className="section-text">
          Track recurring or one-time maintenance requirements such as oil changes,
          annual inspections, IFR/static checks, ELT batteries, engine events, or
          propeller events.
        </p>
      </div>

      <button
        className="secondary-button"
        onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
      >
        {showMaintenanceForm ? "Cancel" : "+ Add Maintenance Event"}
      </button>
    </div>

    {showMaintenanceForm && (
      <div className="collapsible-form">
        <div className="maintenance-grid">
          <input
            className="input"
            placeholder="Item Name, e.g. Oil Change"
            value={maintenanceForm.item_name}
            onChange={(e) =>
              setMaintenanceForm({
                ...maintenanceForm,
                item_name: e.target.value,
              })
            }
          />

          <select
            className="input"
            value={maintenanceForm.category}
            onChange={(e) =>
              setMaintenanceForm({
                ...maintenanceForm,
                category: e.target.value,
              })
            }
          >
            <option value="maintenance">Maintenance</option>
            <option value="inspection">Inspection</option>
            <option value="certification">Certification</option>
            <option value="engine">Engine</option>
            <option value="propeller">Propeller</option>
            <option value="avionics">Avionics</option>
            <option value="other">Other</option>
          </select>

          <select
            className="input"
            value={maintenanceForm.interval_type}
            onChange={(e) =>
              setMaintenanceForm({
                ...maintenanceForm,
                interval_type: e.target.value,
              })
            }
          >
            <option value="hours">Hours</option>
            <option value="months">Months / Date</option>
            <option value="both">Hours and Date</option>
          </select>

          <div>
            <div className="field-label">Last Completed Date</div>
            <input
              className="input"
              type="date"
              value={maintenanceForm.last_completed_date}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  last_completed_date: e.target.value,
                })
              }
            />
          </div>

          <div>
            <div className="field-label">Last Completed Tach</div>
            <input
              className="input"
              placeholder="e.g. 3673"
              value={maintenanceForm.last_completed_tach}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  last_completed_tach: e.target.value,
                })
              }
            />
          </div>

          <div>
            <div className="field-label">Interval Hours</div>
            <input
              className="input"
              placeholder="e.g. 50"
              value={maintenanceForm.interval_hours}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  interval_hours: e.target.value,
                })
              }
            />
          </div>

          <div>
            <div className="field-label">Interval Months</div>
            <input
              className="input"
              placeholder="e.g. 12"
              value={maintenanceForm.interval_months}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  interval_months: e.target.value,
                })
              }
            />
          </div>

          <div>
            <div className="field-label">Due Tach</div>
            <input
              className="input"
              placeholder="Auto or manual"
              value={maintenanceForm.due_tach}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  due_tach: e.target.value,
                })
              }
            />
          </div>

          <div>
            <div className="field-label">Due Date</div>
            <input
              className="input"
              type="date"
              value={maintenanceForm.due_date}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  due_date: e.target.value,
                })
              }
            />
          </div>

          <div>
            <div className="field-label">Yellow Warning Threshold (%)</div>
            <input
              className="input"
              placeholder="e.g. 5"
              value={maintenanceForm.warning_percent}
              onChange={(e) =>
                setMaintenanceForm({
                  ...maintenanceForm,
                  warning_percent: e.target.value,
                })
              }
            />
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
      </div>
    )}
  </section>
)}
              <section className="card">
  <h2 className="section-title">Aircraft Documents</h2>

  <p className="section-text">
    Upload annual inspections, invoices, discrepancy photos,
    registrations, logbook images, and maintenance records.
  </p>

{canUploadDocuments() && (
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
)}
                
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
            </>
          )}

          
{showFlightDetails && selectedFlightLog && (
  <div className="modal-backdrop">
    <div className="modal-card">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">
            Flight Details
          </h2>
          <p className="section-text">
            {selectedFlightLog.departure || "—"} →{" "}
            {selectedFlightLog.destination || "—"} ·{" "}
            {selectedFlightLog.flight_date || "No date"}
          </p>
        </div>

        <button
          className="small-button"
          onClick={() => {
            setShowFlightDetails(false);
            setSelectedFlightLog(null);
          }}
        >
          Close
        </button>
      </div>

      <div className="detail-grid">
        <div>
          <strong>Pilot</strong>
          <p>{selectedFlightLog.pilot || "—"}</p>
        </div>

        <div>
          <strong>Co-Pilot</strong>
          <p>{selectedFlightLog.copilot || "—"}</p>
        </div>

        <div>
          <strong>Hobbs</strong>
          <p>
            {selectedFlightLog.hobbs_out || "—"} →{" "}
            {selectedFlightLog.hobbs_in || "—"}
          </p>
        </div>

        <div>
          <strong>Tach</strong>
          <p>
            {selectedFlightLog.tach_out || "—"} →{" "}
            {selectedFlightLog.tach_in || "—"}
          </p>
        </div>

        <div>
          <strong>Flight Time</strong>
          <p>{selectedFlightLog.flight_time || "—"} hrs</p>
        </div>

        <div>
          <strong>Landings</strong>
          <p>{selectedFlightLog.landings || 0}</p>
        </div>
      </div>

      <div className="modal-actions">
 <button
    className="secondary-button"
    onClick={() => startEditFlight(selectedFlightLog)}
  >
    Edit Flight
  </button>
        <button
          className="primary-button"
         onClick={() => {
  alert("Flight-linked discrepancy creation coming next.");

  setDiscrepancyForm({
    title: "",
    description: "",
    category: "other",
    severity: "yellow",
    is_grounding: false,
    flight_log_id: selectedFlightLog.id,
  });

  setShowFlightDetails(false);
}}
        >
          + Add Discrepancy to This Flight
        </button>
      </div>
    </div>
  </div>
)}

          
        </main>
      </div>
    </div>
  );
}
