window.__qa = async function(){
  const out=[]; const scenes=[...document.querySelectorAll('.scene')];
  for(let i=0;i<scenes.length;i++){
    const s=scenes[i]; const dots=s.querySelectorAll('.dots > *'); s.querySelector('.fig').scrollIntoView({block:'center'});
    for (let k=0;k<dots.length;k++){ // visit each step so every state is checked
      dots[k].click(); await new Promise(r=>setTimeout(r,k==dots.length-1?5200:2600));
      const svg=s.querySelector('svg'); const sr=svg.getBoundingClientRect();
      const vis=el=>{let e=el;while(e&&e!==svg){const cs=getComputedStyle(e); if(+cs.opacity<0.4||cs.display==='none'||cs.visibility==='hidden')return false;e=e.parentNode;}return true;};
      const T=[...svg.querySelectorAll('text')].filter(vis).map(t=>{const r=t.getBoundingClientRect();return{r,txt:(t.textContent||'').trim().slice(0,28)}}).filter(o=>o.txt&&o.r.width>0);
      const issues=[];
      for(let a=0;a<T.length;a++){ const A=T[a].r; if(A.left<sr.left-2||A.right>sr.right+2||A.top<sr.top-2||A.bottom>sr.bottom+2) issues.push('OUT:'+T[a].txt);
        for(let b=a+1;b<T.length;b++){const B=T[b].r; const w=Math.min(A.right,B.right)-Math.max(A.left,B.left), h=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top); if(w>3&&h>3){const ar=w*h, mn=Math.min(A.width*A.height,B.width*B.height); if(ar/mn>0.18) issues.push(T[a].txt+' X '+T[b].txt);}}}
      if(issues.length) out.push(s.id+' step'+(k+1)+': '+[...new Set(issues)].slice(0,6).join(' | '));
    }
  }
  return out.length?out:'no overlaps';
};
'qa ready'
