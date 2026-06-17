  /**
   * ============================================================
   *  render.js — Fungsi Render Tampilan Tab 3, 4, dan 5
   *  Dependensi: db.js (harus di-load lebih dulu)
   * ============================================================
   */

  'use strict';

  /* ============================================================
     SECTION 1 — TAB 3: DATA HPP
  ============================================================ */

  /**
   * Update 3 stat card di bagian atas Tab 3:
   * Total Menu, Rata-rata Margin, Rata-rata HPP
   */
  function updateStats() {
    const stats = DB.getStatsHPP();

    document.getElementById('stat-menu').textContent =
      stats.totalMenu;

    document.getElementById('stat-avg-margin').textContent =
      stats.totalMenu > 0
        ? roundTo(stats.avgMargin, 1) + '%'
        : '0%';

    document.getElementById('stat-avg-hpp').textContent =
      stats.totalMenu > 0
        ? 'Rp' + Math.round(stats.avgHPP).toLocaleString('id-ID')
        : 'Rp0';
  }

  /**
   * Render tabel Data HPP (Tab 3).
   * Dipanggil saat tab dibuka atau user mengetik di search box.
   */
  function renderDataHPP() {
    const query  = document.getElementById('search-hpp').value.toLowerCase().trim();
    const db     = query ? DB.searchHPP(query) : DB.getHPP();
    const tbody  = document.getElementById('tbody-hpp');

    // -- Empty state --
    if (db.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <div class="empty-icon">📊</div>
              <p>${query ? `Tidak ada menu yang cocok dengan "<strong>${query}</strong>"` : 'Belum ada data HPP. Tambahkan di tab Input HPP.'}</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    // -- Render baris tabel --
    tbody.innerHTML = db.map(x => {
      const m          = parseFloat(x.marginPct || 0);
      const badgeClass = _getMarginBadgeClass(m);
      const marginIcon = m >= 30 ? '🟢' : m >= 10 ? '🟡' : '🔴';

      return `
        <tr>
          <td>
            <strong>${x.nama}</strong>
            <br>
            <small style="color:#aaa">${x.tgl}</small>
          </td>
          <td>
            <span class="badge badge-blue">${x.kategori}</span>
          </td>
          <td>${rupiah(roundTo(x.hppBahan, 0))}</td>
          <td>${rupiah(x.overhead || 0)}</td>
          <td>
            <strong style="color:#1e3a5f">
              ${rupiah(roundTo(x.hppTotal, 0))}
            </strong>
          </td>
          <td>${rupiah(x.hargaJual)}</td>
          <td>
            <span class="badge ${badgeClass}">
              ${marginIcon} ${m}%
            </span>
          </td>
          <td>
            <button
              class="btn btn-danger btn-sm"
              onclick="hapusData('hpp', '${x.id}', '${_escapeStr(x.nama)}')"
              title="Hapus menu ini">
              🗑
            </button>
          </td>
        </tr>`;
    }).join('');
  }

  /* ============================================================
     SECTION 2 — TAB 4: LIST BAHAN BAKU
  ============================================================ */

  /**
   * Render tabel List Bahan Baku (Tab 4).
   * Dipanggil saat tab dibuka atau user mengetik di search box.
   */
  function renderListBahan() {
    const query  = document.getElementById('search-bahan').value.toLowerCase().trim();
    const db     = query ? DB.searchBahan(query) : DB.getBahan();
    const tbody  = document.getElementById('tbody-bahan');

    // -- Empty state --
    if (db.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state">
              <div class="empty-icon">📦</div>
              <p>${query ? `Tidak ada bahan yang cocok dengan "<strong>${query}</strong>"` : 'Belum ada bahan baku. Tambahkan di tab Input Bahan Baku.'}</p>
            </div>
          </td>
        </tr>`;
      return;
    }

    // -- Render baris tabel --
    tbody.innerHTML = db.map(x => `
      <tr>
        <td>
          <strong>${x.nama}</strong>
        </td>
        <td>
          <span class="badge badge-blue">${x.kategori}</span>
        </td>
        <td>
          ${x.jumlahBeli} ${x.satuanBeli}
          <br>
          <small style="color:#aaa">${rupiah(x.hargaBeli)}</small>
        </td>
        <td>
          <small style="color:#888">
            1 ${x.satuanBeli} = ${x.konversi} ${x.satuanPakai}
          </small>
        </td>
        <td>${x.satuanPakai}</td>
        <td>
          <strong style="color:#27ae60">
            ${rupiah(roundTo(x.hargaPerPakai, 2))}
          </strong>
          <small style="color:#aaa"> / ${x.satuanPakai}</small>
        </td>
        <td>
          <small style="color:#aaa">${x.tgl}</small>
        </td>
        <td>
          <button
            class="btn btn-danger btn-sm"
            onclick="hapusData('bahan', '${x.id}', '${_escapeStr(x.nama)}')"
            title="Hapus bahan ini">
            🗑
          </button>
        </td>
      </tr>
    `).join('');
  }

  /* ============================================================
     SECTION 3 — TAB 5: LIST RESEP MENU
  ============================================================ */

  /**
   * Render list kartu resep menu (Tab 5).
   * Setiap menu ditampilkan sebagai card berisi
   * tabel rincian bahan + summary HPP.
   * Dipanggil saat tab dibuka atau user mengetik di search box.
   */
  function renderListResep() {
    const query     = document.getElementById('search-resep').value.toLowerCase().trim();
    const db        = query ? DB.searchHPP(query) : DB.getHPP();
    const container = document.getElementById('resep-list-container');

    // -- Empty state --
    if (db.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>${query ? `Tidak ada menu yang cocok dengan "<strong>${query}</strong>"` : 'Belum ada resep menu. Tambahkan di tab Input HPP.'}</p>
        </div>`;
      return;
    }

    // -- Render kartu per menu --
    container.innerHTML = db.map(x => {
      const m          = parseFloat(x.marginPct || 0);
      const badgeClass = _getMarginBadgeClass(m);
      const marginIcon = m >= 30 ? '🟢' : m >= 10 ? '🟡' : '🔴';

      // Tabel rincian bahan
      const tabelBahan = (x.breakdown && x.breakdown.length > 0)
        ? x.breakdown.map(b => `
            <tr>
              <td>${b.nama}</td>
              <td style="text-align:right">${b.jumlah}</td>
              <td>${b.satuan}</td>
              <td style="text-align:right">
                ${rupiah(roundTo(b.harga, 2))}
              </td>
              <td style="text-align:right">
                <strong>${rupiah(roundTo(b.subtotal, 0))}</strong>
              </td>
            </tr>
          `).join('')
        : `<tr><td colspan="5" style="color:#aaa;text-align:center">
             Tidak ada rincian bahan
           </td></tr>`;

      return `
        <div class="resep-card">

          <!-- Header kartu -->
          <div class="resep-card-header">
            <h3>🍽 ${x.nama}</h3>
            <span class="badge badge-blue">${x.kategori}</span>
            <span class="badge ${badgeClass}">
              ${marginIcon} Margin ${m}%
            </span>
          </div>
          <div class="resep-card-meta">
            📅 Disimpan: ${x.tgl}
          </div>

          <!-- Tabel rincian bahan -->
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bahan</th>
                  <th style="text-align:right">Jumlah</th>
                  <th>Satuan</th>
                  <th style="text-align:right">Harga / Satuan</th>
                  <th style="text-align:right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${tabelBahan}
              </tbody>
            </table>
          </div>

          <!-- Summary HPP -->
          <div style="
            margin-top:12px;
            background:#f8f9fa;
            border-radius:8px;
            padding:12px 16px;
            border:1px solid #e8e8e8;">

            <div class="hpp-row">
              <span>Total HPP Bahan</span>
              <span>${rupiah(roundTo(x.hppBahan, 0))}</span>
            </div>
            <div class="hpp-row">
              <span>Biaya Overhead</span>
              <span>${rupiah(x.overhead || 0)}</span>
            </div>
            <div class="hpp-row">
              <span><strong>Total HPP</strong></span>
              <span>
                <strong style="color:#1e3a5f">
                  ${rupiah(roundTo(x.hppTotal, 0))}
                </strong>
              </span>
            </div>
            <div class="hpp-row">
              <span>Harga Jual</span>
              <span>${rupiah(x.hargaJual)}</span>
            </div>
            <div class="hpp-row" style="
              background:${m >= 30 ? '#f0fff4' : m >= 10 ? '#fffde7' : '#fff5f5'};
              border-radius:6px; padding:8px 10px; margin-top:4px;">
              <span><strong>Margin / Profit</strong></span>
              <span style="color:${m >= 10 ? '#27ae60' : '#e74c3c'}">
                <strong>
                  ${rupiah(roundTo(x.margin, 0))} (${m}%)
                </strong>
              </span>
            </div>

          </div>
        </div>`;
    }).join('');
  }

  /* ============================================================
     SECTION 4 — MODAL HAPUS DATA
  ============================================================ */

  /**
   * State target data yang akan dihapus
   * { type: 'bahan'|'hpp', id: string }
   */
  let hapusTarget = null;

  /**
   * Buka modal konfirmasi hapus.
   * Dipanggil dari tombol 🗑 di tabel.
   *
   * @param {string} type  - 'bahan' | 'hpp'
   * @param {string} id    - id data yang akan dihapus
   * @param {string} nama  - nama data (untuk pesan konfirmasi)
   */
  function hapusData(type, id, nama) {
    hapusTarget = { type, id };

    const typeLabel = type === 'bahan' ? 'bahan baku' : 'menu HPP';
    document.getElementById('modal-msg').innerHTML =
      `Apakah Anda yakin ingin menghapus <strong>${typeLabel}</strong>:<br>` +
      `<strong style="color:#e74c3c">"${nama}"</strong>?<br><br>` +
      `<small style="color:#aaa">Data yang dihapus tidak bisa dikembalikan.</small>`;

    document.getElementById('modal-hapus').classList.add('show');
  }

  /**
   * Tutup modal hapus & reset state target.
   */
  function tutupModal() {
    document.getElementById('modal-hapus').classList.remove('show');
    hapusTarget = null;
  }

  /**
   * Eksekusi hapus data setelah user konfirmasi.
   * Dipanggil saat user klik tombol "Hapus" di modal.
   */
  function konfirmasiHapus() {
    if (!hapusTarget) return;

    if (hapusTarget.type === 'bahan') {
      DB.deleteBahan(hapusTarget.id);
      renderListBahan();
    } else if (hapusTarget.type === 'hpp') {
      DB.deleteHPP(hapusTarget.id);
      renderDataHPP();
      renderListResep();
      updateStats();
    }

    tutupModal();
  }

  /* ============================================================
     SECTION 5 — HELPER PRIVATE
  ============================================================ */

  /**
   * Tentukan class badge berdasarkan nilai margin (%)
   * @private
   * @param   {number} marginPct
   * @returns {string} class badge CSS
   */
  function _getMarginBadgeClass(marginPct) {
    if (marginPct >= 30) return 'badge-green';
    if (marginPct >= 10) return 'badge-orange';
    return 'badge-red';
  }

  /**
   * Escape karakter khusus untuk string dalam atribut HTML
   * (mencegah XSS pada nama yang mengandung tanda kutip)
   * @private
   * @param   {string} str
   * @returns {string}
   */
  function _escapeStr(str) {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '&quot;');
  }
