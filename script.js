const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

// Reveal content as it enters the viewport.
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('shown');
      entry.target.querySelectorAll?.('.typed-lines p').forEach((line, i) => {
        setTimeout(() => line.classList.add('visible'), i * 650);
      });
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .18 });
$$('.reveal, .story-copy').forEach(el => revealObserver.observe(el));

// Candle interaction: button fallback always works.
function extinguishCandles() {
  $$('.candle').forEach((c, i) => setTimeout(() => c.classList.add('out'), i * 180));
  $('#wishMessage').textContent = 'May this year bring you everything your heart has been quietly wishing for. Happy Birthday, Sarthuuu! ♥';
  $('#blowButton').textContent = 'Wish made ✦';
  confetti();
}
$('#blowButton').addEventListener('click', extinguishCandles);

// Microphone blow detection uses audio volume only; audio is not recorded or stored.
let audioContext, micStream, micFrame;
$('#micButton').addEventListener('click', async () => {
  const status = $('#micStatus');
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Microphone is not available here. Use the candle button instead.';
    return;
  }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(micStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    status.textContent = 'Microphone is on — blow gently towards your device.';
    $('#micButton').textContent = 'Listening…';
    let loudFrames = 0;
    const listen = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const value of data) sum += Math.abs(value - 128);
      const volume = sum / data.length;
      loudFrames = volume > 13 ? loudFrames + 1 : Math.max(0, loudFrames - 1);
      if (loudFrames > 10) {
        extinguishCandles();
        stopMic();
        status.textContent = 'Wish received. ✨';
        return;
      }
      micFrame = requestAnimationFrame(listen);
    };
    listen();
  } catch {
    status.textContent = 'Microphone permission was not granted. The button still works!';
  }
});
function stopMic() {
  if (micFrame) cancelAnimationFrame(micFrame);
  micStream?.getTracks().forEach(track => track.stop());
  audioContext?.close();
  $('#micButton').textContent = 'Use microphone';
}
window.addEventListener('beforeunload', stopMic);

// Small celebratory confetti burst.
function confetti() {
  for (let i=0; i<75; i++) {
    const bit = document.createElement('i');
    bit.style.cssText = `position:fixed;z-index:45;left:${Math.random()*100}vw;top:-12px;width:${4+Math.random()*5}px;height:${7+Math.random()*8}px;background:${['#c6a16a','#f0d9a7','#8c3e3e','#eee0c5'][i%4]};opacity:.9;pointer-events:none;border-radius:2px;`;
    document.body.appendChild(bit);
    const x = (Math.random()-.5)*220, duration = 1800+Math.random()*1800;
    bit.animate([{transform:'translate3d(0,0,0) rotate(0)',opacity:1},{transform:`translate3d(${x}px,105vh,0) rotate(${Math.random()*900}deg)`,opacity:0}],{duration,easing:'cubic-bezier(.2,.7,.3,1)'});
    setTimeout(()=>bit.remove(),duration);
  }
}

// Gallery lightbox and temporary local uploads.
const lightbox = $('#lightbox');
function openLightbox(src, caption) {
  $('#lightboxImage').src = src;
  $('#lightboxCaption').textContent = caption || '';
  lightbox.classList.add('open');
}
$('#lightboxClose').addEventListener('click',()=>lightbox.classList.remove('open'));
lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.classList.remove('open')});
$('#galleryGrid').addEventListener('click',e=>{
  const item=e.target.closest('.gallery-item');
  if (!item) return;
  const img=$('img',item);
  if (img) openLightbox(img.src,item.dataset.caption);
});
$('#photoUpload').addEventListener('change',e=>{
  [...e.target.files].forEach((file,index)=>{
    if(!file.type.startsWith('image/')) return;
    const url=URL.createObjectURL(file);
    const item=document.createElement('button');
    item.className='gallery-item';
    item.dataset.caption=file.name.replace(/\.[^.]+$/,'');
    const img=document.createElement('img'); img.src=url; img.alt=item.dataset.caption;
    const label=document.createElement('span'); label.textContent='NEW MEMORY';
    item.append(img,label); $('#galleryGrid').prepend(item);
  });
  e.target.value='';
});

