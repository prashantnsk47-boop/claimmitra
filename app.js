pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const INSURERS = [
  { name: 'United India Insurance', color: '#1E3A8A', bg: '#e0e7ff' }, { name: 'ICICI Lombard', color: '#b91c1c', bg: '#fee2e2' },
  { name: 'HDFC ERGO', color: '#dc2626', bg: '#fef2f2' }, { name: 'Bajaj Allianz', color: '#0284c7', bg: '#e0f2fe' },
  { name: 'TATA AIG', color: '#1e293b', bg: '#f1f5f9' }, { name: 'New India Assurance', color: '#1E3A8A', bg: '#e0e7ff' },
  { name: 'Oriental Insurance', color: '#047857', bg: '#d1fae5' }, { name: 'National Insurance', color: '#4338ca', bg: '#e0e7ff' },
  { name: 'Acko General', color: '#0f172a', bg: '#f8fafc' }, { name: 'Go Digit', color: '#f59e0b', bg: '#fef3c7' },
  { name: 'Reliance General', color: '#b91c1c', bg: '#fee2e2' }, { name: 'SBI General', color: '#1e40af', bg: '#dbeafe' }
];

const VEHICLE_TYPES = [
  { id: 'car', label: 'Private Car', emoji: '🚗', isCommercial: false }, 
  { id: 'pickup', label: 'Pickup', emoji: '🛻', isCommercial: true },
  { id: 'truck', label: 'Truck', emoji: '🚚', isCommercial: true }, 
  { id: 'bus', label: 'Passenger Bus', emoji: '🚌', isCommercial: true },
  { id: 'schoolbus', label: 'School Bus', emoji: '🚌', isCommercial: true }, 
  { id: 'tipper', label: 'Tipper', emoji: '🚛', isCommercial: true },
  { id: 'tractor', label: 'Tractor', emoji: '🚜', isCommercial: true },
];

const SHOT_CONFIG = {
  car: ['front','rear','left','right','chassis','odometer','damage'],
  pickup: ['front','rear','left','right','chassis','odometer','damage','permit'],
  truck: ['front','rear','left','right','chassis','odometer','damage','permit'],
  bus: ['front','rear','left','right','chassis','odometer','damage','permit'],
  schoolbus: ['front','rear','left','right','chassis','odometer','damage','permit'],
  tipper: ['front','rear','left','right','chassis','odometer','damage','permit'],
  tractor: ['front','rear','left','right','chassis','hourmeter','damage'],
};

const SHOT_LABELS = {
  front:    { label: 'Front View',      hint: 'Stand 2.5-3m away. Poora vehicle + number plate dikhna chahiye.' },
  rear:     { label: 'Rear View',       hint: 'Rear side ka poora view. Number plate clear ho.' },
  left:     { label: 'Left Side',       hint: 'Left side ka poora profile.' },
  right:    { label: 'Right Side',      hint: 'Right side ka poora profile.' },
  chassis:  { label: 'Chassis Number',  hint: 'Chassis number ka close-up. Agar dikh na rahe to pencil se paper par rub karke photo lein.' },
  odometer: { label: 'Odometer Reading',hint: 'Odometer ka close-up. KM reading clear ho.' },
  hourmeter:{ label: 'Hour Meter',      hint: 'Tractor ka hour meter close-up.' },
  damage:   { label: 'Damage Close-Up', hint: 'Damaged area ka close-up. Number plate bhi frame mein ho to better.' },
  permit:   { label: 'Permit / Fitness',hint: 'Permit / fitness certificate ki clear photo.' },
};

