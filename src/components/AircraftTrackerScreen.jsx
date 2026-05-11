import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function AircraftTrackerScreen() {
  const [aircraft, setAircraft] = useState([]);

  const [form, setForm] = useState({
    tail_number: "",
    make: "",
    model: "",
    current_tach: "",
    total_time: "",
    flightaware_url: "",
  });

  async function loadAircraft() {
    const { data } = await supabase
      .from("aircraft")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setAircraft(data);
  }

  useEffect(() => {
    loadAircraft();
  }, []);

  async function addAircraft() {
    const { error } = await supabase.from("aircraft").insert([
      {
        ...form,
      },
    ]);

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

  return (
    <div className="min-h-screen bg-[#020817] text-white">
      {/* TOP NAV */}
      <div className="border-b border-blue-900/40 bg-black/20 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-8 py-5">
          <div className="flex gap-4">
            <button className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10">
              Fleet Ops
            </button>

            <button className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10">
              Maintenance
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-10">
        {/* HERO */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-blue-950 p-10 lg:col-span-2">
            <div className="mb-4 text-sm font-bold tracking-[0.3em] text-blue-400">
              AI MENTOR FOR SAFER FLYING
            </div>

            <h1 className="mb-6 text-5xl font-bold">
              Aircraft Maintenance Tracker
            </h1>

            <p className="max-w-3xl text-xl text-slate-300">
              Track aircraft status, tach time, total time, inspections,
              oil changes, and FlightAware links from a centralized fleet
              dashboard.
            </p>
          </div>

          {/* STATS */}
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-blue-950 p-10">
            <div className="text-center">
              <div className="text-7xl font-bold">
                {aircraft.length}
              </div>

              <div className="mt-2 text-slate-400">
                Aircraft in Fleet
              </div>

              <div className="my-8 border-t border-white/10" />

              <div className="text-7xl font-bold text-green-400">
                {aircraft.length}
              </div>

              <div className="mt-2 text-slate-400">
                Currently Active
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="mt-8 rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-blue-950 p-10">
          <h2 className="mb-2 text-4xl font-bold">
            Add Aircraft
          </h2>

          <p className="mb-8 text-slate-400">
            Create a new aircraft record for this company.
          </p>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Input
              placeholder="Tail Number"
              value={form.tail_number}
              onChange={(e) =>
                setForm({
                  ...form,
                  tail_number: e.target.value,
                })
              }
            />

            <Input
              placeholder="Make"
              value={form.make}
              onChange={(e) =>
                setForm({
                  ...form,
                  make: e.target.value,
                })
              }
            />

            <Input
              placeholder="Model"
              value={form.model}
              onChange={(e) =>
                setForm({
                  ...form,
                  model: e.target.value,
                })
              }
            />

            <Input
              placeholder="Current Tach"
              value={form.current_tach}
              onChange={(e) =>
                setForm({
                  ...form,
                  current_tach: e.target.value,
                })
              }
            />

            <Input
              placeholder="Total Time"
              value={form.total_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  total_time: e.target.value,
                })
              }
            />

            <Input
              placeholder="FlightAware URL"
              value={form.flightaware_url}
              onChange={(e) =>
                setForm({
                  ...form,
                  flightaware_url: e.target.value,
                })
              }
            />
          </div>

          <button
            onClick={addAircraft}
            className="mt-8 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 px-10 py-4 text-xl font-bold shadow-2xl shadow-blue-500/20 transition hover:scale-105"
          >
            Add Aircraft
          </button>
        </div>

        {/* FLEET */}
        <div className="mt-10">
          <h2 className="text-4xl font-bold">Fleet</h2>

          <p className="mt-2 text-slate-400">
            Aircraft currently registered in this company workspace.
          </p>

          <div className="mt-8 space-y-6">
            {aircraft.length === 0 ? (
              <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-blue-950 p-20 text-center text-2xl text-slate-400">
                No aircraft added yet.
              </div>
            ) : (
              aircraft.map((plane) => (
                <div
                  key={plane.id}
                  className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900 to-blue-950 p-8"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-4xl font-bold">
                        {plane.tail_number}
                      </div>

                      <div className="mt-2 text-xl text-slate-300">
                        {plane.make} {plane.model}
                      </div>
                    </div>

                    <div className="flex gap-10">
                      <div>
                        <div className="text-sm text-slate-400">
                          Current Tach
                        </div>

                        <div className="text-2xl font-bold">
                          {plane.current_tach || 0}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-slate-400">
                          Total Time
                        </div>

                        <div className="text-2xl font-bold">
                          {plane.total_time || 0}
                        </div>
                      </div>
                    </div>

                    <a
                      href={plane.flightaware_url}
                      target="_blank"
                      className="rounded-xl border border-blue-500/40 bg-blue-500/10 px-6 py-3 text-center font-semibold text-blue-300 hover:bg-blue-500/20"
                    >
                      FlightAware
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-lg outline-none backdrop-blur transition focus:border-blue-500"
    />
  );
}


