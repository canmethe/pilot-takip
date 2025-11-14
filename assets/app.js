document.addEventListener('DOMContentLoaded', function() {
    // Calendar settings
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
            locale: 'en',
        events: getUcuslar(),
        editable: true, // enable drag-n-drop
        eventDrop: function(info) {
            // user dragged an event to a different date/time
            const ev = info.event;
            const props = ev.extendedProps || {};
            // update timestamp to ISO
            const newIso = ev.start ? ev.start.toISOString() : null;
            if (newIso) {
                props.tarih = newIso;
                // persist change
                updateUcus(Object.assign({ id: ev.id }, props, { tarih: newIso }));
                // also update extendedProps
                Object.keys(props).forEach(k => ev.setExtendedProp(k, props[k]));
            }
        },
        eventClick: function(info) {
            gosterUcusDetay(info.event);
        }
    });
    calendar.render();
    // expose calendar globally so other functions can access it
    window.calendar = calendar;

    // Form submission
    document.getElementById('ucusForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const yeniUcus = {
            id: Date.now().toString(),
            havaAraci: document.getElementById('havaAraci').value,
            pilotlar: document.getElementById('ucusPilotlari').value,
            sure: document.getElementById('ucusSuresi').value,
            kalkis: document.getElementById('kalkisYeri').value,
            inis: document.getElementById('inisYeri').value,
            // normalize to ISO if user provided datetime-local
            tarih: (function(v){ try { return new Date(v).toISOString(); } catch(e){ return v; } })(document.getElementById('ucusTarihi').value),
            ucusTipi: (document.getElementById('ucusTipi') && document.getElementById('ucusTipi').value) || 'Unknown',
            ucusZamani: (document.getElementById('ucusZamani') && document.getElementById('ucusZamani').value) || '',
            nightVision: (document.getElementById('nightVision') && document.getElementById('nightVision').checked) || false,
            ucusNotu: (document.getElementById('ucusNotu') && document.getElementById('ucusNotu').value) || ''
        };
        
        kaydetUcus(yeniUcus);
        calendar.addEvent({
            id: yeniUcus.id,
            title: `${yeniUcus.havaAraci} - ${yeniUcus.pilotlar}`,
            start: yeniUcus.tarih,
            extendedProps: yeniUcus
        });
        
        this.reset();
    });

    // Add demo data (button may have been removed; safe binding)
    const demoBtn = document.getElementById('demoVeriEkle');
    if (demoBtn) {
        demoBtn.addEventListener('click', function() {
            const demoVeriler = [
                {
                    id: '1',
                    havaAraci: 'Cessna 172',
                    pilotlar: 'Ahmet Yılmaz, Mehmet Demir',
                    sure: '2.5',
                    kalkis: 'İstanbul',
                    inis: 'Ankara',
                    tarih: '2025-11-07T10:00'
                },
                {
                    id: '2',
                    havaAraci: 'Boeing 737',
                    pilotlar: 'Ayşe Kaya, Can Öztürk',
                    sure: '1.5',
                    kalkis: 'Ankara',
                    inis: 'İzmir',
                    tarih: '2025-11-08T14:30'
                }
            ];

            demoVeriler.forEach(ucus => {
                kaydetUcus(ucus);
                calendar.addEvent({
                    id: ucus.id,
                    title: `${ucus.havaAraci} - ${ucus.pilotlar}`,
                    start: ucus.tarih,
                    extendedProps: ucus
                });
            });
        });
    }

    // Flight delete handler
    document.getElementById('ucusSil').addEventListener('click', function() {
        const ucusId = this.dataset.ucusId;
        if (ucusId) {
            const lang = localStorage.getItem('app_lang')||'en';
    if (confirm(window.translations.confirmDeleteFlight[lang]||window.translations.confirmDeleteFlight.en)) {
                silUcus(ucusId);
                calendar.getEvents().forEach(event => {
                    if (event.id === ucusId) {
                        event.remove();
                    }
                });
                const modal = bootstrap.Modal.getInstance(document.getElementById('ucusDetayModal'));
                modal.hide();
            }
        }
    });
});

// LocalStorage işlemleri
function getUcuslar() {
    const key = storageKey();
    const ucuslar = JSON.parse(localStorage.getItem(key) || '[]');
    return ucuslar.map(ucus => ({
        id: ucus.id,
        title: `${ucus.havaAraci} - ${ucus.pilotlar}`,
        start: ucus.tarih,
        extendedProps: ucus
    }));
}

function kaydetUcus(ucus) {
    const key = storageKey();
    const ucuslar = JSON.parse(localStorage.getItem(key) || '[]');
    ucuslar.push(ucus);
    localStorage.setItem(key, JSON.stringify(ucuslar));
}

function silUcus(ucusId) {
    const key = storageKey();
    let ucuslar = JSON.parse(localStorage.getItem(key) || '[]');
    ucuslar = ucuslar.filter(ucus => ucus.id !== ucusId);
    localStorage.setItem(key, JSON.stringify(ucuslar));
    // Takvimde ilgili etkinliği kaldır (eğer calendar örneği mevcutsa)
    if (window.calendar) {
        try {
            window.calendar.getEvents().forEach(e => {
                if (e.id === ucusId) e.remove();
            });
        } catch (err) {
            // Hata olursa takvimi tamamen yeniden yükle
            try {
                window.calendar.removeAllEvents();
                const events = getUcuslar();
                events.forEach(ev => window.calendar.addEvent(ev));
            } catch (e) {
                console.error('Takvim güncellenemedi:', e);
            }
        }
    }
}

function gosterUcusDetay(event) {
    const ucus = event.extendedProps;
    // set current event for edit/delete operations
    window.currentEvent = event;
    // localized labels if translations available
    const lang = localStorage.getItem('app_lang') || 'en';
        const t = (key) => (window.translations && window.translations[key] && window.translations[key][lang]) || key;
        const detayHTML = `
        <p><strong>${t('havaAraci')}:</strong> ${ucus.havaAraci}</p>
        <p><strong>${t('pilotlar')}:</strong> ${ucus.pilotlar}</p>
        <p><strong>${t('ucusSuresi')}:</strong> ${ucus.sure} ${t('hours')}</p>
        <p><strong>${t('kalkisYeri')}:</strong> ${ucus.kalkis}</p>
        <p><strong>${t('inisYeri')}:</strong> ${ucus.inis}</p>
        <p><strong>${t('ucusTarihi')}:</strong> ${formatDateEnglish(ucus.tarih)}</p>
    `;
    
    document.getElementById('ucusDetaylari').innerHTML = detayHTML;
    document.getElementById('ucusSil').dataset.ucusId = ucus.id;
    // reset modal buttons to view mode
    const duz = document.getElementById('ucusDuzenle');
    const kaydet = document.getElementById('ucusKaydet');
    if (duz) duz.style.display = 'inline-block';
    if (kaydet) kaydet.style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('ucusDetayModal'));
    modal.show();
}

