import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'campushelp-reports-v1';
const initialReports = [
  { id: 'CH-1042', title: 'Broken light near the library', category: 'Facilities', location: 'Central Library', details: 'The lamp beside the east entrance is not working.', priority: 'P2 · Facility', status: 'In Progress', createdAt: 'Today, 10:42 AM' },
  { id: 'CH-1038', title: 'Request for fee installment information', category: 'Finance', location: 'Finance Office', details: 'Need details about the installment process.', priority: 'P3 · Routine', status: 'Resolved', createdAt: 'Yesterday, 2:15 PM' },
  { id: 'CH-1031', title: 'Water leak in Block B', category: 'Facilities', location: 'Engineering Block', details: 'Water is leaking near the second-floor corridor.', priority: 'P2 · Facility', status: 'Submitted', createdAt: 'Yesterday, 11:05 AM' }
];

// The campus is imaginary. Coordinates below are points on our own SVG map, not real GPS coordinates.
const places = [
  { id: 'gate', name: 'Main Gate', x: 80, y: 300, kind: 'gate', description: 'Campus entrance' },
  { id: 'admin', name: 'Admin Block', x: 230, y: 235, kind: 'office', description: 'Administration and student help desk' },
  { id: 'library', name: 'Central Library', x: 380, y: 115, kind: 'study', description: 'Library, reading rooms and study spaces' },
  { id: 'engineering', name: 'Engineering Block', x: 395, y: 300, kind: 'academic', description: 'Engineering classrooms and labs' },
  { id: 'cafeteria', name: 'Cafeteria', x: 565, y: 205, kind: 'food', description: 'Food court and student seating' },
  { id: 'hostel', name: 'Student Hostel', x: 590, y: 365, kind: 'residential', description: 'Student residence' },
  { id: 'clinic', name: 'Health Centre', x: 720, y: 110, kind: 'health', description: 'First aid and campus health support' },
  { id: 'sports', name: 'Sports Complex', x: 760, y: 300, kind: 'sports', description: 'Grounds, courts and indoor sports' },
  { id: 'finance', name: 'Finance Office', x: 210, y: 100, kind: 'office', description: 'Fees, receipts and accounts' },
  { id: 'auditorium', name: 'Auditorium', x: 245, y: 365, kind: 'academic', description: 'Lectures, events and college gatherings' },
  { id: 'science', name: 'Science Block', x: 505, y: 85, kind: 'academic', description: 'Science classrooms and laboratories' },
  { id: 'parking', name: 'Parking Area', x: 80, y: 390, kind: 'gate', description: 'Student and visitor parking' },
  { id: 'innovation', name: 'Innovation Hub', x: 510, y: 290, kind: 'academic', description: 'Project labs and collaboration spaces' },
  { id: 'gym', name: 'Indoor Gym', x: 700, y: 390, kind: 'sports', description: 'Fitness and indoor recreation' },
  { id: 'bookstore', name: 'Campus Store', x: 300, y: 165, kind: 'food', description: 'Books, stationery and essentials' }
];
const edges = [
  ['gate','admin',4], ['gate','engineering',7], ['admin','engineering',3], ['admin','finance',3], ['finance','library',4], ['admin','library',6], ['library','engineering',5], ['library','cafeteria',5], ['library','clinic',6], ['engineering','cafeteria',4], ['engineering','hostel',5], ['cafeteria','clinic',4], ['cafeteria','hostel',4], ['cafeteria','sports',5], ['hostel','sports',3], ['clinic','sports',5],
  ['gate','parking',2], ['gate','auditorium',5], ['auditorium','engineering',4], ['admin','bookstore',3], ['bookstore','library',3], ['bookstore','finance',3], ['bookstore','engineering',4], ['library','science',3], ['science','clinic',4], ['science','cafeteria',4], ['engineering','innovation',3], ['innovation','cafeteria',2], ['innovation','hostel',4], ['sports','gym',2], ['hostel','gym',3], ['parking','auditorium',4]
];
const categories = ['Facilities', 'Finance', 'IT Support', 'Academic', 'Security', 'Other'];
const statusSteps = ['Submitted', 'In Progress', 'Resolved'];