// Extra memories uploaded from the editor; stored as compressed images.
let extraMemoryPhotos = [];
function renderExtraMemoryPhotos() {
  const grid = $('#galleryGrid');
  if (!grid) return;
  grid.querySelectorAll('[data-extra-memory="true"]').forEach(node => node.remove());
  extraMemoryPhotos.forEach((src, index) => {
    const item = document.createElement('button');
    item.className = 'gallery-item'; item.dataset.extraMemory = 'true';
    item.dataset.caption = `Memory ${index + 6}`;
    const img = document.createElement('img'); img.src = src; img.alt = `Additional memory ${index + 1}`;
    const label = document.createElement('span'); label.textContent = `MEMORY ${String(index + 6).padStart(2,'0')}`;
    item.append(img, label); grid.appendChild(item);
  });
}
const extraMemoryInput = $('#extraMemoryPhotos');
if (extraMemoryInput) extraMemoryInput.addEventListener('change', async event => {
  const files = [...(event.target.files || [])].filter(file => file.type.startsWith('image/'));
  const msg = $('#editorStatus');
  try {
    for (const file of files) extraMemoryPhotos.push(await compressPhoto(file));
    renderExtraMemoryPhotos();
    if (msg) msg.textContent = `${files.length} photo(s) added to Memories. Press Save changes.`;
  } catch (error) { if (msg) msg.textContent = error.message; }
  event.target.value = '';
});

// Per-page photo uploads. Images are resized before saving to browser storage.
const photoSlots = {
  photoHero: { selector: '.hero-content', insertAfter: '.signature', label: 'Opening page' },
  photoCelebrate: { selector: '.cake-stage', append: true, label: 'Birthday celebration' },
  photoStory: { selector: '.story-wrap', append: true, label: 'Our story' },
  photoChapter1: { selector: '.moment-card:nth-of-type(1) .photo-placeholder', replace: true, label: 'First chapter' },
  photoChapter2: { selector: '.moment-card:nth-of-type(2) .photo-placeholder', replace: true, label: 'The little things' },
  photoChapter3: { selector: '.moment-card:nth-of-type(3) .photo-placeholder', replace: true, label: 'The connection' },
  photoLetter: { selector: '.letter-paper', insertAfter: '.letter-signoff', label: 'English letter' },
  photoHindi: { selector: '.hindi-paper', insertAfter: '.hindi-final', label: 'Hindi shayari' },
  photoGallery: { selector: '.gallery-intro', insertAfter: null, label: 'Memories' },
  photoFinal: { selector: '.final-section', insertBefore: '.back-top', label: 'Final birthday page' }
};
let pagePhotos = {};
const photoPositions = {};
function applyPhotoPosition(id, position = 'center') {
  photoPositions[id] = position;
  const config = photoSlots[id];
  if (!config) return;
  const target = document.querySelector(config.selector);
  if (!target) return;
  const photo = config.replace ? target : target.querySelector(`:scope > .page-photo[data-photo-id=\"${id}\"]`);
  if (!photo) return;
  photo.dataset.align = position;
  if (config.replace) {
    photo.style.width = position === 'center' ? '100%' : '78%';
    photo.style.marginLeft = position === 'right' ? 'auto' : '0';
    photo.style.marginRight = position === 'left' ? 'auto' : '0';
  } else if (id === 'photoCelebrate') {
    photo.style.left = position === 'left' ? '2%' : position === 'center' ? 'calc(50% - 85px)' : 'auto';
    photo.style.right = position === 'right' ? '2%' : 'auto';
  } else {
    photo.style.marginLeft = position === 'left' ? '0' : 'auto';
    photo.style.marginRight = position === 'right' ? '0' : 'auto';
  }
}
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not open that image.'));
      img.onload = () => {
        const max = 1400, scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .78));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function renderPagePhoto(id, src) {
  const config = photoSlots[id];
  if (!config) return;
  const target = document.querySelector(config.selector);
  if (!target) return;
  if (config.replace) {
    target.innerHTML = '';
    if (src) {
      const img = document.createElement('img'); img.src = src; img.alt = config.label;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-page-photo'; remove.textContent = 'Remove photo';
      remove.addEventListener('click', (event) => {
        event.stopPropagation(); delete pagePhotos[id]; renderPagePhoto(id, null);
        const input = document.getElementById(id); if (input) input.value = '';
        const saved = JSON.parse(localStorage.getItem('sarthuuuBirthdayEdits') || '{}');
        delete saved[id]; localStorage.setItem('sarthuuuBirthdayEdits', JSON.stringify(saved));
      });
      target.append(img, remove); target.classList.add('has-photo');
      applyPhotoPosition(id, photoPositions[id] || 'center');
    } else {
      target.textContent = id === 'photoChapter1' ? 'YOUR FIRST HOSTEL MEMORY' : id === 'photoChapter2' ? 'A RANDOM, HAPPY DAY' : 'YOUR FAVOURITE PHOTO';
      target.classList.remove('has-photo');
    }
    return;
  }
  const existing = target.querySelector(`:scope > .page-photo[data-photo-id="${id}"]`);
  existing?.remove();
  if (!src) return;
  const figure = document.createElement('figure');
  figure.className = 'page-photo'; figure.dataset.photoId = id;
  const img = document.createElement('img'); img.src = src; img.alt = `${config.label} photograph`;
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-page-photo'; remove.textContent = 'Remove photo';
  remove.addEventListener('click', () => {
    delete pagePhotos[id]; renderPagePhoto(id, null);
    const input = document.getElementById(id); if (input) input.value = '';
    const saved = JSON.parse(localStorage.getItem('sarthuuuBirthdayEdits') || '{}');
    delete saved[id]; localStorage.setItem('sarthuuuBirthdayEdits', JSON.stringify(saved));
  });
  figure.append(img, remove);
  if (config.insertAfter) {
    const anchor = target.querySelector(config.insertAfter);
    if (anchor) anchor.insertAdjacentElement('afterend', figure); else target.appendChild(figure);
  } else if (config.insertBefore) {
    const anchor = target.querySelector(config.insertBefore);
    if (anchor) target.insertBefore(figure, anchor); else target.appendChild(figure);
  } else target.appendChild(figure);
  applyPhotoPosition(id, photoPositions[id] || 'center');
}
Object.entries(photoSlots).forEach(([id]) => {
  const positionInput = document.getElementById(`position_${id}`);
  if (positionInput) {
    positionInput.addEventListener('change', () => {
      applyPhotoPosition(id, positionInput.value);
      const msg = document.getElementById('editorStatus');
      if (msg) msg.textContent = `${photoSlots[id].label} photo location updated. Press Save changes.`;
    });
  }
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('change', async () => {
    const file = input.files?.[0]; if (!file) return;
    try {
      pagePhotos[id] = await compressPhoto(file);
      renderPagePhoto(id, pagePhotos[id]);
      const msg = document.getElementById('editorStatus');
      if (msg) msg.textContent = `${photoSlots[id].label} photo added. Press Save changes to keep it.`;
    } catch (error) {
      const msg = document.getElementById('editorStatus'); if (msg) msg.textContent = error.message;
    }
  });
});

