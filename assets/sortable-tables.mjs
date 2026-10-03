export function enableTableSorting(root=document){
  const collator=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-column-sort]');if(!button)return;
    const table=button.closest('table'),index=Number(button.dataset.columnSort),header=button.closest('th');
    const direction=header.getAttribute('aria-sort')==='ascending'?-1:1;
    const value=cell=>{if(cell.dataset.sortValue!=null)return cell.dataset.sortValue;const copy=cell.cloneNode(true);copy.querySelectorAll('small').forEach(n=>n.remove());return copy.textContent.trim();};
    const compare=(a,b)=>{const av=value(a.cells[index]),bv=value(b.cells[index]);if(av==='—'||av==='')return bv==='—'||bv===''?0:1;if(bv==='—'||bv==='')return-1;
      const numeric=s=>/^[-+]?\d[\d,]*(\.\d+)?[%*]?$/.test(s)?Number(s.replace(/[,％%*]/g,'')):null;
      const an=numeric(av),bn=numeric(bv);return direction*(an!=null&&bn!=null?an-bn:collator.compare(av,bv));};
    const rows=[...table.tBodies[0].rows];if(rows[0]?.cells.length!==table.tHead.rows[0].cells.length)return;
    rows.sort(compare).forEach(row=>table.tBodies[0].append(row));
    table.querySelectorAll('th').forEach(th=>{th.removeAttribute('aria-sort');const b=th.querySelector('[data-column-sort]');if(b)b.textContent=b.dataset.label;});
    header.setAttribute('aria-sort',direction===1?'ascending':'descending');button.textContent=button.dataset.label+(direction===1?' ↑':' ↓');
  });
}
export function sortableHeader(label,index){return `<button data-column-sort="${index}" data-label="${label}" title="Sort by ${label}">${label} ↕</button>`;}
