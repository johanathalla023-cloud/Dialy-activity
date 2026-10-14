"use client";

import { useState } from "react";
import { saveLogAction } from "@/server/actions/logs";

export type LogFormValues = {
  id?: string;
  date: string;
  attendance: "HADIR" | "IZIN" | "SAKIT";
  checkIn?: string | null;
  checkOut?: string | null;
  activity?: string | null;
  result?: string | null;
  obstacle?: string | null;
  photoId?: string | null;
  photoName?: string | null;
  reason?: string | null;
  proofId?: string | null;
  proofName?: string | null;
};

function FileUploader({
  name,
  label,
  initialId,
  initialName,
}: {
  name: string;
  label: string;
  initialId?: string | null;
  initialName?: string | null;
}) {
  const [id, setId] = useState(initialId ?? "");
  const [fileName, setFileName] = useState(initialName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Gagal mengunggah.");
        return;
      }
      setId(json.id);
      setFileName(json.filename);
    } catch {
      setError("Gagal mengunggah file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={id} />
      <input
        type="file"
        accept="image/*,application/pdf"
        onChange={onChange}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700"
      />
      {loading ? <p className="mt-1 text-xs text-slate-400">Mengunggah...</p> : null}
      {fileName ? <p className="mt-1 text-xs text-emerald-600">Terunggah: {fileName}</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      <p className="mt-1 text-xs text-slate-400">Maksimal 5 MB (gambar/PDF).</p>
    </div>
  );
}

export function LogForm({ values }: { values: LogFormValues }) {
  const [attendance, setAttendance] = useState(values.attendance);
  const isHadir = attendance === "HADIR";
  const isEdit = Boolean(values.id);

  return (
    <form action={saveLogAction} className="space-y-4">
      {values.id ? <input type="hidden" name="logId" value={values.id} /> : null}

      <div>
        <span className="label">Tanggal</span>
        {isEdit ? (
          <>
            <input type="hidden" name="date" value={values.date} />
            <p className="input bg-slate-50 text-slate-500">{values.date}</p>
          </>
        ) : (
          <input type="date" name="date" defaultValue={values.date} max={values.date} className="input" required />
        )}
      </div>

      <div>
        <span className="label">Status Kehadiran</span>
        <input type="hidden" name="attendance" value={attendance} />
        <div className="grid grid-cols-3 gap-2">
          {(["HADIR", "IZIN", "SAKIT"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAttendance(option)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                attendance === option
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              {option === "HADIR" ? "Hadir" : option === "IZIN" ? "Izin" : "Sakit"}
            </button>
          ))}
        </div>
      </div>

      {isHadir ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="checkIn">
                Jam Masuk
              </label>
              <input id="checkIn" name="checkIn" type="time" defaultValue={values.checkIn ?? "08:00"} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="checkOut">
                Jam Keluar
              </label>
              <input id="checkOut" name="checkOut" type="time" defaultValue={values.checkOut ?? "16:00"} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="activity">
              Uraian Kegiatan
            </label>
            <textarea id="activity" name="activity" rows={3} defaultValue={values.activity ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="result">
              Hasil
            </label>
            <textarea id="result" name="result" rows={2} defaultValue={values.result ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="obstacle">
              Kendala
            </label>
            <textarea id="obstacle" name="obstacle" rows={2} defaultValue={values.obstacle ?? ""} className="input" />
          </div>
          <FileUploader name="photoId" label="Foto Kegiatan" initialId={values.photoId} initialName={values.photoName} />
        </>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="reason">
              Alasan
            </label>
            <textarea id="reason" name="reason" rows={3} defaultValue={values.reason ?? ""} className="input" />
          </div>
          <FileUploader name="proofId" label="Bukti (surat/foto)" initialId={values.proofId} initialName={values.proofName} />
        </>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" name="intent" value="draft" className="btn btn-secondary flex-1">
          Simpan Draft
        </button>
        <button type="submit" name="intent" value="submit" className="btn btn-primary flex-1">
          Ajukan
        </button>
      </div>
      <p className="text-xs text-slate-400">
        &ldquo;Ajukan&rdquo; akan mengirim log ke pembimbing untuk diperiksa.
      </p>
    </form>
  );
}