// Güncelleme fonksiyonu: var olan kaydı günceller veya ekler
function updateUcus(ucus) {
    const key = storageKey();
    const ucuslar = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = ucuslar.findIndex(u => u.id === ucus.id);
    if (idx > -1) {
        ucuslar[idx] = ucus;
    } else {
        ucuslar.push(ucus);
    }
    localStorage.setItem(key, JSON.stringify(ucuslar));
}

// ---------- CSV / JSON helpers ----------
function toCSV(arr) {
    if (!arr || !arr.length) return '';
    const headers = ['id','havaAraci','pilotlar','sure','kalkis','inis','tarih'];
    const lines = [headers.join(',')];
    arr.forEach(item => {
        const row = headers.map(h => {
            const v = item[h] != null ? String(item[h]) : '';
            // escape quotes
            if (v.includes(',') || v.includes('"') || v.includes('\n')) {
                return '"' + v.replace(/"/g, '""') + '"';
            }
            return v;
        });
        lines.push(row.join(','));
    });
    return lines.join('\n');
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const out = [];
    for (let i=1;i<lines.length;i++) {
        const row = splitCsvRow(lines[i]);
        if (!row.length) continue;
        const obj = {};
        for (let j=0;j<headers.length;j++) {
            obj[headers[j]] = row[j] || '';
        }
        // normalize expected fields
        const normalized = {
            id: obj.id || Date.now().toString() + '_' + i,
            havaAraci: obj.havaAraci || obj.hava || obj.ac || '',
            pilotlar: obj.pilotlar || obj.pilots || '',
            sure: obj.sure || obj.sureh || '',
            kalkis: obj.kalkis || obj.from || '',
            inis: obj.inis || obj.to || '',
            tarih: obj.tarih || obj.date || ''
        };
        out.push(normalized);
    }
    return out;
}

function splitCsvRow(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i=0;i<line.length;i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i+1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
            continue;
        }
        if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
        cur += ch;
    }
    result.push(cur);
    return result.map(s => s.trim());
}

function handleImportArray(arr) {
    if (!Array.isArray(arr) || !arr.length) { const lang = localStorage.getItem('app_lang')||'en'; alert(window.translations.importEmpty[lang]||window.translations.importEmpty.en); return; }
    // validate objects
    const key = storageKey();
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const existingIds = new Set(existing.map(e => e.id));
    const collisions = arr.filter(a => existingIds.has(a.id)).map(a => a.id);
    let overwrite = true;
    if (collisions.length) {
        const lang = localStorage.getItem('app_lang')||'en';
        const tmpl = window.translations.importCollisions && window.translations.importCollisions[lang] ? window.translations.importCollisions[lang] : window.translations.importCollisions.en;
        overwrite = confirm(tmpl.replace('{n}', String(collisions.length)));
    }
    // merge
    const mergedMap = {};
    existing.forEach(e => mergedMap[e.id] = e);
    arr.forEach(a => {
        const item = {
            id: a.id || Date.now().toString() + '_' + Math.random().toString(36).slice(2,8),
            havaAraci: a.havaAraci || a.hava || '',
            pilotlar: a.pilotlar || a.pilot || a.pilots || '',
            sure: a.sure || a.s || '',
            kalkis: a.kalkis || a.from || '',
            inis: a.inis || a.to || '',
            tarih: a.tarih || a.date || ''
        };
        if (mergedMap[item.id]) {
            if (overwrite) mergedMap[item.id] = item; // replace
            // else skip
        } else mergedMap[item.id] = item;
    });
    const merged = Object.keys(mergedMap).map(k => mergedMap[k]);
    localStorage.setItem(key, JSON.stringify(merged));
    // refresh calendar
    if (window.calendar) {
        window.calendar.removeAllEvents();
        getUcuslar().forEach(ev => window.calendar.addEvent(ev));
    }
    const lang = localStorage.getItem('app_lang')||'en';
    alert(window.translations.importSuccess[lang]||window.translations.importSuccess.en);
    if (window.updatePersonalStats) window.updatePersonalStats();
}

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// --- Storage / Locale helpers (no authentication)
function storageKey() { return 'ucuslar'; }

function localeFor(lang) {
    // Force English locale for all date displays
    return 'en-US';
}

function formatDateEnglish(dateStr) {
    // Format date explicitly in English: "November 9, 2025, 10:30 AM"
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr;
    }
}

// ---------- Aircraft list helpers (per-storage-key) ----------
function aircraftStorageKey() {
    return storageKey() + '_aircrafts';
}

function getAircrafts() {
    try {
        return JSON.parse(localStorage.getItem(aircraftStorageKey()) || '[]');
    } catch (e) { return []; }
}

function saveAircraft(name) {
    if (!name) return;
    const n = String(name).trim();
    if (!n) return;
    const key = aircraftStorageKey();
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    if (!arr.includes(n)) {
        arr.push(n);
        localStorage.setItem(key, JSON.stringify(arr));
    }
    populateAircraftDatalist();
    updateAircraftListUI();
}

function deleteAircraft(name) {
    const key = aircraftStorageKey();
    let arr = JSON.parse(localStorage.getItem(key) || '[]');
    arr = arr.filter(a => a !== name);
    localStorage.setItem(key, JSON.stringify(arr));
    populateAircraftDatalist();
    updateAircraftListUI();
}

function populateAircraftDatalist() {
    const dl = document.getElementById('havaAraciList');
    if (!dl) return;
    dl.innerHTML = '';
    const arr = getAircrafts();
    arr.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a;
        dl.appendChild(opt);
    });
}

