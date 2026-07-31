/* ============================================================
   dashboard.js — behavior for dashboard.html only
   ============================================================ */

// Guard: bounce back to login if nobody is signed in.
const currentUser = getCurrentUser();
if(!currentUser){
  window.location.href = 'login.html';
}

let uiState = {
  currentFolder: 'all',
  search: '',
  confFilter: 'all',
};

function currentFileList(){
  let list = getFiles().filter(f=>canSeeFile(currentUser, f));
  if(uiState.currentFolder !== 'all') list = list.filter(f=>f.folder===uiState.currentFolder);
  if(uiState.confFilter !== 'all') list = list.filter(f=>f.conf===uiState.confFilter);
  if(uiState.search.trim()) list = list.filter(f=>f.name.toLowerCase().includes(uiState.search.toLowerCase()));
  return list;
}

function renderSidebar(){
  const el = document.getElementById('folderList');
  const allItem = document.createElement('div');
  const allCount = getFiles().filter(f=>canSeeFile(currentUser, f)).length;
  let html = `<div class="folder-item ${uiState.currentFolder==='all'?'active':''}" data-folder="all">
                <span>All Records</span><span class="folder-count">${allCount}</span></div>`;
  FOLDERS.forEach(f=>{
    if(!canSeeFolder(currentUser, f)) return;
    const count = getFiles().filter(x=>x.folder===f.id && canSeeFile(currentUser, x)).length;
    html += `<div class="folder-item ${uiState.currentFolder===f.id?'active':''}" data-folder="${f.id}">
               <span>${f.name}</span><span class="folder-count">${count}</span></div>`;
  });
  el.innerHTML = html;
  el.querySelectorAll('.folder-item').forEach(item=>{
    item.addEventListener('click', ()=>{
      uiState.currentFolder = item.getAttribute('data-folder');
      render();
    });
  });
}

function renderBanner(){
  const el = document.getElementById('lockedBanner');
  if(currentUser.role === 'ReadOnly'){
    el.innerHTML = `<div class="locked-banner">You are signed in as a Read-Only / Auditor account. You can view and download shared documents, but uploading, deleting, and private documents are not accessible.</div>`;
  } else if(currentUser.role === 'Staff'){
    el.innerHTML = `<div class="locked-banner">Signed in as Staff. The Finance folder is only visible to Admin accounts, and any document marked "Private" is only visible to its owner and the Executive Director.</div>`;
  } else {
    el.innerHTML = '';
  }
}

function renderDashboard(){
  const el = document.getElementById('adminDashboard');
  if(currentUser.role !== 'Admin'){ el.innerHTML = ''; return; }
  const files = getFiles();
  const audit = getAudit();
  el.innerHTML = `
    <div class="dashboard-cards">
      <div class="card"><div class="num">${files.length}</div><div class="lbl">Documents stored</div></div>
      <div class="card"><div class="num">${FOLDERS.length}</div><div class="lbl">Department folders</div></div>
      <div class="card"><div class="num">${audit.length}</div><div class="lbl">Logged actions</div></div>
    </div>`;
}

function renderMainHead(){
  const folderObj = FOLDERS.find(f=>f.id===uiState.currentFolder);
  document.getElementById('folderTitle').textContent = folderObj ? folderObj.name : 'All Records';
  document.getElementById('folderSub').textContent = folderObj
    ? `Documents in the ${folderObj.name} folder`
    : 'Documents shared across GLIHD departments';
  document.getElementById('userPill').textContent = `${currentUser.name} · ${currentUser.title}`;
}

