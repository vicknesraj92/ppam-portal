# Panduan Deploy PPAM Portal (Kos RM0)

Susunan yang digunakan — semuanya percuma untuk penggunaan sebuah pertubuhan kecil:

| Bahagian | Perkhidmatan | Kos |
|---|---|---|
| Pangkalan data + Log Masuk Ahli | Supabase | RM0 (free tier) |
| Laman web (hosting) | Vercel | RM0 (free tier) |
| Kod sumber | GitHub | RM0 |
| Domain (pilihan) | cth. ppam.org.my | ~RM40–100/tahun (satu-satunya kos, jika mahu) |

---

## Bahagian 1 — Sediakan Supabase (pangkalan data & log masuk)

1. Daftar akaun percuma di **supabase.com** → *Start your project*.
2. Klik **New Project**. Isi nama projek (cth. `ppam-portal`), tetapkan kata laluan pangkalan data (simpan di tempat selamat), pilih rantau terdekat (Singapore biasanya terbaik untuk Malaysia). Tunggu ~2 minit untuk projek disediakan.
3. Buka **SQL Editor** (menu kiri) → *New query*. Salin **seluruh kandungan** fail `supabase/schema.sql` dari folder ini, tampal, dan klik **Run**. Ini akan mencipta jadual `members`, `activities`, `ambulance_requests` berserta peraturan keselamatan (Row Level Security).
4. Buka **Project Settings → API**. Salin dua nilai ini — akan diperlukan sebentar lagi:
   - **Project URL**
   - **anon public** key

---

## Bahagian 2 — Uji di komputer sendiri (pilihan, tapi disyorkan)

1. Pastikan **Node.js** dipasang (node.js.org).
2. Dalam folder projek ini, jalankan:
   ```
   npm install
   ```
3. Salin `.env.example` kepada `.env.local`, dan isikan `VITE_SUPABASE_URL` serta `VITE_SUPABASE_ANON_KEY` dengan nilai dari Bahagian 1.
4. Jalankan:
   ```
   npm run dev
   ```
5. Buka pautan yang dipaparkan (biasanya `http://localhost:5173`) untuk lihat portal berjalan sebenar, disambungkan ke Supabase.

---

## Bahagian 3 — Naikkan ke GitHub

1. Cipta repositori baharu (percuma) di **github.com** — boleh *private*.
2. Muat naik semua fail dalam folder projek ini ke repositori tersebut (guna GitHub Desktop jika tidak biasa dengan command line — senang & percuma).

---

## Bahagian 4 — Deploy di Vercel (laman web live, percuma)

1. Daftar di **vercel.com** menggunakan akaun GitHub anda.
2. Klik **Add New → Project**, pilih repositori PPAM yang baru dimuat naik.
3. Semasa konfigurasi, tambah **Environment Variables**:
   - `VITE_SUPABASE_URL` → (nilai dari Bahagian 1)
   - `VITE_SUPABASE_ANON_KEY` → (nilai dari Bahagian 1)
4. Klik **Deploy**. Dalam ~1 minit, portal anda akan live di alamat percuma seperti:
   `https://ppam-portal.vercel.app`
5. *(Pilihan)* Untuk domain sendiri (cth. `portal.ppam.org.my`), beli domain (~RM40–100/tahun) dan sambungkannya di Vercel → Project Settings → Domains.

---

## Bahagian 5 — Tambah ahli sebenar

Setiap ahli perlukan **dua** entri yang berpadanan:

1. **Akaun log masuk** — Supabase Dashboard → **Authentication → Add user**:
   - Email: No. K/P ahli + `@members.ppam.local` (cth. `950101101234@members.ppam.local`)
   - Kata laluan: tetapkan kata laluan sementara, beritahu ahli secara peribadi
2. **Rekod profil** — Supabase Dashboard → **Table Editor → members → Insert row**:
   - `id`: salin User ID dari akaun yang baru dicipta di langkah 1
   - `member_no`, `ic_number`, `full_name`, `position`, `joined_date`, `fee_status`, `phone`

> Apabila anda berikan saya senarai ahli sebenar (nama, No. K/P, jawatan, tarikh sertai), saya boleh jana skrip SQL lengkap untuk semua ahli sekali gus — anda tinggal jalankan sekali di SQL Editor, tak perlu buat satu-satu.

---

## Bahagian 6 — Urus aktiviti

Tiada kod diperlukan — guna **Table Editor → activities → Insert row** untuk tambah aktiviti baharu. Padam atau kemaskini baris untuk urus aktiviti sedia ada.

---

## Bahagian 7 — Semak permohonan ambulans

Permohonan awam disimpan dalam jadual `ambulance_requests`. Untuk lihat / uruskannya:
**Table Editor → ambulance_requests**. (Peningkatan masa depan yang boleh ditambah: notifikasi emel/WhatsApp automatik ke Setiausaha setiap kali ada permohonan baharu — beritahu saya jika mahu ini dibina.)

---

## Bahagian 8 — Semak permohonan keahlian baharu

Borang **Daftar Ahli** (awam) menyimpan permohonan dalam jadual `membership_applications`.
Untuk semak: **Table Editor → membership_applications**.

Apabila permohonan diluluskan, AJK perlu buat 2 perkara (rujuk Bahagian 5 di atas) untuk jadikan
pemohon seorang ahli sebenar dengan akses log masuk:
1. Cipta akaun log masuk di **Authentication → Add user**
2. Tambah rekod profil di **Table Editor → members**

Selepas itu, boleh kemas kini `status` permohonan kepada `Diluluskan` dalam `membership_applications`.

---

## Bahagian 9 — Log Tugasan & Jam Perkhidmatan

Ahli yang log masuk boleh ke tab **Log Tugasan** untuk merekod jam perkhidmatan bagi satu sesi
(cth. standby acara, kursus). Seorang wakil (ketua pasukan) boleh tambah beberapa ahli sekaligus
dalam satu penyerahan — jam dikira automatik daripada masa mula/tamat yang dimasukkan.

Setiap rekod disimpan dalam jadual `service_duties`, dipautkan kepada ahli melalui **No. Ahli**.
Jumlah jam terus dipaparkan pada Portal Ahli setiap individu (setiap ahli hanya nampak jam
perkhidmatan sendiri, bukan ahli lain — dikuatkuasakan di peringkat pangkalan data).

Untuk lihat rekod keseluruhan pertubuhan (semua ahli): **Table Editor → service_duties**.

---

## Perkara penting untuk diketahui

- **Projek percuma Supabase "tidur" selepas 7 hari tanpa aktiviti** — ia akan bangun semula secara automatik bila seseorang cuba log masuk/hantar borang, tetapi permintaan pertama itu mungkin mengambil masa beberapa saat lebih lama. Jika ini menjadi isu, cara paling mudah ialah sediakan "ping" percuma setiap beberapa hari (boleh saya bantu sediakan).
- Data ahli **tidak boleh dilihat oleh ahli lain** — setiap orang hanya nampak profil sendiri (dikuatkuasakan di peringkat pangkalan data, bukan sekadar di paparan).
- Simpan kata laluan pangkalan data Supabase dan kunci API di tempat selamat — jangan kongsi secara terbuka.
