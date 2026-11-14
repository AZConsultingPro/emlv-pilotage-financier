'use strict';
(function(root){
class Dialogue {
  constructor({synth,Utterance,lines,onChange=()=>{},onError=()=>{}}){Object.assign(this,{synth,Utterance,lines,onChange,onError});this.index=0;this.rate=1;this.active=false;this.paused=false;this.serial=0;this.voices={};this.timer=null;this.waiting=false;}
  available(){try{return this.synth.getVoices().filter(v=>/^fr(?:-|_|$)/i.test(v.lang)).sort((a,b)=>Number(b.localService)-Number(a.localService));}catch{return [];}}
  notify(){this.onChange(this);}
  stop(){this.serial++;clearTimeout(this.timer);this.timer=null;this.waiting=false;this.active=false;this.paused=false;this.synth?.cancel();this.notify();}
  seek(n){this.stop();this.index=Math.max(0,Math.min(this.lines.length-1,n));this.notify();}
  play(){if(this.paused){this.paused=false;if(this.waiting)this.speak();else this.synth.resume();this.notify();return;}if(this.active)return;const vs=this.available();if(!vs.length){this.onError('Aucune voix française disponible dans ce navigateur. La transcription reste accessible.');return;}this.active=true;this.speak();}
  speak(){if(!this.active||this.paused)return;this.waiting=false;const vs=this.available(),row=this.lines[this.index],u=new this.Utterance(row[1]),token=++this.serial;u.lang='fr-FR';u.rate=this.rate;u.voice=vs.find(v=>v.voiceURI===this.voices[row[0]])||vs[row[0]==='F'?0:Math.min(1,vs.length-1)];this.current=u;u.onend=()=>{if(token!==this.serial||!this.active)return;if(this.index===this.lines.length-1){this.active=false;this.notify();return;}this.index++;this.waiting=true;this.notify();this.timer=setTimeout(()=>this.speak(),2000);};u.onerror=e=>{if(token!==this.serial)return;this.stop();this.onError('La lecture a été interrompue ('+e.error+'). Vous pouvez reprendre à la réplique sélectionnée.');};this.synth.cancel();this.synth.resume();this.synth.speak(u);this.notify();}
  pause(){if(!this.active||this.paused)return;this.paused=true;if(this.waiting)clearTimeout(this.timer);else this.synth.pause();this.notify();}
}
if(typeof module!=='undefined')module.exports=Dialogue;
root.DialogueSpeech=Dialogue;
let cleanup=()=>{};
root.DialogueAudio={dispose(){cleanup();cleanup=()=>{};},mount({lines,index,onStep,preferences,onPreferences}){
  this.dispose();const el=document.querySelector('#dialogue-player');if(!el)return;
  const status=el.querySelector('[data-audio-status]'),selectF=el.querySelector('#voice-f'),selectM=el.querySelector('#voice-m'),speed=el.querySelector('#speech-rate');
  const buttons=Object.fromEntries([...el.querySelectorAll('[data-speech]')].map(b=>[b.dataset.speech,b]));
  const synth=root.speechSynthesis||{getVoices:()=>[],cancel(){},pause(){},resume(){},addEventListener(){},removeEventListener(){}};
  let error='';const d=new Dialogue({synth,Utterance:root.SpeechSynthesisUtterance||function(text){this.text=text;},lines,onError:message=>{error=message;paint();},onChange:paint});d.index=index||0;d.rate=Number(preferences?.rate)||1;d.voices={...(preferences?.voices||{})};speed.value=String(d.rate);
  function paint(){const vs=d.available();speed.disabled=!vs.length;buttons.play.disabled=!vs.length||d.active&&!d.paused;buttons.pause.disabled=!d.active||d.paused;buttons.stop.disabled=!d.active;buttons.prev.disabled=d.index===0;buttons.next.disabled=d.index===lines.length-1;buttons.play.textContent=d.paused?'Reprendre':'Lire';status.textContent=error||(!vs.length?'Aucune voix française disponible ici. La transcription et les étapes restent utilisables.':d.paused?'Lecture en pause.':d.active?'Lecture de la réplique '+(d.index+1)+' sur '+lines.length+'.':'Prêt. '+(vs.length<2?'Une seule voix française disponible pour les deux rôles.':'Choisissez les voix des deux rôles, puis lancez la lecture.'));onStep(d.index);}
  function populate(){const vs=d.available();for(const [role,select] of [['F',selectF],['M',selectM]]){select.replaceChildren();vs.forEach(v=>{let o=document.createElement('option');o.value=v.voiceURI;o.textContent=v.name+' ('+v.lang+', '+(v.localService?'locale':'en ligne')+')';select.appendChild(o);});const chosen=vs.find(v=>v.voiceURI===d.voices[role])||(role==='F'?vs.find(v=>/amélie|audrey|aurélie|denise|julie|hortense|marie|female/i.test(v.name)):vs.find(v=>v.voiceURI!==d.voices.F))||vs[0];if(chosen){d.voices[role]=chosen.voiceURI;select.value=chosen.voiceURI;}select.disabled=!vs.length;}paint();}
  function click(e){const action=e.target.closest('[data-speech]')?.dataset.speech;if(!action)return;error='';if(action==='play')d.play();if(action==='pause')d.pause();if(action==='stop')d.stop();if(action==='prev')d.seek(d.index-1);if(action==='next')d.seek(d.index+1);}
  function change(){d.voices={F:selectF.value,M:selectM.value};d.rate=Number(speed.value);onPreferences({rate:d.rate,voices:d.voices});}
  el.addEventListener('click',click);selectF.addEventListener('change',change);selectM.addEventListener('change',change);speed.addEventListener('change',change);synth.addEventListener('voiceschanged',populate);populate();
  cleanup=()=>{d.stop();synth.removeEventListener('voiceschanged',populate);el.removeEventListener('click',click);};
}};
})(typeof window==='undefined'?globalThis:window);
