/* ============================================================
   login.js — behavior for login.html only
   ============================================================ */

// If someone is already signed in, skip straight to the dashboard.
if(getSession()){
  window.location.href = 'dashboard.html';
}

function populateLoginDirectory(){
  const sel = document.getElementById('loginUser');
  sel.innerHTML = getUsers().map(u=>`<option value="${u.username}">${u.name} — ${u.title}</option>`).join('');
}

function attemptLogin(){
  const username = document.getElementById('loginUser').value;
  const password = document.getElementById('loginPassword').value;
  const user = getUsers().find(u=>u.username===username);
  const errEl = document.getElementById('loginError');
  if(!user || password !== user.password){
    errEl.textContent = 'Incorrect password. Hint: every demo account uses demo123.';
    return;
  }
  errEl.textContent = '';
  setSession(user.username);
  logAudit(user, 'Logged in', '— session start —');
  window.location.href = 'dashboard.html';
}

function slugifyUsername(fullName){
  const base = fullName.toLowerCase().trim().replace(/[^a-z\s]/g,'').split(/\s+/).join('.');
  let candidate = base || 'user';
  let n = 1;
  const users = getUsers();
  while(users.some(u=>u.username===candidate)){
    n++;
    candidate = base + n;
  }
  return candidate;
}

function attemptSignup(){
  const name = document.getElementById('signupName').value.trim();
  const dept = document.getElementById('signupDept').value;
  const pw1 = document.getElementById('signupPassword').value;
  const pw2 = document.getElementById('signupPassword2').value;
  const errEl = document.getElementById('signupError');

  if(!name){ errEl.textContent = 'Enter your full name.'; return; }
  if(pw1.length < 6){ errEl.textContent = 'Password must be at least 6 characters.'; return; }
  if(pw1 !== pw2){ errEl.textContent = 'Passwords do not match.'; return; }

  errEl.textContent = '';
  const deptNames = {admin:'Admin', legal:'Legal Aid', advocacy:'Advocacy', finance:'Finance'};
  const newUser = {
    username: slugifyUsername(name),
    password: pw1,
    name: name,
    title: 'Staff Member — ' + deptNames[dept],
    role: 'Staff',
    folder: dept,
  };
  const users = getUsers();
  users.push(newUser);
  saveUsers(users);

  setSession(newUser.username);
  logAudit(newUser, 'Account created', '— new staff account —');
  window.location.href = 'dashboard.html';
}

function showSignupPane(){
  document.getElementById('loginPane').style.display = 'none';
  document.getElementById('signupPane').style.display = 'block';
  document.getElementById('loginError').textContent = '';
}
function showLoginPane(){
  document.getElementById('signupPane').style.display = 'none';
  document.getElementById('loginPane').style.display = 'block';
  document.getElementById('signupError').textContent = '';
}

document.getElementById('loginBtn').addEventListener('click', attemptLogin);
document.getElementById('loginPassword').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') attemptLogin();
});
document.getElementById('signupBtn').addEventListener('click', attemptSignup);
document.getElementById('showSignupBtn').addEventListener('click', showSignupPane);
document.getElementById('showLoginBtn').addEventListener('click', showLoginPane);
document.getElementById('resetBtn').addEventListener('click', ()=>{
  if(confirm('Reset all demo accounts and documents back to their starting state?')){
    resetDemoData();
    populateLoginDirectory();
    alert('Demo data has been reset.');
  }
});

populateLoginDirectory();
