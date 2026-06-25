// script.js

const SUPABASE_URL = 'https://mslsgobvzzxxkwfvpjhx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zbHNnb2J2enp4eGt3ZnZwamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMzAzMDEsImV4cCI6MjA5NzgwNjMwMX0.V7pUmC3En3O0pc3VamJUm9eq7cnB7UFLi333LmtnJqQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let bahanBakuList = [], tempKomposisiBaru = [], tempKomposisiEdit = []; 
let fileImportTertunda = null, jenisImportTertunda = '';
let bbCurrentPage = 1, bbItemsPerPage = 10;
let adminAktif = null;
let bbSortKey = 'nama', bbSortOrder = 'asc';

// Pengaturan Threshold HPP dan Overhead
let hppLimitThreshold = parseFloat(localStorage.getItem('fnb_hpp_limit')) || 35;
let overheadCost = parseFloat(localStorage.getItem('fnb_overhead')) || 0;

const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(angka);
function formatRupiahInput(element) { let val = element.value.replace(/[^,\d]/g, '').toString(); let split = val.split(','); let sisa = split[0].length % 3; let rupiah = split[0].substr(0, sisa); let ribuan = split[0].substr(sisa).match(/\d{3}/gi); if(ribuan) { let separator = sisa ? '.' : ''; rupiah += separator + ribuan.join('.'); } rupiah = split[1] != undefined ? rupiah + ',' + split[1] : rupiah; element.value = rupiah; }
function getNilaiAsli(stringInput) { return parseFloat(String(stringInput).replace(/[^0-9]/g, '')) || 0; }
function closeModal(modalId) { document.getElementById(modalId).classList.add('hidden'); }

// ================= PENGATURAN (SETTINGS) =================
function simpanSettings() {
    const limitVal = parseFloat(document.getElementById('setting-hpp-limit').value);
    const overheadVal = getNilaiAsli(document.getElementById('setting-overhead').value);
    
    if(limitVal > 0 && limitVal <= 100) {
        hppLimitThreshold = limitVal;
        overheadCost = overheadVal;
        localStorage.setItem('fnb_hpp_limit', limitVal);
        localStorage.setItem('fnb_overhead', overheadVal);
        alert('Pengaturan HPP & Overhead berhasil disimpan!');
        loadDirektori(); 
    } else {
        alert('Masukkan angka persentase yang valid (1-100)');
    }
}

function getCardGradient(str) {
    const gradients = ['from-slate-800 to-slate-900', 'from-blue-800 to-indigo-900', 'from-emerald-800 to-teal-900', 'from-rose-800 to-pink-900', 'from-amber-800 to-orange-900', 'from-purple-800 to-fuchsia-900', 'from-cyan-800 to-blue-900', 'from-red-800 to-rose-900', 'from-lime-800 to-green-900'];
    let hash = 0; for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
    return gradients[Math.abs(hash) % gradients.length];
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu'); const overlay = document.getElementById('mobile-overlay');
    if(menu.classList.contains('translate-x-full')) { menu.classList.remove('translate-x-full'); overlay.classList.remove('hidden'); setTimeout(() => overlay.classList.remove('opacity-0'), 10); } else { menu.classList.add('translate-x-full'); overlay.classList.add('opacity-0'); setTimeout(() => overlay.classList.add('hidden'), 300); }
}

