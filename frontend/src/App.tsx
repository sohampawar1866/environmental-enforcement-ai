import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownUp, ArrowLeft, ArrowRight, Check, ChevronRight, CircleAlert, Compass, FileVideo2, Leaf, Link2, Search, ShieldCheck, UploadCloud, Webhook, X } from 'lucide-react';
import LandingPage from './landing/LandingPage';
import AnimatedThemeToggler from './components/ui/animated-theme-toggler';

type TimelineStep = {state:string;frame:number;time_seconds:number;reason:string};
type Incident = {id:string;created_at:string;status:string;camera_id:string;zone:string;source_video:string;job_id:string|null;actor_track_id:number|null;object_track_id:number;waste_class:string;event_time_seconds:number;confidence:number;confidence_components:Record<string,string|number>;timeline:TimelineStep[];evidence:Record<string,string>;review_note:string|null};
type VideoJob = {id:string;created_at:string;updated_at:string;status:'queued'|'running'|'completed'|'failed';progress:number;original_filename:string;camera_id:string;zone:string;result:Record<string,any>|null;error:string|null};
type Page = 'landing'|'intake'|'review'|'webhook';
type Theme = 'dark'|'light';
const api='/api';
const assetUrl=(id:string,name:string)=>`${api}/evidence/${id}/${encodeURIComponent(name)}`;
const maxUploadBytes=500*1024*1024;

