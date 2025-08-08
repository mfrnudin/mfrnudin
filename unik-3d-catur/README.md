## Unik 3D Catur

Catur 3D neon berbasis WebGL (three.js) dengan papan rounded, efek glow, dan kontrol kamera yang halus. Aturan permainan ditangani oleh chess.js.

### Badge
![three.js](https://img.shields.io/badge/three.js-0.161-0ff?style=for-the-badge&logo=three.js&logoColor=white&labelColor=111)
![chess.js](https://img.shields.io/badge/chess.js-1.0.0-ff00ff?style=for-the-badge&logo=javascript&logoColor=white&labelColor=111)
![WebGL](https://img.shields.io/badge/WebGL-2.0-00ffaa?style=for-the-badge&logo=webgl&logoColor=white&labelColor=111)

### Fitur
- Glow neon pada papan, highlight langkah dan target
- Drag‑and‑drop bidak + validasi langkah legal (chess.js)
- Kamera Orbit (putar, zoom), indikator giliran, tombol Reset
- Promosi pion otomatis → Queen (sementara)

### Kontrol (Singkat)
- Seret bidak untuk memindahkan
- Atau klik bidak → klik lingkaran target bercahaya
- Seret area kosong untuk memutar kamera, scroll untuk zoom
- Klik tombol Reset untuk mengulang permainan

### Jalankan Lokal
1) Live Server (VS Code): buka folder `unik-3d-catur/` lalu jalankan "Open with Live Server"
2) Server ringan:

```bash
npm i -D http-server
npx http-server -c-1 -p 5173 unik-3d-catur
# Buka di browser
http://localhost:5173
```

### Catatan
- Membutuhkan dukungan WebGL 2 modern untuk efek glow.