  /**
   * ============================================================
   *  hpp.js — Logika Input HPP Menu & Kalkulasi
   *  Dependensi: db.js (harus di-load lebih dulu)
   * ============================================================
   */

  'use strict';

  /* ============================================================
     STATE — Resep items sementara (sebelum disimpan)
  ============================================================ */

  /**
   * Array sementara untuk menampung bahan-bahan
   * yang sedang diinput dalam satu menu HPP.
   * Format tiap item:
   * {
   *   id      : string  — unique id baris resep
   *   bahanId : string  — id bahan baku dari DB
   *   jumlah  : number  — jumlah pemakaian (dalam satuan pakai)
   * }
   */
  let resepItems = [];

  /* ============================================================
     SECTION 1 — MANAJEMEN BARIS RESEP
  ============================================================ */

  /**
   * Tambah satu baris bahan baru ke resep.
   * Dipanggil saat user klik "+ Tambah Bahan".
   */
  function tambahResepItem() {
    const bahan = DB.getBahan();

    if (bahan.length === 0) {
      showAlert(
        'alert-hpp',
        '⚠️ Belum ada bahan baku! Silakan tambahkan bahan baku di tab "Input Bahan Baku" terlebih dahulu.',
        'error'
      );
      return;
    }

    resepItems.push({
      id     : uid(),
      bahanId: '',
      jumlah : 0
    });

    _renderResepItems();
  }

  /**
   * Update nilai field tertentu pada satu baris resep.
   * @param {string} id    - id baris resep
   * @param {string} field - 'bahanId' | 'jumlah'
   * @param {*}      val   - nilai baru
   */
  function updateResep(id, field, val) {
    const item = resepItems.find(r => r.id === id);
    if (!item) return;

    item[field] = val;

    _renderResepItems();
    hitungHPP();
  }

  /**
   * Hapus satu baris resep berdasarkan id.
   * @param {string} id - id baris resep
   */
  function hapusResepItem(id) {
    resepItems = resepItems.filter(r => r.id !== id);
    _renderResepItems();
    hitungHPP();
  }

  /**
   * Render ulang seluruh daftar baris resep ke DOM.
   * @private
   */
  function _renderResepItems() {
    const semuaBahan = DB.getBahan();
    const container  = document.getElementById('resep-container');

    if (resepItems.length === 0) {
      container.innerHTML = `
        <div style="
          text-align:center; padding:20px;
          color:#bbb; font-size:0.88rem;
          border:2px dashed #e0e0e0;
          border-radius:8px; margin-bottom:8px;">
          Belum ada bahan. Klik "+ Tambah Bahan" untuk mulai.
        </div>`;
      return;
    }

    container.innerHTML = resepItems.map(item => {
      const bahan      = semuaBahan.find(b => b.id === item.bahanId);
      const satuanTeks = bahan ? bahan.satuanPakai : '';
      const infoHarga  = bahan
        ? `💡 Harga: ${rupiah(roundTo(bahan.hargaPerPakai, 2))} / ${bahan.satuanPakai}`
        : '';
      const subtotal   = (bahan && item.jumlah > 0)
        ? rupiah(roundTo(bahan.hargaPerPakai * item.jumlah, 0))
        : '';

      return `
        <div class="resep-item">
          <select onchange="updateResep('${item.id}', 'bahanId', this.value)">
            <option value="">-- Pilih Bahan --</option>
            ${semuaBahan.map(b => `
              <option value="${b.id}" ${b.id === item.bahanId ? 'selected' : ''}>
                ${b.nama} (${b.satuanPakai})
              </option>
            `).join('')}
          </select>

          <input
            type="number"
            placeholder="Jumlah"
            min="0"
            step="0.01"
            value="${item.jumlah > 0 ? item.jumlah : ''}"
            onchange="updateResep('${item.id}', 'jumlah', parseFloat(this.value) || 0)"
          >

          <span style="
            font-size:0.82rem; color:#2d6a9f;
            font-weight:600; align-self:center;
            text-align:center;">
            ${satuanTeks}
          </span>

          <button
            class="btn btn-danger btn-sm"
            onclick="hapusResepItem('${item.id}')"
            title="Hapus bahan ini">
            ✕
          </button>

          ${(infoHarga || subtotal) ? `
            <div class="resep-item-info">
              ${infoHarga}
              ${(infoHarga && subtotal) ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : ''}
              ${subtotal ? `Subtotal: <strong>${subtotal}</strong>` : ''}
            </div>
          ` : ''}
        </div>`;
    }).join('');
  }

  /* ============================================================
     SECTION 2 — KALKULASI HPP
  ============================================================ */

  /**
   * Hitung total HPP dari resep yang sedang diinput.
   * @returns {Object} { totalBahan, totalHPP, margin, marginPct, hppPct, breakdown }
   */
  function hitungHPP() {
    const semuaBahan = DB.getBahan();
    let   totalBahan = 0;
    const breakdown  = [];

    resepItems.forEach(item => {
      if (!item.bahanId || item.jumlah <= 0) return;

      const bahan = semuaBahan.find(b => b.id === item.bahanId);
      if (!bahan) return;

      const subtotal = bahan.hargaPerPakai * item.jumlah;
      totalBahan    += subtotal;

      breakdown.push({
        nama    : bahan.nama,
        jumlah  : item.jumlah,
        satuan  : bahan.satuanPakai,
        harga   : bahan.hargaPerPakai,
        subtotal: subtotal
      });
    });

    const overhead  = parseFloat(document.getElementById('hpp-overhead').value)  || 0;
    const hargaJual = parseFloat(document.getElementById('hpp-harga-jual').value) || 0;
    const totalHPP  = totalBahan + overhead;
    const margin    = hargaJual - totalHPP;
    const marginPct = hargaJual > 0
      ? roundTo((margin / hargaJual) * 100, 1)
      : 0;

    // ✅ BARU: Hitung % HPP = (Total HPP / Harga Jual) × 100
    const hppPct = hargaJual > 0
      ? roundTo((totalHPP / hargaJual) * 100, 1)
      : 0;

    _updateBreakdownUI(breakdown, totalBahan);
    _updateMarginUI(totalBahan, overhead, totalHPP, hargaJual, margin, marginPct, hppPct);

    return { totalBahan, totalHPP, margin, marginPct, hppPct, breakdown };
  }

  /**
   * Update UI breakdown rincian bahan
   * @private
   */
  function _updateBreakdownUI(breakdown, totalBahan) {
    const elPreview   = document.getElementById('hpp-preview');
    const elBreakdown = document.getElementById('hpp-breakdown');

    if (breakdown.length === 0) {
      elPreview.style.display = 'none';
      return;
    }

    elPreview.style.display = 'block';
    elBreakdown.innerHTML   =
      breakdown.map(b => `
        <div class="hpp-row">
          <span>${b.nama}
            <small style="color:#999">
              (${b.jumlah} ${b.satuan} × ${rupiah(roundTo(b.harga, 2))})
            </small>
          </span>
          <span>${rupiah(roundTo(b.subtotal, 0))}</span>
        </div>
      `).join('') +
      `<div class="hpp-row" style="font-weight:700; margin-top:4px;">
        <span>Total HPP Bahan</span>
        <span>${rupiah(roundTo(totalBahan, 0))}</span>
      </div>`;
  }

  /**
   * Update UI summary margin & profit + % HPP indicator
   * @private
   */
  function _updateMarginUI(totalBahan, overhead, totalHPP, hargaJual, margin, marginPct, hppPct) {
    const elMargin = document.getElementById('margin-info');

    if (hargaJual <= 0 && overhead <= 0) {
      elMargin.style.display = 'none';
      return;
    }

    elMargin.style.display = 'block';

    document.getElementById('info-hpp-bahan').textContent  = rupiah(roundTo(totalBahan, 0));
    document.getElementById('info-overhead').textContent   = rupiah(overhead);
    document.getElementById('info-hpp-total').textContent  = rupiah(roundTo(totalHPP, 0));
    document.getElementById('info-harga-jual').textContent = rupiah(hargaJual);

    // -- Update Margin --
    const elMarginVal       = document.getElementById('info-margin');
    elMarginVal.textContent = `${rupiah(roundTo(margin, 0))} (${marginPct}%)`;
    elMarginVal.style.color = margin >= 0 ? '#27ae60' : '#e74c3c';

    const elMarginRow = elMarginVal.closest('.hpp-row');
    if (elMarginRow) {
      if (marginPct >= 30) {
        elMarginRow.style.background = '#f0fff4';
      } else if (marginPct >= 10) {
        elMarginRow.style.background = '#fffde7';
      } else {
        elMarginRow.style.background = '#fff5f5';
      }
    }

    // ✅ BARU: Update badge % HPP dengan warna merah/hijau
    const elHppPct = document.getElementById('info-hpp-pct');
    if (elHppPct) {
      if (hargaJual > 0) {
        elHppPct.textContent = hppPct.toFixed(1) + '%';

        if (hppPct > 35) {
          // 🔴 Merah — HPP terlalu tinggi (> 35%)
          elHppPct.style.background  = '#e74c3c';
          elHppPct.style.color       = '#fff';
          elHppPct.title             = '⚠️ HPP terlalu tinggi! Idealnya ≤ 35%';
        } else {
          // 🟢 Hijau — HPP aman (≤ 35%)
          elHppPct.style.background  = '#27ae60';
          elHppPct.style.color       = '#fff';
          elHppPct.title             = '✅ HPP dalam batas ideal';
        }
      } else {
        // Abu-abu — harga jual belum diisi
        elHppPct.textContent        = '0%';
        elHppPct.style.background   = '#bdc3c7';
        elHppPct.style.color        = '#fff';
        elHppPct.title              = 'Isi harga jual untuk melihat % HPP';
      }
    }
  }

  /* ============================================================
     SECTION 3 — SIMPAN HPP MENU
  ============================================================ */

  /**
   * Validasi & simpan data HPP menu ke database.
   */
  function simpanHPP() {
    const nama      = document.getElementById('hpp-nama').value.trim();
    const kategori  = document.getElementById('hpp-kategori').value;
    const overhead  = parseFloat(document.getElementById('hpp-overhead').value)  || 0;
    const hargaJual = parseFloat(document.getElementById('hpp-harga-jual').value) || 0;

    if (isEmpty(nama))
      return showAlert('alert-hpp', '⚠️ Nama menu tidak boleh kosong!', 'error');

    if (resepItems.length === 0)
      return showAlert('alert-hpp', '⚠️ Tambahkan minimal 1 bahan ke resep!', 'error');

    const itemsValid = resepItems.filter(r => r.bahanId && r.jumlah > 0);
    if (itemsValid.length === 0)
      return showAlert('alert-hpp', '⚠️ Pilih bahan dan isi jumlahnya terlebih dahulu!', 'error');

    if (hargaJual <= 0)
      return showAlert('alert-hpp', '⚠️ Harga jual harus diisi dan lebih dari 0!', 'error');

    const calc = hitungHPP();

    // -- Warning jika HPP > 35% --
    if (calc.hppPct > 35) {
      const lanjut = confirm(
        `⚠️ Perhatian!\n\n` +
        `% HPP kamu adalah ${calc.hppPct}% — melebihi batas ideal 35%.\n` +
        `HPP: ${rupiah(roundTo(calc.totalHPP, 0))} | Harga Jual: ${rupiah(hargaJual)}\n\n` +
        `Apakah Anda tetap ingin menyimpan?`
      );
      if (!lanjut) return;
    }

    // -- Warning jika margin negatif --
    if (calc.margin < 0) {
      const lanjut = confirm(
        `⚠️ Perhatian!\n\n` +
        `HPP (${rupiah(roundTo(calc.totalHPP, 0))}) lebih tinggi dari Harga Jual (${rupiah(hargaJual)}).\n` +
        `Margin negatif: ${rupiah(roundTo(calc.margin, 0))} (${calc.marginPct}%)\n\n` +
        `Apakah Anda tetap ingin menyimpan?`
      );
      if (!lanjut) return;
    }

    DB.addHPP({
      id        : uid(),
      nama      : nama,
      kategori  : kategori || 'Lainnya',
      resep     : itemsValid,
      hppBahan  : roundTo(calc.totalBahan, 2),
      overhead  : overhead,
      hppTotal  : roundTo(calc.totalHPP, 2),
      hargaJual : hargaJual,
      margin    : roundTo(calc.margin, 2),
      marginPct : calc.marginPct,
      hppPct    : calc.hppPct,   // ✅ BARU: simpan % HPP ke DB
      breakdown : calc.breakdown,
      tgl       : tglSekarang()
    });

    _resetFormHPP();

    showAlert(
      'alert-hpp',
      `✅ HPP menu "${nama}" berhasil disimpan! ` +
      `Total HPP: ${rupiah(roundTo(calc.totalHPP, 0))} | ` +
      `% HPP: ${calc.hppPct}% | ` +
      `Margin: ${calc.marginPct}%`,
      'success'
    );
  }

  /* ============================================================
     SECTION 4 — RESET FORM HPP
  ============================================================ */

  /**
   * Reset semua field & state form input HPP.
   * @private
   */
  function _resetFormHPP() {
    ['hpp-nama', 'hpp-overhead', 'hpp-harga-jual']
      .forEach(id => { document.getElementById(id).value = ''; });

    document.getElementById('hpp-kategori').value = '';

    resepItems = [];
    _renderResepItems();

    document.getElementById('hpp-preview').style.display = 'none';
    document.getElementById('margin-info').style.display = 'none';

    // ✅ Reset badge % HPP
    const elHppPct = document.getElementById('info-hpp-pct');
    if (elHppPct) {
      elHppPct.textContent       = '0%';
      elHppPct.style.background  = '#bdc3c7';
      elHppPct.style.color       = '#fff';
      elHppPct.title             = '';
    }

    const elMarginRow = document.querySelector('#margin-info .hpp-row:last-child');
    if (elMarginRow) elMarginRow.style.background = '';
  }