export default function App(){
  const [theme,setTheme]=useState<Theme>(()=>{
    const saved=(localStorage.getItem('civicclean_theme') as Theme)||'dark';
    if(typeof document!=='undefined'){
      document.documentElement.classList.toggle('dark',saved==='dark');
    }
    return saved;
  });
  useEffect(()=>{
    document.documentElement.classList.toggle('dark',theme==='dark');
  },[theme]);
  const [page,setPage]=useState<Page>('landing');
  const [items,setItems]=useState<Incident[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [cameraId,setCameraId]=useState('CAM-01');
  const [zone,setZone]=useState('Simulated Public Space');
  const [job,setJob]=useState<VideoJob|null>(null);
  const [webhookSource,setWebhookSource]=useState('City camera platform');
  const [webhookUrl,setWebhookUrl]=useState('https://camera-platform.example/events');
  const [webhookMethod,setWebhookMethod]=useState('POST');
  const [webhookFormat,setWebhookFormat]=useState('application/json');
  const [webhookAuth,setWebhookAuth]=useState('HMAC-SHA256');
  const [signatureHeader,setSignatureHeader]=useState('X-Webhook-Signature');
  const [retryPolicy,setRetryPolicy]=useState('3 attempts · exponential backoff');
  const [webhookEvents,setWebhookEvents]=useState(['video.ready','camera.offline']);

  const refresh=()=>fetch(`${api}/incidents`).then(async r=>{if(!r.ok)throw new Error('API unavailable');return r.json() as Promise<Incident[]>}).then(data=>{setItems(data);setError('')}).catch(()=>setError('Local API is unavailable. Start it with uvicorn app.main:app --app-dir backend.'));
  useEffect(()=>{void refresh()},[]);
  useEffect(()=>{
    if(!job||job.status==='completed'||job.status==='failed')return;
    const timer=window.setInterval(()=>{
      fetch(`${api}/video-jobs/${job.id}`).then(r=>r.ok?r.json():Promise.reject(new Error('Could not read processing status'))).then((next:VideoJob)=>{
        setJob(next);
        if(next.status==='completed')void refresh();
      }).catch(e=>setError(String(e)));
    },1500);
    return()=>window.clearInterval(timer);
  },[job?.id,job?.status]);

  const filtered=useMemo(()=>items.filter(i=>(filter==='all'||i.status===filter)&&`${i.camera_id} ${i.zone} ${i.id}`.toLowerCase().includes(query.toLowerCase())),[items,filter,query]);
  const active=items.find(i=>i.id===selected)||filtered[0]||null;
  const pending=items.filter(i=>i.status==='pending_review').length;

  function chooseFile(next:File|null){
    setError('');
    if(next&&(!next.name.toLowerCase().endsWith('.mp4')||next.type&&next.type!=='video/mp4'&&next.type!=='application/octet-stream')){setFile(null);setError('Choose an MP4 video file.');return;}
    if(next&&next.size>maxUploadBytes){setFile(null);setError('The video is larger than the 500 MB upload limit.');return;}
    setFile(next);
  }
  function onFileChange(event:ChangeEvent<HTMLInputElement>){chooseFile(event.target.files?.[0]||null)}
  function onDrop(event:DragEvent<HTMLLabelElement>){event.preventDefault();chooseFile(event.dataTransfer.files?.[0]||null)}

  async function submitVideo(event:ChangeEvent<HTMLFormElement>){
    event.preventDefault();
    if(!file){setError('Choose an MP4 video first.');return;}
    setBusy(true);setError('');setJob(null);
    const form=new FormData();form.append('file',file);form.append('camera_id',cameraId);form.append('zone',zone);
    try{
      const response=await fetch(`${api}/video-jobs`,{method:'POST',body:form});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.detail||'Video submission failed');
      setJob(payload as VideoJob);
    }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
  }
  async function review(decision:'approved'|'dismissed'){
    if(!active)return;setBusy(true);setError('');
    try{const response=await fetch(`${api}/incidents/${active.id}/review`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,note:null})});if(!response.ok)throw new Error('Review update failed');await refresh()}
    catch(e){setError(String(e))}finally{setBusy(false)}
  }
  const pageTitle=page==='landing'?'System Overview':page==='intake'?'Video intake':page==='webhook'?'Live Camera Webhook':'Incident review';
  const pageSubtitle=page==='landing'?'CivicClean Environmental Enforcement platform overview.':page==='intake'?'Choose how a camera source enters the local review workflow.':page==='webhook'?'Configure webhook details for continuous camera intake.':'Inspect model-flagged events. Every alert needs a human decision.';

  if(page==='landing'){
    return <LandingPage onNavigate={(next)=>{setPage(next);if(next==='review')void refresh()}} pendingCount={pending}/>;
  }

  return <div className="shell" data-theme={theme}>
    <aside className="rail">
      <div className="brand" onClick={()=>setPage('landing')} style={{cursor:'pointer'}} title="Return to Overview"><div className="brandmark"><Leaf size={18}/></div><span>CIVICCLEAN</span></div>
      <div className="railnav">
        <button onClick={()=>setPage('landing')}><Compass size={18}/><span>Overview</span></button>
        <button className={page==='intake'?'navactive':''} onClick={()=>setPage('intake')}><UploadCloud size={18}/><span>Video intake</span></button>
        <button className={page==='webhook'?'navactive':''} onClick={()=>setPage('webhook')}><Webhook size={18}/><span>Live camera</span></button>
        <button className={page==='review'?'navactive':''} onClick={()=>{setPage('review');void refresh()}}><ShieldCheck size={18}/><span>Review queue</span><b className="navcount">{pending}</b></button>
      </div>
      <div className="railbottom"><div className="local"><span className="pulse"/> LOCAL PIPELINE</div><small>Air-gapped local adjudication</small></div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="crumb"><span onClick={()=>setPage('landing')} style={{cursor:'pointer'}}>CIVICCLEAN</span> <ChevronRight size={13}/> OPERATIONS <ChevronRight size={13}/> {pageTitle.toUpperCase()}</div>
        <div className="topbarActions">
          <AnimatedThemeToggler
            theme={theme}
            onThemeChange={(nextTheme) => {
              setTheme(nextTheme);
              localStorage.setItem('civicclean_theme', nextTheme);
            }}
            variant="circle"
            className="themeTogglerBtn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme"
          />
        </div>
      </header>
      <section className="pagehead"><div><div className="eyebrow">ENVIRONMENTAL MONITORING <span>•</span> LOCAL REVIEW</div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>{page==='review'&&<div className="queuecount"><span>{pending.toString().padStart(2,'0')}</span><small>AWAITING REVIEW</small></div>}</section>
      {error&&<div className="error"><CircleAlert size={16}/>{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={14}/></button></div>}

      {page==='intake'&&<section className="intakePage">
        <div className="intakeHeading"><div><span className="eyebrow">CHOOSE AN INGEST METHOD</span><h2>Bring a camera source into review</h2><p>Analyze a video now, or explore how a live camera could send footage continuously.</p></div><div className="intakeTag"><Activity size={15}/> LOCAL PROCESSING</div></div>
        <div className="ingestChoices">
          <button className="ingestCard manualCard" onClick={()=>document.getElementById('video-intake-form')?.scrollIntoView({behavior:'smooth',block:'center'})}>
            <span className="cardIcon"><FileVideo2 size={21}/></span><span className="cardEyebrow">READY TO USE</span><strong>Upload a video</strong><span className="cardText">Choose a prerecorded MP4 and run the local detection and tracking pipeline.</span>
            <div className="cardActionRow">
              <span className="cardAction">Select video <ArrowRight size={15}/></span>
            </div>
          </button>
          <button className="ingestCard webhookCard" onClick={()=>setPage('webhook')}>
            <span className="cardIcon webhookIcon"><Webhook size={21}/></span><span className="cardEyebrow">CONTINUOUS CAMERA INGEST</span><strong>Live Camera Webhook</strong><span className="cardText">Configure how a camera platform sends new footage for analysis.</span>
            <div className="cardActionRow">
              <span className="cardAction">Enter camera endpoint webhook <ArrowRight size={15}/></span>
              <span className="notConnected">Not configured yet</span>
            </div>
          </button>
        </div>

        <form id="video-intake-form" className="uploadPanel" onSubmit={submitVideo}>
          <div className="panelTitle"><div><span className="stepNumber">01</span><div><h3>Manual video submission</h3><p>MP4 only · up to 500 MB · processed locally</p></div></div><span className="requiredTag">ACTIVE PATH</span></div>
          <label className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
            <input type="file" accept="video/mp4,.mp4" onChange={onFileChange}/>
            <span className="dropIcon"><UploadCloud size={23}/></span>
            {file?<><strong>{file.name}</strong><span>{(file.size/1024/1024).toFixed(1)} MB · click to replace</span></>:<><strong>Drop an MP4 file here</strong><span>or <u>browse files</u> on this device</span></>}
          </label>
          <div className="formFields"><label>Camera ID<input value={cameraId} maxLength={100} onChange={e=>setCameraId(e.target.value)} required/></label><label>Zone or location<input value={zone} maxLength={200} onChange={e=>setZone(e.target.value)} required/></label></div>
          <div className="submitRow"><span><ShieldCheck size={15}/> Candidate events always require human review.</span><button type="submit" className="primaryButton" disabled={!file||busy||!!job&&['queued','running'].includes(job.status)}>{busy?'Submitting…':job&&['queued','running'].includes(job.status)?'Analysis running…':'Analyze video'} <ArrowRight size={15}/></button></div>
        </form>

        {job&&<section className={`jobPanel ${job.status}`}>
          <div className="jobHeader"><div><span className={`jobDot ${job.status}`}/><strong>{job.status==='queued'?'Queued for analysis':job.status==='running'?'Analyzing video':job.status==='completed'?'Analysis complete':'Analysis failed'}</strong><small>{job.original_filename} · {job.camera_id} · {job.zone}</small></div>{job.status==='completed'&&<span className="jobDone"><Check size={14}/> COMPLETE</span>}</div>
          {(job.status==='queued'||job.status==='running')&&<div className="progressWrap"><div className="progressTrack"><span style={{width:`${Math.max(job.progress,job.status==='queued'?2:0)}%`}}/></div><small>{job.status==='queued'?'Waiting for the local worker':`${job.progress}% · video frames processed`}</small></div>}
          {job.status==='failed'&&<p className="jobError">{job.error||'The video could not be processed.'}</p>}
          {job.status==='completed'&&job.result&&<div className="jobResults"><div><b>{job.result.frames??0}</b><small>FRAMES</small></div><div><b>{job.result.unique_track_ids??0}</b><small>TRACK IDS</small></div><div><b>{job.result.events_created??0}</b><small>REVIEW CANDIDATES</small></div><a href={`${api}/video-jobs/${job.id}/output`} target="_blank" rel="noreferrer">Open annotated video <ArrowRight size={14}/></a><button onClick={()=>{setPage('review');void refresh()}}>Open review queue <ArrowRight size={14}/></button></div>}
        </section>}
        <p className="intakeFootnote">A model flag is a review lead, not a finding of responsibility.</p>
      </section>}

      {page==='webhook'&&<section className="webhookPage">
        <button className="backLink" onClick={()=>setPage('intake')}><ArrowLeft size={15}/> Back to video intake</button>
        <div className="connectionNotice"><span className="connectionIcon"><Webhook size={20}/></span><div><strong>Not configured yet</strong><p>This local prototype does not accept external webhook events. Use video upload to run the working analysis flow.</p></div></div>
        <div className="webhookLayout"><div className="setupMain"><div className="setupTitle"><span className="eyebrow">CAMERA EVENT DELIVERY</span><h2>Webhook configuration</h2><p>Set the source details, event types, and delivery options used by a camera platform.</p></div>
          <div className="webhookForm">
            <div className="configFields"><label>Camera source name<input value={webhookSource} onChange={e=>setWebhookSource(e.target.value)}/></label><label>Receiver URL<input type="url" value={webhookUrl} onChange={e=>setWebhookUrl(e.target.value)}/></label></div>
            <div className="configFields threeFields"><label>HTTP method<select value={webhookMethod} onChange={e=>setWebhookMethod(e.target.value)}><option>POST</option><option>PUT</option></select></label><label>Payload format<select value={webhookFormat} onChange={e=>setWebhookFormat(e.target.value)}><option>application/json</option><option>application/cloudevents+json</option></select></label><label>Authentication<select value={webhookAuth} onChange={e=>setWebhookAuth(e.target.value)}><option>HMAC-SHA256</option><option>Bearer token</option></select></label></div>
            <label className="signatureField">Signature header<input value={signatureHeader} onChange={e=>setSignatureHeader(e.target.value)}/></label>
            <fieldset className="eventFieldset"><legend>Subscribe to camera events</legend><div className="eventOptions">{['video.ready','camera.offline','recording.started'].map(event=><label className="eventOption" key={event}><input type="checkbox" checked={webhookEvents.includes(event)} onChange={e=>setWebhookEvents(current=>e.target.checked?[...current,event]:current.filter(item=>item!==event))}/><span>{event}</span></label>)}</div></fieldset>
            <label className="retryField">Delivery retry policy<select value={retryPolicy} onChange={e=>setRetryPolicy(e.target.value)}><option>3 attempts · exponential backoff</option><option>5 attempts · exponential backoff</option><option>Do not retry</option></select></label>
          </div>
          <button className="primaryButton inactiveButton" disabled title="No webhook receiver is active">Connect camera source <Link2 size={15}/></button><small className="formNote">Configuration fields are for demonstration; values are not saved or sent.</small>
        </div><aside className="webhookSide"><div className="sideIcon"><Webhook size={20}/></div><span className="eyebrow">CONNECTION STATUS</span><h3>Not configured yet</h3><p>No endpoint is listening for camera notifications in this local build. These settings do not create a live connection.</p><div className="sideDivider"/><small>ACTIVE INGESTION METHOD</small><div className="sideStatus"><span/> Manual MP4 upload</div></aside></div>
      </section>}

      {page==='review'&&<section className="workspace"><div className="listpanel"><div className="listhead"><div><b>Review queue</b><span className="count">{filtered.length}</span></div><button className="sort"><ArrowDownUp size={14}/> Newest</button></div><div className="filters"><label><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search incidents"/></label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="pending_review">Pending</option><option value="approved">Approved</option><option value="dismissed">Dismissed</option></select></div><div className="incidentlist">{filtered.map(i=><button className={`incidentrow ${active?.id===i.id?'chosen':''}`} key={i.id} onClick={()=>setSelected(i.id)}><span className="rowtop"><span className={`statusdot ${i.status}`}/><span className="statuslabel">{i.status.replace('_',' ')}</span><time>{new Date(i.created_at).toLocaleString()}</time></span><strong>Possible littering event</strong><span className="rowmeta">{i.camera_id} <i>·</i> {i.zone}</span><span className="rowbottom">OBJECT TRACK #{i.object_track_id}<ChevronRight size={15}/></span></button>)}{filtered.length===0&&<div className="empty">No incidents yet.<small>Submit a staged video to create review candidates.</small></div>}</div></div>
        <div className="detailpanel">{active?<><div className="detailhead"><div><span className={`pill ${active.status}`}>{active.status.replace('_',' ')}</span><h2>Possible littering event</h2><div className="subhead">{active.camera_id} <span>·</span> {active.zone} <span>·</span> {new Date(active.created_at).toLocaleString()}</div></div><button className="more">•••</button></div><div className="evidence"><div className="evtitle">EVIDENCE REVIEW</div>{active.evidence.annotated_video?<video controls src={assetUrl(active.id,active.evidence.annotated_video)}/>:<div className="placeholder"><Leaf size={26}/><span>Evidence clip unavailable</span></div>}<div className="frames">{(['before','separation','after'] as const).map(k=><div className="frame" key={k}>{active.evidence[k]?<img src={assetUrl(active.id,active.evidence[k])}/>:<div className="frameempty">No frame</div>}<small>{k==='before'?'BEFORE':k==='separation'?'SEPARATION':'AFTER'}</small></div>)}</div></div><div className="facts"><div><small>OBJECT TRACK</small><b>#{active.object_track_id} · {active.waste_class}</b></div><div><small>ACTOR TRACK</small><b>{active.actor_track_id===null?'Unattributed':`#${active.actor_track_id} · provisional`}</b></div><div><small>EVENT TIME</small><b>{active.event_time_seconds.toFixed(1)} sec</b></div><div><small>MODEL SCORE</small><b>{Math.round(active.confidence*100)}% <em>review aid only</em></b></div></div><div className="timeline"><div className="sectiontitle">Event timeline <small>{active.timeline.length} recorded transitions</small></div>{active.timeline.map((t,n)=><div className="eventstep" key={`${t.state}-${n}`}><span className="stepdot"/><time>{t.time_seconds.toFixed(1)}s</time><div><b>{t.state.replaceAll('_',' ')}</b><p>{t.reason}</p></div></div>)}</div><div className="warning"><CircleAlert size={17}/><span><b>Human review required.</b> Geometric association is provisional and cannot establish responsibility.</span></div><div className="actions"><button className="dismiss" disabled={busy||active.status!=='pending_review'} onClick={()=>review('dismissed')}><X size={16}/> Dismiss</button><button className="approve" disabled={busy||active.status!=='pending_review'} onClick={()=>review('approved')}><Check size={16}/> Approve for case review</button></div></>:<div className="empty detailEmpty">Select an incident to review.</div>}</div></section>}

      <footer>CIVICCLEAN <span>•</span> LOCAL-FIRST PROTOTYPE <span>•</span> HUMAN REVIEW REQUIRED</footer>
    </main>
  </div>;
}