function showLoading() { document.getElementById('loading-overlay').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-overlay').classList.add('hidden'); }
function showSummaryModal(isSuccess, title, successCount, failCount) { document.getElementById('summary-icon').innerText = isSuccess ? '✅' : '⚠️'; document.getElementById('summary-title').innerText = title; document.getElementById('summary-success').innerText = successCount; document.getElementById('summary-fail').innerText = failCount; document.getElementById('modal-summary').classList.remove('hidden'); }

// ================= AUTHENTICATION =================
async function inisialisasiAuth() {
    // Set UI awal untuk settings
    document.getElementById('setting-hpp-limit').value = hppLimitThreshold;
    document.getElementById('setting-overhead').value = overheadCost.toString();
    formatRupiahInput(document.getElementById('setting-overhead'));

    const { data: { session } } = await supabaseClient.auth.getSession(); adminAktif = session?.user || null; renderAuthUI();
    supabaseClient.auth.onAuthStateChange((_event, session) => { adminAktif = session?.user || null; renderAuthUI(); });
}

function renderAuthUI() {
    const elAdmins = document.querySelectorAll('.admin-only'); const btnLogin = document.getElementById('btn-login'); const btnLogout = document.getElementById('btn-logout'); const userStatus = document.getElementById('user-status'); const btnLoginMobile = document.getElementById('btn-login-mobile'); const btnLogoutMobile = document.getElementById('btn-logout-mobile'); const userStatusMobile = document.getElementById('user-status-mobile');
    if (adminAktif) { elAdmins.forEach(el => el.classList.remove('hidden')); btnLogin.classList.add('hidden'); btnLogout.classList.remove('hidden'); btnLoginMobile.classList.add('hidden'); btnLogoutMobile.classList.remove('hidden'); userStatus.innerHTML = "🌟 Admin Area"; userStatus.classList.replace('text-gray-500', 'text-blue-600'); userStatus.classList.replace('bg-gray-100', 'bg-blue-50'); userStatusMobile.innerHTML = "🌟 Admin Area"; userStatusMobile.classList.replace('text-gray-500', 'text-blue-600'); userStatusMobile.classList.replace('bg-gray-100', 'bg-blue-50'); } else { elAdmins.forEach(el => el.classList.add('hidden')); btnLogin.classList.remove('hidden'); btnLogout.classList.add('hidden'); btnLoginMobile.classList.remove('hidden'); btnLogoutMobile.classList.add('hidden'); userStatus.innerHTML = "👤 Guest"; userStatus.classList.replace('text-blue-600', 'text-gray-500'); userStatus.classList.replace('bg-blue-50', 'bg-gray-100'); userStatusMobile.innerHTML = "👤 Guest (View Only)"; userStatusMobile.classList.replace('text-blue-600', 'text-gray-500'); userStatusMobile.classList.replace('bg-blue-50', 'bg-gray-100'); const activeTabEl = document.querySelector('.tab-content.active'); if(activeTabEl && ['tab-bahan-baku', 'tab-input-hpp', 'tab-settings'].includes(activeTabEl.id)) { switchTab('tab-direktori'); } }
}

async function loginAdmin() { const email = document.getElementById('login-email').value; const password = document.getElementById('login-password').value; const btn = document.getElementById('btn-submit-login'); if(!email || !password) return alert("Masukkan email dan password!"); btn.innerText = "Memverifikasi..."; const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }); btn.innerText = "Autentikasi"; if(error) alert("Gagal Login: " + error.message); else { closeModal('modal-login'); document.getElementById('login-email').value = ''; document.getElementById('login-password').value = ''; } }
async function logoutAdmin() { await supabaseClient.auth.signOut(); }

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active')); document.querySelectorAll('.btn-tab').forEach(el => el.classList.remove('active')); document.querySelectorAll('.btn-tab-mobile').forEach(el => { el.classList.remove('bg-blue-50', 'text-blue-700', 'font-bold'); el.classList.add('text-gray-600', 'font-semibold'); });
    document.getElementById(tabId).classList.add('active'); document.getElementById('btn-' + tabId).classList.add('active'); const mobileBtn = document.getElementById('btn-' + tabId + '-mobile'); if(mobileBtn) { mobileBtn.classList.remove('text-gray-600', 'font-semibold'); mobileBtn.classList.add('bg-blue-50', 'text-blue-700', 'font-bold'); }
    if(tabId === 'tab-bahan-baku') { bbCurrentPage = 1; loadBahanBaku(); } if(tabId === 'tab-input-hpp') loadDropdownBahanBaku('baru'); if(tabId === 'tab-direktori') loadDirektori();
}