function updateAircraftListUI() {
    const el = document.getElementById('myAircraftList');
    if (!el) return;
    const arr = getAircrafts();
    if (!arr.length) {
        const lang = localStorage.getItem('app_lang')||'en';
        el.innerHTML = `<div class="small text-muted">${(window.translations.noRecords && window.translations.noRecords[lang]) || 'No saved aircraft.'}</div>`;
        return;
    }
    el.innerHTML = '';
    arr.forEach(a => {
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center py-1';
        const left = document.createElement('div'); left.textContent = a;
        const right = document.createElement('div');
        const del = document.createElement('button');
        del.className = 'btn btn-sm btn-outline-danger ms-2 remove-aircraft';
        const delLang = localStorage.getItem('app_lang')||'en';
        del.textContent = (window.translations && window.translations.deleteFlight) ? (window.translations.deleteFlight[delLang] || window.translations.deleteFlight['en']) : 'Delete';
        del.setAttribute('data-name', a);
    del.addEventListener('click', function() { const lang = localStorage.getItem('app_lang')||'en'; if (confirm(window.translations.confirmDeleteAircraft[lang]||window.translations.confirmDeleteAircraft.en)) deleteAircraft(a); });
        right.appendChild(del);
        row.appendChild(left);
        row.appendChild(right);
        el.appendChild(row);
    });
}

// (Google Sign-In removed)

