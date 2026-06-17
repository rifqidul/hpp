  /**
   * ============================================================
   *  bahan.js — Logika Input Bahan Baku Manual & Import Excel
   *  Dependensi: db.js (harus di-load lebih dulu)
   * ============================================================
   */

  'use strict';

  /* ============================================================
     SECTION 1 — INPUT MANUAL: PREVIEW KONVERSI
  ============================================================ */

  /**
   * Dipanggil setiap kali user mengetik di field
   * jumlah beli, harga beli, satuan pakai, atau konversi.
   * Menampilkan preview harga per satuan pakai secara real-time.
   */
  function hitungHargaSatuan() {
    const satuanBeli  = document.getElementById('bahan-satuan-beli').value;
    const jumlahBeli  = parseFloat(document.getElementById('bahan-jumlah-beli').value) || 0;
    const hargaBeli   = parseFloat(document.getElementById('bahan-harga-beli').value)  || 0;
    const satuanPakai = document.getElementById('bahan-satuan-pakai').value;
    const konversi    = parseFloat(document.getElementById('bahan-konversi').value)    || 0;

    const elInfo      = document.getElementById('konversi-info');
    const elContoh    = document.getElementById('konversi-contoh');
    const elHasil     = document.getElementById('hasil-konversi');

    // -- Tampilkan info teks konversi --
    if (satuanBeli && satuanPakai && konversi > 0) {
      elInfo.style.display  = 'block';
      elContoh.textContent  = `1 ${satuanBeli} = ${konversi} ${satuanPakai}`;
    } else {
      elInfo.style.display  = 'none';
    }

    // -- Tampilkan hasil kalkulasi harga --
    if (jumlahBeli > 0 && hargaBeli > 0 && konversi > 0 && satuanBeli && satuanPakai) {
      const hargaPerBeli  = hargaBeli / jumlahBeli;
      const hargaPerPakai = hargaPerBeli / konversi;

      document.getElementById('kv-satuan-beli').textContent    = satuanBeli;
      document.getElementById('kv-satuan-pakai').textContent   = satuanPakai;
      document.getElementById('kv-harga-per-beli').textContent =
        rupiah(roundTo(hargaPerBeli, 0));
      document.getElementById('kv-harga-per-pakai').textContent =
        rupiah(roundTo(hargaPerPakai, 4));

      elHasil.style.display = 'block';
    } else {
      elHasil.style.display = 'none';
    }
  }

  /* ============================================================
     SECTION 2 — INPUT MANUAL: SIMPAN BAHAN BAKU
  ============================================================ */

  /**
   * Validasi & simpan satu bahan baku ke database.
   * Dipanggil saat user klik tombol "Simpan Bahan Baku".
   */
  function simpanBahan() {
    // -- Ambil nilai dari form --
    const nama        = document.getElementById('bahan-nama').value.trim();
    const kategori    = document.getElementById('bahan-kategori').value;
    const satuanBeli  = document.getElementById('bahan-satuan-beli').value;
    const jumlahBeli  = parseFloat(document.getElementById('bahan-jumlah-beli').value);
    const hargaBeli   = parseFloat(document.getElementById('bahan-harga-beli').value);
    const satuanPakai = document.getElementById('bahan-satuan-pakai').value;
    const konversi    = parseFloat(document.getElementById('bahan-konversi').value);

    // -- Validasi --
    if (isEmpty(nama))
      return showAlert('alert-bahan', '⚠️ Nama bahan tidak boleh kosong!', 'error');
    if (!satuanBeli)
      return showAlert('alert-bahan', '⚠️ Pilih satuan beli terlebih dahulu!', 'error');
    if (!jumlahBeli || jumlahBeli <= 0)
      return showAlert('alert-bahan', '⚠️ Jumlah beli harus lebih dari 0!', 'error');
    if (!hargaBeli || hargaBeli <= 0)
      return showAlert('alert-bahan', '⚠️ Total harga beli harus lebih dari 0!', 'error');
    if (!satuanPakai)
      return showAlert('alert-bahan', '⚠️ Pilih satuan pakai terlebih dahulu!', 'error');
    if (!konversi || konversi <= 0)
      return showAlert('alert-bahan', '⚠️ Nilai konversi harus lebih dari 0!', 'error');

    // -- Hitung harga per satuan pakai --
    const hargaPerPakai = kalkulasiHargaPerPakai(jumlahBeli, hargaBeli, konversi);

    // -- Simpan ke DB --
    DB.addBahan({
      id          : uid(),
      nama        : nama,
      kategori    : kategori || 'Lainnya',
      satuanBeli  : satuanBeli,
      jumlahBeli  : jumlahBeli,
      hargaBeli   : hargaBeli,
      satuanPakai : satuanPakai,
      konversi    : konversi,
      hargaPerPakai: roundTo(hargaPerPakai, 6),
      tgl         : tglSekarang()
    });

    // -- Reset form --
    _resetFormBahan();

    // -- Notifikasi sukses --
    showAlert(
      'alert-bahan',
      `✅ "${nama}" berhasil disimpan! ` +
      `Harga per ${satuanPakai}: ${rupiah(roundTo(hargaPerPakai, 2))}`,
      'success'
    );
  }

  /**
   * Reset semua field form input bahan baku
   * @private
   */
  function _resetFormBahan() {
    const fields = [
      'bahan-nama', 'bahan-jumlah-beli',
      'bahan-harga-beli', 'bahan-konversi'
    ];
    const selects = [
      'bahan-satuan-beli', 'bahan-satuan-pakai', 'bahan-kategori'
    ];
    fields.forEach(id  => { document.getElementById(id).value = ''; });
    selects.forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('hasil-konversi').style.display = 'none';
    document.getElementById('konversi-info').style.display  = 'none';
  }

  /* ============================================================
     SECTION 3 — IMPORT EXCEL: STATE & DOWNLOAD TEMPLATE
  ============================================================ */

  /** State sementara untuk menyimpan data hasil parse Excel */
  let importData = [];

  /**
   * Generate & download file template Excel (.xlsx)
   * menggunakan library SheetJS (xlsx).
   */
  function downloadTemplate() {
    const wsData = [
      // -- Baris 1: Header kolom --
      [
        'Nama Bahan',
        'Kategori',
        'Satuan Beli',
        'Jumlah Beli',
        'Total Harga Beli (Rp)',
        'Satuan Pakai',
        'Nilai Konversi'
      ],
      // -- Baris 2: Petunjuk --
      ['--- PETUNJUK ---', '', '', '', '', '', ''],
      [
        'Isi nama bahan baku',
        'Bahan Utama / Bumbu / Sayuran / Protein / Minuman / Kemasan / Lainnya',
        'kg / gram / ons / liter / ml / pcs / butir / buah / ikat / porsi / pack / botol / kaleng',
        'Angka: berapa banyak yang dibeli',
        'Angka: total harga yang dibayar (Rp)',
        'kg / gram / ons / liter / ml / pcs / butir / buah / ikat / porsi / pack / botol / kaleng',
        'Angka: 1 satuan beli = ? satuan pakai'
      ],
      // -- Baris 4: Contoh --
      ['--- CONTOH DATA ---', '', '', '', '', '', ''],
      ['Susu UHT',       'Minuman',     'liter', 1,   15000,  'ml',   1000],
      ['Kopi Arabica',   'Bahan Utama', 'gram',  200, 200000, 'gram', 1   ],
      ['Tepung Terigu',  'Bahan Utama', 'kg',    1,   12000,  'gram', 1000],
      ['Telur Ayam',     'Protein',     'pcs',   1,   2500,   'pcs',  1   ],
      ['Gula Pasir',     'Bahan Utama', 'kg',    1,   14000,  'gram', 1000],
      ['Minyak Goreng',  'Bahan Utama', 'liter', 2,   36000,  'ml',   1000],
      ['Garam',          'Bumbu',       'gram',  500, 5000,   'gram', 1   ],
      ['Bawang Merah',   'Bumbu',       'kg',    1,   30000,  'gram', 1000],
      ['Bawang Putih',   'Bumbu',       'kg',    1,   40000,  'gram', 1000],
      ['Ayam Fillet',    'Protein',     'kg',    1,   45000,  'gram', 1000],
    ];

    // -- Buat workbook & worksheet --
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // -- Set lebar kolom --
    ws['!cols'] = [
      { wch: 20 }, // Nama Bahan
      { wch: 16 }, // Kategori
      { wch: 13 }, // Satuan Beli
      { wch: 13 }, // Jumlah Beli
      { wch: 24 }, // Total Harga Beli
      { wch: 13 }, // Satuan Pakai
      { wch: 16 }, // Nilai Konversi
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Bahan Baku');
    XLSX.writeFile(wb, 'template_bahan_baku.xlsx');

    showAlert(
      'alert-import',
      '✅ Template berhasil didownload! ' +
      'Isi data mulai baris ke-5 (hapus baris petunjuk & contoh jika perlu).',
      'success'
    );
  }

  /* ============================================================
     SECTION 4 — IMPORT EXCEL: UPLOAD & PARSE FILE
  ============================================================ */

  /**
   * Handler drag & drop file ke import zone
   * @param {DragEvent} e
   */
  function handleDrop(e) {
    e.preventDefault();
    document.getElementById('import-zone').classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) _prosesFile(file);
  }

  /**
   * Handler klik pilih file dari input[type=file]
   * @param {Event} e
   */
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) _prosesFile(file);
  }

  /**
   * Baca & parse file Excel, lalu tampilkan preview
   * @private
   * @param {File} file
   */
  function _prosesFile(file) {
    // -- Validasi ekstensi --
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showAlert('alert-import', '⚠️ Format file harus .xlsx atau .xls!', 'error');
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        // -- Parse Excel --
        const wb  = XLSX.read(e.target.result, { type: 'binary' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // -- Filter: skip header (baris 0) & baris petunjuk/contoh --
        const rows = raw.filter((row, index) => {
          if (index === 0) return false; // header kolom
          const firstCell = String(row[0] || '').trim();
          if (firstCell === '')           return false; // baris kosong
          if (firstCell.startsWith('---')) return false; // baris petunjuk
          return true;
        });

        if (rows.length === 0) {
          showAlert('alert-import', '⚠️ Tidak ada data ditemukan dalam file!', 'error');
          return;
        }

        // -- Parse setiap baris menjadi object --
        importData = rows.map((row, i) => _parseRow(row, i));

        // -- Render preview tabel --
        _renderPreviewImport();

        // -- Tampilkan section preview --
        document.getElementById('import-preview-section').style.display = 'block';

        // -- Tampilkan summary --
        const valid   = importData.filter(x => x.status === 'valid').length;
        const invalid = importData.filter(x => x.status === 'error').length;
        document.getElementById('import-summary').innerHTML =
          `📋 Ditemukan <strong>${importData.length} baris</strong> data — ` +
          `<span style="color:#27ae60"><strong>✅ ${valid} valid</strong></span>` +
          (invalid > 0
            ? ` &nbsp;|&nbsp; <span style="color:#e74c3c"><strong>❌ ${invalid} error</strong></span>`
            : '');

      } catch (err) {
        console.error('[Import] Error parse file:', err);
        showAlert(
          'alert-import',
          '❌ Gagal membaca file. Pastikan format file Excel benar!',
          'error'
        );
      }
    };

    reader.onerror = function () {
      showAlert('alert-import', '❌ Gagal membaca file!', 'error');
    };

    reader.readAsBinaryString(file);
  }

  /**
   * Parse satu baris Excel menjadi object bahan baku
   * @private
   * @param {Array} row   - array nilai dari satu baris
   * @param {number} idx  - index baris (untuk log)
   * @returns {Object}
   */
  function _parseRow(row, idx) {
    const nama        = String(row[0] || '').trim();
    const kategori    = String(row[1] || 'Lainnya').trim();
    const satuanBeli  = String(row[2] || '').trim();
    const jumlahBeli  = parseFloat(row[3]) || 0;
    const hargaBeli   = parseFloat(row[4]) || 0;
    const satuanPakai = String(row[5] || '').trim();
    const konversi    = parseFloat(row[6]) || 0;

    // -- Validasi per field --
    let status = 'valid';
    let errMsg = '';

    if (isEmpty(nama)) {
      status = 'error'; errMsg = 'Nama kosong';
    } else if (isEmpty(satuanBeli)) {
      status = 'error'; errMsg = 'Satuan beli kosong';
    } else if (jumlahBeli <= 0) {
      status = 'error'; errMsg = 'Jumlah beli tidak valid';
    } else if (hargaBeli <= 0) {
      status = 'error'; errMsg = 'Harga beli tidak valid';
    } else if (isEmpty(satuanPakai)) {
      status = 'error'; errMsg = 'Satuan pakai kosong';
    } else if (konversi <= 0) {
      status = 'error'; errMsg = 'Nilai konversi tidak valid';
    }

    const hargaPerPakai = status === 'valid'
      ? roundTo(kalkulasiHargaPerPakai(jumlahBeli, hargaBeli, konversi), 6)
      : 0;

    return {
      nama, kategori, satuanBeli, jumlahBeli,
      hargaBeli, satuanPakai, konversi,
      hargaPerPakai, status, errMsg
    };
  }

  /* ============================================================
     SECTION 5 — IMPORT EXCEL: RENDER PREVIEW TABEL
  ============================================================ */

  /**
   * Render tabel preview data yang akan diimport
   * @private
   */
  function _renderPreviewImport() {
    const tbody = document.getElementById('tbody-preview');

    if (importData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              <div class="empty-icon">📭</div>
              <p>Tidak ada data untuk ditampilkan</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = importData.map((d, i) => `
      <tr style="${d.status === 'error' ? 'background:#fff5f5;' : ''}">
        <td style="color:#999">${i + 1}</td>
        <td><strong>${d.nama || '-'}</strong></td>
        <td>${d.kategori}</td>
        <td>${d.satuanBeli  || '-'}</td>
        <td>${d.jumlahBeli  || '-'}</td>
        <td>${d.hargaBeli   ? rupiah(d.hargaBeli) : '-'}</td>
        <td>${d.satuanPakai || '-'}</td>
        <td>${d.konversi    || '-'}</td>
        <td>
          ${d.status === 'valid'
            ? `<strong style="color:#27ae60">${rupiah(roundTo(d.hargaPerPakai, 2))}</strong>`
            : '<span style="color:#aaa">-</span>'}
        </td>
        <td>
          ${d.status === 'valid'
            ? '<span class="badge badge-green">✅ Valid</span>'
            : `<span class="badge badge-red" title="${d.errMsg}">❌ ${d.errMsg}</span>`}
        </td>
      </tr>
    `).join('');
  }

  /* ============================================================
     SECTION 6 — IMPORT EXCEL: TOGGLE WARNING & PROSES IMPORT
  ============================================================ */

  /**
   * Tampilkan/sembunyikan warning Replace
   * @param {string} mode - 'replace' | 'modify'
   */
  function toggleReplaceWarning(mode) {
    const el = document.getElementById('replace-warning');
    el.style.display = mode === 'replace' ? 'block' : 'none';
  }

  /**
   * Proses import data valid ke database
   * sesuai mode yang dipilih (modify / replace)
   */
  function prosesImport() {
    const validData = importData.filter(x => x.status === 'valid');

    if (validData.length === 0) {
      showAlert(
        'alert-import',
        '⚠️ Tidak ada data valid untuk diimport! Periksa kembali file Anda.',
        'error'
      );
      return;
    }

    const mode = document.querySelector('input[name="import-mode"]:checked').value;

    // -- Konversi ke format object DB --
    const newItems = validData.map(d => ({
      id           : uid(),
      nama         : d.nama,
      kategori     : d.kategori || 'Lainnya',
      satuanBeli   : d.satuanBeli,
      jumlahBeli   : d.jumlahBeli,
      hargaBeli    : d.hargaBeli,
      satuanPakai  : d.satuanPakai,
      konversi     : d.konversi,
      hargaPerPakai: d.hargaPerPakai,
      tgl          : tglSekarang()
    }));

    if (mode === 'replace') {
      // -- Ganti semua data bahan baku --
      DB.saveBahan(newItems);
      showAlert(
        'alert-import',
        `✅ Replace berhasil! ${newItems.length} bahan baku telah diganti dengan data baru.`,
        'success'
      );
    } else {
      // -- Tambahkan ke data yang sudah ada --
      const existing = DB.getBahan();
      DB.saveBahan([...existing, ...newItems]);
      showAlert(
        'alert-import',
        `✅ Modify berhasil! ${newItems.length} bahan baku baru ditambahkan ` +
        `(total: ${existing.length + newItems.length} bahan).`,
        'success'
      );
    }

    // -- Reset state import --
    batalImport();
  }

  /**
   * Batal import — reset semua state & tampilan
   */
  function batalImport() {
    importData = [];
    document.getElementById('import-preview-section').style.display = 'none';
    document.getElementById('file-excel').value                      = '';
    document.getElementById('replace-warning').style.display         = 'none';
    // Reset radio ke default (modify)
    const radioModify = document.querySelector('input[name="import-mode"][value="modify"]');
    if (radioModify) radioModify.checked = true;
  }
