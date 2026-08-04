import { useEffect, useState } from "react";
import {
  Truck, Users, Calendar, LogIn, LogOut, ShieldCheck, MapPin, Phone,
  CheckCircle2, AlertTriangle, Menu, X, Clock, Heart, ChevronRight, Loader2,
  UserPlus, ClipboardList, Trash2, PlusCircle, Timer
} from "lucide-react";
import { supabase, icToPseudoEmail } from "./supabaseClient";

const GOLD = "#F0B429";
const NAVY = "#0B3C6B";

const STATUS_LABEL = {
  akan_datang: { text: "Akan Datang", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  berlangsung: { text: "Sedang Berlangsung", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  selesai: { text: "Selesai", cls: "bg-gray-100 text-gray-600 border-gray-300" },
};

function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill={GOLD} />
      <circle cx="50" cy="50" r="42" fill={NAVY} />
      <circle cx="50" cy="50" r="33" fill="#F7F8FA" />
      <rect x="44" y="30" width="12" height="40" rx="3" fill="#D6262A" />
      <rect x="30" y="44" width="40" height="12" rx="3" fill="#D6262A" />
      <polyline points="26,50 38,50 42,40 47,60 51,50 74,50" fill="none" stroke="#F7F8FA" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);

  // ---- auth / member session ----
  const [session, setSession] = useState(null);
  const [member, setMember] = useState(null);
  const [loginIc, setLoginIc] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ---- activities ----
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // ---- ambulance request form ----
  const [form, setForm] = useState({ nama: "", telefon: "", jenis: "", lokasi: "", tarikh: "", masa: "", butiran: "" });
  const [confirmation, setConfirmation] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);

  // ---- membership registration form (public) ----
  const [regForm, setRegForm] = useState({
    nama: "", ic: "", alamat: "", telefon: "", email: "", pekerjaan: "",
    kecemasanNama: "", kecemasanTelefon: "",
  });
  const [regConfirmation, setRegConfirmation] = useState(null);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // ---- service duty submission (members only, one rep can log for several) ----
  const [dutyInfo, setDutyInfo] = useState({ jenis: "", tarikh: "", mula: "", tamat: "" });
  const [dutyPeople, setDutyPeople] = useState([{ memberNo: "", nama: "" }]);
  const [dutyConfirmation, setDutyConfirmation] = useState(null);
  const [dutyError, setDutyError] = useState("");
  const [dutyLoading, setDutyLoading] = useState(false);

  // ---- this member's own duty history / total hours ----
  const [myDuties, setMyDuties] = useState([]);
  const [myDutiesLoading, setMyDutiesLoading] = useState(false);

  // Restore session on load + listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch this member's own profile once logged in
  useEffect(() => {
    if (!session) { setMember(null); return; }
    supabase
      .from("members")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) setLoginError("Log masuk berjaya, tetapi profil ahli tidak dijumpai. Sila hubungi Setiausaha.");
        else {
          setMember(data);
          setDutyPeople([{ memberNo: data.member_no, nama: data.full_name }]);
        }
      });
  }, [session]);

  // Fetch this member's own service-duty history + total hours (RLS limits this to their own rows)
  useEffect(() => {
    if (!member) { setMyDuties([]); return; }
    setMyDutiesLoading(true);
    supabase
      .from("service_duties")
      .select("*")
      .order("duty_date", { ascending: false })
      .then(({ data }) => {
        setMyDuties(data || []);
        setMyDutiesLoading(false);
      });
  }, [member]);

  // Fetch activities (public)
  useEffect(() => {
    supabase
      .from("activities")
      .select("*")
      .order("activity_date", { ascending: true })
      .then(({ data }) => {
        setActivities(data || []);
        setActivitiesLoading(false);
      });
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: icToPseudoEmail(loginIc),
      password: loginPw,
    });
    setLoginLoading(false);
    if (error) setLoginError("No. K/P atau kata laluan tidak sah. Sila cuba lagi.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setLoginIc("");
    setLoginPw("");
  }

  async function handleRequestSubmit(e) {
    e.preventDefault();
    if (!form.nama || !form.telefon || !form.tarikh) return;
    setRequestLoading(true);
    setRequestError("");
    // Reference code is generated here in the browser (not read back from
    // the database) because ambulance_requests has no public SELECT policy
    // by design — the public can only insert, never read back rows.
    const referenceCode =
      "PPAM-REQ-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase.from("ambulance_requests").insert({
      reference_code: referenceCode,
      full_name: form.nama,
      phone: form.telefon,
      event_type: form.jenis,
      location: form.lokasi,
      request_date: form.tarikh,
      request_time: form.masa,
      details: form.butiran,
    });
    setRequestLoading(false);
    if (error) {
      setRequestError("Maaf, permohonan gagal dihantar. Sila cuba sekali lagi.");
      return;
    }
    setConfirmation(referenceCode);
    setForm({ nama: "", telefon: "", jenis: "", lokasi: "", tarikh: "", masa: "", butiran: "" });
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!regForm.nama || !regForm.ic || !regForm.telefon) return;
    setRegLoading(true);
    setRegError("");
    const { error } = await supabase.from("membership_applications").insert({
      full_name: regForm.nama,
      ic_number: regForm.ic,
      address: regForm.alamat,
      contact_number: regForm.telefon,
      email: regForm.email,
      occupation: regForm.pekerjaan,
      emergency_contact_name: regForm.kecemasanNama,
      emergency_contact_phone: regForm.kecemasanTelefon,
    });
    setRegLoading(false);
    if (error) {
      setRegError("Maaf, pendaftaran gagal dihantar. Sila cuba sekali lagi.");
      return;
    }
    setRegConfirmation(true);
    setRegForm({ nama: "", ic: "", alamat: "", telefon: "", email: "", pekerjaan: "", kecemasanNama: "", kecemasanTelefon: "" });
  }

  // Decimal hours between two "HH:MM" times; handles shifts that cross midnight
  function calcHours(start, end) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return Math.round((mins / 60) * 100) / 100;
  }

  function addDutyPerson() {
    setDutyPeople([...dutyPeople, { memberNo: "", nama: "" }]);
  }
  function removeDutyPerson(i) {
    setDutyPeople(dutyPeople.filter((_, idx) => idx !== i));
  }
  function updateDutyPerson(i, field, value) {
    const next = [...dutyPeople];
    next[i][field] = value;
    setDutyPeople(next);
  }

  async function handleDutySubmit(e) {
    e.preventDefault();
    setDutyError("");
    if (!dutyInfo.jenis || !dutyInfo.tarikh || !dutyInfo.mula || !dutyInfo.tamat) return;
    const validPeople = dutyPeople.filter((p) => p.memberNo && p.nama);
    if (validPeople.length === 0) {
      setDutyError("Sila masukkan sekurang-kurangnya satu ahli (No. Ahli + Nama).");
      return;
    }
    const hours = calcHours(dutyInfo.mula, dutyInfo.tamat);
    setDutyLoading(true);
    const rows = validPeople.map((p) => ({
      member_no: p.memberNo,
      member_name: p.nama,
      duty_type: dutyInfo.jenis,
      duty_date: dutyInfo.tarikh,
      start_time: dutyInfo.mula,
      end_time: dutyInfo.tamat,
      hours,
      submitted_by: member?.full_name || "Ahli",
      submitted_by_member_no: member?.member_no || null,
    }));
    const { error } = await supabase.from("service_duties").insert(rows);
    setDutyLoading(false);
    if (error) {
      setDutyError("Maaf, rekod tugasan gagal dihantar. Pastikan No. Ahli yang dimasukkan betul.");
      return;
    }
    setDutyConfirmation({ count: validPeople.length, hours });
    setDutyInfo({ jenis: "", tarikh: "", mula: "", tamat: "" });
    setDutyPeople([{ memberNo: member?.member_no || "", nama: member?.full_name || "" }]);
  }

  const navItem = (key, label, Icon) => (
    <button
      onClick={() => { setTab(key); setMenuOpen(false); }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition ${
        tab === key ? "bg-white text-[#0B3C6B]" : "text-white/85 hover:bg-white/10"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#1E2530] font-sans">
      {/* NAV */}
      <header className="sticky top-0 z-20" style={{ background: NAVY }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div className="leading-tight">
              <p className="text-white font-black tracking-wide text-lg">PPAM</p>
              <p className="text-white/70 text-[11px] uppercase tracking-widest">Pertubuhan Prihatin Ambulans Malaysia</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItem("home", "Utama", ShieldCheck)}
            {navItem("activities", "Aktiviti", Calendar)}
            {navItem("request", "Mohon Ambulans", Truck)}
            {navItem("register", "Daftar Ahli", UserPlus)}
            {navItem("duty", "Log Tugasan", ClipboardList)}
            {navItem("login", session ? "Portal Ahli" : "Log Masuk Ahli", Users)}
          </nav>
          <button className="md:hidden text-white" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden flex flex-col gap-1 px-4 pb-3">
            {navItem("home", "Utama", ShieldCheck)}
            {navItem("activities", "Aktiviti", Calendar)}
            {navItem("request", "Mohon Ambulans", Truck)}
            {navItem("register", "Daftar Ahli", UserPlus)}
            {navItem("duty", "Log Tugasan", ClipboardList)}
            {navItem("login", session ? "Portal Ahli" : "Log Masuk Ahli", Users)}
          </div>
        )}
      </header>

      {/* HOME */}
      {tab === "home" && (
        <main>
          <section className="max-w-6xl mx-auto px-4 pt-16 pb-14 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="uppercase tracking-widest text-xs font-bold" style={{ color: "#C6890E" }}>Sukarelawan • Pertolongan Cemas • Ambulans</p>
              <h1 className="text-4xl md:text-5xl font-black mt-3 leading-tight" style={{ color: NAVY }}>
                Siap sedia untuk masyarakat, setiap masa.
              </h1>
              <p className="text-gray-600 mt-4 text-[15px] leading-relaxed">
                PPAM menyediakan perkhidmatan pertolongan cemas dan standby ambulans untuk acara awam,
                latihan pertolongan cemas kepada masyarakat, serta kempen kesedaran kesihatan kecemasan
                di seluruh Malaysia.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <button onClick={() => setTab("request")} className="px-5 py-3 rounded-lg font-bold text-white text-sm flex items-center gap-2" style={{ background: "#D6262A" }}>
                  <Truck size={16} /> Mohon Perkhidmatan Ambulans
                </button>
                <button onClick={() => setTab("activities")} className="px-5 py-3 rounded-lg font-bold text-sm flex items-center gap-2 border-2" style={{ borderColor: NAVY, color: NAVY }}>
                  Lihat Aktiviti <ChevronRight size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Kebangsaan", "Taraf Pertubuhan"],
                ["2026", "Ditubuhkan"],
                ["20", "Sasaran Sukarelawan 2027"],
                ["24/7", "Kesiapsiagaan Standby"],
              ].map(([big, small]) => (
                <div key={small} className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
                  <p className="text-3xl font-black" style={{ color: NAVY }}>{big}</p>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{small}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* ACTIVITIES */}
      {tab === "activities" && (
        <main className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-3xl font-black mb-2" style={{ color: NAVY }}>Aktiviti PPAM</h2>
          <p className="text-gray-600 mb-8 text-sm">Aktiviti semasa dan akan datang anjuran pertubuhan.</p>
          {activitiesLoading ? (
            <p className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="animate-spin" size={16} /> Memuatkan...</p>
          ) : activities.length === 0 ? (
            <p className="text-gray-500 text-sm">Tiada aktiviti buat masa ini.</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {activities.map((a) => (
                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-[#1E2530]">{a.title}</h3>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full border whitespace-nowrap ${STATUS_LABEL[a.status]?.cls || ""}`}>
                      {STATUS_LABEL[a.status]?.text || a.status}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                    <p className="flex items-center gap-2"><Calendar size={14} /> {a.activity_date}</p>
                    {a.activity_time && <p className="flex items-center gap-2"><Clock size={14} /> {a.activity_time}</p>}
                    {a.location && <p className="flex items-center gap-2"><MapPin size={14} /> {a.location}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* AMBULANCE REQUEST */}
      {tab === "request" && (
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-1">
            <Truck style={{ color: "#D6262A" }} />
            <h2 className="text-3xl font-black" style={{ color: NAVY }}>Mohon Perkhidmatan Ambulans</h2>
          </div>
          <p className="text-gray-600 text-sm mb-6">
            Borang ini untuk permohonan standby / perkhidmatan pertolongan cemas bagi acara awam.
            Untuk kecemasan sebenar, sila hubungi <strong>999</strong> serta-merta.
          </p>

          {confirmation ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={36} />
              <p className="font-bold text-emerald-800">Permohonan Diterima!</p>
              <p className="text-sm text-emerald-700 mt-1">No. Rujukan anda: <strong>{confirmation}</strong></p>
              <p className="text-xs text-emerald-700 mt-3">Pasukan kami akan menghubungi anda untuk pengesahan lanjut.</p>
              <button onClick={() => setConfirmation(null)} className="mt-4 text-sm font-semibold underline text-emerald-800">
                Hantar permohonan lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Nama Penuh</label>
                  <input required value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Nama anda" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">No. Telefon</label>
                  <input required value={form.telefon} onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="012-3456789" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Jenis Acara</label>
                <input value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="cth: Larian amal, Majlis korporat" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Lokasi</label>
                <input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Lokasi acara" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Tarikh</label>
                  <input required type="date" value={form.tarikh} onChange={(e) => setForm({ ...form, tarikh: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Masa</label>
                  <input type="time" value={form.masa} onChange={(e) => setForm({ ...form, masa: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Butiran Tambahan</label>
                <textarea value={form.butiran} onChange={(e) => setForm({ ...form, butiran: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Anggaran bilangan orang, keperluan khas, dsb." />
              </div>
              {requestError && (
                <p className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle size={14} /> {requestError}</p>
              )}
              <button type="submit" disabled={requestLoading} className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: "#D6262A" }}>
                {requestLoading && <Loader2 className="animate-spin" size={16} />} Hantar Permohonan
              </button>
            </form>
          )}
        </main>
      )}

      {/* MEMBERSHIP REGISTRATION */}
      {tab === "register" && (
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus style={{ color: NAVY }} />
            <h2 className="text-3xl font-black" style={{ color: NAVY }}>Pendaftaran Ahli Baharu</h2>
          </div>
          <p className="text-gray-600 text-sm mb-6">
            Isikan borang ini untuk memohon menjadi ahli PPAM. Permohonan anda akan disemak oleh
            Ahli Jawatankuasa sebelum akaun log masuk disediakan.
          </p>

          {regConfirmation ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={36} />
              <p className="font-bold text-emerald-800">Permohonan Diterima!</p>
              <p className="text-sm text-emerald-700 mt-1">Permohonan keahlian anda sedang menunggu semakan AJK PPAM.</p>
              <button onClick={() => setRegConfirmation(null)} className="mt-4 text-sm font-semibold underline text-emerald-800">
                Hantar permohonan lain
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Nama Penuh</label>
                <input required value={regForm.nama} onChange={(e) => setRegForm({ ...regForm, nama: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Nama penuh mengikut K/P" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">No. Kad Pengenalan</label>
                  <input required value={regForm.ic} onChange={(e) => setRegForm({ ...regForm, ic: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="cth: 950101101234" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">No. Telefon</label>
                  <input required value={regForm.telefon} onChange={(e) => setRegForm({ ...regForm, telefon: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="012-3456789" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Alamat</label>
                <textarea value={regForm.alamat} onChange={(e) => setRegForm({ ...regForm, alamat: e.target.value })}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Alamat kediaman" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Alamat E-mel</label>
                  <input type="email" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="nama@emel.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Pekerjaan</label>
                  <input value={regForm.pekerjaan} onChange={(e) => setRegForm({ ...regForm, pekerjaan: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Pekerjaan semasa" />
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2 mt-2">Hubungan Kecemasan</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Nama</label>
                    <input value={regForm.kecemasanNama} onChange={(e) => setRegForm({ ...regForm, kecemasanNama: e.target.value })}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Nama waris/kenalan rapat" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">No. Telefon</label>
                    <input value={regForm.kecemasanTelefon} onChange={(e) => setRegForm({ ...regForm, kecemasanTelefon: e.target.value })}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="012-3456789" />
                  </div>
                </div>
              </div>
              {regError && (
                <p className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle size={14} /> {regError}</p>
              )}
              <button type="submit" disabled={regLoading} className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
                {regLoading && <Loader2 className="animate-spin" size={16} />} Hantar Permohonan
              </button>
            </form>
          )}
        </main>
      )}

      {/* SERVICE DUTY SUBMISSION */}
      {tab === "duty" && (
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList style={{ color: NAVY }} />
            <h2 className="text-3xl font-black" style={{ color: NAVY }}>Log Jam Perkhidmatan</h2>
          </div>

          {!session ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-6 text-center mt-4">
              <AlertTriangle className="mx-auto mb-2 text-amber-600" size={28} />
              <p className="font-bold text-amber-800">Sila log masuk dahulu</p>
              <p className="text-sm text-amber-700 mt-1">Hanya ahli berdaftar boleh log jam tugasan.</p>
              <button onClick={() => setTab("login")} className="mt-4 px-4 py-2 rounded-lg font-bold text-white text-sm" style={{ background: NAVY }}>
                Ke Log Masuk Ahli
              </button>
            </div>
          ) : dutyConfirmation ? (
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-6 text-center mt-4">
              <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={36} />
              <p className="font-bold text-emerald-800">Rekod Tugasan Disimpan!</p>
              <p className="text-sm text-emerald-700 mt-1">
                {dutyConfirmation.count} ahli × {dutyConfirmation.hours} jam telah direkodkan.
              </p>
              <button onClick={() => setDutyConfirmation(null)} className="mt-4 text-sm font-semibold underline text-emerald-800">
                Log tugasan lain
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-6 mt-1">
                Seorang wakil boleh log tugasan bagi beberapa ahli sekali gus (cth. ketua pasukan selepas satu sesi standby).
                Jam perkhidmatan akan dikira secara automatik dan terus dipaparkan pada profil setiap ahli terbabit.
              </p>
              <form onSubmit={handleDutySubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Jenis Tugasan</label>
                  <input required value={dutyInfo.jenis} onChange={(e) => setDutyInfo({ ...dutyInfo, jenis: e.target.value })}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="cth: Standby acara, Kursus latihan" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Tarikh</label>
                    <input required type="date" value={dutyInfo.tarikh} onChange={(e) => setDutyInfo({ ...dutyInfo, tarikh: e.target.value })}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Masa Mula</label>
                    <input required type="time" value={dutyInfo.mula} onChange={(e) => setDutyInfo({ ...dutyInfo, mula: e.target.value })}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Masa Tamat</label>
                    <input required type="time" value={dutyInfo.tamat} onChange={(e) => setDutyInfo({ ...dutyInfo, tamat: e.target.value })}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                {dutyInfo.mula && dutyInfo.tamat && (
                  <p className="flex items-center gap-2 text-xs text-gray-500">
                    <Timer size={14} /> Jumlah jam bagi sesi ini: <strong>{calcHours(dutyInfo.mula, dutyInfo.tamat)} jam</strong> setiap ahli
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mt-2 mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Ahli Terlibat</p>
                    <button type="button" onClick={addDutyPerson} className="flex items-center gap-1 text-xs font-bold" style={{ color: NAVY }}>
                      <PlusCircle size={14} /> Tambah Ahli
                    </button>
                  </div>
                  <div className="space-y-2">
                    {dutyPeople.map((p, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input value={p.memberNo} onChange={(e) => updateDutyPerson(i, "memberNo", e.target.value)}
                          className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="No. Ahli" />
                        <input value={p.nama} onChange={(e) => updateDutyPerson(i, "nama", e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Nama ahli" />
                        {dutyPeople.length > 1 && (
                          <button type="button" onClick={() => removeDutyPerson(i)} className="text-red-500 p-2">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {dutyError && (
                  <p className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle size={14} /> {dutyError}</p>
                )}
                <button type="submit" disabled={dutyLoading} className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
                  {dutyLoading && <Loader2 className="animate-spin" size={16} />} Simpan Rekod Tugasan
                </button>
              </form>
            </>
          )}
        </main>
      )}

      {/* MEMBER LOGIN / DASHBOARD */}
      {tab === "login" && (
        <main className="max-w-2xl mx-auto px-4 py-12">
          {!session ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Users style={{ color: NAVY }} />
                <h2 className="text-3xl font-black" style={{ color: NAVY }}>Log Masuk Ahli</h2>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                Ruangan ini khas untuk ahli berdaftar PPAM. Butiran keahlian tidak boleh dilihat tanpa log masuk.
              </p>
              <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">No. Kad Pengenalan</label>
                  <input required value={loginIc} onChange={(e) => setLoginIc(e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="cth: 950101101234" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Kata Laluan</label>
                  <input required type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Kata laluan" />
                </div>
                {loginError && (
                  <p className="flex items-center gap-2 text-sm text-red-600"><AlertTriangle size={14} /> {loginError}</p>
                )}
                <button type="submit" disabled={loginLoading} className="w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: NAVY }}>
                  {loginLoading ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />} Log Masuk
                </button>
              </form>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black" style={{ color: NAVY }}>Portal Ahli</h2>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-red-600">
                  <LogOut size={16} /> Log Keluar
                </button>
              </div>
              {!member ? (
                <p className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="animate-spin" size={16} /> Memuatkan profil...</p>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl" style={{ background: NAVY }}>
                      {member.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{member.full_name}</p>
                      <p className="text-sm text-gray-500">{member.position}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div><p className="text-gray-400 text-xs uppercase font-bold">No. Ahli</p><p className="font-semibold">{member.member_no}</p></div>
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Tarikh Sertai</p><p className="font-semibold">{member.joined_date}</p></div>
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Status Yuran</p><p className="font-semibold text-emerald-600">{member.fee_status}</p></div>
                    <div><p className="text-gray-400 text-xs uppercase font-bold">Jawatan</p><p className="font-semibold">{member.position}</p></div>
                  </div>
                </div>
              )}

              {/* Service hours summary */}
              {member && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2" style={{ color: NAVY }}>
                      <Timer size={18} /> Jam Perkhidmatan
                    </h3>
                    <button onClick={() => setTab("duty")} className="text-xs font-bold" style={{ color: NAVY }}>
                      + Log Tugasan
                    </button>
                  </div>
                  {myDutiesLoading ? (
                    <p className="flex items-center gap-2 text-gray-500 text-sm"><Loader2 className="animate-spin" size={16} /> Memuatkan...</p>
                  ) : (
                    <>
                      <div className="text-center py-3 mb-4 rounded-lg" style={{ background: "#F7F8FA" }}>
                        <p className="text-3xl font-black" style={{ color: NAVY }}>
                          {myDuties.reduce((sum, d) => sum + Number(d.hours), 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Jumlah Jam Perkhidmatan</p>
                      </div>
                      {myDuties.length === 0 ? (
                        <p className="text-sm text-gray-500">Belum ada rekod tugasan.</p>
                      ) : (
                        <div className="space-y-2">
                          {myDuties.map((d) => (
                            <div key={d.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                              <div>
                                <p className="font-semibold">{d.duty_type}</p>
                                <p className="text-gray-500 text-xs">{d.duty_date} · {d.start_time}–{d.end_time}</p>
                              </div>
                              <span className="font-bold" style={{ color: NAVY }}>{Number(d.hours).toFixed(2)} jam</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <footer className="text-center text-xs text-gray-400 py-8">
        © 2026 Pertubuhan Prihatin Ambulans Malaysia (PPAM)
      </footer>
    </div>
  );
}