window.addEventListener('click', function(e) { if (!e.target.closest('button[onclick*="toggleKebabMenu"]')) { document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden')); } if (!e.target.closest('.bb-autocomplete')) { const d1 = document.getElementById('r-dropdown-list'); const d2 = document.getElementById('edit-r-dropdown-list'); if(d1) d1.classList.add('hidden'); if(d2) d2.classList.add('hidden'); } });
function toggleKebabMenu(event, menuId) { event.stopPropagation(); const targetMenu = document.getElementById(menuId); const isHidden = targetMenu.classList.contains('hidden'); document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden')); if (isHidden) targetMenu.classList.remove('hidden'); }

// ================= BAHAN BAKU LOGIC =================
function kalkulasiHargaSatuBB(mode) { const prefix = mode === 'edit' ? 'edit-bb-' : 'bb-'; const hrgBeli = getNilaiAsli(document.getElementById(prefix+'harga-beli').value); const konversi = parseFloat(document.getElementById(prefix+'konversi').value) || 1; const satuan = document.getElementById(prefix+'satuan-resep').value || '-'; document.getElementById(prefix+'harga-final').innerText = `${formatRp(hrgBeli / (konversi > 0 ? konversi : 1))} / ${satuan}`; }
function sortBahanBaku(key, order) { bbSortKey = key; bbSortOrder = order; bbCurrentPage = 1; document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden')); renderTabelBahanBaku(); }
async function loadBahanBaku() { const { data, error } = await supabaseClient.from('bahan_baku').select('*'); if (!error) { bahanBakuList = data; renderTabelBahanBaku(); } }
function updatePaginationBB() { bbCurrentPage = 1; const val = document.getElementById('bb-per-page').value; bbItemsPerPage = val === 'all' ? bahanBakuList.length : parseInt(val); renderTabelBahanBaku(); }
function ubahHalamanBB(page) { bbCurrentPage = page; renderTabelBahanBaku(); }
function renderTabelBahanBaku() {
    const searchQuery = document.getElementById('search-bb').value.toLowerCase(); let filteredData = bahanBakuList.filter(item => item.nama.toLowerCase().includes(searchQuery));
    filteredData.sort((a, b) => { let valA = a[bbSortKey] !== null && a[bbSortKey] !== undefined ? a[bbSortKey] : ''; let valB = b[bbSortKey] !== null && b[bbSortKey] !== undefined ? b[bbSortKey] : ''; if (typeof valA === 'string') valA = valA.toLowerCase(); if (typeof valB === 'string') valB = valB.toLowerCase(); if (valA < valB) return bbSortOrder === 'asc' ? -1 : 1; if (valA > valB) return bbSortOrder === 'asc' ? 1 : -1; return 0; });
    const totalData = filteredData.length; const isAll = document.getElementById('bb-per-page').value === 'all'; let limit = isAll ? totalData : bbItemsPerPage; if(limit === 0) limit = 1; const totalPages = Math.ceil(totalData / limit); const startIndex = (bbCurrentPage - 1) * limit; const endIndex = startIndex + limit; const pageData = filteredData.slice(startIndex, endIndex);
    const tbody = document.getElementById('table-bahan-baku'); tbody.innerHTML = '';
    if(totalData === 0) { tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-400 italic">Bahan baku tidak ditemukan.</td></tr>`; } 
    else { pageData.forEach(item => { tbody.innerHTML += `<tr class="border-b border-gray-100 hover:bg-blue-50/30 transition-colors relative"><td class="p-4 font-bold text-gray-700 truncate max-w-xs border-r">${item.nama}</td><td class="p-3 border-l text-gray-500 bg-gray-50/50">${item.satuan_beli || '-'}</td><td class="p-3 border-r font-semibold text-gray-700 bg-gray-50/50">${item.harga_beli ? formatRp(item.harga_beli) : '-'}</td><td class="p-3 text-gray-500">${item.nilai_konversi || 1} ${item.satuan}</td><td class="p-3 text-blue-700 font-black">${formatRp(item.harga)} <span class="text-xs text-gray-400 font-normal">/ ${item.satuan}</span></td><td class="p-3 text-center border-l admin-only ${adminAktif ? '' : 'hidden'}"><button onclick="toggleKebabMenu(event, 'drop-bb-${item.id}')" class="bg-gray-100 hover:bg-gray-200 text-gray-600 w-8 h-8 rounded-lg font-bold transition-colors">⋮</button><div id="drop-bb-${item.id}" class="dropdown-menu hidden absolute right-12 mt-1 bg-white shadow-xl rounded-xl border border-gray-100 w-32 py-2 z-20"><button onclick="bukaModalEditBB(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="w-full text-left px-4 py-2 hover:bg-blue-50 font-semibold text-blue-600">📝 Edit</button><button onclick="aksiHapusBahanBaku(${item.id}, '${item.nama}')" class="w-full text-left px-4 py-2 hover:bg-red-50 font-semibold text-red-600">🗑️ Hapus</button></div></td></tr>`; }); }
    document.getElementById('bb-info-halaman').innerText = `Menampilkan ${totalData > 0 ? startIndex + 1 : 0} - ${Math.min(endIndex, totalData)} dari ${totalData} data`; let btnHTML = '';
    if(!isAll && totalPages > 1) { btnHTML += `<button onclick="ubahHalamanBB(${Math.max(1, bbCurrentPage - 1)})" class="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 font-medium ${bbCurrentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">Prev</button>`; for(let i=1; i<=totalPages; i++) { if (i === bbCurrentPage || i === 1 || i === totalPages || (i >= bbCurrentPage - 1 && i <= bbCurrentPage + 1)) { let active = i === bbCurrentPage ? 'bg-blue-600 text-white border-blue-600 shadow' : 'hover:bg-gray-100 text-gray-700 border-gray-200'; btnHTML += `<button onclick="ubahHalamanBB(${i})" class="px-3 py-1.5 border rounded-lg font-medium ${active}">${i}</button>`; } else if (i === 2 || i === totalPages - 1) { btnHTML += `<span class="px-2 text-gray-400">...</span>`; } } btnHTML += `<button onclick="ubahHalamanBB(${Math.min(totalPages, bbCurrentPage + 1)})" class="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 font-medium ${bbCurrentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">Next</button>`; }
    document.getElementById('bb-pagination-controls').innerHTML = btnHTML; renderAuthUI();
}

async function tambahBahanBaku() { const nama = document.getElementById('bb-nama').value.trim(); const satuanBeli = document.getElementById('bb-satuan-beli').value.trim(); const hargaBeli = getNilaiAsli(document.getElementById('bb-harga-beli').value); const konversi = parseFloat(document.getElementById('bb-konversi').value); const satuanResep = document.getElementById('bb-satuan-resep').value.trim(); if(!nama || !satuanBeli || !hargaBeli || !konversi || !satuanResep) return alert("Lengkapi semua kolom!"); showLoading(); const { error } = await supabaseClient.from('bahan_baku').insert([{ nama, satuan_beli: satuanBeli, harga_beli: hargaBeli, nilai_konversi: konversi, satuan: satuanResep, harga: (hargaBeli/konversi) }]); hideLoading(); if (error) alert("Gagal menyimpan bahan baku!"); else { alert("Berhasil ditambahkan!"); ['nama','satuan-beli','harga-beli','konversi','satuan-resep'].forEach(id => document.getElementById('bb-'+id).value = ''); kalkulasiHargaSatuBB('baru'); loadBahanBaku(); } }
async function aksiHapusBahanBaku(id, nama) { if(confirm(`Yakin hapus "${nama}"?`)) { showLoading(); const { error } = await supabaseClient.from('bahan_baku').delete().eq('id', id); hideLoading(); if(error) { if(error.code === '23503') alert(`DITOLAK: "${nama}" masih digunakan dalam resep.`); else alert("Gagal hapus."); } else loadBahanBaku(); } }
function bukaModalEditBB(item) { document.getElementById('edit-bb-id').value = item.id; document.getElementById('edit-bb-nama').value = item.nama; document.getElementById('edit-bb-satuan-beli').value = item.satuan_beli || ''; document.getElementById('edit-bb-harga-beli').value = item.harga_beli ? item.harga_beli.toString() : ''; formatRupiahInput(document.getElementById('edit-bb-harga-beli')); document.getElementById('edit-bb-konversi').value = item.nilai_konversi || ''; document.getElementById('edit-bb-satuan-resep').value = item.satuan; kalkulasiHargaSatuBB('edit'); document.getElementById('modal-edit-bb').classList.remove('hidden'); }
async function simpanEditBahanBaku() { const id = document.getElementById('edit-bb-id').value; const nama = document.getElementById('edit-bb-nama').value.trim(); const satuanBeli = document.getElementById('edit-bb-satuan-beli').value.trim(); const hargaBeli = getNilaiAsli(document.getElementById('edit-bb-harga-beli').value); const konversi = parseFloat(document.getElementById('edit-bb-konversi').value); const satuanResep = document.getElementById('edit-bb-satuan-resep').value.trim(); if(!nama || !hargaBeli) return alert("Lengkapi data!"); showLoading(); const { error } = await supabaseClient.from('bahan_baku').update({ nama, satuan_beli: satuanBeli, harga_beli: hargaBeli, nilai_konversi: konversi, satuan: satuanResep, harga: (hargaBeli/konversi) }).eq('id', id); hideLoading(); if(error) alert("Gagal memperbarui data!"); else { closeModal('modal-edit-bb'); loadBahanBaku(); if(document.getElementById('tab-direktori').classList.contains('active')) loadDirektori(); } }

// ================= AUTOCOMPLETE BAHAN BAKU =================
async function loadDropdownBahanBaku(targetElement) { const { data } = await supabaseClient.from('bahan_baku').select('*').order('nama'); bahanBakuList = data || []; const prefix = targetElement === 'edit' ? 'edit-r-' : 'r-'; const ul = document.getElementById(prefix + 'dropdown-list'); ul.innerHTML = ''; if(bahanBakuList.length === 0) { ul.innerHTML = '<li class="p-4 text-gray-400 text-sm italic text-center">Belum ada bahan di database</li>'; } else { bahanBakuList.forEach(bb => { ul.innerHTML += `<li class="p-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 text-sm bb-item flex justify-between items-center transition-colors" onclick="pilihBahanBaku('${targetElement}', '${bb.id}', '${bb.nama.replace(/'/g, "\\'")}', ${bb.harga}, '${bb.satuan}')"><div class="font-bold text-gray-700">${bb.nama}</div><div class="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md">${formatRp(bb.harga)} <span class="text-gray-500 font-normal">/ ${bb.satuan}</span></div></li>`; }); } }
function bukaDropdownBB(mode) { const prefix = mode === 'edit' ? 'edit-r-' : 'r-'; document.getElementById(prefix + 'dropdown-list').classList.remove('hidden'); filterDropdownBB(mode); }
function filterDropdownBB(mode) { const prefix = mode === 'edit' ? 'edit-r-' : 'r-'; const inputVal = document.getElementById(prefix + 'pilih-bb').value.toLowerCase(); const ul = document.getElementById(prefix + 'dropdown-list'); const items = ul.getElementsByTagName('li'); for (let i = 0; i < items.length; i++) { if (items[i].classList.contains('bb-item')) { const txt = items[i].textContent || items[i].innerText; items[i].style.display = txt.toLowerCase().indexOf(inputVal) > -1 ? "" : "none"; } } }
function pilihBahanBaku(mode, id, nama, harga, satuan) { const prefix = mode === 'edit' ? 'edit-r-' : 'r-'; document.getElementById(prefix + 'pilih-bb').value = nama; document.getElementById(prefix + 'bb-selected-id').value = id; document.getElementById(prefix + 'bb-selected-nama').value = nama; document.getElementById(prefix + 'bb-selected-harga').value = harga; document.getElementById(prefix + 'bb-selected-satuan').value = satuan; document.getElementById(prefix + 'dropdown-list').classList.add('hidden'); }

// ================= RESEP KOMPOSISI =================
function addTempKomposisi(mode) {
    const prefix = mode === 'edit' ? 'edit-r-' : 'r-'; const id = document.getElementById(prefix + 'bb-selected-id').value; const nama = document.getElementById(prefix + 'bb-selected-nama').value; const harga = parseFloat(document.getElementById(prefix + 'bb-selected-harga').value); const satuan = document.getElementById(prefix + 'bb-selected-satuan').value; const qty = parseFloat(document.getElementById(prefix + 'qty-bb').value);
    if(!id || !qty) return alert("Pilih bahan dari dropdown dan isi Qty!"); const dataArr = mode === 'edit' ? tempKomposisiEdit : tempKomposisiBaru; if(dataArr.some(item => item.bahan_baku_id == id)) return alert("Bahan sudah masuk daftar!");
    dataArr.push({ bahan_baku_id: id, nama: nama, satuan: satuan, qty: qty, subtotal: harga * qty }); document.getElementById(prefix + 'pilih-bb').value = ''; document.getElementById(prefix + 'bb-selected-id').value = ''; document.getElementById(prefix + 'qty-bb').value = ''; renderKomposisi(mode);
}
function removeTempKomposisi(mode, index) { if(mode === 'edit') tempKomposisiEdit.splice(index, 1); else tempKomposisiBaru.splice(index, 1); renderKomposisi(mode); }

function renderKomposisi(mode) {
    const prefix = mode === 'edit' ? 'edit-' : ''; const dataArr = mode === 'edit' ? tempKomposisiEdit : tempKomposisiBaru;
    const tbody = document.getElementById(prefix + 'temp-komposisi-list'); tbody.innerHTML = '';
    dataArr.forEach((item, idx) => { tbody.innerHTML += `<tr class="hover:bg-gray-50 transition-colors"><td class="p-3 font-semibold text-gray-700">${item.nama}</td><td class="p-3 text-gray-500 text-center">${item.qty} ${item.satuan}</td><td class="p-3 text-blue-600 font-bold text-right">${formatRp(item.subtotal)}</td><td class="p-3 text-center"><button onclick="removeTempKomposisi('${mode}', ${idx})" class="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors font-bold text-lg leading-none">×</button></td></tr>`; });
    updateKalkulasiHPP(mode);
}

// PERUBAHAN: Menghitung HPP dengan Yield dan Overhead
function updateKalkulasiHPP(mode) {
    const prefix = mode === 'edit' ? 'edit-r-' : 'r-'; const dataArr = mode === 'edit' ? tempKomposisiEdit : tempKomposisiBaru;
    
    // Bind Event Listeners on-the-fly jika belum ada
    const elHargaJual = document.getElementById(prefix + 'harga-jual');
    const elYield = document.getElementById(prefix + 'yield');
    if(elHargaJual && !elHargaJual.hasAttribute('data-bound')) { elHargaJual.addEventListener('input', () => updateKalkulasiHPP(mode)); elHargaJual.setAttribute('data-bound', 'true'); }
    if(elYield && !elYield.hasAttribute('data-bound')) { elYield.addEventListener('input', () => updateKalkulasiHPP(mode)); elYield.setAttribute('data-bound', 'true'); }
    
    const hargaJual = getNilaiAsli(elHargaJual.value); 
    const yieldPorsi = parseFloat(elYield.value) || 1;
    
    // 1. Total Harga Semua Bahan Baku
    const totalBahanPokok = dataArr.reduce((sum, item) => sum + item.subtotal, 0);
    
    // 2. HPP per Porsi = (Total Bahan Pokok / Porsi) + Overhead Tambahan
    const hppPerPorsi = (totalBahanPokok / yieldPorsi) + overheadCost;
    
    // 3. Margin & Persentase (Berdasarkan HPP 1 Porsi vs Harga Jual 1 Porsi)
    const marginValue = hargaJual - hppPerPorsi;
    const hppValue = hargaJual > 0 ? (hppPerPorsi / hargaJual) * 100 : 0;

    document.getElementById(prefix + 'total-cost').innerText = formatRp(hppPerPorsi);
    if(mode !== 'edit') document.getElementById(prefix + 'target-jual').innerText = formatRp(hargaJual);
    
    const elMargin = document.getElementById(prefix + 'margin'); elMargin.innerText = formatRp(marginValue); elMargin.className = marginValue < 0 ? 'font-bold text-red-400' : 'font-bold text-emerald-400';
    const elHPP = document.getElementById(prefix + 'persentase'); elHPP.innerText = hppValue.toFixed(2) + '%'; elHPP.className = hppValue > hppLimitThreshold ? 'font-black text-lg text-red-500' : 'font-black text-lg text-emerald-400';
}

async function simpanResepFinal() {
    const nama = document.getElementById('r-nama').value.trim(); const kategori = document.getElementById('r-kategori').value.trim(); const sub = document.getElementById('r-sub').value.trim(); const harga_jual = getNilaiAsli(document.getElementById('r-harga-jual').value); const yield_porsi = parseFloat(document.getElementById('r-yield').value) || 1;
    if(!nama || !kategori || tempKomposisiBaru.length === 0) return alert("Lengkapi data menu dan resep!");
    showLoading(); const { data: resepData, error: resepErr } = await supabaseClient.from('resep').insert([{ nama, kategori, sub_kategori: sub, harga_jual, yield: yield_porsi }]).select();
    if(resepErr) { hideLoading(); return alert("Gagal menyimpan menu! Pastikan kolom yield sudah ditambah di Supabase."); }
    const { error: detailErr } = await supabaseClient.from('resep_detail').insert(tempKomposisiBaru.map(item => ({ resep_id: resepData[0].id, bahan_baku_id: item.bahan_baku_id, qty: item.qty }))); hideLoading();
    if(!detailErr) { alert("Resep Berhasil Disimpan!"); document.getElementById('r-nama').value = ''; document.getElementById('r-kategori').value = ''; document.getElementById('r-sub').value = ''; document.getElementById('r-harga-jual').value = ''; document.getElementById('r-yield').value = '1'; tempKomposisiBaru = []; renderKomposisi('baru'); switchTab('tab-direktori'); }
}

// ================= DIREKTORI & GROUPING =================
async function loadDirektori() {
    // Note: Pastikan kolom 'yield' dipanggil dari Supabase
    const { data, error } = await supabaseClient.from('resep').select(`id, nama, kategori, sub_kategori, harga_jual, yield, resep_detail (qty, bahan_baku_id, bahan_baku (nama, satuan, harga))`);
    if(error) return;

    let processedData = data.map(menu => {
        let totalBiayaBahan = 0, komposisiHTML = '';
        (menu.resep_detail || []).forEach(det => {
            if (det.bahan_baku) {
                totalBiayaBahan += det.qty * det.bahan_baku.harga;
                komposisiHTML += `<li class="flex justify-between items-start text-[15px] py-1.5 border-b border-gray-100 last:border-0"><span class="text-gray-600 font-medium pr-4 break-words w-2/3 leading-snug">- ${det.bahan_baku.nama}</span> <span class="font-bold text-gray-800 whitespace-nowrap text-right w-1/3">${det.qty} ${det.bahan_baku.satuan}</span></li>`;
            }
        });
        
        const currentYield = menu.yield || 1;
        // Kalkulasi HPP per porsi + Overhead Seting
        const hppPerPorsi = (totalBiayaBahan / currentYield) + overheadCost;
        
        return { ...menu, yield: currentYield, totalCost: hppPerPorsi, margin: menu.harga_jual - hppPerPorsi, hppPersen: menu.harga_jual > 0 ? (hppPerPorsi / menu.harga_jual) * 100 : 0, komposisiHTML };
    });

    const searchKey = document.getElementById('search-resep').value.toLowerCase();
    if(searchKey) processedData = processedData.filter(m => m.nama.toLowerCase().includes(searchKey) || m.kategori.toLowerCase().includes(searchKey) || m.sub_kategori.toLowerCase().includes(searchKey));
    const sortBy = document.getElementById('sort-resep').value;
    if(sortBy === 'nama') processedData.sort((a,b) => a.nama.localeCompare(b.nama));
    if(sortBy === 'hpp_asc') processedData.sort((a,b) => a.hppPersen - b.hppPersen);
    if(sortBy === 'hpp_desc') processedData.sort((a,b) => b.hppPersen - a.hppPersen);

    const wrapper = document.getElementById('recipe-wrapper'); wrapper.innerHTML = '';
    if(processedData.length === 0) { wrapper.innerHTML = `<div class="w-full text-center py-20 text-gray-400 italic">Data menu belum tersedia.</div>`; return; }

    const groupedData = {};
    processedData.forEach(menu => { const kat = menu.kategori ? menu.kategori.toUpperCase() : 'UNCATEGORIZED'; const sub = menu.sub_kategori ? menu.sub_kategori : 'General'; if(!groupedData[kat]) groupedData[kat] = {}; if(!groupedData[kat][sub]) groupedData[kat][sub] = []; groupedData[kat][sub].push(menu); });

    Object.keys(groupedData).sort().forEach(kat => {
        let html = `<div class="mb-12"><h2 class="text-3xl font-black text-gray-800 mb-6 border-b-4 border-blue-600 inline-block pr-8 pb-1 tracking-tight uppercase">${kat}</h2>`;
        Object.keys(groupedData[kat]).sort().forEach(sub => {
            const cardBgColor = getCardGradient(sub); 
            html += `<div class="mb-10"><h3 class="text-lg font-bold text-gray-700 mb-5 flex items-center"><span class="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm uppercase tracking-wider border border-blue-200 shadow-sm">${sub}</span></h3><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">`;
            
            groupedData[kat][sub].forEach(menu => {
                let hppColor = menu.hppPersen > hppLimitThreshold ? 'text-red-500' : 'text-emerald-600';
                let marginColor = menu.margin < 0 ? 'text-red-500' : 'text-emerald-600';
                
                // Tambahkan keterangan overhead dan yield untuk detail visualisasi
                let ovhText = overheadCost > 0 ? `<div class="text-xs text-gray-400 mt-0.5">+ Overhead: ${formatRp(overheadCost)}</div>` : '';

                html += `
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-visible relative hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group flex flex-col">
                        <div class="absolute top-3 right-3 z-10 admin-only ${adminAktif ? '' : 'hidden'} opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="toggleKebabMenu(event, 'drop-r-${menu.id}')" class="kebab-btn bg-white/90 backdrop-blur hover:bg-white text-gray-800 w-8 h-8 rounded-lg font-bold shadow-md border border-gray-200">⋮</button>
                            <div id="drop-r-${menu.id}" class="dropdown-menu hidden absolute right-0 mt-1 bg-white shadow-xl rounded-xl border border-gray-100 w-32 py-2 text-sm text-gray-700">
                                <button onclick="bukaModalEditResep(${JSON.stringify(menu).replace(/"/g, '&quot;')})" class="w-full text-left px-4 py-2 hover:bg-blue-50 font-bold text-blue-600">📝 Edit</button>
                                <button onclick="aksiHapusResep(${menu.id}, '${menu.nama}')" class="w-full text-left px-4 py-2 hover:bg-red-50 font-bold text-red-600">🗑️ Hapus</button>
                            </div>
                        </div>
                        <div class="bg-gradient-to-br ${cardBgColor} text-white p-5 rounded-t-2xl relative">
                            <h3 class="text-xl font-black tracking-wide pr-8 leading-tight break-words">${menu.nama}</h3>
                            <div class="absolute bottom-5 right-5 text-xs font-semibold bg-white/20 px-2 py-1 rounded backdrop-blur">YIELD: ${menu.yield}</div>
                        </div>
                        <div class="p-5 md:p-6 flex-grow flex flex-col">
                            <ul class="mb-5 h-72 md:h-80 overflow-y-auto custom-scrollbar flex-grow pr-2">${menu.komposisiHTML || '<li class="text-sm text-gray-400 italic">Tanpa komposisi</li>'}</ul>
                            <div class="bg-gray-50 p-4 rounded-xl text-[15px] space-y-2 border border-gray-100 mt-auto">
                                <div class="flex justify-between items-center"><span class="text-gray-500 font-medium">Harga Jual:</span><span class="font-bold text-gray-800">${formatRp(menu.harga_jual)}</span></div>
                                <div class="flex justify-between items-start border-t border-gray-200 pt-2"><span class="text-gray-500 font-medium">HPP / Porsi:</span><div class="text-right"><span class="font-bold text-gray-800 block">${formatRp(menu.totalCost)}</span>${ovhText}</div></div>
                                <div class="flex justify-between items-center border-t border-gray-200 pt-2"><span class="text-gray-500 font-medium">Margin:</span><span class="font-bold ${marginColor}">${formatRp(menu.margin)}</span></div>
                                <div class="flex justify-between items-center"><span class="text-gray-500 font-medium">% HPP:</span><span class="font-black text-lg ${hppColor}">${menu.hppPersen.toFixed(2)}%</span></div>
                            </div>
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        html += `</div>`; wrapper.innerHTML += html;
    });
    renderAuthUI();
}

async function aksiHapusResep(id, nama) { if(confirm(`Yakin hapus resep "${nama}"?`)) { showLoading(); await supabaseClient.from('resep').delete().eq('id', id); hideLoading(); loadDirektori(); } }
async function bukaModalEditResep(menuObj) {
    await loadDropdownBahanBaku('edit');
    document.getElementById('edit-r-pilih-bb').value = ''; document.getElementById('edit-r-bb-selected-id').value = ''; document.getElementById('edit-r-qty-bb').value = '';
    document.getElementById('edit-r-id').value = menuObj.id; document.getElementById('edit-r-nama').value = menuObj.nama; document.getElementById('edit-r-kategori').value = menuObj.kategori; document.getElementById('edit-r-sub').value = menuObj.sub_kategori;
    document.getElementById('edit-r-harga-jual').value = menuObj.harga_jual.toString(); formatRupiahInput(document.getElementById('edit-r-harga-jual'));
    
    // PERUBAHAN: Set nilai Yield ke dalam form Edit Modal
    document.getElementById('edit-r-yield').value = menuObj.yield || 1;

    tempKomposisiEdit = menuObj.resep_detail.map(det => { if(!det.bahan_baku) return null; return { bahan_baku_id: det.bahan_baku_id, nama: det.bahan_baku.nama, satuan: det.bahan_baku.satuan, qty: det.qty, subtotal: det.qty * det.bahan_baku.harga }; }).filter(item => item !== null);
    renderKomposisi('edit'); document.getElementById('modal-edit-resep').classList.remove('hidden');
}

async function simpanEditResep() {
    const resepId = document.getElementById('edit-r-id').value; const nama = document.getElementById('edit-r-nama').value.trim(); const kategori = document.getElementById('edit-r-kategori').value.trim(); const sub = document.getElementById('edit-r-sub').value.trim(); const harga_jual = getNilaiAsli(document.getElementById('edit-r-harga-jual').value); const yield_porsi = parseFloat(document.getElementById('edit-r-yield').value) || 1;
    if(!nama || tempKomposisiEdit.length === 0) return alert("Nama dan komposisi wajib!");
    showLoading();
    // PERUBAHAN: Tambahkan yield saat update Supabase
    await supabaseClient.from('resep').update({ nama, kategori, sub_kategori: sub, harga_jual, yield: yield_porsi }).eq('id', resepId);
    await supabaseClient.from('resep_detail').delete().eq('resep_id', resepId);
    await supabaseClient.from('resep_detail').insert(tempKomposisiEdit.map(item => ({ resep_id: resepId, bahan_baku_id: item.bahan_baku_id, qty: item.qty })));
    hideLoading(); closeModal('modal-edit-resep'); loadDirektori();
}

// ================= IMPORT EXCEL LOGIC =================
function initiateImport(event, type) { fileImportTertunda = event.target.files[0]; if(!fileImportTertunda) return; jenisImportTertunda = type; document.getElementById('modal-import-option').classList.remove('hidden'); }
function batalImport() { fileImportTertunda = null; jenisImportTertunda = ''; document.getElementById('import-bb-file').value = ''; document.getElementById('import-resep-file').value = ''; closeModal('modal-import-option'); }
function jalankanImport(mode) { closeModal('modal-import-option'); showLoading(); if(jenisImportTertunda === 'bb') eksekusiImportBahanBaku(mode); else eksekusiImportResep(mode); }
function downloadTemplateBahanBaku() { const ws = XLSX.utils.json_to_sheet([{ "Nama Bahan": "Susu UHT", "Satuan Beli": "Karton", "Harga Beli": 240000, "Nilai Konversi (Yield)": 12000, "Satuan Pemakaian Resep": "ml" }]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template"); XLSX.writeFile(wb, "Template_Bahan_Baku.xlsx"); }
function exportBahanBakuToExcel() { const ws = XLSX.utils.json_to_sheet(bahanBakuList.map(i => ({"ID":i.id,"Nama Bahan":i.nama,"Satuan Beli":i.satuan_beli,"Harga Beli":i.harga_beli,"Konversi":i.nilai_konversi,"Satuan Resep":i.satuan,"Harga per Satuan":i.harga}))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data"); XLSX.writeFile(wb, "BahanBaku_Export.xlsx"); }
function eksekusiImportBahanBaku(mode) { const reader = new FileReader(); reader.onload = async (e) => { try { const rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).Sheets[XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).SheetNames[0]]); const cleanData = rows.map(r => { const h=parseFloat(r["Harga Beli"]||0); const k=parseFloat(r["Nilai Konversi (Yield)"]||1); return { nama:String(r["Nama Bahan"]).trim(), satuan_beli:r["Satuan Beli"], harga_beli:h, nilai_konversi:k, satuan:r["Satuan Pemakaian Resep"], harga:h/k };}).filter(r=>r.nama && r.nama !== "undefined"); if(cleanData.length === 0) { hideLoading(); alert("Data kosong!"); batalImport(); return; } let successCount = 0; let failCount = 0; if(mode === 'replace') { const { error: delError } = await supabaseClient.from('bahan_baku').delete().neq('id', 0); if(delError && delError.code === '23503') { hideLoading(); alert("GAGAL: Bahan baku sedang dipakai di Resep."); batalImport(); return; } const { error: insError } = await supabaseClient.from('bahan_baku').insert(cleanData); if(insError) { failCount = cleanData.length; } else { successCount = cleanData.length; } } else if (mode === 'modify') { const { data: ext } = await supabaseClient.from('bahan_baku').select('*'); const nMap = {}; ext.forEach(i => nMap[i.nama.toLowerCase()] = i.id); for(let r of cleanData) { const eId = nMap[r.nama.toLowerCase()]; if(eId) { const { error } = await supabaseClient.from('bahan_baku').update(r).eq('id', eId); if(error) failCount++; else successCount++; } else { const { error } = await supabaseClient.from('bahan_baku').insert([r]); if(error) failCount++; else successCount++; } } } hideLoading(); loadBahanBaku(); batalImport(); showSummaryModal(failCount === 0, 'Import Bahan Baku Selesai', successCount, failCount); } catch (err) { hideLoading(); alert("Terjadi kesalahan sistem saat membaca Excel."); batalImport(); } }; reader.readAsArrayBuffer(fileImportTertunda); }

// Saat ini template resep tidak memiliki kolom yield, default akan diset 1
function downloadTemplateResep() { const ws = XLSX.utils.json_to_sheet([{"Nama Menu":"Matcha Latte","Kategori":"Beverage","Sub Kategori":"Matcha","Harga Jual":28000,"Nama Bahan Baku":"Fresh Milk UHT","Qty":160}]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template"); XLSX.writeFile(wb, "Template_Resep.xlsx"); }
async function exportResepToExcel() { const { data } = await supabaseClient.from('resep').select(`nama,kategori,sub_kategori,harga_jual,resep_detail(qty,bahan_baku(nama,satuan,harga))`); let rec = []; data.forEach(m => m.resep_detail.forEach(d => rec.push({"Menu":m.nama,"Kat":m.kategori,"Sub":m.sub_kategori,"Harga":m.harga_jual,"Bahan":d.bahan_baku?.nama,"Qty":d.qty,"Satuan":d.bahan_baku?.satuan,"Biaya":d.qty*(d.bahan_baku?.harga||0)}))); const ws = XLSX.utils.json_to_sheet(rec); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Resep"); XLSX.writeFile(wb, "Resep_Export.xlsx"); }
function eksekusiImportResep(mode) { const reader = new FileReader(); reader.onload = async (e) => { try { const rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).Sheets[XLSX.read(new Uint8Array(e.target.result), { type: 'array' }).SheetNames[0]]); if(rows.length === 0) { hideLoading(); alert("Data Excel kosong!"); batalImport(); return; } if(mode === 'replace') await supabaseClient.from('resep').delete().neq('id', 0); const { data: bbData } = await supabaseClient.from('bahan_baku').select('*'); const bbMap = {}; bbData.forEach(b => bbMap[b.nama.toLowerCase().trim()] = b.id); let grp = {}; rows.forEach(r => { const m = r["Nama Menu"]; if(!m) return; if(!grp[m]) grp[m] = { nama:m, kategori:r["Kategori"]||"-", sub_kategori:r["Sub Kategori"]||"-", harga_jual:parseFloat(r["Harga Jual"]||0), ing:[] }; const mId = bbMap[String(r["Nama Bahan Baku"]||"").toLowerCase().trim()]; if(mId) grp[m].ing.push({ bahan_baku_id:mId, qty:parseFloat(r["Qty"]||0) }); }); let successCount = 0; let failCount = 0; for(let k in grp) { if(grp[k].ing.length === 0) { failCount++; continue; } let rId; let hasError = false; if(mode === 'modify') { const { data: cR } = await supabaseClient.from('resep').select('id').eq('nama', grp[k].nama).single(); if(cR) { rId = cR.id; await supabaseClient.from('resep').update({kategori:grp[k].kategori, sub_kategori:grp[k].sub_kategori, harga_jual:grp[k].harga_jual}).eq('id', rId); await supabaseClient.from('resep_detail').delete().eq('resep_id', rId); } } if(!rId) { const { data: nR, error: resepErr } = await supabaseClient.from('resep').insert([{nama:grp[k].nama, kategori:grp[k].kategori, sub_kategori:grp[k].sub_kategori, harga_jual:grp[k].harga_jual, yield: 1}]).select(); if(resepErr) { hasError = true; } else { rId = nR[0].id; } } if(rId && !hasError) { const { error: detailErr } = await supabaseClient.from('resep_detail').insert(grp[k].ing.map(i => ({resep_id:rId, bahan_baku_id:i.bahan_baku_id, qty:i.qty}))); if(detailErr) hasError = true; } if(hasError) failCount++; else successCount++; } hideLoading(); batalImport(); loadDirektori(); showSummaryModal(failCount === 0, 'Import Resep Selesai', successCount, failCount); } catch (err) { hideLoading(); alert("Terjadi kesalahan saat mengelola resep!"); batalImport(); } }; reader.readAsArrayBuffer(fileImportTertunda); }

// Initialize App
window.onload = () => { inisialisasiAuth(); loadDirektori(); };