// Music control is ready for an optional local audio file.
const music = $('#backgroundMusic');
const musicToggle = $('#musicToggle');
let musicReady = false;
musicToggle.addEventListener('click', async()=>{
  if(!musicReady){
    music.src='assets/ambient.mp3';
    music.volume=.25;
    musicReady=true;
  }
  try {
    if(music.paused){ await music.play(); musicToggle.innerHTML='♫ <span>Music on</span>'; }
    else { music.pause(); musicToggle.innerHTML='♫ <span>Music off</span>'; }
  } catch { musicToggle.innerHTML='♫ <span>Add music file</span>'; }
});

// Ambient star particles.
for(let i=0;i<32;i++){
  const star=document.createElement('span');
  star.textContent=i%4===0?'✦':'·';
  star.style.cssText=`position:fixed;z-index:0;pointer-events:none;left:${Math.random()*100}%;top:${Math.random()*100}%;color:#c9a36c;opacity:${.12+Math.random()*.35};font-size:${7+Math.random()*12}px;animation:float ${5+Math.random()*8}s ease-in-out infinite;animation-delay:${-Math.random()*8}s`;
  document.body.appendChild(star);
}

// QUICK EDITOR: lets the site owner personalize text without opening code.
(() => {
  const panel = document.getElementById('editorPanel');
  const backdrop = document.getElementById('editorBackdrop');
  const status = document.getElementById('editorStatus');
  const themeFields = ['editThemeCelebrateBg','editThemeCelebrateAccent','editThemeStoryBg','editThemeStoryAccent','editThemeLetterBg','editThemeLetterAccent','editThemeHindiBg','editThemeHindiAccent','editThemeGalleryBg','editThemeGalleryAccent','editThemeFinalBg','editThemeFinalAccent'];
  const fields = ['editFriend','editTagline','editOpening','editStory','editChapter1Title','editChapter1Text','editChapter2Title','editChapter2Text','editChapter3Title','editChapter3Text','editEnglishLetter','editHindiLetter','editFinal','editAccent',...themeFields];
  const $id = id => document.getElementById(id);
  const letterParagraphs = [...document.querySelectorAll('.letter-body p')].map(p => p.textContent.trim());
  const defaults = {
    editFriend:'Sarthuuuuu', editTagline:'Lallaaaaa',
    editOpening:'Some people enter your life unexpectedly...\nSomehow, they become a part of your favourite memories.',
    editStory:[...document.querySelectorAll('.typed-lines p')].map(p=>p.textContent).join('\n'),
    editChapter1Title:document.querySelectorAll('.moment-card p')[0]?.textContent || 'The first chapter',
    editChapter1Text:document.querySelectorAll('.moment-card small')[0]?.textContent || '',
    editChapter2Title:document.querySelectorAll('.moment-card p')[1]?.textContent || 'The little things',
    editChapter2Text:document.querySelectorAll('.moment-card small')[1]?.textContent || '',
    editChapter3Title:document.querySelectorAll('.moment-card p')[2]?.textContent || 'The connection',
    editChapter3Text:document.querySelectorAll('.moment-card small')[2]?.textContent || '',
    editEnglishLetter:letterParagraphs.join('\n\n'),
    editHindiLetter:[...document.querySelectorAll('#hindiPoem p')].map(p=>p.textContent).filter(t=>!t.startsWith('[')).join('\n\n'),
    editFinal:"Here's to another year of memories, madness, laughter and endless stories.\nStay the same idiot you've always been.\nKeep smiling. Keep growing. Keep being YOU.",
    editAccent:'#b9955e',
    editThemeCelebrateBg:'#100d0c', editThemeCelebrateAccent:'#c6a16a',
    editThemeStoryBg:'#0b0a09', editThemeStoryAccent:'#c6a16a',
    editThemeLetterBg:'#15110e', editThemeLetterAccent:'#b9955e',
    editThemeHindiBg:'#0b0908', editThemeHindiAccent:'#c6a16a',
    editThemeGalleryBg:'#0e0c0b', editThemeGalleryAccent:'#c6a16a',
    editThemeFinalBg:'#080808', editThemeFinalAccent:'#c6a16a'
  };
  function open(){panel.classList.add('open');backdrop.classList.add('open');}
  function close(){panel.classList.remove('open');backdrop.classList.remove('open');}
  document.getElementById('editLaunch').addEventListener('click',open);
  document.getElementById('editorClose').addEventListener('click',close);
  backdrop.addEventListener('click',close);
  function setText(selector,text){const el=document.querySelector(selector);if(el)el.textContent=text;}
  function apply(data){
    const friend=data.editFriend||defaults.editFriend, tagline=data.editTagline||defaults.editTagline;
    const opening=(data.editOpening||'').split('\n');
    const prelude=document.querySelectorAll('.hero-prelude');
    if(prelude[0])prelude[0].textContent=opening[0]||'';
    if(prelude[1])prelude[1].textContent=opening[1]||'';
    const heroName=document.querySelector('.hero h1 em'); if(heroName)heroName.textContent=friend+'!';
    const finalName=document.querySelector('.final-section h1 em');if(finalName)finalName.textContent=friend+'!';
    document.querySelectorAll('.signature span').forEach(el=>el.textContent=tagline);
    const story=(data.editStory||'').split('\n');
    const storyBox=document.querySelector('.typed-lines');storyBox.innerHTML='';
    story.forEach((line,i)=>{const p=document.createElement('p');p.textContent=line;if(i===story.length-1)p.className='gold-line visible';else p.className='visible';storyBox.appendChild(p)});
    for(let i=1;i<=3;i++){
      const card=document.querySelectorAll('.moment-card')[i-1];
      if(card){
        card.querySelector('p').textContent=data[`editChapter${i}Title`] ?? defaults[`editChapter${i}Title`];
        card.querySelector('small').textContent=data[`editChapter${i}Text`] ?? defaults[`editChapter${i}Text`];
      }
    }
    const letter=document.querySelector('.letter-body');letter.innerHTML='';
    (data.editEnglishLetter||'').split(/\n\s*\n/).filter(Boolean).forEach(line=>{const p=document.createElement('p');p.textContent=line;letter.appendChild(p)});
    const signoff=document.querySelector('.letter-signoff');signoff.innerHTML='With lots of love,<br><span></span> ♥';signoff.querySelector('span').textContent='Yours '+tagline;
    const poem=document.getElementById('hindiPoem');poem.innerHTML='';
    (data.editHindiLetter||'').split(/\n\s*\n/).filter(Boolean).forEach(line=>{const p=document.createElement('p');p.textContent=line;poem.appendChild(p)});
    const final=(data.editFinal||'').split('\n');
    document.querySelector('.final-section h2').textContent=final[0]||'';
    document.querySelector('.final-lines').innerHTML=(final.slice(1).join('<br>'));
    document.documentElement.style.setProperty('--user-accent',data.editAccent||defaults.editAccent);
    document.querySelectorAll('.eyebrow,.section-kicker,.hindi-final,.signature span').forEach(el=>el.style.setProperty('color',data.editAccent||defaults.editAccent));
    const pageThemes = [
      ['celebrate','editThemeCelebrateBg','editThemeCelebrateAccent'],
      ['story','editThemeStoryBg','editThemeStoryAccent'],
      ['letter','editThemeLetterBg','editThemeLetterAccent'],
      ['hindi','editThemeHindiBg','editThemeHindiAccent'],
      ['gallery','editThemeGalleryBg','editThemeGalleryAccent'],
      ['final','editThemeFinalBg','editThemeFinalAccent']
    ];
    pageThemes.forEach(([sectionId,bgKey,accentKey])=>{
      const section=document.getElementById(sectionId);
      if(!section) return;
      const bg=data[bgKey]||defaults[bgKey], accent=data[accentKey]||defaults[accentKey];
      section.style.backgroundColor=bg;
      section.querySelectorAll('.eyebrow,.section-kicker,h2 em,h1 em,.moment>span,.moment-card p,.wish-message,.hindi-final').forEach(el=>el.style.color=accent);
      section.style.setProperty('--page-accent',accent);
    });
  }
  function readFields(){const out={};fields.forEach(id=>out[id]=$id(id).value);return out;}
  fields.forEach(id=>$id(id).addEventListener('input',()=>apply(readFields())));
  function load(data){fields.forEach(id=>$id(id).value=data[id]??defaults[id]);apply(data);}
  document.getElementById('saveEdits').addEventListener('click',()=>{
    const data={...readFields(),...pagePhotos, extraMemoryPhotos};
    Object.keys(photoSlots).forEach(id => data[`position_${id}`] = photoPositions[id] || 'center');
    apply(data);
    try{localStorage.setItem('sarthuuuBirthdayEdits',JSON.stringify(data));status.textContent='Saved in this browser. Your edits will return when you reopen this site here.';}
    catch{status.textContent='Preview updated, but browser storage is full. Export a text backup.';}
  });
  document.getElementById('resetEdits').addEventListener('click',()=>{
    localStorage.removeItem('sarthuuuBirthdayEdits');pagePhotos={};extraMemoryPhotos=[];renderExtraMemoryPhotos();const extraInput=$id('extraMemoryPhotos');if(extraInput)extraInput.value='';Object.keys(photoSlots).forEach(id=>{photoPositions[id]='center';renderPagePhoto(id,null);const input=$id(id);if(input)input.value='';const pos=document.getElementById(`position_${id}`);if(pos)pos.value='center';});load(defaults);status.textContent='Original website text and photos restored.';
  });
  document.getElementById('exportEdits').addEventListener('click',()=>{
    const backup={...readFields(),...pagePhotos, extraMemoryPhotos};Object.keys(photoSlots).forEach(id=>backup[`position_${id}`]=photoPositions[id]||'center');
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sarthuuu-website-text-backup.json';a.click();URL.revokeObjectURL(a.href);
    status.textContent='Text backup downloaded.';
  });
  const saved=localStorage.getItem('sarthuuuBirthdayEdits');
  const savedData=saved?JSON.parse(saved):defaults;
  load(savedData);
  extraMemoryPhotos = Array.isArray(savedData.extraMemoryPhotos) ? savedData.extraMemoryPhotos : [];
  renderExtraMemoryPhotos();
  Object.keys(photoSlots).forEach(id=>{
    const position = savedData[`position_${id}`] || 'center';
    photoPositions[id] = position;
    const positionInput = document.getElementById(`position_${id}`); if (positionInput) positionInput.value = position;
    if (savedData[id]) { pagePhotos[id]=savedData[id]; renderPagePhoto(id, savedData[id]); }
  });
})();
