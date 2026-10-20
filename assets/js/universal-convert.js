const $ = id => document.getElementById(id);
const mode = document.body.dataset.mode;
const fileInput = $('files'), status = $('status'), result = $('result');
const say = (s, kind='error') => { status.textContent=s; status.className='status '+kind; status.hidden=!s; };
const read = f => new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read '+f.name));r.readAsArrayBuffer(f);});
const safe = s => s.replace(/[^\w.-]+/g,'_').replace(/^_+|_+$/g,'') || 'converted';
const download = (blob,name) => { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1500); };
let output=[];
async function pdfLib(){ if(window.PDFLib)return window.PDFLib; await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='../../assets/js/vendor/pdf-lib.min.js';s.onload=resolve;s.onerror=()=>reject(Error('PDF library failed to load. Serve the website over HTTP.'));document.head.append(s)}); return window.PDFLib; }
async function pdfjs(){ return import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs'); }
async function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Could not load the document converter. Check your internet connection.'));document.head.append(s)});}
async function docxText(file){await loadScript('https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js');if(!window.mammoth)throw Error('Word converter did not load.');const r=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});return r.value;}
async function toPdf(){
 const files=[...fileInput.files]; if(!files.length) throw Error('Choose one or more files first.');
 const lib=await pdfLib(), doc=await lib.PDFDocument.create(); let added=0;
 for(const f of files){ const ext=f.name.split('.').pop().toLowerCase(), buf=await read(f), bytes=new Uint8Array(buf);
  if(['jpg','jpeg','png'].includes(ext)||/^image\/(jpeg|png)$/.test(f.type)){
   let im; try{im=ext==='png'||f.type==='image/png'?await doc.embedPng(bytes):await doc.embedJpg(bytes)}catch{const bmp=await createImageBitmap(f);const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;c.getContext('2d').drawImage(bmp,0,0);const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));im=await doc.embedJpg(new Uint8Array(await b.arrayBuffer()));bmp.close();}
   const page=doc.addPage([im.width,im.height]);page.drawImage(im,{x:0,y:0,width:im.width,height:im.height}); added++;
  } else if(/^image\//.test(f.type)||['webp','gif','bmp','avif'].includes(ext)){
   const bmp=await createImageBitmap(f),c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;c.getContext('2d').drawImage(bmp,0,0);bmp.close();const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error(f.name+': unsupported image format.');const im=await doc.embedPng(new Uint8Array(await blob.arrayBuffer()));const p=doc.addPage([im.width,im.height]);p.drawImage(im,{x:0,y:0,width:im.width,height:im.height});added++;
  } else if(ext==='docx' || f.type==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
   const text=await docxText(f); if(!text.trim()) throw Error(f.name+': no readable text was found in this Word document.'); const font=await doc.embedFont(lib.StandardFonts.Helvetica), size=10, margin=42, lineH=14, width=510, lines=[]; for(const raw of text.replace(/\r/g,'').split('\n')){let line='';for(const word of raw.split(/\s+/)){const test=line?line+' '+word:word;if(font.widthOfTextAtSize(test,size)>width&&line){lines.push(line);line=word}else line=test}lines.push(line)}let page,y=0;for(const line of lines){if(!page||y<margin){page=doc.addPage([595.28,841.89]);y=800}page.drawText(line.slice(0,180),{x:margin,y,size,font,maxWidth:510});y-=lineH}added++;
  } else if(['txt','csv','md','html','htm','json','xml','log','srt'].includes(ext)||f.type.startsWith('text/')){
   const rawText=new TextDecoder().decode(bytes).replace(/\r/g,''); const text=['html','htm'].includes(ext)?new DOMParser().parseFromString(rawText,'text/html').body.innerText:rawText; const font=await doc.embedFont(lib.StandardFonts.Helvetica), size=10, margin=42, lineH=14, width=510; const lines=[];
   for(const raw of text.split('\n')){let line='';for(const word of raw.split(/\s+/)){const test=line?line+' '+word:word;if(font.widthOfTextAtSize(test,size)>width&&line){lines.push(line);line=word;}else line=test;}lines.push(line);}
   let page; let y=0; for(const line of lines){if(!page||y<margin){page=doc.addPage([595.28,841.89]);y=800;}page.drawText(line.slice(0,180),{x:margin,y,size,font,maxWidth:510});y-=lineH;} added++;
  } else throw Error(`${f.name}: unsupported format. Supported: JPG, PNG, WebP, GIF, BMP, AVIF, DOCX, TXT, CSV, MD, HTML, JSON, XML, LOG and SRT. Legacy DOC, XLSX, PPTX and arbitrary binary formats need a dedicated converter or export from their original app.`);
 }
 if(!added)throw Error('No supported files found.'); const bytes=await doc.save();output=[{blob:new Blob([bytes],{type:'application/pdf'}),name:'converted-files.pdf'}];
}
async function fromPdf(){
 const files=[...fileInput.files];if(files.length!==1)throw Error('Choose one PDF file.');const f=files[0];if(!f.name.toLowerCase().endsWith('.pdf')&&f.type!=='application/pdf')throw Error('Choose a PDF file.');
 const format=$('format').value, pdfjsLib=await pdfjs();pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await read(f))}).promise;
 output=[];
 if(format==='txt') {let all=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),c=await page.getTextContent();all.push(`--- Page ${i} ---\n`+c.items.map(x=>x.str).join(' '));}output=[{blob:new Blob([all.join('\n\n')],{type:'text/plain;charset=utf-8'}),name:safe(f.name.replace(/\.pdf$/i,''))+'.txt'}];}
 else if(format==='docx') {let pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),c=await page.getTextContent();pages.push(c.items.map(x=>x.str).join(' '));}if(!pages.join('').trim())throw Error('No selectable text found. Scanned PDFs require OCR, which is not included.');await loadScript('https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js');const D=window.docx;if(!D?.Document||!D?.Packer)throw Error('Word document library unavailable.');const children=[];pages.forEach((txt,i)=>{if(i)children.push(new D.Paragraph({children:[],pageBreakBefore:true}));for(const line of txt.split(/\n/))children.push(new D.Paragraph({children:[new D.TextRun(line)]}));});const d=new D.Document({sections:[{properties:{},children}]});output=[{blob:await D.Packer.toBlob(d),name:safe(f.name.replace(/\.pdf$/i,''))+'.docx'}];}
 else {for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.7}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const blob=await new Promise(r=>canvas.toBlob(r,format==='jpg'?'image/jpeg':'image/png',.92));output.push({blob,name:`${safe(f.name.replace(/\.pdf$/i,''))}-page-${String(i).padStart(3,'0')}.${format}`});}}
}
$('convert').addEventListener('click',async()=>{say('');result.replaceChildren();$('convert').disabled=true;try{await (mode==='to-pdf'?toPdf():fromPdf());if(!output.length)throw Error('No output was created.');result.textContent=`Ready: ${output.length} file${output.length===1?'':'s'}.`;output.forEach(o=>{const b=document.createElement('button');b.type='button';b.textContent='Download '+o.name;b.addEventListener('click',()=>download(o.blob,o.name));result.append(b);});if(output.length===1)download(output[0].blob,output[0].name);say('Conversion complete. Files are processed in your browser.','success');}catch(e){say(e.message||'Conversion failed.');}finally{$('convert').disabled=false;}});
$('reset').addEventListener('click',()=>{fileInput.value='';output=[];result.replaceChildren();say('');});
fileInput.addEventListener('change',()=>{result.replaceChildren();say(fileInput.files.length?`${fileInput.files.length} file(s) selected.`:'');});
