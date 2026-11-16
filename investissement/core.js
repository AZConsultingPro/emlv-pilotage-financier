'use strict';
(function(root){
 const F={
  pv:(c,r,n)=>c/(1+r)**n,
  fv:(c,r,n)=>c*(1+r)**n,
  annuity:(c,r,n)=>r===0?c*n:c*(1-(1+r)**(-n))/r,
  payment:(p,r,n)=>p/F.annuity(1,r,n),
  npv:(flows,r)=>flows.reduce((s,c,t)=>s+c/(1+r)**t,0),
  irr:flows=>{let lo=0,hi=1;while(F.npv(flows,hi)>0&&hi<1e6)hi*=2;if(F.npv(flows,lo)<0)return null;for(let i=0;i<100;i++){let mid=(lo+hi)/2;if(F.npv(flows,mid)>0)lo=mid;else hi=mid;}return(lo+hi)/2;},
  combinations:(projects,budget)=>Array.from({length:2**projects.length},(_,mask)=>{let picked=projects.filter((_,i)=>mask>>i&1);return{names:picked.map(p=>p.name),cost:picked.reduce((s,p)=>s+p.cost,0),value:picked.reduce((s,p)=>s+p.value,0)};}).filter(x=>x.cost<=budget).sort((a,b)=>b.value-a.value),
  parse:(raw,unit='')=>{
   let s=String(raw??'').trim().replace(/\u2212/g,'-');if(!s)return{status:'empty'};if(!/\d/.test(s))return{status:'format'};
   const u={'€':['€','EUR'],'k€':['k€'],'M$':['M$'],'%':['%'],'×':['×','x','fois'],'ans':['ans','an'],'jours':['jours','jour']};
   let suffix=s.match(/([a-zA-Z€$%×]+)$/u)?.[1];if(suffix){if(!(u[unit]||[]).includes(suffix))return{status:'unit'};s=s.slice(0,-suffix.length).trim();}
   s=s.replace(/[\u00a0\u202f]/g,' ');if(/^\(.*\)$/.test(s))s='-'+s.slice(1,-1);
   if(!/^[+-]?[\d ,.]+$/.test(s))return{status:'format'};
   if(s.includes(' ')){if(!/^[+-]?\d{1,3}( \d{3})+([.,]\d+)?$/.test(s))return{status:'ambiguous'};s=s.replace(/ /g,'');}
   if(s.includes(',')&&s.includes('.'))return{status:'ambiguous'};
   if((s.match(/[.,]/g)||[]).length>1)return{status:'ambiguous'};
   if(!/^[+-]?\d+([.,]\d+)?$/.test(s))return{status:'format'};
   const value=Number(s.replace(',','.'));return Number.isFinite(value)?{status:'ok',value}:{status:'format'};
  },
  grade:(q,raw)=>{if(q.type==='number'){const p=F.parse(raw,q.unit);if(p.status!=='ok')return p;return{status:'ok',correct:Math.abs(p.value-q.answer)<=q.tolerance+1e-9,value:p.value};}const a=Array.isArray(raw)?raw:[raw];if(!a.length||a[0]===''||a[0]==null)return{status:'empty'};return{status:'ok',correct:JSON.stringify([...a].map(Number).sort())===JSON.stringify([...q.answer].sort())};},
  fresh:id=>({schema:1,module:id,contentVersion:'1.0.0',profile:{firstName:'',lastName:''},answers:{},events:{},streak:0,best:0,milestones:[],challenge:{round:0},route:'home',notes:{},reasoning:{}}),
  award:(state,id,q,help)=>{if(state.events[id])return false;state.events[id]={question:q,at:new Date().toISOString(),version:state.contentVersion,help};return true;},
  check:(state,q,raw,micro=false)=>{const a=state.answers[q.id]||=( {raw:'',tries:0,ok:false,micro:{raw:'',tries:0,ok:false}});const part=micro?a.micro:a;const item=micro?q.micro:q;const g=F.grade(item,raw);if(g.status!=='ok')return g;part.raw=raw;part.ok=g.correct;if(!g.correct)part.tries++;else F.award(state,q.id+(micro?'-micro':''),q.id,part.tries>0||!!a.helpCells||!!a.hintUsed);return{...g,tries:part.tries,needsMicro:a.tries>=3&&!a.micro.ok};},
  answerDone:(state,q)=>{const a=state.answers[q.id];return !!a&&(a.tries>=3?a.micro.ok:a.ok);},
  done:(state,q)=>F.answerDone(state,q)&&(!q.justify||!!state.reasoning?.['q-'+q.id]?.ok),
  validateImport:(o,id)=>{
   const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),nat=x=>Number.isInteger(x)&&x>=0;
   const raw=x=>typeof x==='string'||(Array.isArray(x)&&x.every(n=>Number.isInteger(n)&&n>=0&&n<4));
   const response=x=>obj(x)&&raw(x.raw)&&nat(x.tries)&&typeof x.ok==='boolean';
   if(o?.profile!==undefined&&(!obj(o.profile)||!['firstName','lastName'].every(k=>typeof o.profile[k]==='string'&&o.profile[k].length<=80)))return false;
   if(o?.updatedAt!==undefined&&(typeof o.updatedAt!=='string'||!Number.isFinite(Date.parse(o.updatedAt))))return false;
   if(o?.resumeRoute!==undefined&&(typeof o.resumeRoute!=='string'||! /^(cours|parcours|laboratoire|audio)(\/[^<>\s]*)?$/.test(o.resumeRoute)))return false;
   if(o?.reasoning!==undefined&&(!obj(o.reasoning)||Object.keys(o.reasoning).length>100||!Object.entries(o.reasoning).every(([k,r])=>/^(lab-(prediction|observation)|q-[a-z0-9-]+)$/.test(k)&&obj(r)&&obj(r.picks)&&Object.keys(r.picks).length<=20&&Object.entries(r.picks).every(([k,v])=>/^[a-z0-9-]+$/.test(k)&&typeof v==='string'&&['correct','confusion','surinterpretation'].includes(v))&&typeof r.checked==='boolean'&&typeof r.ok==='boolean'&&nat(r.tries))))return false;
   return obj(o)&&o.schema===1&&o.module===id&&o.contentVersion==='1.0.0'&&obj(o.answers)&&Object.values(o.answers).every(a=>response(a)&&response(a.micro)&&(a.transferEvidence===undefined||(obj(a.transferEvidence)&&typeof a.transferEvidence.firstCorrect==='boolean'&&typeof a.transferEvidence.helpBeforeFirst==='boolean'))&&(!a.cells||Array.isArray(a.cells)&&a.cells.every(c=>typeof c==='string')))&&obj(o.events)&&Object.values(o.events).every(e=>obj(e)&&typeof e.at==='string'&&typeof e.question==='string')&&nat(o.streak)&&nat(o.best)&&Array.isArray(o.milestones)&&o.milestones.every(n=>[10,20,30].includes(n))&&obj(o.challenge)&&nat(o.challenge.round)&&typeof o.route==='string'&&obj(o.notes)&&Object.values(o.notes).every(n=>typeof n==='string')&&(!o.group||['MSID1','DRH1','DRH2','AUTRE'].includes(o.group));
  }

 };root.Finance=F;if(typeof module!=='undefined')module.exports=F;
})(typeof window!=='undefined'?window:globalThis);