function dijkstra(start, end) {
  const graph = Object.fromEntries(places.map(p => [p.id, []]));
  edges.forEach(([a,b,w]) => { graph[a].push([b,w]); graph[b].push([a,w]); });
  const dist = Object.fromEntries(places.map(p => [p.id, Infinity]));
  const previous = {};
  const unvisited = new Set(places.map(p => p.id));
  dist[start] = 0;
  while (unvisited.size) {
    let current = null;
    for (const id of unvisited) if (current === null || dist[id] < dist[current]) current = id;
    if (current === null || dist[current] === Infinity) break;
    if (current === end) break;
    unvisited.delete(current);
    for (const [next, weight] of graph[current]) {
      const candidate = dist[current] + weight;
      if (candidate < dist[next]) { dist[next] = candidate; previous[next] = current; }
    }
  }
  if (start !== end && !previous[end]) return { path: [], distance: Infinity };
  const path = []; let cursor = end;
  while (cursor) { path.unshift(cursor); if (cursor === start) break; cursor = previous[cursor]; }
  return { path, distance: dist[end] };
}
function makeId() { return `CH-${Math.floor(1000 + Math.random() * 9000)}`; }
function readReports() {
  try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? JSON.parse(saved) : initialReports; }
  catch { return initialReports; }
}
function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span>; }

