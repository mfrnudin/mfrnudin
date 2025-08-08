## Unik 3D Catur

- 3D catur berbasis WebGL (three.js) dengan gaya neon-3D, papan rounded dan glow.
- Interaksi drag-and-drop, highlight langkah legal, aturan via chess.js.

### Jalankan Lokal

Tanpa instalasi (cukup buka file):
- Gunakan ekstensi Live Server atau buka dengan server statis apa pun.

Dengan server ringan (http-server):
1. `npm i -D http-server`
2. `npx http-server -c-1 -p 5173` (jalankan di folder `unik-3d-catur`)
3. Buka `http://localhost:5173`.

### Catatan
- Promosi otomatis ke Queen untuk saat ini.
- Efek glow membutuhkan dukungan WebGL 2 modern.