const FORM_FIELDS = [
  { key:'policy_no', label:'Policy Number', section:'Policy Details' }, { key:'vehicle_no', label:'Registration Number', section:'Vehicle Details' },
  { key:'engine_no', label:'Engine Number', section:'Vehicle Details' }, { key:'chassis_no', label:'Chassis Number', section:'Vehicle Details' },
  { key:'insured_name', label:'Insured Name', section:'Insured Details' }, { key:'mobile', label:'Mobile', section:'Insured Details', type:'tel' },
  { key:'email', label:'Email', section:'Insured Details', type:'email' }, { key:'accident_date', label:'Date of Loss', section:'Loss Details', type:'date' },
  { key:'place_of_loss', label:'Place of Accident', section:'Loss Details' },
  { key:'type_of_loss', label:'Claim Type', section:'Loss Details', type:'select', options:['','Accident','Theft','Others'] },
  { key:'estimated_repair_cost', label:'Estimated Loss', section:'Loss Details', type:'number' },
  { key:'description', label:'Description of Accident', section:'Loss Details', type:'textarea' },
  { key:'driver_name', label:'Driver Name', section:'Driver Details' }, { key:'driver_license_no', label:'Driving Licence No', section:'Driver Details' },
  { key:'permit_no', label:'Permit Number', section:'Commercial Vehicle Details' }, { key:'fitness_valid_upto', label:'Fitness Valid Upto', section:'Commercial Vehicle Details', type:'date' },
  { key:'police_report_lodged', label:'Loss Reported to Police', section:'Police Report', type:'select', options:['','Yes','No'] },
  { key:'fir_no', label:'FIR / Crime Diary No', section:'Police Report' },
];

let state = { view: 'home', claims: [], current: null, wizardStep: 1, busy: false, busyMsg: '', docStatus: {}, extractedData: {} };

async function loadClaims() { try { state.claims = (await idbKeyval.get('claims')) || []; } catch { state.claims = []; } }
async function saveClaims() { await idbKeyval.set('claims', state.claims); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function toast(msg, ms=2200) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#1E3A8A;color:#fff;padding:10px 20px;border-radius:8px;z-index:9999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function processImage(file, coords, shotLabel) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1280; let { width: w, height: h } = img;
        if (w > h && w > MAX) { h = h * MAX / w; w = MAX; } else if (h > MAX) { w = w * MAX / h; h = MAX; }
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
        const barH = Math.max(60, h * 0.09);
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, h - barH, w, barH);
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(barH * 0.28)}px Arial`;
        ctx.fillText(shotLabel, 12, h - barH + barH * 0.32);
        ctx.font = `${Math.round(barH * 0.24)}px Arial`;
        const gpsText = coords ? `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'GPS: Not available';
        ctx.fillText(gpsText, 12, h - barH + barH * 0.62);
        ctx.fillText(new Date().toLocaleString('en-IN'), 12, h - barH + barH * 0.88);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    const timer = setTimeout(() => resolve(null), 6000);
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { clearTimeout(timer); resolve(null); }, { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// FIX: PDF reading issue solved (using dynamic import & canvas to image conversion)
async function runOCR(file, docType, onProgress) {
  let text = '';
  try {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Read only first 2 pages to save memory
      const pagesToRead = Math.min(pdf.numPages, 2); 
      
      for (let i = 1; i <= pagesToRead; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Convert canvas to blob image for Tesseract (saves memory)
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg'));
        
        const { data } = await Tesseract.recognize(blob, 'eng', { 
          logger: (m) => { if (m.status === 'recognizing text') onProgress?.(m.progress); } 
        });
        text += data.text + '\n';
      }
    } else {
      const { data } = await Tesseract.recognize(file, 'eng', { 
        logger: (m) => { if (m.status === 'recognizing text') onProgress?.(m.progress); } 
      });
      text = data.text;
    }
  } catch (e) {
    console.error("OCR Error:", e);
    throw new Error("File padhne mein dikkat aayi. Password protected PDF ho sakti hai.");
  }
  return text;
}

