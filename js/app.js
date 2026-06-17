  /**
   * ============================================================
   *  app.js — Entry Point & Controller Utama Aplikasi
   *  Dependensi: db.js, bahan.js, hpp.js, render.js
   *  File ini harus di-load TERAKHIR setelah semua JS lainnya.
   * ============================================================
   */

  'use strict';

  /* ============================================================
     SECTION 1 — TAB NAVIGATION
  ============================================================ */

  /**
   * Pindah ke tab yang dipilih.
   * Dipanggil dari onclick di setiap tombol tab.
   *
   * @param {string} tabId - id tab panel yang dituju
   * @param {HTMLElement} el - elemen tombol tab yang diklik
   */
  function switchTab(tabId, el) {
    // -- Nonaktifkan semua tab button --
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // -- Sembunyikan semua tab panel --
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.remove('active');
    });

    // -- Aktifkan tab yang dipilih --
    el.classList.add('active');
    document.getElementById(tabId).classList.add('active');

    // -- Refresh data saat tab dibuka --
    _onTabOpen(tabId);
  }

  /**
   * Jalankan fungsi render yang sesuai saat tab dibuka.
   * @private
   * @param {string} tabId
   */
  function _onTabOpen(tabId) {
    switch (tabId) {
      case 'tab-data-hpp':
        renderDataHPP();
        updateStats();
        break;
      case 'tab-list-bahan':
        renderListBahan();
        break;
      case 'tab-list-resep':
        renderListResep();
        break;
      case 'tab-input-hpp':
        // Refresh dropdown bahan di form HPP
        // (jika user baru saja menambah bahan di tab lain)
        _renderResepItems();
        break;
      default:
        break;
    }
  }

  /* ============================================================
     SECTION 2 — SEARCH HANDLER (debounce)
  ============================================================ */

  /** Timer debounce per search box */
  const _debounceTimers = {};

  /**
   * Debounce wrapper untuk fungsi search.
   * Mencegah render terlalu sering saat user mengetik cepat.
   *
   * @param {string}   key  - identifier unik per search box
   * @param {Function} fn   - fungsi render yang akan dipanggil
   * @param {number}   wait - delay dalam ms (default 300)
   */
  function debounceSearch(key, fn, wait = 300) {
    clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(fn, wait);
  }

  /* ============================================================
     SECTION 3 — EXPORT DATA
  ============================================================ */

  /**
   * Export semua data (bahan + HPP) ke file JSON.
   * Berguna sebagai backup manual oleh user.
   */
  function exportJSON() {
    const jsonStr  = DB.exportAll();
    const blob     = new Blob([jsonStr], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const fileName = `backup_hpp_${_getDateStamp()}.json`;

    a.href     = url;
    a.download = fileName;
    a.click();

    URL.revokeObjectURL(url);

    showAlert(
      'alert-settings',
      `✅ Backup berhasil didownload: ${fileName}`,
      'success'
    );
  }

  /**
   * Export data HPP ke file Excel (.xlsx) menggunakan SheetJS.
   * Berguna untuk laporan ke manajemen / owner.
   */
  function exportExcel() {
    const db = DB.getHPP();

    if (db.length === 0) {
      showAlert('alert-settings', '⚠️ Belum ada data HPP untuk diexport!', 'error');
      return;
    }

    // -- Sheet 1: Ringkasan HPP --
    const wsData = [
      ['No', 'Nama Menu', 'Kategori', 'HPP Bahan (Rp)', 'Overhead (Rp)',
       'Total HPP (Rp)', 'Harga Jual (Rp)', 'Margin (Rp)', 'Margin (%)', 'Tanggal'],
      ...db.map((x, i) => [
        i + 1,
        x.nama,
        x.kategori,
        roundTo(x.hppBahan, 0),
        x.overhead || 0,
        roundTo(x.hppTotal, 0),
        x.hargaJual,
        roundTo(x.margin, 0),
        x.marginPct + '%',
        x.tgl
      ])
    ];

    // -- Sheet 2: Rincian Bahan per Menu --
    const wsDetail = [
      ['Nama Menu', 'Bahan', 'Jumlah', 'Satuan', 'Harga/Satuan (Rp)', 'Subtotal (Rp)']
    ];
    db.forEach(x => {
      if (x.breakdown && x.breakdown.length > 0) {
        x.breakdown.forEach(b => {
          wsDetail.push([
            x.nama,
            b.nama,
            b.jumlah,
            b.satuan,
            roundTo(b.harga, 2),
            roundTo(b.subtotal, 0)
          ]);
        });
      }
    });

    // -- Sheet 3: List Bahan Baku --
    const wsBahan = [
      ['No', 'Nama Bahan', 'Kategori', 'Satuan Beli', 'Jumlah Beli',
       'Harga Beli (Rp)', 'Satuan Pakai', 'Konversi', 'Harga/Satuan Pakai (Rp)', 'Tanggal'],
      ...DB.getBahan().map((x, i) => [
        i + 1,
        x.nama,
        x.kategori,
        x.satuanBeli,
        x.jumlahBeli,
        x.hargaBeli,
        x.satuanPakai,
        x.konversi,
        roundTo(x.hargaPerPakai, 4),
        x.tgl
      ])
    ];

    // -- Buat workbook --
    const wb   = XLSX.utils.book_new();
    const ws1  = XLSX.utils.aoa_to_sheet(wsData);
    const ws2  = XLSX.utils.aoa_to_sheet(wsDetail);
    const ws3  = XLSX.utils.aoa_to_sheet(wsBahan);

    // -- Set lebar kolom sheet 1 --
    ws1['!cols'] = [
      {wch:4}, {wch:22}, {wch:14}, {wch:16}, {wch:14},
      {wch:16}, {wch:16}, {wch:14}, {wch:10}, {wch:14}
    ];

    // -- Set lebar kolom sheet 2 --
    ws2['!cols'] = [
      {wch:22}, {wch:20}, {wch:10}, {wch:10}, {wch:20}, {wch:16}
    ];

    // -- Set lebar kolom sheet 3 --
    ws3['!cols'] = [
      {wch:4}, {wch:22}, {wch:14}, {wch:12}, {wch:12},
      {wch:16}, {wch:12}, {wch:10}, {wch:22}, {wch:14}
    ];

    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan HPP');
    XLSX.utils.book_append_sheet(wb, ws2, 'Rincian Bahan');
    XLSX.utils.book_append_sheet(wb, ws3, 'List Bahan Baku');

    const fileName = `laporan_hpp_${_getDateStamp()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showAlert(
      'alert-settings',
      `✅ Export Excel berhasil: ${fileName} (3 sheet)`,
      'success'
    );
  }

  /* ============================================================
     SECTION 4 — IMPORT BACKUP JSON
  ============================================================ */

  /**
   * Handler upload file backup JSON.
   * Dipanggil dari input[type=file] di tab Settings.
   *
   * @param {Event} e
   */
  function handleImportJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showAlert('alert-settings', '⚠️ File harus berformat .json!', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onload = function (ev) {
      const ok = DB.importAll(ev.target.result);
      if (ok) {
        showAlert(
          'alert-settings',
          `✅ Backup berhasil dipulihkan! ` +
          `Bahan: ${DB.countBahan()} item | HPP: ${DB.countHPP()} menu.`,
          'success'
        );
        // Refresh semua tampilan
        _refreshAll();
      } else {
        showAlert(
          'alert-settings',
          '❌ Gagal memulihkan backup. File mungkin rusak atau format tidak valid.',
          'error'
        );
      }
      // Reset input file agar bisa upload ulang file yang sama
      e.target.value = '';
    };

    reader.onerror = function () {
      showAlert('alert-settings', '❌ Gagal membaca file!', 'error');
    };

    reader.readAsText(file);
  }

  /* ============================================================
     SECTION 5 — RESET DATA
  ============================================================ */

  /**
   * Reset semua data bahan baku (dengan konfirmasi).
   */
  function resetBahan() {
    const count = DB.countBahan();
    if (count === 0) {
      showAlert('alert-settings', '⚠️ Tidak ada data bahan baku untuk dihapus.', 'info');
      return;
    }

    if (confirm(
      `⚠️ PERHATIAN!\n\n` +
      `Anda akan menghapus SEMUA ${count} data bahan baku.\n` +
      `Data yang dihapus tidak bisa dikembalikan!\n\n` +
      `Apakah Anda yakin?`
    )) {
      DB.clearBahan();
      showAlert(
        'alert-settings',
        `✅ Semua data bahan baku (${count} item) berhasil dihapus.`,
        'success'
      );
      _refreshAll();
    }
  }

  /**
   * Reset semua data HPP menu (dengan konfirmasi).
   */
  function resetHPP() {
    const count = DB.countHPP();
    if (count === 0) {
      showAlert('alert-settings', '⚠️ Tidak ada data HPP untuk dihapus.', 'info');
      return;
    }

    if (confirm(
      `⚠️ PERHATIAN!\n\n` +
      `Anda akan menghapus SEMUA ${count} data HPP menu.\n` +
      `Data yang dihapus tidak bisa dikembalikan!\n\n` +
      `Apakah Anda yakin?`
    )) {
      DB.clearHPP();
      showAlert(
        'alert-settings',
        `✅ Semua data HPP (${count} menu) berhasil dihapus.`,
        'success'
      );
      _refreshAll();
    }
  }

  /**
   * Reset SEMUA data aplikasi (bahan + HPP) dengan konfirmasi ganda.
   */
  function resetAll() {
    const bCount = DB.countBahan();
    const hCount = DB.countHPP();

    if (bCount === 0 && hCount === 0) {
      showAlert('alert-settings', '⚠️ Tidak ada data untuk dihapus.', 'info');
      return;
    }

    // -- Konfirmasi pertama --
    if (!confirm(
      `🚨 RESET TOTAL!\n\n` +
      `Ini akan menghapus:\n` +
      `• ${bCount} data bahan baku\n` +
      `• ${hCount} data HPP menu\n\n` +
      `Semua data akan hilang permanen!\n` +
      `Apakah Anda yakin?`
    )) return;

    // -- Konfirmasi kedua (double confirm) --
    if (!confirm(
      `⚠️ Konfirmasi terakhir!\n\n` +
      `Ketuk OK untuk menghapus SEMUA data.\n` +
      `Tindakan ini TIDAK BISA dibatalkan.`
    )) return;

    DB.resetAll();
    showAlert(
      'alert-settings',
      `✅ Semua data berhasil dihapus. Aplikasi telah direset.`,
      'success'
    );
    _refreshAll();
  }

  /* ============================================================
     SECTION 6 — INFO STORAGE
  ============================================================ */

  /**
   * Tampilkan informasi storage & ringkasan data
   * di tab Settings.
   */
  function updateStorageInfo() {
    const bCount = DB.countBahan();
    const hCount = DB.countHPP();
    const size   = DB.getStorageSize();

    const el = document.getElementById('storage-info');
    if (!el) return;

    el.innerHTML =
      `<div class="hpp-row">
         <span>📦 Total Bahan Baku</span>
         <span><strong>${bCount} item</strong></span>
       </div>
       <div class="hpp-row">
         <span>📊 Total Menu HPP</span>
         <span><strong>${hCount} menu</strong></span>
       </div>
       <div class="hpp-row">
         <span>💾 Ukuran Data Tersimpan</span>
         <span><strong>${size}</strong></span>
       </div>
       <div class="hpp-row">
         <span>🕐 Terakhir Dibuka</span>
         <span><strong>${tglSekarang()}</strong></span>
       </div>`;
  }

  /* ============================================================
     SECTION 7 — DRAG & DROP IMPORT ZONE
  ============================================================ */

  /**
   * Inisialisasi event drag & drop pada import zone.
   * @private
   */
  function _initDragDrop() {
    const zone = document.getElementById('import-zone');
    if (!zone) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
      handleDrop(e);
    });

    // Klik zone = trigger input file
    zone.addEventListener('click', () => {
      document.getElementById('file-excel').click();
    });
  }

  /* ============================================================
     SECTION 8 — KEYBOARD SHORTCUT
  ============================================================ */

  /**
   * Inisialisasi keyboard shortcut global.
   * @private
   */
  function _initKeyboard() {
    document.addEventListener('keydown', e => {
      // Escape — tutup modal
      if (e.key === 'Escape') {
        tutupModal();
      }
    });
  }

  /* ============================================================
     SECTION 9 — HELPER PRIVATE
  ============================================================ */

  /**
   * Refresh semua tampilan yang membutuhkan data terbaru.
   * Dipanggil setelah import, reset, atau perubahan massal.
   * @private
   */
  function _refreshAll() {
    updateStats();
    updateStorageInfo();
    // Render ulang tab yang sedang aktif
    const activePanel = document.querySelector('.tab-panel.active');
    if (activePanel) _onTabOpen(activePanel.id);
  }

  /**
   * Buat string tanggal format YYYYMMDD untuk nama file.
   * @private
   * @returns {string} contoh: "20260617"
   */
  function _getDateStamp() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const t = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${t}`;
  }

  /* ============================================================
     SECTION 10 — INIT APLIKASI
  ============================================================ */

  /**
   * Entry point utama — dijalankan saat DOM siap.
   * Urutan inisialisasi:
   * 1. Drag & drop
   * 2. Keyboard shortcut
   * 3. Render tab pertama (Input Bahan Baku)
   * 4. Update storage info di Settings
   */
  document.addEventListener('DOMContentLoaded', function () {
    console.log('[App] Initializing HPP Calculator...');

    // -- Init fitur --
    _initDragDrop();
    _initKeyboard();

    // -- Render data awal --
    updateStorageInfo();

    // -- Pastikan tab pertama aktif --
    const firstTab = document.querySelector('.tab-btn');
    if (firstTab) firstTab.classList.add('active');

    const firstPanel = document.querySelector('.tab-panel');
    if (firstPanel) firstPanel.classList.add('active');

    console.log(
      `[App] Ready — ` +
      `Bahan: ${DB.countBahan()} | ` +
      `HPP: ${DB.countHPP()} | ` +
      `Storage: ${DB.getStorageSize()}`
    );
  });