// DOM ready: ek buton dinleyicileri
document.addEventListener('DOMContentLoaded', function() {
    // Düzenle butonu: modal içeriğini form haline getirir
    const duzenleBtn = document.getElementById('ucusDuzenle');
    const kaydetBtn = document.getElementById('ucusKaydet');
    duzenleBtn && duzenleBtn.addEventListener('click', function() {
        const event = window.currentEvent;
        if (!event) return;
        const ucus = event.extendedProps;
        // localized form HTML
    const lang = localStorage.getItem('app_lang') || 'en';
    const t = (key) => (window.translations && window.translations[key] && (window.translations[key][lang] || window.translations[key]['en'])) || key;
        const formHTML = `
            <div class="row">
                <div class="col-12 mb-2"><label class="form-label">${t('havaAraci')}</label><input id="edit_havaAraci" class="form-control" value="${ucus.havaAraci}"></div>
                <div class="col-12 mb-2"><label class="form-label">${t('pilotlar')}</label><input id="edit_pilotlar" class="form-control" value="${ucus.pilotlar}"></div>
                <div class="col-6 mb-2"><label class="form-label">${t('ucusSuresi')}</label><input id="edit_sure" type="number" step="0.1" class="form-control" value="${ucus.sure}"></div>
                <div class="col-6 mb-2"><label class="form-label">${t('ucusTarihi')}</label><input id="edit_tarih" type="datetime-local" class="form-control" value="${ucus.tarih}"></div>
                <div class="col-6 mb-2"><label class="form-label">${t('kalkisYeri')}</label><input id="edit_kalkis" class="form-control" value="${ucus.kalkis}"></div>
                <div class="col-6 mb-2"><label class="form-label">${t('inisYeri')}</label><input id="edit_inis" class="form-control" value="${ucus.inis}"></div>
            </div>
        `;
        document.getElementById('ucusDetaylari').innerHTML = formHTML;
        // göster/gizle butonlar
        duzenleBtn.style.display = 'none';
        kaydetBtn.style.display = 'inline-block';
    });

    // Kaydet butonu: formdaki verilerle güncelle
    kaydetBtn && kaydetBtn.addEventListener('click', function() {
        const event = window.currentEvent;
        if (!event) return;
        const id = event.id || (Date.now().toString());
        const updated = {
            id: id,
            havaAraci: document.getElementById('edit_havaAraci').value,
            pilotlar: document.getElementById('edit_pilotlar').value,
            sure: document.getElementById('edit_sure').value,
            kalkis: document.getElementById('edit_kalkis').value,
            inis: document.getElementById('edit_inis').value,
            tarih: document.getElementById('edit_tarih').value
        };
        // localStorage güncelle
        updateUcus(updated);

        // takvim etkinliğini güncelle
        try {
            event.setProp('title', `${updated.havaAraci} - ${updated.pilotlar}`);
            event.setStart(updated.tarih);
            // extended props güncelle
            Object.keys(updated).forEach(k => {
                if (k !== 'id') event.setExtendedProp(k, updated[k]);
            });
        } catch (e) {
            console.error('Error updating event:', e);
        }

        // modal görünümünü eski haline getir
        document.getElementById('ucusDetaylari').innerHTML = `
            <p><strong>Aircraft:</strong> ${updated.havaAraci}</p>
            <p><strong>Pilots:</strong> ${updated.pilotlar}</p>
            <p><strong>Flight Duration:</strong> ${updated.sure} ${window.translations.hours && window.translations.hours['en'] ? window.translations.hours['en'] : 'hrs'}</p>
            <p><strong>Departure:</strong> ${updated.kalkis}</p>
            <p><strong>Arrival:</strong> ${updated.inis}</p>
            <p><strong>Date:</strong> ${new Date(updated.tarih).toLocaleString('en-US')}</p>
        `;
        // butonları geri al
        const duz = document.getElementById('ucusDuzenle');
        duz && (duz.style.display = 'inline-block');
        this.style.display = 'none';
        // güncellenmiş id ile modal kapatılabilir
        const modal = bootstrap.Modal.getInstance(document.getElementById('ucusDetayModal'));
        // modal.hide(); // isteğe bağlı: otomatik kapatma yapmıyoruz
    });

    // Ayarlar paneli toggler
    const settingsToggle = document.getElementById('settingsToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    settingsToggle && settingsToggle.addEventListener('click', function() {
        if (!settingsPanel) return;
        settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });

    // --- i18n / English-only translation map
    // Keep only English strings to simplify the codebase (app is English-only)
    window.translations = {
        title: { en: 'Pilot Flight Tracker' },
        settings: { en: 'Settings' },
        calendarTab: { en: 'Calendar' },
        personalTab: { en: 'Personal Info' },
        demoVeriYukle: { en: 'Load Demo Data' },
        veriTemizle: { en: 'Clear All Data' },
        exportCsv: { en: 'Export CSV' },
        exportJson: { en: 'Export JSON' },
        importFile: { en: 'Import File' },
        language: { en: 'Language' },
        title_personal: { en: 'My Flight Info' },
        weeklyLabel: { en: 'This Week Total Flight Hours:' },
        monthlyLabel: { en: 'This Month Total Flight Hours:' },
        totalLabel: { en: 'Total Flight Hours:' },
        clearPersonalData: { en: 'Clear Personal Data' },
        showSavedFlights: { en: 'Show Saved Flights' },
        ucusDetaylar: { en: 'Flight Details' },
        addFlight: { en: 'Add Flight' },
        timeDay: { en: 'Day' },
        timeNight: { en: 'Night' },
        noRecords: { en: 'No saved flights.' },
        noDate: { en: 'No date' },

        importEmpty: { en: 'No data to import.' },
        importSuccess: { en: 'Data imported successfully.' },
        importJsonError: { en: 'JSON parse error: {err}' },
        importCollisions: { en: '{n} records conflict by ID. Overwrite?' },
        confirmDeleteFlight: { en: 'Are you sure you want to delete this flight?' },
        confirmDeleteAircraft: { en: 'Are you sure you want to delete this aircraft?' },
        confirmClearAll: { en: 'Are you sure you want to delete all flight records?' },
        recordsDeleted: { en: 'Records deleted.' },
        noEntries: { en: 'No entries.' },
        added: { en: 'Added' },

        signOut: { en: 'Sign out' },
        havaAraci: { en: 'Aircraft' },
        pilotlar: { en: 'Pilots' },
        ucusSuresi: { en: 'Flight Duration (hrs)' },
        kalkisYeri: { en: 'Departure' },
        inisYeri: { en: 'Arrival' },
        ucusTarihi: { en: 'Flight Date' },
        ucusTipi: { en: 'Flight Type' },
        ucusZamani: { en: 'Flight Time' },
        nightVision: { en: 'Night Vision' },
        note: { en: 'Note' },
        notePlaceholder: { en: 'Additional info...' },
        crew: { en: 'Crew' },
        crewPlaceholder: { en: 'Crew names (comma separated)' },
        ucusTarihiPlaceholder: { en: 'MM/DD/YYYY' },
        edit: { en: 'Edit' },
        deleteFlight: { en: 'Delete Flight' },
        saveBtn: { en: 'Save' },
        closeBtn: { en: 'Close' },
        clearPersonalHint: { en: '(This will delete all flight records in your session)' },
        hours: { en: 'hrs' },

        myAircrafts: { en: 'My Aircraft' },
        manageAircraftHint: { en: 'Add aircraft you use often here' },
        addAircraftBtn: { en: 'Add' },
        aircraftPlaceholder: { en: 'Aircraft name' },

        remindersTab: { en: 'Reminders' },
        remindersTitle: { en: 'Reminders' },
        reminderDate: { en: 'Date & Time' },
        reminderNote: { en: 'Note' },
        addReminderBtn: { en: 'Add Reminder' },
        remindersList: { en: 'Saved Reminders' },
        reminders_none: { en: 'No reminders.' },
        reminderTomorrowMsg: { en: 'Tomorrow you have a flight.' },
        reminderDismiss: { en: 'Dismiss' },
        reminderDateMissing: { en: 'Please select date & time.' },

        type_egitim: { en: 'Training' },
        type_kontrol: { en: 'Check' },
        type_vip: { en: 'VIP' },
        type_sihhiye: { en: 'Medical' },
        type_kurtarma: { en: 'Rescue' },
        type_operasyon: { en: 'Operation' },

        chart_all: { en: 'All Flight Types' },
        chart_day: { en: 'Day Flights' },
        chart_night: { en: 'Night Flights' }
    };

    // map legacy/other labels to canonical keys
    const typeKeyMap = {
        'eğitim': 'egitim', 'egitim': 'egitim', 'training': 'egitim',
        'kontrol': 'kontrol', 'check': 'kontrol',
        'vip': 'vip',
        'sıhhiye': 'sihhiye', 'sihhiye': 'sihhiye', 'medical': 'sihhiye',
        'kurtarma': 'kurtarma', 'rescue': 'kurtarma',
        'operasyon': 'operasyon', 'operación': 'operasyon', 'operation': 'operasyon'
    };

    function normalizeTypeKey(raw) {
        if (!raw) return 'bilinmiyor';
        const r = String(raw).trim();
        // already canonical
        if (['egitim','kontrol','vip','sihhiye','kurtarma','operasyon'].includes(r)) return r;
        const lower = r.toLowerCase();
        return typeKeyMap[lower] || 'bilinmiyor';
    }

    function applyTranslations(lang) {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (window.translations[key] && window.translations[key][lang]) el.textContent = window.translations[key][lang];
        });
        // placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (window.translations[key] && window.translations[key][lang]) el.     placeholder = window.translations[key][lang];
        });
        // ensure option elements with data-i18n are updated (some browsers treat option text specially)
        document.querySelectorAll('option[data-i18n]').forEach(opt => {
            const key = opt.getAttribute('data-i18n');
            if (window.translations[key] && window.translations[key][lang]) opt.textContent = window.translations[key][lang];
        });
        // set specific texts that don't use data-i18n
    const titleSpan = document.querySelector('[data-i18n="title"]');
    if (titleSpan) titleSpan.textContent = translations.title[lang] || translations.title.en;
        // update fullcalendar locale
        const localeMap = { tr: 'tr', en: 'en', es: 'es', fr: 'fr', de: 'de' };
        if (window.calendar && localeMap[lang]) {
            window.calendar.setOption('locale', localeMap[lang]);
            // re-render events if needed
            window.calendar.render();
        }
        // re-render personal stats so charts and labels get localized
        if (window.updatePersonalStats) window.updatePersonalStats();
        // refresh aircraft datalist and list UI so "no records" and related texts update
        try { populateAircraftDatalist(); updateAircraftListUI(); } catch (e) { /* ignore if not ready */ }
        try { if (window.showReminderBannerIfAny) window.showReminderBannerIfAny(); } catch (e) { /* ignore */ }
    }

    // Enforce single language (English): collapse translations to English-only and set default language
    (function(){
        try {
            Object.keys(window.translations || {}).forEach(function(k){
                const v = window.translations[k];
                let en = '';
                if (v && typeof v === 'object') {
                    en = v.en || v['en'] || v.tr || Object.values(v)[0] || '';
                } else if (typeof v === 'string') {
                    en = v;
                }
                window.translations[k] = { en: en };
            });
            // set app language to English
            localStorage.setItem('app_lang', 'en');
        } catch (e) { console.warn('i18n normalization failed', e); }
    })();

    // App is English-only. Use 'en' as saved language and apply translations.
    const savedLang = 'en';
    applyTranslations(savedLang);
    // populate aircraft datalist and personal UI on load
    populateAircraftDatalist();
    updateAircraftListUI();

    // --- Reminders / Hatırlatmalar feature
    function remindersStorageKey() { return storageKey() + '_reminders'; }
    function getReminders() {
        try { return JSON.parse(localStorage.getItem(remindersStorageKey()) || '[]'); } catch(e) { return []; }
    }
    function saveReminderObj(r) {
        const key = remindersStorageKey();
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        if (!r.id) r.id = Date.now().toString() + '_' + Math.random().toString(36).slice(2,6);
        // ensure ISO date
        try { r.tarih = new Date(r.tarih).toISOString(); } catch(e) {}
        const idx = arr.findIndex(x => x.id === r.id);
        if (idx > -1) arr[idx] = r; else arr.push(r);
        localStorage.setItem(key, JSON.stringify(arr));
    }
    function deleteReminder(id) {
        const key = remindersStorageKey();
        let arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr = arr.filter(a => a.id !== id);
        localStorage.setItem(key, JSON.stringify(arr));
        populateRemindersUI();
    }

    function populateRemindersUI() {
        const el = document.getElementById('remindersList');
        if (!el) return;
        const arr = getReminders();
    const lang = localStorage.getItem('app_lang')||'en';
        el.innerHTML = '';
        if (!arr.length) {
            const txt = (window.translations.reminders_none && window.translations.reminders_none[lang]) || window.translations.reminders_none.en || 'No reminders.';
            el.innerHTML = `<div class="small text-muted">${txt}</div>`;
            return;
        }
        arr.sort((a,b)=> new Date(a.tarih) - new Date(b.tarih));
        arr.forEach(r => {
            const row = document.createElement('div');
            row.className = 'd-flex justify-content-between align-items-start py-2 border-bottom';
            const left = document.createElement('div');
            const when = r.tarih ? formatDateEnglish(r.tarih) : (window.translations.noDate ? window.translations.noDate[lang] : 'No date');
            left.innerHTML = `<div><strong>${r.havaAraci || '—'}</strong> — ${r.pilotlar || '—'}</div><div class="small text-muted">${when}</div>`;
            const right = document.createElement('div');
            const del = document.createElement('button');
            del.className = 'btn btn-sm btn-outline-danger ms-2';
            const delLang = localStorage.getItem('app_lang')||'en';
            del.textContent = (window.translations.deleteFlight && (window.translations.deleteFlight[delLang] || window.translations.deleteFlight['en'])) || 'Delete';
            del.addEventListener('click', function(){ if (confirm((window.translations && window.translations.confirmDeleteFlight) ? (window.translations.confirmDeleteFlight[localStorage.getItem('app_lang')||'en'] || window.translations.confirmDeleteFlight.en) : 'Delete?')) deleteReminder(r.id); });
            right.appendChild(del);
            row.appendChild(left);
            row.appendChild(right);
            el.appendChild(row);
        });
    }

    function showReminderBannerIfAny() {
        try {
            const container = document.getElementById('reminderBannerContainer');
            if (!container) return;
            container.innerHTML = '';
            const arr = getReminders();
            if (!arr.length) return;
            const now = new Date();
            const tomorrow = new Date(now); tomorrow.setDate(now.getDate()+1); tomorrow.setHours(0,0,0,0);
            const lang = localStorage.getItem('app_lang')||'en';
            const toShow = arr.filter(r => {
                if (r.seen) return false;
                const d = r.tarih ? new Date(r.tarih) : null;
                if (!d) return false;
                // compare by date (local)
                const dLocal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                return dLocal.getTime() === tomorrow.getTime();
            });
            if (!toShow.length) return;
            // build banner
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning alert-dismissible fade show';
            alert.setAttribute('role','alert');
            const title = (window.translations.reminderTomorrowMsg && window.translations.reminderTomorrowMsg[lang]) || window.translations.reminderTomorrowMsg.en || 'Tomorrow you have a flight.';
            const listHtml = toShow.map(r => {
                const when = r.tarih ? formatDateEnglish(r.tarih) : '';
                return `<div><strong>${r.havaAraci || ''}</strong> — ${r.pilotlar || ''} • <small>${when}</small></div>`;
            }).join('');
            alert.innerHTML = `<div><strong>${title}</strong></div><div class="mt-1">${listHtml}</div>`;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn-close';
            button.setAttribute('aria-label', (window.translations.reminderDismiss && window.translations.reminderDismiss[lang]) || window.translations.reminderDismiss.en || 'Dismiss');
            button.addEventListener('click', function(){
                // mark these reminders as seen so they won't reappear
                const all = getReminders();
                const ids = new Set(toShow.map(t => t.id));
                const updated = all.map(a => ids.has(a.id) ? Object.assign({}, a, { seen: true }) : a);
                localStorage.setItem(remindersStorageKey(), JSON.stringify(updated));
                // remove banner
                try { bootstrap.Alert && bootstrap.Alert.getOrCreateInstance(alert).close(); } catch(e){ alert.remove(); }
                // refresh UI list
                populateRemindersUI();
            });
            alert.appendChild(button);
            container.appendChild(alert);
        } catch (err) { console.error('showReminderBannerIfAny error', err); }
    }

    // wire add reminder button
    const addRemBtn = document.getElementById('addReminderBtn');
    if (addRemBtn) {
        addRemBtn.addEventListener('click', function(){
            const ha = document.getElementById('rem_havaAraci');
            const p = document.getElementById('rem_pilotlar');
            const dt = document.getElementById('rem_date');
            const noteInput = document.getElementById('rem_note');
            if (!dt || !dt.value) return alert((window.translations && window.translations.reminderDateMissing) ? window.translations.reminderDateMissing[localStorage.getItem('app_lang')||'en'] : window.translations.reminderDateMissing.en || 'Please select date & time.');
            const r = { havaAraci: ha ? ha.value : '', pilotlar: p ? p.value : '', tarih: dt.value, note: noteInput ? (noteInput.value || '') : '', seen: false };
            saveReminderObj(r);
            // ensure aircraft list includes it
            try { if (r.havaAraci) saveAircraft(r.havaAraci); } catch(e){}
            populateRemindersUI();
            // refresh reminders calendar
            try { if (window.refreshRemindersCalendar) window.refreshRemindersCalendar(); } catch(e){}
            // clear inputs
            if (ha) ha.value = ''; if (p) p.value = ''; if (dt) dt.value = '';
            const lang = localStorage.getItem('app_lang')||'en';
            alert(window.translations.added ? (window.translations.added[lang] || window.translations.added.en) : 'Added');
        });
    }

    // reminders calendar: init and initial populate/banner check
    let remindersCalendar = null;
    function initRemindersCalendar() {
        try {
            const el = document.getElementById('remindersCalendar');
            if (!el || typeof FullCalendar === 'undefined') return;
            // destroy existing
            if (remindersCalendar) {
                try { remindersCalendar.destroy(); } catch(e){}
                remindersCalendar = null;
            }
            const lang = localStorage.getItem('app_lang') || 'en';
            remindersCalendar = new FullCalendar.Calendar(el, {
                initialView: 'dayGridMonth',
                headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
                locale: (lang === 'tr' ? 'tr' : (lang === 'es' ? 'es' : 'en')),
                events: getReminders().map(r => ({ id: r.id, title: `${r.havaAraci || ''} - ${r.pilotlar || ''}`, start: r.tarih }))
            });
            remindersCalendar.render();
        } catch (err) { console.error('initRemindersCalendar error', err); }
    }
    function refreshRemindersCalendar() {
        try {
            if (!remindersCalendar) { initRemindersCalendar(); return; }
            remindersCalendar.removeAllEvents();
            getReminders().forEach(r => remindersCalendar.addEvent({ id: r.id, title: `${r.havaAraci || ''} - ${r.pilotlar || ''}`, start: r.tarih }));
        } catch (err) { console.error('refreshRemindersCalendar error', err); initRemindersCalendar(); }
    }

    // initial populate and banner check
    populateRemindersUI();
    initRemindersCalendar();
    showReminderBannerIfAny();
    // expose refresh for other handlers
    window.refreshRemindersCalendar = refreshRemindersCalendar;
    // make available globally and refresh on language change too
    window.showReminderBannerIfAny = showReminderBannerIfAny;

    // Demo verileri yükle
    const demoLoad = document.getElementById('demoVeriYukle');
    demoLoad && demoLoad.addEventListener('click', function() {
        const now = Date.now();
        const demo = [
            { id: (now+1).toString(), havaAraci: 'Cessna 182', pilotlar: 'Pilot A', sure: '2', kalkis: 'IST', inis: 'ANK', tarih: new Date().toISOString().slice(0,16) },
            { id: (now+2).toString(), havaAraci: 'Piper PA-28', pilotlar: 'Pilot B', sure: '1.2', kalkis: 'ESB', inis: 'IZM', tarih: new Date(Date.now()+86400000).toISOString().slice(0,16) }
        ];
        demo.forEach(d => {
            updateUcus(d);
            if (window.calendar) window.calendar.addEvent({ id: d.id, title: `${d.havaAraci} - ${d.pilotlar}`, start: d.tarih, extendedProps: d });
            // ensure aircraft list includes demo items
            saveAircraft(d.havaAraci);
        });
    });

    // Tüm verileri temizle
    const clearBtn = document.getElementById('veriTemizle');
    clearBtn && clearBtn.addEventListener('click', function() {
        const lang = localStorage.getItem('app_lang')||'en';
        if (!confirm(window.translations.confirmClearAll[lang]||window.translations.confirmClearAll.en)) return;
        localStorage.removeItem('ucuslar');
        if (window.calendar) window.calendar.removeAllEvents();
    });

    // Export / Import handlers (CSV / JSON)
    const exportCsvBtn = document.getElementById('exportCsv');
    const exportJsonBtn = document.getElementById('exportJson');
    const importFileInput = document.getElementById('importFile');

    exportCsvBtn && exportCsvBtn.addEventListener('click', function() {
        const events = JSON.parse(localStorage.getItem(storageKey()) || '[]');
    if (!events.length) { const lang = localStorage.getItem('app_lang')||'en'; alert(window.translations.noEntries[lang]||window.translations.noEntries.en); return; }
        const csv = toCSV(events);
        downloadFile(csv, 'pilot_ucuslar.csv', 'text/csv;charset=utf-8;');
    });

    exportJsonBtn && exportJsonBtn.addEventListener('click', function() {
        const events = JSON.parse(localStorage.getItem(storageKey()) || '[]');
    if (!events.length) { const lang = localStorage.getItem('app_lang')||'en'; alert(window.translations.noEntries[lang]||window.translations.noEntries.en); return; }
        const json = JSON.stringify(events, null, 2);
        downloadFile(json, 'pilot_ucuslar.json', 'application/json');
    });

    importFileInput && importFileInput.addEventListener('change', function(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            const text = evt.target.result;
            if (file.name.toLowerCase().endsWith('.json')) {
                try {
                    const data = JSON.parse(text);
                    handleImportArray(data);
                } catch (err) {
                    const lang = localStorage.getItem('app_lang')||'en';
                    const tmpl = window.translations.importJsonError && window.translations.importJsonError[lang] ? window.translations.importJsonError[lang] : window.translations.importJsonError.en;
                    alert(tmpl.replace('{err}', err && err.message ? err.message : String(err)));
                }
            } else {
                // assume CSV
                const arr = parseCSV(text);
                handleImportArray(arr);
            }
        };
        reader.readAsText(file, 'utf-8');
        // reset input
        e.target.value = '';
    });

    // --- Kişisel bilgi / chart logic
    let flightChart = null;
    let dayChart = null;
    let nightChart = null;
    function updatePersonalStats() {
        try {
            console.debug('updatePersonalStats: starting');
            const raw = JSON.parse(localStorage.getItem(storageKey()) || '[]');
            console.debug('updatePersonalStats: raw length=', raw.length);
            let weekly = 0, monthly = 0, total = 0;
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
            weekStart.setHours(0,0,0,0);
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

            const typeSums = {}; // hours per flight type (all)
            const typeSumsDay = {}; // hours per type for day flights
            const typeSumsNight = {}; // hours per type for night flights
            raw.forEach(u => {
                const sure = parseFloat(u.sure || u.ucusSuresi || 0) || 0;
                const tarih = u.tarih ? new Date(u.tarih) : null;
                if (!tarih) return;
                total += sure;
                if (tarih >= weekStart && tarih <= now) weekly += sure;
                if (tarih >= monthStart && tarih <= now) monthly += sure;
                // normalize type key (store canonical keys like 'egitim')
                const tipKey = normalizeTypeKey(u.ucusTipi || u.tip || '');
                typeSums[tipKey] = (typeSums[tipKey] || 0) + sure;

                // determine if this flight is night or day
                let isNight = false;
                const z = String(u.ucusZamani || '').toLowerCase();
                if (['night','gece','noche'].includes(z)) isNight = true;
                if (u.nightVision) isNight = true;
                // fallback: use hour from timestamp (night = before 06 or after 18)
                const hr = tarih.getHours();
                if (!u.ucusZamani && !u.nightVision) {
                    if (hr < 6 || hr >= 18) isNight = true;
                }

                if (isNight) {
                    typeSumsNight[tipKey] = (typeSumsNight[tipKey] || 0) + sure;
                } else {
                    typeSumsDay[tipKey] = (typeSumsDay[tipKey] || 0) + sure;
                }
            });

            document.getElementById('weeklyFlightHours').textContent = weekly.toFixed(1);
            document.getElementById('monthlyFlightHours').textContent = monthly.toFixed(1);
            document.getElementById('totalFlightHours').textContent = total.toFixed(1);

            const labels = Object.keys(typeSums);
            const data = labels.map(l => typeSums[l]);
            const lang = localStorage.getItem('app_lang') || 'en';
            console.debug('updatePersonalStats: labels=', labels, 'data=', data);
            // localized labels for charts
            const labelsTranslated = labels.map(k => {
                const tk = 'type_' + k;
                return (window.translations[tk] && window.translations[tk][lang]) || k;
            });
            // fallback when no data
            if (labels.length === 0) {
                labels.push('bilinmiyor');
                data.push(0);
                labelsTranslated.push(window.translations && window.translations['noRecords'] ? window.translations['noRecords'][lang] : (window.translations.noRecords && window.translations.noRecords.en) || 'No records');
            }

            const colors = [
                '#00aaff','#00ff95','#ffaa00','#ff4d4d','#8e44ad','#3498db','#2ecc71','#f39c12'
            ];
            const ctx = document.getElementById('flightPieChart') && document.getElementById('flightPieChart').getContext('2d');
            const pieCanvas = document.getElementById('flightPieChart');
            const pieSum = data.reduce((s,v) => s + (parseFloat(v)||0), 0);
            // restore old behavior: always show canvas; if no data, draw a single 'noRecords' slice so chart remains visible
            if (pieCanvas) {
                pieCanvas.style.display = '';
            }
            const noLabel = (window.translations.noRecords && window.translations.noRecords[lang]) || (window.translations.noRecords && window.translations.noRecords.en) || 'No records';
            const chartLabels = (pieSum === 0) ? [noLabel] : labelsTranslated;
            const chartData = (pieSum === 0) ? [1] : data;
            const chartBg = (pieSum === 0) ? [colors[0]] : labels.map((_,i) => colors[i % colors.length]);
            if (ctx) {
                console.debug('updatePersonalStats: found flightPieChart ctx');
                if (flightChart) {
                    flightChart.data.labels = chartLabels;
                    flightChart.data.datasets[0].data = chartData;
                    flightChart.data.datasets[0].backgroundColor = chartBg;
                    flightChart.update();
                } else {
                    console.debug('updatePersonalStats: creating flightChart');
                    flightChart = new Chart(ctx, {
                        type: 'pie',
                        data: {
                            labels: chartLabels,
                            datasets: [{
                                data: chartData,
                                backgroundColor: chartBg
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { position: 'bottom', labels: { color: '#fff' } },
                                tooltip: { mode: 'index' }
                            }
                        }
                    });
                }
            }

            // Day chart (use translated labels)
            const dayLabels = Object.keys(typeSumsDay);
            const dayData = dayLabels.map(l => typeSumsDay[l]);
            const dayLabelsTranslated = dayLabels.map(k => {
                const tk = 'type_' + k;
                return (window.translations[tk] && window.translations[tk][lang]) || k;
            });
            if (dayLabels.length === 0) { dayLabels.push('bilinmiyor'); dayData.push(0); dayLabelsTranslated.push(window.translations.noRecords ? window.translations.noRecords[lang] : (window.translations.noRecords && window.translations.noRecords.en) || 'No records'); }
            const ctxDay = document.getElementById('flightDayChart') && document.getElementById('flightDayChart').getContext('2d');
            const dayCanvas = document.getElementById('flightDayChart');
            const daySum = dayData.reduce((s,v) => s + (parseFloat(v)||0), 0);
            if (dayCanvas) dayCanvas.style.display = '';
            const dayNoLabel = (window.translations.noRecords && window.translations.noRecords[lang]) || (window.translations.noRecords && window.translations.noRecords.en) || 'No records';
            const dayChartLabels = (daySum === 0) ? [dayNoLabel] : dayLabelsTranslated;
            const dayChartData = (daySum === 0) ? [1] : dayData;
            const dayChartBg = (daySum === 0) ? [colors[0]] : dayLabels.map((_,i) => colors[i % colors.length]);
            if (ctxDay) {
                console.debug('updatePersonalStats: found flightDayChart ctx');
                if (dayChart) {
                    dayChart.data.labels = dayChartLabels;
                    dayChart.data.datasets[0].data = dayChartData;
                    dayChart.data.datasets[0].backgroundColor = dayChartBg;
                    dayChart.update();
                } else {
                    console.debug('updatePersonalStats: creating dayChart');
                    dayChart = new Chart(ctxDay, {
                        type: 'pie',
                        data: { labels: dayChartLabels, datasets: [{ data: dayChartData, backgroundColor: dayChartBg }] },
                        options: { plugins: { legend: { labels: { color: '#fff' } } } }
                    });
                }
            }

            // Night chart (use translated labels)
            const nightLabels = Object.keys(typeSumsNight);
            const nightData = nightLabels.map(l => typeSumsNight[l]);
            const nightLabelsTranslated = nightLabels.map(k => {
                const tk = 'type_' + k;
                return (window.translations[tk] && window.translations[tk][lang]) || k;
            });
            if (nightLabels.length === 0) { nightLabels.push('bilinmiyor'); nightData.push(0); nightLabelsTranslated.push(window.translations.noRecords ? window.translations.noRecords[lang] : (window.translations.noRecords && window.translations.noRecords.en) || 'No records'); }
            const ctxNight = document.getElementById('flightNightChart') && document.getElementById('flightNightChart').getContext('2d');
            const nightCanvas = document.getElementById('flightNightChart');
            const nightSum = nightData.reduce((s,v) => s + (parseFloat(v)||0), 0);
            if (nightCanvas) nightCanvas.style.display = '';
            const nightNoLabel = (window.translations.noRecords && window.translations.noRecords[lang]) || (window.translations.noRecords && window.translations.noRecords.en) || 'No records';
            const nightChartLabels = (nightSum === 0) ? [nightNoLabel] : nightLabelsTranslated;
            const nightChartData = (nightSum === 0) ? [1] : nightData;
            const nightChartBg = (nightSum === 0) ? [colors[0]] : nightLabels.map((_,i) => colors[i % colors.length]);
            if (ctxNight) {
                console.debug('updatePersonalStats: found flightNightChart ctx');
                if (nightChart) {
                    nightChart.data.labels = nightChartLabels;
                    nightChart.data.datasets[0].data = nightChartData;
                    nightChart.data.datasets[0].backgroundColor = nightChartBg;
                    nightChart.update();
                } else {
                    console.debug('updatePersonalStats: creating nightChart');
                    nightChart = new Chart(ctxNight, {
                        type: 'pie',
                        data: { labels: nightChartLabels, datasets: [{ data: nightChartData, backgroundColor: nightChartBg }] },
                        options: { plugins: { legend: { labels: { color: '#fff' } } } }
                    });
                }
            }

            // render flight type breakdown list
            const statsEl = document.getElementById('flightTypeStats');
            if (statsEl) {
                statsEl.innerHTML = '';
                // use translated labels if available
                const shownLabels = labelsTranslated && labelsTranslated.length ? labelsTranslated : labels;
                shownLabels.forEach((labelText,i) => {
                    const item = document.createElement('div');
                    item.className = 'd-flex justify-content-between align-items-center py-1';
                    const hourText = (window.translations.hours && window.translations.hours[lang]) || 'hrs';
                    item.innerHTML = `<div>${labelText}</div><div class="badge bg-secondary">${data[i].toFixed(1)} ${hourText}</div>`;
                    statsEl.appendChild(item);
                });
            }

            // populate list of saved flights for debugging/visibility
            const listEl = document.getElementById('personalFlightList');
            if (listEl) {
                listEl.innerHTML = '';
                if (raw.length === 0) {
                    const txt = window.translations.noRecords ? window.translations.noRecords[lang] : (window.translations.noRecords && window.translations.noRecords.en) || 'No saved flights.';
                    listEl.innerHTML = `<div class="small text-muted">${txt}</div>`;
                } else {
                    raw.forEach(u => {
                        const d = document.createElement('div');
                        d.className = 'border-bottom py-2';
                        const when = u.tarih ? formatDateEnglish(u.tarih) : (window.translations.noDate ? window.translations.noDate[lang] : 'No date');
                        const tipKey = normalizeTypeKey(u.ucusTipi || u.tip || '');
                        const tipLabel = (window.translations['type_' + tipKey] && window.translations['type_' + tipKey][lang]) || (u.ucusTipi || 'Unknown');
                        const hourText = (window.translations.hours && window.translations.hours[lang]) || 'hrs';
                        d.innerHTML = `<div><strong>${u.havaAraci || '—'}</strong> — ${u.pilotlar || '—'}</div><div class="small text-muted">Duration: ${parseFloat(u.sure||0).toFixed(1)} ${hourText} • ${when} • Type: ${tipLabel}</div>`;
                        listEl.appendChild(d);
                    });
                }
            }
        } catch (err) {
            console.error('updatePersonalStats hata:', err);
        }
    }

    // show personal tab when header button clicked
    const personalInfoBtn = document.getElementById('personalInfoBtn');
    if (personalInfoBtn) {
        personalInfoBtn.addEventListener('click', function() {
            const tabEl = document.querySelector('#personal-tab');
            if (tabEl) {
                const tab = new bootstrap.Tab(tabEl);
                tab.show();
                // small timeout to let tab rendering finish
                setTimeout(updatePersonalStats, 120);
            }
        });
    }

    // update stats when the tab becomes visible
    const personalTabBtn = document.getElementById('personal-tab');
    if (personalTabBtn) {
        personalTabBtn.addEventListener('shown.bs.tab', function() {
            console.debug('personal-tab: shown.bs.tab handler triggered');
            updatePersonalStats();
        });
    }

    // refresh reminders calendar when its tab is shown to ensure proper sizing
    const remindersTabBtn = document.getElementById('reminders-tab');
    if (remindersTabBtn) {
        remindersTabBtn.addEventListener('shown.bs.tab', function() {
            try { setTimeout(function(){ if (window.refreshRemindersCalendar) window.refreshRemindersCalendar(); }, 120); } catch(e) { console.debug('reminders tab show handler error', e); }
        });
    }

    // also listen globally for tab show events (more robust across markup variations)
    document.addEventListener('shown.bs.tab', function(e) {
        try {
            // e.target is the newly activated tab trigger element
            if (e && e.target && e.target.id === 'personal-tab') {
                console.debug('document shown.bs.tab event for personal-tab detected');
                // small delay to ensure layout is visible
                setTimeout(updatePersonalStats, 120);
            }
        } catch (err) { console.debug('shown.bs.tab listener error', err); }
    });

    // clear personal data button
    const clearPersonalBtn = document.getElementById('clearPersonalData');
    if (clearPersonalBtn) {
        clearPersonalBtn.addEventListener('click', function() {
            const lang = localStorage.getItem('app_lang')||'en';
            if (!confirm(window.translations.confirmClearAll[lang]||window.translations.confirmClearAll.en)) return;
            localStorage.removeItem(storageKey());
            // refresh calendar and personal stats
            if (window.calendar) {
                window.calendar.removeAllEvents();
            }
            updatePersonalStats();
            alert(window.translations.recordsDeleted[lang]||window.translations.recordsDeleted.en);
        });
    }

    // Aircraft add button wiring
    const addAircraftBtn = document.getElementById('addAircraftBtn');
    if (addAircraftBtn) {
        addAircraftBtn.addEventListener('click', function() {
            const inp = document.getElementById('newAircraftInput');
            if (!inp) return;
            const v = (inp.value || '').trim();
            if (!v) return;
            saveAircraft(v);
            inp.value = '';
            const lang = localStorage.getItem('app_lang')||'en';
            alert(window.translations.added[lang] || window.translations.added.en);
        });
    }

    // also update stats when import/export or data changes
    const originalKaydet = kaydetUcus;
    // wrap kaydetUcus to call updatePersonalStats after save and register aircraft
    window.kaydetUcus = function(ucus) { originalKaydet(ucus); try { if (ucus && ucus.havaAraci) saveAircraft(ucus.havaAraci); } catch (e) {} updatePersonalStats(); };
    // expose updater to global so other flows (import) can call it
    window.updatePersonalStats = updatePersonalStats;
});