// FIX: Extract only relevant data and check match
function extractFromText(text, docType) {
  const t = text.replace(/\s+/g, ' '); const out = {};
  const grab = (pats) => { for (const p of pats) { const m = t.match(p); if (m) return m[1].trim(); } return null; };

  if (docType === 'policy') {
    out.policy_no = grab([/policy\s*(?:no|number|#)[\s:.\-]*([A-Z0-9\-\/]{5,30})/i, /policy\s*[:\-]\s*([A-Z0-9\-\/]{5,30})/i]);
    out.insured_name = grab([/(?:insured|proposer|policy\s*holder)\s*(?:name)?[\s:.\-]*([A-Z][A-Za-z\s\.]{3,60})/i]);
    out.vehicle_no = grab([/\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/]);
    out.engine_no = grab([/engine\s*(?:no|number|#)?[\s:.\-]*([A-Z0-9]{8,25})/i]);
    out.chassis_no = grab([/chassis\s*(?:no|number|#)?[\s:.\-]*([A-Z0-9]{12,25})/i]);
    out.mobile = grab([/(?:mobile|phone|contact|cell)[\s:.\-]*(\+?91[-\s]?\d{10}|\d{10})/i, /\b([6-9]\d{9})\b/]);
    out.email = grab([/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/]);
  } 
  else if (docType === 'rc') {
    out.vehicle_no = grab([/\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z]{1,3}[-\s]?\d{4})\b/]);
    out.engine_no = grab([/engine\s*(?:no|number|#)?[\s:.\-]*([A-Z0-9]{8,25})/i]);
    out.chassis_no = grab([/chassis\s*(?:no|number|#)?[\s:.\-]*([A-Z0-9]{12,25})/i]);
    out.insured_name = grab([/(?:owner|name)\s*[:\-]?\s*([A-Z][A-Za-z\s\.]{3,60})/i]);
  }
  else if (docType === 'dl') {
    out.driver_license_no = grab([/(?:license|licence|DL)\s*(?:no|number)?[\s:.\-]*([A-Z0-9]{10,20})/i]);
    out.driver_name = grab([/(?:name)\s*[:\-]?\s*([A-Z][A-Za-z\s\.]{3,60})/i]);
  }

  return Object.fromEntries(Object.entries(out).filter(([_,v]) => v));
}

function setView(v, opts={}) { state.view = v; Object.assign(state, opts); render(); window.scrollTo(0, 0); }
function startNewClaim() {
  state.current = { id: uid(), insurer: INSURERS[0].name, vehicleType: '', fields: {}, photos: [], createdAt: new Date().toISOString() };
  state.docStatus = {};
  state.extractedData = {};
  state.wizardStep = 1; setView('wizard');
}
function openClaim(id) { state.current = state.claims.find(c => c.id === id); if (state.current) { state.wizardStep = 2; setView('wizard'); } }

function render() {
  const app = document.getElementById('app'); let html = '';
  switch (state.view) {
    case 'home': html = renderHome(); break;
    case 'wizard': html = renderWizard(); break;
    case 'insurers': html = renderInsurers(); break;
    case 'settings': html = renderSettings(); break;
    default: html = renderHome();
  }
  app.innerHTML = html;
}

function renderHome() {
  const recent = state.claims.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  return `<div class="max-w-md mx-auto min-h-screen bg-white pb-8">
    <header class="bg-[#1E3A8A] text-white p-5 pb-6 rounded-b-3xl">
      <div class="flex items-center justify-between"><div><h1 class="text-2xl font-bold">ClaimMitra</h1><p class="text-xs opacity-80 mt-0.5">Motor Insurance Claim Assistant</p></div>
      <a href="#" onclick="setView('settings');return false" class="text-xs bg-white/20 px-3 py-2 rounded-lg">Settings</a></div>
    </header>
    <main class="p-4 space-y-4">
      <button onclick="startNewClaim()" class="w-full bg-[#F59E0B] text-white p-5 rounded-2xl shadow-md text-left active:opacity-90">
        <p class="font-bold text-lg">+ Start New Claim</p><p class="text-sm mt-1 opacity-90">Upload docs → Auto-fill → Guided photos → PDF</p></button>
      <div class="grid grid-cols-2 gap-3">
        <button onclick="setView('insurers')" class="card p-4 text-left"><p class="text-2xl">📞</p><p class="font-semibold text-sm mt-1">Insurer Contacts</p><p class="text-xs text-gray-500">Toll-free numbers</p></button>
        <button onclick="loadDemo()" class="card p-4 text-left"><p class="text-2xl">🧪</p><p class="font-semibold text-sm mt-1">Demo Claim</p><p class="text-xs text-gray-500">Try PDFs instantly</p></button>
      </div>
      <div><div class="flex items-center justify-between mb-2 mt-4"><p class="font-semibold text-gray-800">Recent Claims</p><span class="text-xs text-gray-400">${state.claims.length} total</span></div>
        ${recent.length === 0 ? `<div class="card p-6 text-center text-gray-400"><p class="text-4xl mb-2">📄</p><p class="text-sm">No claims yet. Tap "Start New Claim".</p></div>` : recent.map(c => `
          <button onclick="openClaim('${c.id}')" class="card p-3 w-full text-left mb-2 flex items-center gap-3">
            <div class="text-2xl">${VEHICLE_TYPES.find(v=>v.id===c.vehicleType)?.emoji || '🚗'}</div>
            <div class="flex-1 min-w-0"><p class="font-semibold text-sm truncate">${esc(c.fields?.vehicle_no || 'Vehicle not set')}</p><p class="text-xs text-gray-500 truncate">Policy: ${esc(c.fields?.policy_no || 'N/A')} · ${c.photos?.length || 0} photos</p></div>
            <span class="text-gray-300 text-xl">›</span></button>`).join('')}
      </div></main></div>`;
}

function renderWizard() {
  const c = state.current; if (!c) return '<p class="p-4">No claim</p>'; let body = '';
  if (state.wizardStep === 1) body = wizardStep1(); else if (state.wizardStep === 2) body = wizardStep2(); else if (state.wizardStep === 3) body = wizardStep3(); else body = wizardStep4();
  const titles = ['Select Insurer & Vehicle', 'Documents & Details', 'Vehicle Photos', 'Review & PDF'];
  return `<div class="max-w-md mx-auto min-h-screen bg-white pb-24">
    <header class="bg-[#1E3A8A] text-white p-4 sticky top-0 z-10"><div class="flex items-center gap-3">
      <button onclick="if(state.wizardStep>1){state.wizardStep--;render();}else{setView('home')}" class="text-2xl leading-none">‹</button>
      <div class="flex-1"><p class="text-xs opacity-80">Step ${state.wizardStep} of 4</p><p class="font-semibold text-sm">${titles[state.wizardStep-1]}</p></div></div>
      <div class="mt-3 flex gap-1">${[1,2,3,4].map(i => `<div class="flex-1 h-1 rounded-full ${i<=state.wizardStep?'bg-[#F59E0B]':'bg-white/30'}"></div>`).join('')}</div>
    </header><main class="p-4">${body}</main></div>`;
}

function wizardStep1() {
  const c = state.current;
  return `<p class="text-sm text-gray-600 mb-2 font-semibold">1. Insurance Company Chuniye</p>
    <select onchange="setInsurer(this.value)" class="w-full border border-gray-300 rounded-lg p-3 text-sm mb-6 bg-white">
      ${INSURERS.map(ins => `<option value="${ins.name}" ${c.insurer === ins.name ? 'selected' : ''}>${ins.name}</option>`).join('')}
    </select>
    
    <p class="text-sm text-gray-600 mb-2 font-semibold">2. Vehicle Type Chuniye</p>
    <div class="grid grid-cols-2 gap-3">${VEHICLE_TYPES.map(v => `<button onclick="pickVehicle('${v.id}')" class="card p-4 text-center ${c.vehicleType===v.id?'ring-2 ring-[#1E3A8A] bg-blue-50':''}"><p class="text-3xl">${v.emoji}</p><p class="text-sm font-semibold mt-2">${v.label}</p></button>`).join('')}</div>`;
}
function setInsurer(val) { state.current.insurer = val; }
function pickVehicle(id) { state.current.vehicleType = id; state.wizardStep = 2; render(); }

function wizardStep2() {
  const c = state.current; const grouped = {}; FORM_FIELDS.forEach(f => { (grouped[f.section] = grouped[f.section] || []).push(f); });
  
  // Check for Name Mismatch (RC vs Policy)
  let mismatchAlert = '';
  if (state.extractedData.policy?.insured_name && state.extractedData.rc?.insured_name) {
    const pName = state.extractedData.policy.insured_name.toLowerCase().replace(/[^a-z]/g, '');
    const rName = state.extractedData.rc.insured_name.toLowerCase().replace(/[^a-z]/g, '');
    if (!pName.includes(rName) && !rName.includes(pName)) {
      mismatchAlert = `<div class="alert-danger">⚠️ WARNING: Policy mein naam "${esc(state.extractedData.policy.insured_name)}" hai, aur RC mein naam "${esc(state.extractedData.rc.insured_name)}" hai. Dono match nahi kar rahe hain! Claim reject ho sakta hai.</div>`;
    } else {
      mismatchAlert = `<div class="alert-success">✓ Naam sahi mil raha hai Policy aur RC mein.</div>`;
    }
  }

  const docList = [
    { id: 'policy', label: 'Insurance Policy' },
    { id: 'rc', label: 'RC (Registration)' },
    { id: 'dl', label: 'Driving License' },
    { id: 'aadhaar', label: 'Aadhaar / PAN' }
  ];
  const docStatusHtml = docList.map(doc => `
    <div class="flex items-center justify-between mb-2 pb-2 border-b border-gray-100 last:border-0 text-xs">
      <span class="text-gray-700 font-medium">${doc.label} ${doc.id === 'aadhaar' ? '(Optional)' : ''}</span>
      <span class="px-2 py-1 rounded-full font-bold ${state.docStatus[doc.id] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}">
        ${state.docStatus[doc.id] ? '✓ Uploaded' : 'Pending'}
      </span>
    </div>
  `).join('');

  return `<div class="card p-4 mb-4 border-2 border-[#1E3A8A]">
      <p class="text-sm text-gray-800 mb-3 font-bold flex items-center gap-2">📄 Step A: Upload Documents (Auto-fill)</p>
      
      ${mismatchAlert}

      <div class="mb-4 bg-gray-50 p-3 rounded-lg border">
        <p class="text-xs font-semibold text-gray-600 mb-2 uppercase">Upload Status:</p>
        ${docStatusHtml}
      </div>

      <label class="block w-full bg-blue-50 border-2 border-dashed border-[#1E3A8A] rounded-xl p-4 text-center cursor-pointer active:bg-blue-100 transition">
        <span class="text-2xl block mb-1">📁</span>
        <span class="text-sm font-bold text-[#1E3A8A]">Tap to Choose Files</span>
        <p class="text-[10px] text-gray-500 mt-1">Select PDF or Images (Policy, RC, DL)</p>
        <input type="file" multiple accept="image/*,application/pdf" onchange="handleUpload(event)" class="hidden"/>
      </label>
      
      ${state.busy ? `<div class="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-[#1E3A8A] bg-blue-50 p-2 rounded"><span class="spinner"></span>${esc(state.busyMsg)}</div>` : ''}
    </div>

    <p class="text-xs text-gray-500 text-center mb-3 font-semibold">— OR Fill Manually —</p>
    
    <p class="text-sm text-gray-700 mb-3 font-semibold">Step B: Verify Details</p>
    ${Object.entries(grouped).map(([section, fields]) => `<div class="mb-4"><p class="text-xs font-bold text-[#1E3A8A] uppercase mb-2">${section}</p><div class="space-y-2">${fields.map(f => renderField(f, c.fields[f.key])).join('')}</div></div>`).join('')}
    
    <button onclick="nextToPhotos()" class="w-full bg-[#F59E0B] text-white p-4 rounded-xl font-bold mt-4 shadow-lg active:scale-95 transition">Next: Capture Photos →</button>`;
}

function renderField(f, value) {
  const common = `class="w-full border border-gray-300 rounded-lg p-3 text-sm