function CampusMap({ start, setStart, destination, setDestination, route, livePoint }) {
  const routeEdges = route.path.slice(1).map((id, i) => [route.path[i], id]);
  const isOnRoute = (a,b) => routeEdges.some(([x,y]) => (x===a&&y===b)||(x===b&&y===a));
  return <div className="map-frame">
    <svg className="campus-map" viewBox="0 0 840 450" role="img" aria-label="Illustrated fictional college campus map">
      <defs><pattern id="grass" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="4" cy="5" r="1" fill="#d8e8d7"/><circle cx="17" cy="17" r="1" fill="#d8e8d7"/></pattern></defs>
      <rect width="840" height="450" rx="18" fill="#eef5ed"/><rect width="840" height="450" rx="18" fill="url(#grass)"/>
      <path d="M30 300 L170 300 L230 235 L320 235 L395 300 L500 300 L590 365 L760 300 M230 235 L210 100 L380 115 L395 300 M380 115 L565 205 L720 110 M395 300 L565 205 L590 365 M565 205 L760 300" fill="none" stroke="#fff" strokeWidth="27" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 300 L170 300 L230 235 L320 235 L395 300 L500 300 L590 365 L760 300 M230 235 L210 100 L380 115 L395 300 M380 115 L565 205 L720 110 M395 300 L565 205 L590 365 M565 205 L760 300" fill="none" stroke="#cbd9d1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M465 65 C530 40 650 60 680 140 S650 260 690 330 S650 420 520 405" fill="none" stroke="#d3e6c9" strokeWidth="42" strokeLinecap="round"/>
      <path d="M465 65 C530 40 650 60 680 140 S650 260 690 330 S650 420 520 405" fill="none" stroke="#b9d7ad" strokeWidth="2" strokeDasharray="4 8"/>
      {edges.map(([a,b]) => { const p=places.find(x=>x.id===a), q=places.find(x=>x.id===b); return <g key={`${a}-${b}`}><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#fff" strokeWidth="17" strokeLinecap="round"/><line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={isOnRoute(a,b)?'#0d9488':'#cbd9d1'} strokeWidth={isOnRoute(a,b)?7:2} strokeLinecap="round" opacity=".95"/></g>; })}
      {places.map(p => <g key={p.id} className="map-place" onClick={() => setDestination(p.id)} role="button" tabIndex="0" aria-label={`Route to ${p.name}`} onKeyDown={e=>{if(e.key==='Enter')setDestination(p.id)}}>
        <rect x={p.x-31} y={p.y-20} width="62" height="40" rx="7" fill={p.id===destination?'#0d9488':p.id===start?'#17243b':'#d7e1dc'} stroke={p.id===destination?'#fff':'#9db2a7'} strokeWidth="2"/>
        <rect x={p.x-24} y={p.y-13} width="48" height="26" rx="3" fill={p.id===destination?'#27b5a6':p.id===start?'#34445e':'#f8fbf9'}/>
        <text x={p.x} y={p.y+4} textAnchor="middle" fontSize="13" fill={p.id===destination||p.id===start?'#fff':'#43584d'} fontWeight="700">{p.kind==='health'?'✚':p.kind==='study'?'▤':p.kind==='food'?'♨':p.kind==='sports'?'⚽':p.kind==='gate'?'⇥':p.kind==='residential'?'⌂':'▦'}</text>
        <text x={p.x} y={p.y+35} textAnchor="middle" fontSize="12" fontWeight="700" fill="#253a31">{p.name}</text>
      </g>)}
      {livePoint && <g><circle cx={livePoint.x} cy={livePoint.y} r="15" fill="#3b82f6" opacity=".18"/><circle cx={livePoint.x} cy={livePoint.y} r="7" fill="#2563eb" stroke="white" strokeWidth="3"/><text x={livePoint.x} y={livePoint.y-18} textAnchor="middle" fontSize="11" fill="#1d4ed8" fontWeight="700">YOU (DEMO)</text></g>}
      <g transform="translate(795 28)"><circle r="17" fill="#fff" stroke="#d3ddd7"/><path d="M0 -10 L5 5 L0 2 L-5 5 Z" fill="#52685c"/><text x="0" y="30" textAnchor="middle" fontSize="10" fill="#52685c">N</text></g>
    </svg>
    <div className="map-legend"><span><i className="legend-dot route-dot"/> Suggested shortest route</span><span><i className="legend-dot you-dot"/> Your demo position</span><span><i className="legend-dot building-dot"/> Campus building</span></div>
  </div>;
}

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  function submit(e) { e.preventDefault(); if (username.trim().toLowerCase() === 'admin' && password === 'CampusHelp@123') { onLogin(); } else { setError('Invalid demo credentials. Please check the username and password.'); } }
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="login-brand"><span className="brand-mark">C</span><div><strong>CampusHelp</strong><small>ADMINISTRATOR ACCESS</small></div></div><div className="eyebrow">RESTRICTED WORKSPACE</div><h1>Welcome back.</h1><p>Sign in to manage campus reports and update complaint status.</p><label htmlFor="admin-username">USERNAME</label><input id="admin-username" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter admin username" required/><label htmlFor="admin-password">PASSWORD</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" required/>{error&&<div className="login-error" role="alert">{error}</div>}<button className="primary-btn full-btn" type="submit">Sign in to admin <span>→</span></button><div className="login-demo-note"><strong>Demo credentials</strong><br/>Username: <code>admin</code><br/>Password: <code>CampusHelp@123</code><br/><small>Prototype-only login; not secure authentication for a real deployment.</small></div><a href="/" className="back-link">← Return to student CampusHelp</a></form></div>;
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [adminAuthenticated, setAdminAuthenticated] = useState(() => sessionStorage.getItem('campushelp-admin-demo') === 'true');
  const [page, setPage] = useState(window.location.pathname.startsWith('/admin') ? 'Admin panel' : 'Overview');
  const [reports, setReports] = useState(readReports);
  const [start, setStart] = useState('gate');
  const [destination, setDestination] = useState('clinic');
  const [livePoint, setLivePoint] = useState(null);
  const [gps, setGps] = useState({ state: 'idle', message: 'Location has not been requested yet.' });
  const [form, setForm] = useState({ title: '', category: 'Facilities', location: 'Engineering Block', details: '', urgent: false });
  const [trackId, setTrackId] = useState('');
  const [notice, setNotice] = useState('');
  const route = useMemo(() => dijkstra(start, destination), [start, destination]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); }, [reports]);
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  function enterAdmin() { sessionStorage.setItem('campushelp-admin-demo', 'true'); setAdminAuthenticated(true); window.history.pushState({}, '', '/admin'); setPath('/admin'); setPage('Admin panel'); }
  function leaveAdmin() { sessionStorage.removeItem('campushelp-admin-demo'); setAdminAuthenticated(false); window.history.pushState({}, '', '/'); setPath('/'); setPage('Overview'); }
  if (path.startsWith('/admin') && !adminAuthenticated) return <AdminLogin onLogin={enterAdmin} />;
  const openReports = reports.filter(r => r.status !== 'Resolved');
  const urgentReports = reports.filter(r => r.priority.startsWith('P1'));
  const nav = [{name:'Overview',icon:'◫'}, {name:'Campus map',icon:'⌖'}, {name:'Report an issue',icon:'＋'}, {name:'Track complaint',icon:'◎'}];
  function showNotice(message) { setNotice(message); window.setTimeout(() => setNotice(''), 4000); }
  function requestLocation() {
    if (!navigator.geolocation) { setGps({state:'error',message:'This browser does not support geolocation.'}); return; }
    setGps({state:'loading',message:'Requesting permission from your browser…'});
    navigator.geolocation.getCurrentPosition(pos => {
      const {latitude, longitude, accuracy} = pos.coords;
      setGps({state:'success',message:`Location received · ${latitude.toFixed(5)}, ${longitude.toFixed(5)} · accuracy about ${Math.round(accuracy)} m`});
      setLivePoint(null);
      showNotice('Live coordinates received. They are real GPS coordinates, not positions on the fictional campus map.');
    }, err => {
      const msg = err.code===1 ? 'Location permission was denied. Allow location access in your browser and try again.' : err.code===2 ? 'Your device could not determine a location. Try again outdoors or check device location settings.' : 'Location request timed out. Please try again.';
      setGps({state:'error',message:msg});
    }, {enableHighAccuracy:true, timeout:12000, maximumAge:10000});
  }
  function useDemoLocation() { setStart('engineering'); setLivePoint({x:395,y:300}); setGps({state:'demo',message:'Demo position set to Engineering Block. This is simulated campus data, not GPS.'}); }
  function submitReport(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.details.trim()) { showNotice('Please add a title and describe the issue.'); return; }
    const priority = form.urgent || form.category==='Security' ? 'P1 · Urgent safety' : form.category==='Facilities' ? 'P2 · Facility' : 'P3 · Routine';
    const report = { id: makeId(), title: form.title.trim(), category: form.category, location: form.location, details: form.details.trim(), priority, status: 'Submitted', createdAt: new Date().toLocaleString() };
    setReports(prev => [report, ...prev]); setTrackId(report.id); setForm({title:'',category:'Facilities',location:'Engineering Block',details:'',urgent:false}); setPage('Track complaint'); showNotice(`Report created successfully. Your complaint ID is ${report.id}.`);
  }
  function updateStatus(id, status) { setReports(prev => prev.map(r => r.id===id ? {...r,status} : r)); showNotice(`${id} updated to ${status}.`); }
  const selectedTrack = reports.find(r => r.id.toLowerCase() === trackId.trim().toLowerCase());
  const target = places.find(p=>p.id===destination);

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><strong>CampusHelp</strong><small>STUDENT SERVICES</small></div></div>
      <div className="campus-chip"><span className="online-dot"/> DEMO CAMPUS <span className="chip-arrow">⌄</span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(n=><button key={n.name} className={`nav-item ${page===n.name?'active':''}`} onClick={()=>{setPage(n.name); if(path.startsWith('/admin')) { window.history.pushState({}, '', '/'); setPath('/'); }}}><span className="nav-icon">{n.icon}</span><span className="nav-text">{n.name}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon">✦</div><strong>Need immediate help?</strong><p>For a real emergency, contact campus security or local emergency services directly.</p><button onClick={()=>{setPage('Report an issue');setForm(f=>({...f,category:'Security',urgent:true,title:f.title||'Urgent safety concern'}));}}>Report emergency <span>↗</span></button></div><div className="profile"><div className="avatar">ST</div><div><strong>Demo Student</strong><small>Student account · demo</small></div><span className="profile-dots">•••</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span className="breadcrumb-brand">CampusHelp</span> <span>/</span> <b>{page}</b></div><div className="top-actions"><span className="today-label">● System operational</span>{page==='Admin panel'?<button className="admin-logout" onClick={leaveAdmin}>Log out</button>:null}<button className="top-avatar" title="Demo student profile">ST</button></div></header>
      <div className="content">
        {notice&&<div className="toast" role="status">✓ {notice}<button onClick={()=>setNotice('')}>×</button></div>}
        {page==='Overview'&&<>
          <div className="page-heading"><div><div className="eyebrow">WEDNESDAY · CAMPUS AT A GLANCE</div><h1>Good afternoon, Student <span>✦</span></h1><p>Find your way, get support, and keep campus issues moving.</p></div><button className="primary-btn" onClick={()=>setPage('Report an issue')}>＋ New report</button></div>
          <div className="hero-banner"><div className="hero-copy"><span className="banner-kicker">YOUR CAMPUS, CONNECTED</span><h2>The right help,<br/>at the right time.</h2><p>One place for campus information, maintenance reports and student safety.</p><button className="light-btn" onClick={()=>setPage('Campus map')}>Explore campus map <span>→</span></button></div><div className="hero-art"><div className="sun"/><div className="art-building building-a"><i/><i/><i/><i/></div><div className="art-building building-b"><i/><i/><i/><i/><i/><i/></div><div className="art-path"/><div className="art-tree tree-a">✳</div><div className="art-tree tree-b">✳</div><div className="art-pin">⌖</div></div><div className="banner-orb orb-one"/><div className="banner-orb orb-two"/></div>
          <div className="section-title"><div><h2>Campus overview</h2><p>A quick look at your support requests.</p></div><span className="period-chip">All time <span>⌄</span></span></div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-top"><span>Total reports</span><span className="stat-icon teal">▤</span></div><div className="stat-number">{reports.length.toString().padStart(2,'0')}</div><div className="stat-foot">All submitted reports</div></div><div className="stat-card"><div className="stat-top"><span>Open requests</span><span className="stat-icon blue">◷</span></div><div className="stat-number">{openReports.length.toString().padStart(2,'0')}</div><div className="stat-foot"><span className="mini-dot blue-dot"/> Awaiting resolution</div></div><div className="stat-card"><div className="stat-top"><span>Urgent safety</span><span className="stat-icon orange">⚑</span></div><div className="stat-number">{urgentReports.length.toString().padStart(2,'0')}</div><div className="stat-foot"><span className="mini-dot orange-dot"/> Priority 1 reports</div></div><div className="stat-card"><div className="stat-top"><span>Resolved</span><span className="stat-icon green">✓</span></div><div className="stat-number">{reports.filter(r=>r.status==='Resolved').length.toString().padStart(2,'0')}</div><div className="stat-foot"><span className="mini-dot green-dot"/> Successfully closed</div></div></div>
          <div className="dashboard-grid"><section className="panel recent-panel"><div className="panel-heading"><div><h3>Recent reports</h3><p>Updates from across the campus</p></div><button className="text-btn" onClick={()=>setPage('Track complaint')}>View all <span>→</span></button></div><div className="report-list">{reports.slice(0,4).map(r=><div className="report-row" key={r.id}><div className={`report-symbol ${r.priority.startsWith('P1')?'urgent-symbol':r.category==='Facilities'?'facility-symbol':'general-symbol'}`}>{r.priority.startsWith('P1')?'!':r.category==='Facilities'?'⌁':'▤'}</div><div className="report-main"><strong>{r.title}</strong><small>{r.id} <span>·</span> {r.location}</small></div><div className="report-meta"><span className={`status-pill ${r.status.toLowerCase().replace(' ','-')}`}>{r.status}</span><small>{r.createdAt}</small></div></div>)}</div></section>
          <section className="panel quick-panel"><div className="panel-heading"><div><h3>Quick access</h3><p>What would you like to do?</p></div></div><button className="quick-action" onClick={()=>setPage('Campus map')}><span className="quick-icon mint">⌖</span><span><strong>Find a location</strong><small>Navigate campus buildings</small></span><b>→</b></button><button className="quick-action" onClick={()=>setPage('Report an issue')}><span className="quick-icon lavender">＋</span><span><strong>Report an issue</strong><small>Maintenance, IT or other</small></span><b>→</b></button><button className="quick-action" onClick={()=>setPage('Track complaint')}><span className="quick-icon peach">◎</span><span><strong>Track a complaint</strong><small>Check a report's progress</small></span><b>→</b></button><div className="location-mini"><span className="location-mini-icon">⌖</span><div><strong>Live location</strong><small>{gps.state==='success'?'GPS coordinates received':gps.state==='demo'?'Demo campus location active':'Not connected yet'}</small></div><button onClick={requestLocation} aria-label="Get live location">→</button></div></section></div>
          <div className="footnote"><span>ⓘ</span> CampusHelp is running in demo mode. Reports are saved in this browser only; no college office receives them.</div>
        </>}
        {page==='Campus map'&&<>
          <div className="page-heading"><div><div className="eyebrow">DISCOVER YOUR SURROUNDINGS</div><h1>Campus map</h1><p>Explore our fictional campus and find the shortest walking route.</p></div><button className="outline-btn" onClick={requestLocation}>⌖ Use live location</button></div>
          <div className="map-layout"><section className="panel map-panel"><div className="panel-heading"><div><h3>Greenfield University</h3><p><span className="online-dot"/> Interactive demo map · 9 destinations</p></div><span className="map-badge">ILLUSTRATIVE</span></div><CampusMap start={start} setStart={setStart} destination={destination} setDestination={setDestination} route={route} livePoint={livePoint}/><div className="map-note">This is an invented campus layout. Click a building on the map to set your destination.</div></section><section className="panel route-panel"><div className="panel-heading"><div><h3>Plan a route</h3><p>Shortest path with Dijkstra's algorithm</p></div><span className="route-icon">⌖</span></div><label>STARTING POINT</label><select value={start} onChange={e=>setStart(e.target.value)}>{places.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><div className="route-swap">↓</div><label>DESTINATION</label><select value={destination} onChange={e=>setDestination(e.target.value)}>{places.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><div className="route-summary"><div><span>ESTIMATED ROUTE LENGTH</span><strong>{route.distance===Infinity?'—':`${route.distance} map units`}</strong></div><span className="route-tag">OPTIMIZED</span></div><div className="route-steps"><strong>Route directions</strong>{route.path.length?route.path.map((id,i)=><div className="route-step" key={id}><span className={`step-number ${i===0?'step-start':i===route.path.length-1?'step-end':''}`}>{i===0?'A':i===route.path.length-1?'B':i}</span><div><strong>{places.find(p=>p.id===id).name}</strong><small>{i===0?'Start here':i===route.path.length-1?'Destination':'Continue along campus path'}</small></div>{i<route.path.length-1&&<span className="step-arrow">↓</span>}</div>):<p>No route found between these places.</p>}</div><button className="primary-btn full-btn" onClick={()=>showNotice(`Shortest route calculated to ${target.name}. Distance: ${route.distance} map units.`)}>✓ Confirm route</button><div className="algorithm-note"><strong>Why Dijkstra?</strong><p>It checks possible paths and chooses the route with the lowest total edge weight. Our weights are fictional walking-distance units.</p></div></section></div>
          <section className="panel gps-panel"><div className="gps-icon">⌖</div><div className="gps-copy"><h3>Where am I?</h3><p>{gps.message}</p>{gps.state==='success'&&<small>Browser GPS gives real latitude/longitude. This demo campus is fictional, so real coordinates cannot accurately place you on this drawing.</small>}</div><div className="gps-actions"><button className="outline-btn" onClick={useDemoLocation}>Try demo position</button><button className="primary-btn" onClick={requestLocation}>⌖ Get live GPS</button></div></section>
        </>}
        {page==='Report an issue'&&<>
          <div className="page-heading"><div><div className="eyebrow">WE'RE HERE TO HELP</div><h1>Report an issue</h1><p>Tell us what happened. We'll create a unique ID to help you track it.</p></div><div className="form-badge">◈ Student support</div></div>
          <div className="form-layout"><form className="panel issue-form" onSubmit={submitReport}><div className="form-section-title"><span>01</span><div><h3>Issue details</h3><p>Give your request a clear title and category.</p></div></div><label htmlFor="issue-title">REPORT TITLE <b>*</b></label><input id="issue-title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Broken light near the library" required maxLength={100}/><label>SELECT CATEGORY <b>*</b></label><div className="category-grid">{categories.map((c,i)=><button type="button" key={c} className={`category-option ${form.category===c?'selected':''}`} onClick={()=>setForm({...form,category:c})}><span>{['⌁','₹','⌘','▤','⚑','＋'][i]}</span><strong>{c}</strong>{form.category===c&&<i>✓</i>}</button>)}</div><label htmlFor="issue-location">LOCATION <b>*</b></label><select id="issue-location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})}>{places.map(p=><option key={p.id}>{p.name}</option>)}</select><label htmlFor="issue-details">DESCRIPTION <b>*</b></label><textarea id="issue-details" value={form.details} onChange={e=>setForm({...form,details:e.target.value})} placeholder="Describe the issue and any details that might help…" required rows={5} maxLength={1000}/><div className="char-count">{form.details.length}/1000 characters</div><div className={`urgent-toggle ${form.urgent?'urgent-on':''}`}><div className="urgent-toggle-icon">!</div><div><strong>Mark as urgent safety issue</strong><small>Use only for safety-related incidents that need immediate attention.</small></div><input type="checkbox" checked={form.urgent} onChange={e=>setForm({...form,urgent:e.target.checked})} aria-label="Mark as urgent safety issue"/></div><div className="form-actions"><span><b>*</b> Required fields</span><button className="primary-btn" type="submit">Submit report <span>→</span></button></div></form><aside className="form-aside"><div className="aside-card"><div className="aside-illustration">✦</div><h3>What happens next?</h3><div className="mini-timeline"><div><i>1</i><span><strong>Report received</strong><small>Your unique complaint ID is generated.</small></span></div><div><i>2</i><span><strong>Priority assigned</strong><small>Urgent safety reports are marked P1.</small></span></div><div><i>3</i><span><strong>Progress tracked</strong><small>Use your ID to check status updates.</small></span></div></div></div><div className="safety-card"><span>⚠</span><div><strong>Immediate danger?</strong><p>This demo does not contact emergency services. Call campus security or local emergency services directly.</p></div></div></aside></div>
        </>}
        {page==='Track complaint'&&<>
          <div className="page-heading"><div><div className="eyebrow">STAY IN THE LOOP</div><h1>Track your complaint</h1><p>Enter the complaint ID you received when submitting your report.</p></div></div>
          <section className="panel tracking-search"><div className="search-icon">⌕</div><div className="search-field"><label htmlFor="track-id">COMPLAINT ID</label><input id="track-id" value={trackId} onChange={e=>setTrackId(e.target.value)} placeholder="e.g. CH-1042" onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}}/></div><button className="primary-btn" onClick={()=>{if(!selectedTrack)showNotice('No complaint found with that ID. Try one of the sample IDs below.')}}>Track report <span>→</span></button></section>
          {selectedTrack?<section className="panel track-result"><div className="track-result-header"><div><span className="success-label">● REPORT FOUND</span><h2>{selectedTrack.title}</h2><p>{selectedTrack.id} <span>·</span> Submitted {selectedTrack.createdAt}</p></div><span className={`status-pill ${selectedTrack.status.toLowerCase().replace(' ','-')}`}>{selectedTrack.status}</span></div><div className="track-details-grid"><div><small>CATEGORY</small><strong>{selectedTrack.category}</strong></div><div><small>LOCATION</small><strong>{selectedTrack.location}</strong></div><div><small>PRIORITY</small><strong className={selectedTrack.priority.startsWith('P1')?'priority-red':''}>{selectedTrack.priority}</strong></div></div><div className="progress-track"><h3>Resolution progress</h3><div className="progress-line">{statusSteps.map((s,i)=>{const current=statusSteps.indexOf(selectedTrack.status);return <div className={`progress-step ${i<=current?'completed':''}`} key={s}><span>{i<current?'✓':i+1}</span><small>{s}</small></div>})}</div></div><div className="details-box"><strong>Issue description</strong><p>{selectedTrack.details}</p></div></section>:<section className="empty-track"><div className="empty-track-icon">◎</div><h3>Ready when you are</h3><p>Search for a report above, or select one of these demo reports to see how tracking works.</p><div className="sample-ids">{reports.slice(0,4).map(r=><button key={r.id} onClick={()=>setTrackId(r.id)}><span>{r.id}</span><b>→</b></button>)}</div></section>}
          <div className="footnote"><span>ⓘ</span> This demo stores reports in your browser. It is not connected to a real college ticketing system.</div>
        </>}
        {page==='Admin panel'&&<>
          <div className="page-heading"><div><div className="eyebrow">OPERATIONS WORKSPACE</div><h1>Admin panel</h1><p>Review incoming requests and update their status.</p></div><span className="demo-warning">DEMO ADMIN ACCESS</span></div><div className="admin-stats"><div className="admin-stat"><small>TOTAL REPORTS</small><strong>{reports.length}</strong></div><div className="admin-stat"><small>NEEDS ATTENTION</small><strong>{openReports.length}</strong></div><div className="admin-stat"><small>URGENT SAFETY</small><strong className="priority-red">{urgentReports.length}</strong></div></div><section className="panel admin-table-panel"><div className="panel-heading"><div><h3>All campus reports</h3><p>Use the status menu to simulate an administrator update.</p></div><span className="table-count">{reports.length} RECORDS</span></div>{reports.length===0?<div className="empty-state">No reports yet. Submit a report to see it here.</div>:<div className="table-wrap"><table><thead><tr><th>COMPLAINT</th><th>CATEGORY</th><th>PRIORITY</th><th>STATUS</th><th>UPDATE STATUS</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td><strong>{r.title}</strong><small>{r.id} · {r.location}</small></td><td>{r.category}</td><td><span className={`priority-pill ${r.priority.startsWith('P1')?'p1':r.priority.startsWith('P2')?'p2':'p3'}`}>{r.priority}</span></td><td><span className={`status-pill ${r.status.toLowerCase().replace(' ','-')}`}>{r.status}</span></td><td><select aria-label={`Update status for ${r.id}`} value={r.status} onChange={e=>updateStatus(r.id,e.target.value)}>{statusSteps.map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>}</section><div className="admin-explainer"><span>ⓘ</span><p><strong>Academic note:</strong> The admin panel demonstrates the update workflow locally. A real deployment would require authentication, a backend API, a database, and access controls.</p></div>
        </>}
      </div>
      <footer className="app-footer"><span>© 2026 CampusHelp <i>·</i> Academic project demo</span><span><i className="online-dot"/> All systems operational <b>v1.0.0</b></span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
