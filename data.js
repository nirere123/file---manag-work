/* ============================================================
   GLIHD Digital Records System — shared data layer
   Loaded by both login.html and dashboard.html.
   Uses localStorage as a lightweight stand-in for a real database,
   so accounts and documents persist between the login page and the
   dashboard page (and across reloads) for this demo.
   ============================================================ */

const FOLDERS = [
  {id:'admin', name:'Admin', restricted:false},
  {id:'legal', name:'Legal Aid', restricted:false},
  {id:'advocacy', name:'Advocacy', restricted:false},
  {id:'finance', name:'Finance', restricted:true}, // hidden from Staff
];

const SEED_USERS = [
  {username:'vmulisa',     password:'demo123', name:'Vestine Mulisa',   title:'Executive Director',  role:'Admin',    folder:'admin'},
  {username:'anirere',     password:'demo123', name:'Aliya Nirere',     title:'IT Support Intern',   role:'Staff',    folder:'admin'},
  {username:'juwase',      password:'demo123', name:'J. Uwase',         title:'Legal Aid Officer',   role:'Staff',    folder:'legal'},
  {username:'pnkurunziza', password:'demo123', name:'P. Nkurunziza',    title:'Advocacy Officer',    role:'Staff',    folder:'advocacy'},
  {username:'emukamana',   password:'demo123', name:'E. Mukamana',      title:'Finance Officer',     role:'Staff',    folder:'finance'},
  {username:'auditor',     password:'demo123', name:'External Auditor', title:'Compliance Reviewer', role:'ReadOnly', folder:null},
];

const SEED_FILES = [
  {id:1, name:'GLIHD_Onboarding_Checklist.pdf', folder:'admin', owner:'anirere', by:'A. Nirere', date:'05/05/2026', size:'214 KB', conf:'Internal', private:false},
  {id:2, name:'IT_Asset_Register.xlsx', folder:'admin', owner:'anirere', by:'A. Nirere', date:'06/05/2026', size:'88 KB', conf:'Confidential', private:true},
  {id:3, name:'File_Naming_Convention_Guide.pdf', folder:'admin', owner:'anirere', by:'A. Nirere', date:'18/05/2026', size:'150 KB', conf:'Public', private:false},
  {id:4, name:'Legal_Aid_Case_Intake_Form.docx', folder:'legal', owner:'juwase', by:'J. Uwase', date:'20/05/2026', size:'96 KB', conf:'Confidential', private:false},
  {id:5, name:'Community_Rights_Workshop_Report.docx', folder:'advocacy', owner:'pnkurunziza', by:'P. Nkurunziza', date:'02/06/2026', size:'340 KB', conf:'Public', private:false},
  {id:6, name:'Advocacy_Campaign_Media_Plan.pptx', folder:'advocacy', owner:'pnkurunziza', by:'P. Nkurunziza', date:'10/06/2026', size:'1.2 MB', conf:'Internal', private:false},
  {id:7, name:'Q2_Donor_Financial_Summary.xlsx', folder:'finance', owner:'emukamana', by:'E. Mukamana', date:'01/06/2026', size:'112 KB', conf:'Executive', private:true},
  {id:8, name:'Audit_Compliance_Checklist.pdf', folder:'finance', owner:'emukamana', by:'E. Mukamana', date:'15/06/2026', size:'75 KB', conf:'Confidential', private:true},
];

const SEED_AUDIT = [
  {action:'Uploaded', doc:'Audit_Compliance_Checklist.pdf', user:'E. Mukamana', when:'15 Jun, 10:42', ip:'10.0.0.22'},
  {action:'Downloaded', doc:'Advocacy_Campaign_Media_Plan.pptx', user:'P. Nkurunziza', when:'12 Jun, 15:10', ip:'10.0.0.31'},
  {action:'Uploaded', doc:'Advocacy_Campaign_Media_Plan.pptx', user:'P. Nkurunziza', when:'10 Jun, 09:03', ip:'10.0.0.31'},
  {action:'Uploaded', doc:'Q2_Donor_Financial_Summary.xlsx', user:'E. Mukamana', when:'01 Jun, 14:20', ip:'10.0.0.22'},
];

/* ---------- storage helpers ---------- */
function ensureSeeded(){
  if(!localStorage.getItem('glihd_users'))  localStorage.setItem('glihd_users', JSON.stringify(SEED_USERS));
  if(!localStorage.getItem('glihd_files'))  localStorage.setItem('glihd_files', JSON.stringify(SEED_FILES));
  if(!localStorage.getItem('glihd_audit'))  localStorage.setItem('glihd_audit', JSON.stringify(SEED_AUDIT));
  if(!localStorage.getItem('glihd_nextid')) localStorage.setItem('glihd_nextid', '9');
}
function getUsers(){ ensureSeeded(); return JSON.parse(localStorage.getItem('glihd_users')); }
function saveUsers(list){ localStorage.setItem('glihd_users', JSON.stringify(list)); }
function getFiles(){ ensureSeeded(); return JSON.parse(localStorage.getItem('glihd_files')); }
function saveFiles(list){ localStorage.setItem('glihd_files', JSON.stringify(list)); }
function getAudit(){ ensureSeeded(); return JSON.parse(localStorage.getItem('glihd_audit')); }
function saveAudit(list){ localStorage.setItem('glihd_audit', JSON.stringify(list)); }
function nextFileId(){ ensureSeeded(); const n = parseInt(localStorage.getItem('glihd_nextid'),10); localStorage.setItem('glihd_nextid', String(n+1)); return n; }

function getSession(){ return localStorage.getItem('glihd_session'); }
function setSession(username){ localStorage.setItem('glihd_session', username); }
function clearSession(){ localStorage.removeItem('glihd_session'); }
function getCurrentUser(){
  const uname = getSession();
  if(!uname) return null;
  return getUsers().find(u=>u.username===uname) || null;
}

/* Reset button helper — wipes the demo back to its original seed state */
function resetDemoData(){
  localStorage.removeItem('glihd_users');
  localStorage.removeItem('glihd_files');
  localStorage.removeItem('glihd_audit');
  localStorage.removeItem('glihd_nextid');
  localStorage.removeItem('glihd_session');
  ensureSeeded();
}

/* ---------- permission logic (all take the current user explicitly) ---------- */
function canUpload(user){ return user && (user.role === 'Admin' || user.role === 'Staff'); }
function canDelete(user){ return user && user.role === 'Admin'; }
function canSeeFolder(user, folderObj){ return !(folderObj && folderObj.restricted && user.role === 'Staff'); }
function canSeeConfidentiality(user, conf){
  if(conf === 'Executive') return user.role === 'Admin' || user.role === 'ReadOnly';
  return true;
}
function isOwnerOrAdmin(user, file){
  return user.role === 'Admin' || file.owner === user.username;
}
function canSeeFile(user, file){
  if(file.private) return isOwnerOrAdmin(user, file);
  const folderObj = FOLDERS.find(f=>f.id===file.folder);
  return canSeeFolder(user, folderObj) && canSeeConfidentiality(user, file.conf);
}

function logAudit(user, action, docName){
  const ip = '10.0.0.' + (10 + Math.floor(Math.random()*40));
  const audit = getAudit();
  audit.unshift({action, doc:docName, user: user ? user.name : 'Unknown', when:'just now', ip});
  saveAudit(audit);
}