function renderTable(){
  const list = currentFileList();
  const body = document.getElementById('fileTableBody');
  document.getElementById('uploadBtn').disabled = !canUpload(currentUser);

  if(list.length === 0){
    body.innerHTML = `<tr><td colspan="7"><div class="empty">No documents found here yet. ${canUpload(currentUser) ? 'Use "Upload document" to add the first one.' : ''}</div></td></tr>`;
    return;
  }

  body.innerHTML = list.map(f=>{
    const folderObj = FOLDERS.find(x=>x.id===f.folder);
    const canTogglePrivacy = isOwnerOrAdmin(currentUser, f);
    return `
    <tr>
      <td class="file-name">${f.name}${f.private ? '<span class="lock-tag">🔒 Private</span>' : ''}</td>
      <td><span class="tag">${folderObj ? folderObj.name : f.folder}</span></td>
      <td><span class="conf-tag conf-${f.conf}">${f.conf}</span></td>
      <td>${f.by}</td>
      <td>${f.date}</td>
      <td>${f.size}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="btn-secondary" onclick="downloadFile(${f.id})">Download</button>
          ${canTogglePrivacy ? `<button class="btn-secondary" onclick="togglePrivacy(${f.id})">${f.private ? 'Make shared' : 'Make private'}</button>` : ''}
          <button class="btn-danger" ${canDelete(currentUser) ? '' : 'disabled'} onclick="deleteFile(${f.id})">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderAudit(){
  const el = document.getElementById('auditList');
  el.innerHTML = getAudit().slice(0,10).map(a=>`
    <div class="audit-entry">
      <div class="action">${a.action}</div>
      <div>${a.doc}</div>
      <div class="meta">${a.user} · ${a.when} · IP ${a.ip}</div>
    </div>
  `).join('');
}

function renderNotifications(){
  const el = document.getElementById('notifList');
  el.innerHTML = getAudit().slice(0,5).map(a=>`
    <div class="notif-item"><b>${a.user}</b> ${a.action.toLowerCase()} <b>${a.doc}</b><br><span class="notif-time">${a.when}</span></div>
  `).join('');
}

function render(){
  renderSidebar();
  renderBanner();
  renderDashboard();
  renderMainHead();
  renderTable();
  renderAudit();
  renderNotifications();
}

/* ---------- actions ---------- */
function downloadFile(id){
  const f = getFiles().find(x=>x.id===id);
  if(!f) return;
  logAudit(currentUser, 'Downloaded', f.name);
  render();
}

function togglePrivacy(id){
  const files = getFiles();
  const f = files.find(x=>x.id===id);
  if(!f || !isOwnerOrAdmin(currentUser, f)) return;
  f.private = !f.private;
  saveFiles(files);
  logAudit(currentUser, f.private ? 'Marked private' : 'Marked shared', f.name);
  render();
}

function deleteFile(id){
  if(!canDelete(currentUser)) return;
  const files = getFiles();
  const f = files.find(x=>x.id===id);
  if(!f) return;
  if(!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
  saveFiles(files.filter(x=>x.id!==id));
  logAudit(currentUser, 'Deleted', f.name);
  render();
}

/* ---------- event wiring ---------- */
document.getElementById('searchBox').addEventListener('input', (e)=>{
  uiState.search = e.target.value;
  renderTable();
});

document.getElementById('confFilter').addEventListener('change', (e)=>{
  uiState.confFilter = e.target.value;
  renderTable();
});

document.getElementById('clearSearchBtn').addEventListener('click', ()=>{
  uiState.search = '';
  uiState.confFilter = 'all';
  document.getElementById('searchBox').value = '';
  document.getElementById('confFilter').value = 'all';
  renderTable();
});

document.getElementById('bellBtn').addEventListener('click', (e)=>{
  e.stopPropagation();
  document.getElementById('bellPanel').classList.toggle('open');
});
document.addEventListener('click', ()=>{
  document.getElementById('bellPanel').classList.remove('open');
});

document.getElementById('uploadBtn').addEventListener('click', ()=>{
  if(!canUpload(currentUser)) return;
  const name = prompt('Enter a file name to simulate an upload (e.g. Staff_Meeting_Notes.docx):');
  if(!name) return;
  let conf = prompt('Confidentiality level? Type Public, Internal, Confidential, or Executive:', 'Internal');
  const validConf = ['Public','Internal','Confidential','Executive'];
  if(!validConf.includes(conf)) conf = 'Internal';
  if(conf === 'Executive' && currentUser.role !== 'Admin'){
    alert('Only Admin accounts can mark a document as Executive. Saving as Confidential instead.');
    conf = 'Confidential';
  }
  const makePrivate = confirm('Make this document private — visible only to you and the Executive Director?\n\nOK = Private   /   Cancel = Shared with your department');
  const folderId = uiState.currentFolder === 'all' ? (currentUser.folder || 'admin') : uiState.currentFolder;
  const newFile = {
    id: nextFileId(),
    name: name,
    folder: folderId,
    owner: currentUser.username,
    by: currentUser.name,
    date: new Date().toLocaleDateString('en-GB'),
    size: (Math.round(Math.random()*400)+40) + ' KB',
    conf: conf,
    private: makePrivate,
  };
  const files = getFiles();
  files.unshift(newFile);
  saveFiles(files);
  logAudit(currentUser, 'Uploaded', newFile.name);
  render();
});

document.getElementById('logoutBtn').addEventListener('click', ()=>{
  logAudit(currentUser, 'Logged out', '— session end —');
  clearSession();
  window.location.href = 'login.html';
});

if(currentUser){
  render();
}
