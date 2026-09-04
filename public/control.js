  const socket = io();
  const statusEl = document.getElementById('connStatus');
  const topStatusEl = document.getElementById('topConnStatus');
  const topStatusDot = document.getElementById('topConnDot');
  const headerStatusDot = document.querySelector('header.deck .status .dot');

  function setPanelConnectionState(label, connected){
    statusEl.textContent = label;
    if(topStatusEl) topStatusEl.textContent = label;
    const color = connected ? '#39d98a' : '#ff4f78';
    if(topStatusDot){ topStatusDot.style.background = color; topStatusDot.style.boxShadow = connected ? '0 0 10px rgba(57,217,138,.55)' : '0 0 10px rgba(255,79,120,.45)'; }
    if(headerStatusDot) headerStatusDot.style.background = color;
  }

  // Socket.IO only means the panel can reach the server. TikTok status comes from tiktok:status.
  socket.on('connect', () => setPanelConnectionState('BELUM TERHUBUNG', false));
  socket.on('disconnect', () => setPanelConnectionState('SERVER TERPUTUS', false));

  // ---- TTS voice list ----
  let availableVoices = [];
  // FIX PERFORMANCE: dulu loadVoiceOptions() selalu bongkar-pasang ulang
  // SEMUA <option> di dropdown voice dari nol, setiap kali dipanggil.
  // Fungsi ini dipanggil dari setInterval tiap 1.5 detik SECARA GLOBAL
  // (bukan cuma pas tab Text-to-Speech kebuka), jadi main thread browser
  // sering "keblok" sebentar tiap 1.5 detik terus-menerus — ini yang bikin
  // klik/pindah tab kerasa delay di SEMUA tab, bukan cuma TTS.
  // Sekarang kita simpan signature (jumlah + nama voice) dari render
  // terakhir, dan cuma bongkar-pasang ulang dropdown kalau daftar
  // voice-nya BENERAN berubah. Browser jarang sekali ganti daftar voice
  // di tengah sesi, jadi harusnya cuma render ulang 1-2 kali pas load awal.
  let lastVoiceSignature = '';
  function loadVoiceOptions(){
    availableVoices = speechSynthesis.getVoices() || [];
    const select = document.getElementById('ttsVoice');
    if(!select) return;
    const signature = availableVoices.map(v => v.name + '|' + v.lang).join(',');
    if(signature === lastVoiceSignature) return; // gak ada perubahan, skip rebuild DOM
    lastVoiceSignature = signature;
    const current = select.value;
    select.innerHTML = '<option value="">Otomatis — Bahasa Indonesia</option>';

    // Put Google voices first, then Indonesian voices, then the rest.
    const sorted = [...availableVoices].sort((a,b) => {
      const score = v => (v.name.toLowerCase().includes('google') ? 6 : 0) + (/^id/i.test(v.lang) ? 4 : 0);
      return score(b) - score(a) || a.name.localeCompare(b.name);
    });
    sorted.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      const genderHint = /female|woman|girl/i.test(v.name) ? ' • perempuan'
        : /male|man|boy/i.test(v.name) ? ' • laki-laki' : '';
      opt.textContent = `${v.name} — ${v.lang}${genderHint}`;
      select.appendChild(opt);
    });
    if([...select.options].some(o => o.value === current)) select.value = current;
    document.getElementById('voiceStatus').textContent =
      availableVoices.length
        ? `${availableVoices.length} suara tersedia. ${availableVoices.filter(v => /google/i.test(v.name)).length} suara Google terdeteksi.`
        : 'Browser belum memberikan daftar suara. Coba buka ulang panel.';
  }
  loadVoiceOptions();
  speechSynthesis.onvoiceschanged = loadVoiceOptions;

  // overlay url
  const overlayUrl = location.origin + '/overlay.html?v=22';
  document.getElementById('overlayUrl').textContent = overlayUrl;
  function copyOverlayUrl(){
    navigator.clipboard.writeText(overlayUrl);
    logEvent('URL overlay disalin ke clipboard.');
  }

  // leaderboard overlay url
  const leaderboardUrl = location.origin + '/overlay-leaderboard.html?v=27';
  document.getElementById('leaderboardUrl').textContent = leaderboardUrl;
  function copyLeaderboardUrl(){
    navigator.clipboard.writeText(leaderboardUrl);
    logEvent('URL overlay leaderboard disalin ke clipboard.');
  }

  // comments overlay url
  const commentsUrl = location.origin + '/overlay-comments.html?v=27';
  document.getElementById('commentsUrl').textContent = commentsUrl;
  const musicUrl = location.origin + '/overlay-music.html?v=32';
  const musicPlayerUrl = location.origin + '/music-player.html?v=32';
  document.getElementById('musicUrl').textContent = musicUrl;
  function copyCommentsUrl(){
    navigator.clipboard.writeText(commentsUrl);
    logEvent('URL overlay komentar disalin ke clipboard.');
  }

  const followGiftUrl = location.origin + '/overlay-follow-gift.html?v=22';
  function copyFollowGiftUrl(){
    navigator.clipboard.writeText(followGiftUrl);
    logEvent('URL overlay Follow + Gift disalin ke clipboard.');
  }

  // tabs
  document.querySelectorAll('nav.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  function logEvent(text){
    // Activity logs are intentionally not rendered in the control panel anymore.
    // Keep this function as a silent compatibility hook for existing actions.
    const log = document.getElementById('eventLog');
    if(!log) return;
    const line = document.createElement('div');
    const t = new Date().toLocaleTimeString('id-ID');
    line.textContent = `[${t}] ${text}`;
    log.prepend(line);
  }

  // ---- tiktok live ----
  let tiktokTimeout = null;
  function connectTiktok(){
    const username = document.getElementById('tiktokUsername').value.trim().replace(/^@/, '');
    const signApiKey = document.getElementById('tiktokApiKey').value.trim();
    if(!username) return;
    setPanelConnectionState('MENYAMBUNG', false);
    setTiktokStatus('Menyambungkan…', `Menghubungkan ke @${username}`, 'var(--gold)');
    socket.emit('tiktok:connect', { username, signApiKey });
    logEvent(`Mencoba menyambung ke TikTok: @${username}`);

    clearTimeout(tiktokTimeout);
    tiktokTimeout = setTimeout(() => {
      setPanelConnectionState('TERPUTUS', false);
      setTiktokStatus('Waktu habis', 'Tidak ada respon setelah 20 detik. Cek apakah kamu benar-benar sedang live, username benar, atau coba tambahkan API key.', 'var(--magenta)');
      logEvent('TikTok: waktu tunggu koneksi habis.');
    }, 20000);
  }
  function disconnectTiktok(){
    clearTimeout(tiktokTimeout);
    setPanelConnectionState('BELUM TERHUBUNG', false);
    socket.emit('tiktok:disconnect');
    logEvent('Memutus koneksi TikTok.');
  }
  function setTiktokStatus(title, desc, color){
    clearTimeout(tiktokTimeout);
    document.getElementById('tiktokStatusTitle').textContent = title;
    document.getElementById('tiktokStatusDesc').textContent = desc;
    document.getElementById('tiktokStatusBox').style.setProperty('--accent', color);
  }
  socket.on('tiktok:status', ({ connected, username, error, roomId }) => {
    if(connected){
      setPanelConnectionState('TERHUBUNG', true);
      setTiktokStatus('Tersambung', `Live sebagai @${username} (room ${roomId})`, 'var(--cyan)');
      logEvent(`Tersambung ke live TikTok @${username}`);
    } else if(error){
      setPanelConnectionState('TERPUTUS', false);
      setTiktokStatus('Gagal / terputus', error, 'var(--magenta)');
      logEvent(`TikTok: ${error}`);
    } else {
      setPanelConnectionState('BELUM TERHUBUNG', false);
      setTiktokStatus('Terputus', `Tidak lagi tersambung ke @${username || ''}`, 'var(--muted)');
      logEvent('Koneksi TikTok terputus.');
    }
  });

  // ---- alerts ----
  function sendAlert(type){
    const username = document.getElementById('alertUser').value || randomName();
    const extra = document.getElementById('alertExtra').value;
    const payload = { kind: 'alert', type, username, extra };
    socket.emit('trigger', payload);
    logEvent(`Alert dikirim: ${type} — ${username}${extra ? ' — ' + extra : ''}`);
  }
  function randomName(){
    const names = ['Andi', 'Sari', 'Budi', 'Dewi', 'Rian', 'Nadia'];
    return names[Math.floor(Math.random()*names.length)];
  }

  // ---- soundboard ----
  const sounds = [
    { id:'clap', label:'Tepuk Tangan', color:'var(--cyan)' },
    { id:'horn', label:'Air Horn', color:'var(--gold)' },
    { id:'ding', label:'Ding', color:'var(--violet)' },
    { id:'drum', label:'Drum Roll', color:'var(--magenta)' },
    { id:'boo',  label:'Boo', color:'var(--muted)' },
    { id:'coin', label:'Coin', color:'var(--gold)' },
  ];
  const grid = document.getElementById('soundGrid');
  sounds.forEach(s => {
    const b = document.createElement('button');
    b.className = 'strip';
    b.style.setProperty('--accent', s.color);
    b.innerHTML = `<div class="tag">SFX</div><div class="title">${s.label}</div><div class="desc">Putar di overlay</div>`;
    b.onclick = () => {
      socket.emit('trigger', { kind:'sound', id:s.id });
      logEvent(`Suara dikirim: ${s.label}`);
      playSynth(s.id); // local preview too
    };
    grid.appendChild(b);
  });

  // simple local Web Audio synth, shared logic also lives in overlay.html
  function playSynth(id){
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    function tone(freq, start, dur, type='sine', gain=0.2){
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, now+start);
      g.gain.linearRampToValueAtTime(gain, now+start+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now+start+dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(now+start); o.stop(now+start+dur+0.05);
    }
    if(id==='clap'){ for(let i=0;i<3;i++) tone(200+Math.random()*200, i*0.08, 0.06, 'square', 0.15); }
    else if(id==='horn'){ tone(220,0,0.6,'sawtooth',0.18); tone(220,0.6,0.6,'sawtooth',0.18); }
    else if(id==='ding'){ tone(880,0,0.5,'sine',0.2); tone(1320,0.05,0.4,'sine',0.12); }
    else if(id==='drum'){ for(let i=0;i<10;i++) tone(80+i*4, i*0.05, 0.08, 'triangle', 0.15); }
    else if(id==='boo'){ tone(180,0,0.5,'sawtooth',0.15); tone(140,0.3,0.6,'sawtooth',0.15); }
    else if(id==='coin'){ tone(988,0,0.1,'square',0.15); tone(1319,0.1,0.25,'square',0.15); }
  }

  // ---- TTS settings ----
  function currentTtsSettings(){
    return {
      readComments: document.getElementById('ttsReadComments').checked,
      readLikes: document.getElementById('ttsReadLikes').checked,
      readFollows: document.getElementById('ttsReadFollows').checked,
      readGifts: document.getElementById('ttsReadGifts').checked,
      voiceName: document.getElementById('ttsVoice').value,
      rate: Number(document.getElementById('ttsRate').value),
      pitch: Number(document.getElementById('ttsPitch').value),
      volume: Number(document.getElementById('ttsVolume').value) / 100,
    };
  }

  function updateTtsSettings(){
    const settings = currentTtsSettings();
    document.getElementById('ttsRateValue').textContent = settings.rate.toFixed(2) + 'x';
    document.getElementById('ttsPitchValue').textContent = settings.pitch.toFixed(2);
    document.getElementById('ttsVolumeValue').textContent = Math.round(settings.volume * 100) + '%';
    socket.emit('tts:settings', settings);
    logEvent(`TTS: komentar ${settings.readComments ? 'ON' : 'OFF'}, like ${settings.readLikes ? 'ON' : 'OFF'}, follow ${settings.readFollows ? 'ON' : 'OFF'}, gift ${settings.readGifts ? 'ON' : 'OFF'}, suara ${settings.voiceName || 'otomatis'}`);
  }

  socket.on('tts:settings', (settings) => {
    if(!settings) return;
    document.getElementById('ttsReadComments').checked = !!settings.readComments;
    document.getElementById('ttsReadLikes').checked = !!settings.readLikes;
    document.getElementById('ttsReadFollows').checked = settings.readFollows === true;
    document.getElementById('ttsReadGifts').checked = settings.readGifts === true;
    document.getElementById('ttsVoice').value = settings.voiceName || '';
    document.getElementById('ttsRate').value = settings.rate || 1;
    document.getElementById('ttsPitch').value = settings.pitch || 1;
    document.getElementById('ttsVolume').value = Math.round((settings.volume == null ? 1 : settings.volume) * 100);
    document.getElementById('ttsRateValue').textContent = Number(settings.rate || 1).toFixed(2) + 'x';
    document.getElementById('ttsPitchValue').textContent = Number(settings.pitch || 1).toFixed(2);
    document.getElementById('ttsVolumeValue').textContent = Math.round((settings.volume == null ? 1 : settings.volume) * 100) + '%';
  });

  // ---- TTS manual/live ----
  // TTS intentionally runs in the CONTROL PANEL, not in OBS Browser Source.
  // The first click on "Aktifkan TTS Live" is the real user gesture that
  // unlocks speechSynthesis; after that, live comments are queued here.
  let ttsUnlocked = false;
  let liveTtsQueue = [];
  let liveTtsBusy = false;

  function selectedVoice(){
    const wanted = document.getElementById('ttsVoice').value;
    return availableVoices.find(v => v.name === wanted) ||
      availableVoices.find(v => /^id-ID$/i.test(v.lang)) ||
      availableVoices.find(v => /^id/i.test(v.lang)) || null;
  }

  let sfxUnlocked = false;
  const sfxAudioCache = {};
  function unlockSfxAudio(){
    sfxUnlocked = true;
    for (const id of ['follow','gift']) {
      try {
        const a = sfxAudioCache[id] || new Audio(`/sounds/${id}.mp3?v=16`);
        a.preload='auto'; a.volume=1; a.muted=true;
        sfxAudioCache[id]=a;
        const play=a.play();
        if(play && play.then) play.then(()=>{a.pause();a.currentTime=0;a.muted=false;}).catch(()=>{});
      } catch(e){}
    }
  }
  function playLiveSfx(id){
    if(!sfxUnlocked) return;
    try {
      const a=sfxAudioCache[id] || new Audio(`/sounds/${id}.mp3?v=16`);
      a.preload='auto'; a.volume=1; a.muted=false; a.currentTime=0;
      sfxAudioCache[id]=a;
      const p=a.play(); if(p && p.catch) p.catch(()=>{});
    } catch(e){}
  }

  function refreshVoices(){
    try { availableVoices = speechSynthesis.getVoices() || []; } catch(e) { availableVoices=[]; }
    loadVoiceOptions();
  }

  function unlockTts(){
    // This function is called directly by a user click. Do NOT wait for onend
    // before marking the engine unlocked; Chrome can reject the first utterance
    // and otherwise every live comment would remain stuck in the queue.
    unlockSfxAudio();
    refreshVoices();
    ttsUnlocked = true;
    try { speechSynthesis.resume(); } catch(e) {}

    const u = new SpeechSynthesisUtterance('TTS live aktif.');
    const v = selectedVoice();
    if(v){ u.voice=v; u.lang=v.lang || 'id-ID'; } else u.lang='id-ID';
    u.volume=Number(document.getElementById('ttsVolume').value)/100 || 0; u.rate=1; u.pitch=1;
    u.onend=()=>{ document.getElementById('ttsDiagnostic').textContent='TTS Live AKTIF. Komentar akan dibaca dari panel ini tanpa username.'; };
    u.onerror=(e)=>{ document.getElementById('ttsDiagnostic').textContent='TTS aktif, tetapi browser menolak suara. Klik "Tes Suara Terpilih" sekali; jika itu juga diam, cek volume/tab mute dan izin audio browser.'; };
    // Give the browser a moment after resume so the utterance is not lost.
    setTimeout(()=>{
      try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch(e) {
        document.getElementById('ttsDiagnostic').textContent='Gagal menjalankan TTS: '+(e.message||e);
      }
    }, 80);
  }

  function testSelectedVoice(){
    ttsUnlocked = true;
    refreshVoices();
    speakLocal('Ini adalah tes suara TTS. Jika terdengar, TTS Live siap membaca komentar.');
  }

  function speakLocal(text){
    if(!text) return;
    refreshVoices();
    try { speechSynthesis.resume(); } catch(e) {}
    const u = new SpeechSynthesisUtterance(String(text));
    const v = selectedVoice();
    if(v){ u.voice=v; u.lang=v.lang || 'id-ID'; } else u.lang='id-ID';
    u.rate=Number(document.getElementById('ttsRate').value)||1;
    u.pitch=Number(document.getElementById('ttsPitch').value)||1;
    u.volume=Number(document.getElementById('ttsVolume').value)/100 || 0;
    u.onerror=(e)=>{ document.getElementById('ttsDiagnostic').textContent='Tes TTS gagal: '+(e.error||'browser menolak audio'); };
    try { speechSynthesis.speak(u); } catch(e) { document.getElementById('ttsDiagnostic').textContent='Tes TTS gagal: '+(e.message||e); }
  }

  function queueLiveTts(text){
    if(!text || !ttsUnlocked) return;
    liveTtsQueue.push(String(text).slice(0,500));
    if(liveTtsQueue.length>20) liveTtsQueue.shift();
    pumpLiveTts();
  }

  function pumpLiveTts(){
    if(liveTtsBusy || !liveTtsQueue.length || !ttsUnlocked) return;
    const text=liveTtsQueue.shift();
    refreshVoices();
    const u=new SpeechSynthesisUtterance(text);
    const v=selectedVoice();
    if(v){u.voice=v;u.lang=v.lang||'id-ID';} else u.lang='id-ID';
    u.rate=Number(document.getElementById('ttsRate').value)||1;
    u.pitch=Number(document.getElementById('ttsPitch').value)||1;
    u.volume=Number(document.getElementById('ttsVolume').value)/100 || 0;
    liveTtsBusy=true;
    const done=()=>{ if(!liveTtsBusy)return; liveTtsBusy=false; setTimeout(pumpLiveTts,100); };
    u.onend=done;
    u.onerror=()=>{ liveTtsBusy=false; liveTtsQueue.unshift(text); document.getElementById('ttsDiagnostic').textContent='TTS event gagal dibaca; antrean akan dicoba lagi.'; setTimeout(pumpLiveTts,500); };
    try { speechSynthesis.resume(); speechSynthesis.speak(u); } catch(e) { done(); liveTtsQueue.unshift(text); setTimeout(pumpLiveTts,500); }
  }

  speechSynthesis.onvoiceschanged=()=>refreshVoices();
  setInterval(()=>{ try { if(speechSynthesis.paused) speechSynthesis.resume(); refreshVoices(); if(ttsUnlocked && liveTtsQueue.length && !liveTtsBusy) pumpLiveTts(); } catch(e){} }, 1500);

  socket.on('event', (payload) => {
    if(!payload || payload.kind !== 'alert') return;
    if(payload.type==='comment' && currentTtsSettings().readComments && payload.extra && !/^!song\s*/i.test(String(payload.extra))){
      // Read ONLY the comment text; username is intentionally excluded.
      queueLiveTts(payload.extra);
    }
    if(payload.type==='like' && currentTtsSettings().readLikes){
      queueLiveTts(payload.count>1 ? `Ada ${payload.count} like masuk.` : 'Ada yang mengirim like.');
    }
    if(payload.type==='follow'){
      playLiveSfx('follow');
      if(currentTtsSettings().readFollows===true) queueLiveTts('Ada yang baru follow.');
    }
    if(payload.type==='gift'){
      playLiveSfx('gift');
      if(currentTtsSettings().readGifts===true){
        const detail=payload.extra ? ` ${payload.extra}.` : '.';
        queueLiveTts(`Ada gift masuk${detail}`);
      }
    }
  });

  function sendTts(){
    const text = document.getElementById('ttsText').value.trim();
    if(!text) return;
    socket.emit('trigger', { kind:'tts', text });
    logEvent(`TTS manual dikirim: "${text}"`);
  }

  function previewTts(){
    const text = document.getElementById('ttsText').value.trim();
    if(!text) return;
    speakLocal(text);
    ttsUnlocked = true;
    logEvent('Preview TTS diputar di browser panel.');
  }

  // ---- Overlay preview/theme ----
  function previewComment(){
    const username = 'Penonton';
    const extra = 'Halo! Ini contoh komentar live.';
    socket.emit('trigger', { kind:'alert', type:'comment', username, extra });
    logEvent('Preview komentar dikirim ke overlay.');
  }

  let chatStyleSettings = { style:'glass-card', gap:16 };
  function applyChatStyleUI(){
    document.querySelectorAll('.chat-style-card').forEach(el => el.classList.toggle('active', el.dataset.chatStyle === chatStyleSettings.style));
    document.getElementById('chatGap').value = chatStyleSettings.gap;
    document.getElementById('chatGapValue').textContent = chatStyleSettings.gap + 'px';
    document.getElementById('chatStyleStatus').textContent = ({'glass-card':'Glass Card','pill':'Pill Bubble','speech':'Speech Bubble','stacked':'Stacked','neon-line':'Neon Line','compact':'Compact'}[chatStyleSettings.style] || 'Glass Card') + ' · ' + chatStyleSettings.gap + 'px';
  }
  function setChatStyle(style){ chatStyleSettings.style=style; applyChatStyleUI(); socket.emit('overlay:settings',{ chat:chatStyleSettings }); }
  function setChatGap(value){ chatStyleSettings.gap=Number(value)||16; applyChatStyleUI(); socket.emit('overlay:settings',{ chat:chatStyleSettings }); }
  function saveChatStyle(){ socket.emit('overlay:settings',{ chat:chatStyleSettings }); logEvent(`Style chat disimpan: ${chatStyleSettings.style}, gap ${chatStyleSettings.gap}px`); }

  function setTheme(theme){
    document.querySelectorAll('.theme-card').forEach(el => el.classList.toggle('active', el.dataset.theme === theme));
    socket.emit('overlay:settings', { theme });
    logEvent(`Tema overlay diubah: ${theme}`);
  }

  socket.on('overlay:settings', (settings) => {
    const theme = settings && settings.theme ? settings.theme : 'glass';
    document.querySelectorAll('.theme-card').forEach(el => el.classList.toggle('active', el.dataset.theme === theme));
    if(settings && settings.chat){ chatStyleSettings = { ...chatStyleSettings, ...settings.chat }; applyChatStyleUI(); }
  });

  // ---- Dashboard / analytics ----
  socket.on('stats:update', (stats) => {
    document.getElementById('statComments').textContent = stats.comments || 0;
    document.getElementById('statLikes').textContent = stats.likes || 0;
    document.getElementById('statFollows').textContent = stats.follows || 0;
    document.getElementById('statGifts').textContent = stats.gifts || 0;
    document.getElementById('lastEventAt').textContent = stats.lastEventAt ? new Date(stats.lastEventAt).toLocaleTimeString('id-ID') : '-';
  });
  socket.on('stats:update', stats => {
    if(stats) logEvent(`Statistik diperbarui: komentar ${stats.comments||0}, like ${stats.likes||0}, follow ${stats.follows||0}, gift ${stats.gifts||0}`);
  });
  function resetStats(){ socket.emit('stats:reset'); logEvent('Statistik sesi di-reset.'); }
  function saveGoal(){
    socket.emit('goal:save', {
      enabled: document.getElementById('goalEnabled').checked,
      title: document.getElementById('goalTitle').value || 'Live Goal',
      type: document.getElementById('goalType').value,
      current: Number(document.getElementById('goalCurrent').value || 0),
      target: Number(document.getElementById('goalTarget').value || 1000)
    });
    logEvent('Goal disimpan.');
  }
  socket.on('goal:update', goal => {
    if(!goal) return;
    document.getElementById('goalEnabled').checked = !!goal.enabled;
    document.getElementById('goalTitle').value = goal.title || 'Live Goal';
    document.getElementById('goalType').value = goal.type || 'likes';
    document.getElementById('goalCurrent').value = goal.current || 0;
    document.getElementById('goalTarget').value = goal.target || 1000;
  });

  // ---- Custom actions ----
  let actionRules = [];
  function addAction(){
    actionRules.push({id: Math.random().toString(36).slice(2,9), enabled:true, event:'comment', keyword:'', action:'tts', value:'Terima kasih {username}!' });
    renderActions();
  }
  function renderActions(){
    const root = document.getElementById('actionList');
    root.innerHTML = '';
    if(!actionRules.length){
      root.innerHTML = '<div class="hint">Belum ada rule. Klik "+ Tambah Event".</div>';
      return;
    }
    actionRules.forEach((a, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'field';
      wrap.style.marginTop = '12px';
      wrap.innerHTML = `
        <div class="row" style="gap:8px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;"><input type="checkbox" data-i="${i}" data-k="enabled" ${a.enabled?'checked':''}> ON</label>
          <select data-i="${i}" data-k="event" style="width:130px;">
            <option value="comment" ${a.event==='comment'?'selected':''}>Komentar</option>
            <option value="like" ${a.event==='like'?'selected':''}>Like</option>
            <option value="follow" ${a.event==='follow'?'selected':''}>Follow</option>
            <option value="gift" ${a.event==='gift'?'selected':''}>Gift</option>
          </select>
          <input data-i="${i}" data-k="keyword" value="${escapeHtml(a.keyword)}" placeholder="keyword (kosong = semua)" style="flex:1;min-width:150px;">
          <select data-i="${i}" data-k="action" style="width:120px;">
            <option value="tts" ${a.action==='tts'?'selected':''}>TTS</option>
            <option value="alert" ${a.action==='alert'?'selected':''}>Alert</option>
            <option value="sound" ${a.action==='sound'?'selected':''}>Sound</option>
          </select>
          <input data-i="${i}" data-k="value" value="${escapeHtml(a.value)}" placeholder="aksi / teks / sound id" style="flex:2;min-width:200px;">
          <button class="btn" data-remove="${i}">Hapus</button>
        </div>`;
      root.appendChild(wrap);
    });
    root.querySelectorAll('[data-i][data-k]').forEach(el => el.addEventListener('input', () => {
      const i = Number(el.dataset.i), k = el.dataset.k;
      actionRules[i][k] = el.type === 'checkbox' ? el.checked : el.value;
    }));
    root.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', () => {
      actionRules.splice(Number(el.dataset.remove), 1); renderActions();
    }));
  }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function saveActions(){
    socket.emit('actions:save', actionRules);
    logEvent(`${actionRules.length} custom action rules disimpan.`);
  }
  socket.on('actions:list', actions => { actionRules = Array.isArray(actions) ? actions : []; renderActions(); });

  // ---- Follow/Gift animation settings ----
  let animationSettings = { enabled:true, followStyle:'wings', giftStyle:'treasure', followDuration:4, giftDuration:5, position:'top-center' };
  function renderAnimationSettings(){
    document.getElementById('animEnabled').checked = animationSettings.enabled !== false;
    document.getElementById('followAnimStyle').value = animationSettings.followStyle || 'wings';
    document.getElementById('giftAnimStyle').value = animationSettings.giftStyle || 'treasure';
    document.getElementById('followAnimDuration').value = animationSettings.followDuration || 4;
    document.getElementById('giftAnimDuration').value = animationSettings.giftDuration || 5;
    document.getElementById('animPosition').value = animationSettings.position || 'top-center';
  }
  function saveAnimationSettings(){
    animationSettings = {
      enabled: document.getElementById('animEnabled').checked,
      followStyle: document.getElementById('followAnimStyle').value,
      giftStyle: document.getElementById('giftAnimStyle').value,
      followDuration: Math.max(2, Math.min(10, Number(document.getElementById('followAnimDuration').value)||4)),
      giftDuration: Math.max(2, Math.min(10, Number(document.getElementById('giftAnimDuration').value)||5)),
      position: document.getElementById('animPosition').value,
    };
    socket.emit('overlay:settings', { theme: currentTheme, animations: animationSettings });
    document.getElementById('animStatus').textContent = 'Animasi tersimpan ✓';
  }
  function testAnimation(type){
    const username = document.getElementById('simUsername')?.value || 'user123';
    const extra = type === 'gift' ? 'Rose x5' : 'Baru saja follow!';
    socket.emit('trigger', {kind:'alert', type, username, extra, count:1});
    logEvent(`Test animasi ${type}: @${username}`);
  }
  socket.on('overlay:settings', settings => {
    animationSettings = { ...animationSettings, ...(settings?.animations || {}) };
  
  // ---- Modern ON/OFF switches ----
  // Keep the original checkbox elements/IDs so all existing JS logic continues to work.
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    if (input.closest('.switch')) return;
    const switchEl = document.createElement('span');
    switchEl.className = 'switch';
    switchEl.setAttribute('role', 'switch');
    switchEl.setAttribute('aria-checked', input.checked ? 'true' : 'false');
    switchEl.title = input.checked ? 'ON' : 'OFF';

    input.parentNode.insertBefore(switchEl, input);
    switchEl.appendChild(input);

    const sync = () => {
      switchEl.classList.toggle('is-on', input.checked);
      switchEl.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      switchEl.title = input.checked ? 'ON' : 'OFF';
    };
    input.addEventListener('change', sync);
    switchEl.addEventListener('click', (e) => {
      if (e.target === input) return;
      input.click();
    });
    sync();
  });

  renderAnimationSettings();
  });

  // ---- Music Request ----
  // The control page itself is the Chrome music player. This avoids the old
  // mistake where the user had to keep a second /music-player.html tab open.
  let chromeMusicPlayer = null;
  let chromeMusicApiReady = false;
  let chromeMusicActivated = false;
  let chromeMusicCurrentId = null;
  let chromeMusicPending = null;
  let chromeMusicVolume = 0.75;

  function setChromeMusicStatus(text, ok=false){
    const el=document.getElementById('musicBrowserStatus');
    if(el){ el.textContent=text; el.style.color=ok ? '#39d98a' : ''; }
  }
  function loadChromeYouTubeApi(){
    if(window.YT && window.YT.Player){
      if(window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
      return;
    }
    if(document.querySelector('script[data-leano-youtube-api]')) return;
    const s=document.createElement('script');
    s.src='https://www.youtube.com/iframe_api';
    s.dataset.leanoYoutubeApi='1';
    document.head.appendChild(s);
  }
  window.onYouTubeIframeAPIReady=function(){
    if(chromeMusicApiReady) return;
    chromeMusicApiReady=true;
    chromeMusicPlayer=new YT.Player('controlMusicPlayer',{
      width:'100%',height:'270',videoId:'',
      playerVars:{autoplay:0,controls:1,rel:0,playsinline:1,modestbranding:1},
      events:{
        onReady:function(){
          try{ chromeMusicPlayer.setVolume(Math.round(chromeMusicVolume*100)); try{ chromeMusicPlayer.setPlaybackQuality('tiny'); }catch(e){} }catch(e){}
          if(chromeMusicPending && chromeMusicActivated) playChromeMusic(chromeMusicPending);
        },
        onStateChange:function(e){
          if(e.data===YT.PlayerState.PLAYING){ try{ chromeMusicPlayer.setPlaybackQuality('tiny'); }catch(e){} setChromeMusicStatus('🔊 Musik sedang bunyi dari Chrome · target 144p',true); }
          if(e.data===YT.PlayerState.ENDED && chromeMusicCurrentId){
            const id=chromeMusicCurrentId; chromeMusicCurrentId=null; socket.emit('music:ended',{videoId:id});
          }
        },
        onError:function(){
          setChromeMusicStatus('❌ YouTube gagal memainkan video ini');
          if(chromeMusicCurrentId){ const id=chromeMusicCurrentId; chromeMusicCurrentId=null; socket.emit('music:ended',{videoId:id}); }
        }
      }
    });
  };
  function activateChromeMusic(){
    chromeMusicActivated=true;
    const b=document.getElementById('musicActivateBtn');
    if(b){ b.textContent='✅ Audio Chrome Aktif'; b.disabled=true; }
    setChromeMusicStatus('Chrome music player aktif',true);
    loadChromeYouTubeApi();
    if(chromeMusicPending && chromeMusicApiReady) playChromeMusic(chromeMusicPending);
  }
  function playChromeMusic(item){
    if(!chromeMusicActivated || !item || !item.videoId) return;
    chromeMusicPending=item;
    if(!chromeMusicApiReady || !chromeMusicPlayer){ loadChromeYouTubeApi(); return; }
    if(chromeMusicCurrentId===item.videoId) return;
    chromeMusicCurrentId=item.videoId;
    setChromeMusicStatus('⏳ Memutar: '+(item.title||'Lagu'));
    try{
      chromeMusicPlayer.setVolume(Math.round(chromeMusicVolume*100));
      chromeMusicPlayer.loadVideoById({videoId:item.videoId,startSeconds:0,suggestedQuality:'tiny'});
      setTimeout(()=>{ try{ chromeMusicPlayer.setPlaybackQuality('tiny'); }catch(e){} }, 1200);
      chromeMusicPlayer.playVideo();
    }catch(e){ setChromeMusicStatus('❌ Gagal memulai audio Chrome'); }
  }

  function copyMusicUrl(){ navigator.clipboard?.writeText(document.getElementById('musicUrl').textContent); logEvent('URL OBS Music Request (visual only) disalin.'); }
  function copyMusicPlayerUrl(){ navigator.clipboard?.writeText(document.getElementById('musicPlayerUrl').textContent); logEvent('URL Chrome Music Player disalin.'); }
  function renderMusic(state){
    state=state||{}; const c=state.current; const q=Array.isArray(state.queue)?state.queue:[];
    document.getElementById('musicCurrentTitle').textContent=c?.title||'Belum ada lagu';
    document.getElementById('musicCurrentBy').textContent=c?`@${c.requestedBy||'Penonton'} · ${c.duration||''}`:'-';
    document.getElementById('musicQueueCount').textContent=q.length;
    const root=document.getElementById('musicQueueList');
    root.innerHTML=q.length?q.map((x,i)=>`<div>${i+1}. <b>${escapeHtml(x.title||'Lagu')}</b> — @${escapeHtml(x.requestedBy||'Penonton')}</div>`).join(''):'<div>Belum ada antrian.</div>';
    chromeMusicPending=c||null;
    if(c && chromeMusicActivated) playChromeMusic(c);
    if(!c && chromeMusicPlayer && chromeMusicApiReady){ try{chromeMusicPlayer.stopVideo();}catch(e){} chromeMusicCurrentId=null; }
  }
  socket.on('music:update',renderMusic);
  socket.on('music:settings',s=>{ chromeMusicVolume=Math.max(0,Math.min(1,Number(s?.volume ?? 0.75))); const el=document.getElementById('musicVolume'); if(el) el.value=Math.round(chromeMusicVolume*100); const v=document.getElementById('musicVolumeValue'); if(v) v.textContent=Math.round(chromeMusicVolume*100)+'%'; if(chromeMusicPlayer&&chromeMusicApiReady){try{chromeMusicPlayer.setVolume(Math.round(chromeMusicVolume*100));}catch(e){}} });
  // FIX PERFORMANCE: loadChromeYouTubeApi() DIHAPUS dari sini.
  // Sebelumnya baris ini jalan otomatis begitu dashboard dibuka, artinya
  // iframe YouTube ditanam & aktif terus meskipun fitur music request gak
  // pernah dipakai. Itu penyebab utama CPU tinggi terus-menerus dan delay
  // pas pindah/alt-tab browser. Sekarang API+player YouTube baru dimuat
  // pas user beneran klik tombol "Aktifkan Audio Chrome" (lihat
  // activateChromeMusic() di atas, yang sudah manggil loadChromeYouTubeApi()
  // sendiri kalau memang dibutuhkan).
  socket.on('music:request-result',r=>{ logEvent(r?.ok?`Music request masuk: ${r.item?.title||'Lagu'}`:`Music request gagal: ${r?.message||'error'}`); });
  socket.on('event',p=>{ if(p?.kind==='music-request') logEvent(`🎵 @${p.username||'Penonton'} request: ${p.extra||''}`); if(p?.kind==='music-request-error') logEvent(`🎵 Request ditolak @${p.username||'Penonton'}: ${p.extra||''}`); });
  function updateMusicVolume(){
    const el=document.getElementById('musicVolume');
    const volume=Math.max(0,Math.min(100,Number(el.value)||0));
    chromeMusicVolume=volume/100;
    document.getElementById('musicVolumeValue').textContent=volume+'%';
    if(chromeMusicPlayer && chromeMusicApiReady){ try{chromeMusicPlayer.setVolume(volume);}catch(e){} }
    socket.emit('music:settings',{volume:chromeMusicVolume});
    logEvent('Volume musik Chrome: '+volume+'%');
  }

  function musicSkip(){socket.emit('music:skip');logEvent('Music: skip.');}
  function musicClear(){socket.emit('music:clear');logEvent('Music: queue dihapus.');}
  function musicStop(){socket.emit('music:stop');logEvent('Music: stop dan queue dihapus.');}
  function testMusicRequest(){const q=document.getElementById('musicTestQuery').value.trim();if(!q)return;if(!chromeMusicActivated) activateChromeMusic();socket.emit('music:request',{username:'PenontonDemo',query:q});}

  // ---- Simulator ----
  function simulateTtsComment(){const username=document.getElementById('simUsername').value||'PenontonDemo';const comment=document.getElementById('simComment').value||'halo, tes TTS!';socket.emit('trigger',{kind:'alert',type:'comment',username,extra:comment});logEvent('Tes Chat + TTS dikirim ke Browser Source ALERT + TTS. Pastikan audio Browser Source tidak di-mute.');}
  function cp(id){navigator.clipboard?.writeText(document.getElementById(id).textContent);logEvent('URL Browser Source disalin.');}
  const baseUrl=location.origin;setTimeout(()=>{document.getElementById('srcChat').textContent=baseUrl+'/overlay-comments.html?v=27';document.getElementById('srcFollowGift').textContent=baseUrl+'/overlay-follow-gift.html?v=27';document.getElementById('srcGoal').textContent=baseUrl+'/overlay-goal.html?v=27';document.getElementById('srcAlert').textContent=baseUrl+'/overlay.html?v=27';document.getElementById('srcTts').textContent=baseUrl+'/overlay-tts.html?v=27';document.getElementById('musicUrl').textContent=baseUrl+'/overlay-music.html?v=32';
    if(document.getElementById('musicPlayerUrl')) document.getElementById('musicPlayerUrl').textContent=baseUrl+'/music-player.html?v=32';},0);

  function simulateEvent(type){
    const username = document.getElementById('simUsername').value || 'PenontonDemo';
    const comment = document.getElementById('simComment').value || 'halo, tes overlay!';
    const extra = type === 'comment' ? comment : type === 'gift' ? 'Rose x1' : '';
    socket.emit('trigger', {kind:'alert', type, username, extra, count:type==='like'?5:1});
    logEvent(`Simulator: ${type} dari ${username}`);
  }

  function simulateLikeLeaderboard(){
    const username = document.getElementById('simUsername').value || 'PenontonDemo';
    const count = Math.max(1, Number(document.getElementById('simLikeCount').value) || 1);
    socket.emit('trigger', {kind:'like-sim', username, count});
    logEvent(`Simulator leaderboard: ${username} +${count} like.`);
  }

  function resetSimLeaderboard(){
    socket.emit('trigger', {kind:'leaderboard-reset'});
    logEvent('Simulator leaderboard di-reset.');
  }

  renderAnimationSettings();
  socket.emit('stats:get');
  socket.emit('goal:get');
  socket.emit('actions:get');


  // V38 dashboard UI helpers — presentation only; existing feature logic remains unchanged.
  (() => {
    const clock = document.getElementById('dashboardClock');
    const dashConn = document.getElementById('dashConnectionText');
    const serverText = document.getElementById('serverStateText');
    function tick(){
      if(!clock) return;
      const d = new Date();
      clock.textContent = [d.getHours(),d.getMinutes(),d.getSeconds()].map(v=>String(v).padStart(2,'0')).join(':');
    }
    tick(); setInterval(tick,1000);
    const originalSet = window.setPanelConnectionState;
    // Keep dashboard status synchronized without changing the underlying connection behavior.
    const syncDash = (label, connected) => {
      if(dashConn){
        dashConn.textContent = label === 'TERHUBUNG' ? 'TikTok Connected' : label === 'SERVER TERPUTUS' ? 'Server Offline' : 'Belum Terhubung';
      }
      if(serverText) serverText.textContent = (label === 'SERVER TERPUTUS') ? 'Server Offline' : 'Server Online';
    };
    const observer = new MutationObserver(() => {
      const label = statusEl ? statusEl.textContent : 'BELUM TERHUBUNG';
      syncDash(label, label === 'TERHUBUNG');
    });
    if(statusEl) observer.observe(statusEl,{childList:true,characterData:true,subtree:true});
    setTimeout(()=>syncDash(statusEl?.textContent || 'BELUM TERHUBUNG', false),50);
  })();
