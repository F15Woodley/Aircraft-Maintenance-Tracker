import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

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
      console.error(error);
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
      tail_number: form.tail_number.toUpperCase(),
      make: form.make,
      model: form.model,
      current_tach: Number(form.current_tach || 0),
      total_time: Number(form.total_time || 0),
      flightaware_url: form.flightaware_url,
    };

    const { error } = await supabase
      .from("aircraft")
      .insert(payload);

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
    const confirmed = window.confirm(
      "Delete this aircraft?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("aircraft")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadAircraft();
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Aircraft Maintenance Tracker</h1>

      <form
        onSubmit={handleAddAircraft}
        style={{
          display: "grid",
          gap: 12,
          marginTop: 24,
          marginBottom: 32,
        }}
      >
        <input
          placeholder="Tail Number"
          value={form.tail_number}
          onChange={(e) =>
            setForm({
              ...form,
              tail_number: e.target.value,
            })
          }
        />

        <input
          placeholder="Make"
          value={form.make}
          onChange={(e) =>
            setForm({
              ...form,
              make: e.target.value,
            })
          }
        />

        <input
          placeholder="Model"
          value={form.model}
          onChange={(e) =>
            setForm({
              ...form,
              model: e.target.value,
            })
          }
        />

        <input
          placeholder="Current Tach"
          type="number"
          step="0.1"
          value={form.current_tach}
          onChange={(e) =>
            setForm({
              ...form,
              current_tach: e.target.value,
            })
          }
        />

        <input
          placeholder="Total Time"
          type="number"
          step="0.1"
          value={form.total_time}
          onChange={(e) =>
            setForm({
              ...form,
              total_time: e.target.value,
            })
          }
        />

        <input
          placeholder="FlightAware URL"
          value={form.flightaware_url}
          onChange={(e) =>
            setForm({
              ...form,
              flightaware_url: e.target.value,
            })
          }
        />

        <button type="submit">
          Add Aircraft
        </button>
      </form>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          {aircraft.map((plane) => (
            <div
              key={plane.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <h2>
                {plane.tail_number}
              </h2>

              <div>
                {plane.make} {plane.model}
              </div>

              <div
                style={{
                  marginTop: 12,
                }}
              >
                Current Tach:{" "}
                {plane.current_tach}
              </div>

              <div>
                Total Time:{" "}
                {plane.total_time}
              </div>

              {plane.flightaware_url && (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={
                      plane.flightaware_url
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open FlightAware
                  </a>
                </div>
              )}

              <button
                onClick={() =>
                  handleDelete(plane.id)
                }
                style={{
                  marginTop: 16,
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}