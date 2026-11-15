'use strict';
(function(root){
 const L={
  diagnose(q,value){
   if(q.type!=='number'||!Number.isFinite(value))return '';
   const tolerance=Math.max(q.tolerance||0,.011);
   if(Math.abs(value-q.answer)<=tolerance)return '';
   const found=q.guide?.errors?.find(e=>Number.isFinite(e.value)&&Math.abs(value-e.value)<=tolerance);
   if(found)return found.message;
   if(q.unit==='%'&&q.answer!==0){
    if(Math.abs(value-q.answer/100)<=Math.max(0.00001,(q.tolerance||.005)/100))return 'Ce nombre correspond au taux décimal. La case attend un pourcentage : multipliez le taux décimal par 100. Par exemple, 0,06 s’écrit 6 dans une case en %.';
    if(Math.abs(value-q.answer*100)<=Math.max(.01,(q.tolerance||.005)*100))return 'Ce résultat correspond à une conversion en pourcentage supplémentaire. Convertissez le taux décimal en % une seule fois.';
   }
   return '';
  },
  essentialIds:m=>m.essential.flatMap(x=>x.questions),
  transferStatus(q,r){
   if(!q.transfer)return '';
   if(!r?.transferEvidence)return r?.tries||r?.ok?'Historique antérieur : les conditions du premier essai n’ont pas été mesurées.':'Essayez ce nouveau cas avant d’ouvrir un indice. Les aides restent disponibles.';
   if(!r.ok&&r.micro?.ok)return 'Micro-transfert réussi après remédiation ; le premier calcul reste à reprendre.';
   if(!r.ok&&!r.micro?.ok)return 'Nouveau cas en cours : utilisez le retour, puis réessayez.';
   return r.transferEvidence.firstCorrect&&!r.transferEvidence.helpBeforeFirst?'Calcul réussi au premier essai, sans indice ni calcul décomposé ouvert dans cette activité.':'Calcul réussi après une aide ou une reprise. Refaire plus tard sans aide permet de vérifier la méthode.';
  }
 };root.Learning=L;if(typeof module!=='undefined')module.exports=L;
})(typeof window!=='undefined'?window:globalThis);
