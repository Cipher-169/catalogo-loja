import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getAdminCatalog, createCategory, updateCategory, deleteCategory, createProduct, updateProduct, deleteProduct, isImageFileInUse } from "./catalog-service.js";

const ADMIN_UIDS = ["nTFrJYgehtOYSPz6z8yMdOftQRn2", "MkBiNVj74keXFeJCFWDUwRJVxD22", "ofBu9ybOYION977yuvNTSXyFaw13"];
const IMAGE_MANAGER_UID = "nTFrJYgehtOYSPz6z8yMdOftQRn2";
// Preencha após publicar o Worker no Cloudflare. Não coloque segredos aqui.
const IMAGE_UPLOAD_ENDPOINT = "https://fotomania-image-upload.world-testaocenter790.workers.dev";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const $ = id => document.getElementById(id);
const loginView=$("login-view"), dashboardView=$("dashboard-view"), loginFeedback=$("login-feedback"), dashboardFeedback=$("dashboard-feedback");
let categories=[], products=[], localImagePreviewUrl="", customFields=[], productPriceTiers=[];
const message=(el,text)=>{el.textContent=text||"";};
const safe=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function showAdminConfirm(message,title="Confirmar ação"){
  return new Promise(resolve=>{const dialog=$("admin-dialog"),confirmButton=$("admin-dialog-confirm"),cancelButton=$("admin-dialog-cancel");$("admin-dialog-title").textContent=title;$("admin-dialog-message").textContent=message;dialog.hidden=false;const finish=value=>{dialog.hidden=true;confirmButton.removeEventListener("click",yes);cancelButton.removeEventListener("click",no);dialog.removeEventListener("click",outside);document.removeEventListener("keydown",escape);resolve(value);};const yes=()=>finish(true),no=()=>finish(false),outside=e=>{if(e.target===dialog)no();},escape=e=>{if(e.key==="Escape")no();};confirmButton.addEventListener("click",yes);cancelButton.addEventListener("click",no);dialog.addEventListener("click",outside);document.addEventListener("keydown",escape);confirmButton.focus();});
}

$("login-form").addEventListener("submit",async e=>{e.preventDefault();message(loginFeedback,"Entrando...");try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);}catch(error){message(loginFeedback,authError(error));}});
$("forgot-password").addEventListener("click",async()=>{const email=$("email").value.trim();if(!email){message(loginFeedback,"Informe seu e-mail para receber o link de recuperação.");return;}try{await sendPasswordResetEmail(auth,email);message(loginFeedback,"Se o endereço estiver cadastrado, você receberá o link de recuperação.");}catch(error){message(loginFeedback,authError(error));}});
$("logout").addEventListener("click",()=>signOut(auth));
onAuthStateChanged(auth,async user=>{
  if(!user){loginView.hidden=false;dashboardView.hidden=true;return;}
  if(!ADMIN_UIDS.includes(user.uid)){message(loginFeedback,"Esta conta não está autorizada a administrar a Fotomania.");await signOut(auth);return;}
  loginView.hidden=true;dashboardView.hidden=false;$("admin-email").textContent=user.email||"Administrador autenticado";
  $("image-library-panel").hidden = user.uid !== IMAGE_MANAGER_UID;
  await refresh();
  if(user.uid===IMAGE_MANAGER_UID)await loadImageLibrary({reset:true});
});

// Biblioteca do ImageKit: acesso efetivo também validado pelo Cloudflare Worker.
let imageLibraryFiles = [];
let imageLibrarySkip = 0;
const IMAGE_LIBRARY_LIMIT = 100;
let imageLibraryHasNext = false;

function formatImageSize(bytes){
  const value=Number(bytes)||0;
  if(value<1024)return `${value} B`;
  if(value<1024*1024)return `${(value/1024).toFixed(1)} KB`;
  return `${(value/(1024*1024)).toFixed(1)} MB`;
}
function formatImageDate(value){
  if(!value)return "Data não informada";
  const date=new Date(value);
  return Number.isNaN(date.getTime())?"Data não informada":date.toLocaleDateString("pt-BR");
}
function renderImageLibrary(){
  const search=$("image-library-search").value.trim().toLocaleLowerCase("pt-BR");
  const usage=$("image-library-usage").value;
  const linkedIds=new Set(products.map(product=>product.imageFileId).filter(Boolean));
  const filtered=imageLibraryFiles.filter(file=>{
    const used=linkedIds.has(file.fileId);
    const matchesUsage=usage==="all"||(usage==="used"&&used)||(usage==="unused"&&!used);
    return matchesUsage&&String(file.name||"").toLocaleLowerCase("pt-BR").includes(search);
  });
  $("image-library-grid").innerHTML=filtered.map(file=>{
    const used=linkedIds.has(file.fileId);
    const imageUrl=file.thumbnail||file.url;
    return `<article class="image-library-card">
      <a class="image-library-preview" href="${safe(file.url||imageUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir imagem ${safe(file.name)}">
        <img src="${safe(imageUrl)}" alt="${safe(file.name)}" loading="lazy">
      </a>
      <div class="image-library-card-info"><strong title="${safe(file.name)}">${safe(file.name||"Arquivo sem nome")}</strong>
      <small>${formatImageSize(file.size)} · ${formatImageDate(file.createdAt)}</small>
      <span class="image-library-link-state ${used?"is-used":"is-unused"}">${used?"Vinculada a produto":"Sem vínculo com produto"}</span>
      <small class="image-library-file-id">ID: ${safe(file.fileId||"não informado")}</small></div>
    </article>`;
  }).join("")||'<p class="image-library-empty">Nenhuma imagem corresponde aos filtros desta página.</p>';
  $("image-library-page").textContent=`Página ${Math.floor(imageLibrarySkip/IMAGE_LIBRARY_LIMIT)+1}`;
  $("image-library-prev").disabled=imageLibrarySkip===0;
  $("image-library-next").disabled=!imageLibraryHasNext;
}
async function loadImageLibrary({reset=false}={}){
  if(auth.currentUser?.uid!==IMAGE_MANAGER_UID)return;
  if(reset)imageLibrarySkip=0;
  const status=$("image-library-status");
  $("image-library-refresh").disabled=true;
  $("image-library-prev").disabled=true;
  $("image-library-next").disabled=true;
  message(status,"Carregando arquivos do ImageKit...");
  try{
    const token=await auth.currentUser.getIdToken();
    const response=await fetch(IMAGE_UPLOAD_ENDPOINT,{
      method:"POST",
      headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({action:"list",path:"/fotomania/produtos",limit:IMAGE_LIBRARY_LIMIT,skip:imageLibrarySkip})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||`Falha ao consultar a biblioteca (HTTP ${response.status}).`);
    imageLibraryFiles=Array.isArray(result.files)?result.files:[];
    imageLibraryHasNext=imageLibraryFiles.length===IMAGE_LIBRARY_LIMIT;
    renderImageLibrary();
    message(status,`${imageLibraryFiles.length} arquivo(s) carregado(s) nesta página. A pesquisa e o filtro consideram a página atual.`);
  }catch(error){
    imageLibraryFiles=[];renderImageLibrary();
    message(status,error.message||"Não foi possível carregar a biblioteca.");
  }finally{$("image-library-refresh").disabled=false;}
}
$("image-library-refresh").addEventListener("click",()=>loadImageLibrary({reset:true}));
$("image-library-search").addEventListener("input",renderImageLibrary);
$("image-library-usage").addEventListener("change",renderImageLibrary);
$("image-library-prev").addEventListener("click",()=>{if(imageLibrarySkip>=IMAGE_LIBRARY_LIMIT){imageLibrarySkip-=IMAGE_LIBRARY_LIMIT;loadImageLibrary();}});
$("image-library-next").addEventListener("click",()=>{if(imageLibraryHasNext){imageLibrarySkip+=IMAGE_LIBRARY_LIMIT;loadImageLibrary();}});

function authError(error){if(error.code==="auth/invalid-credential"||error.code==="auth/wrong-password")return"E-mail ou senha incorretos.";if(error.code==="auth/too-many-requests")return"Muitas tentativas. Aguarde um pouco e tente novamente.";return error.message||"Não foi possível concluir a operação.";}
async function refresh(){try{const data=await getAdminCatalog();categories=data.categories;products=data.products;renderLists();message(dashboardFeedback,"");}catch(error){message(dashboardFeedback,"Falha ao carregar dados. Confira as regras do Firestore e a conexão: "+error.message);}}
function renderLists(){
  $("category-list").innerHTML=categories.map(c=>`<div class="record"><div><strong>${safe(c.name)}</strong><small>${c.published?"Publicada":"Oculta"} · ordem ${Number(c.order)||0}</small></div><div class="record-actions"><button data-edit-category="${c.id}">Editar</button><button class="delete" data-delete-category="${c.id}">Excluir</button></div></div>`).join("")||"<p class='status'>Nenhuma categoria cadastrada.</p>";
  $("product-category").innerHTML='<option value="">Selecione</option>'+categories.map(c=>`<option value="${safe(c.name)}">${safe(c.name)}</option>`).join("");
  const listFilter=$("product-list-category");
  const selectedFilter=listFilter.value;
  listFilter.innerHTML='<option value="">Todas as categorias</option>'+categories.map(c=>`<option value="${safe(c.name)}">${safe(c.name)}</option>`).join("");
  if(categories.some(c=>c.name===selectedFilter))listFilter.value=selectedFilter;
  renderProductList();
  document.querySelectorAll("[data-edit-category]").forEach(b=>b.onclick=()=>editCategory(b.dataset.editCategory));
  document.querySelectorAll("[data-delete-category]").forEach(b=>b.onclick=()=>removeCategory(b.dataset.deleteCategory));
  document.querySelectorAll("[data-edit-product]").forEach(b=>b.onclick=()=>editProduct(b.dataset.editProduct));
  document.querySelectorAll("[data-delete-product]").forEach(b=>b.onclick=()=>removeProduct(b.dataset.deleteProduct));
}
function renderProductList(){
  const selected=$("product-list-category").value;
  const filtered=selected?products.filter(p=>String(p.category||"")===selected):products;
  $("product-list-count").textContent=`${filtered.length} ${filtered.length===1?"produto":"produtos"}`;
  $("product-list").innerHTML=filtered.map(p=>`<div class="record"><div><strong>${safe(p.name)}</strong><small>${safe(p.category)} · ${p.published?"Publicado":"Oculto"}${p.featured?" · Destaque":""}</small></div><div class="record-actions"><button data-edit-product="${p.id}">Editar</button><button class="delete" data-delete-product="${p.id}">Excluir</button></div></div>`).join("")||"<p class='status'>Nenhum produto encontrado nesta categoria.</p>";
  document.querySelectorAll("[data-edit-product]").forEach(b=>b.onclick=()=>editProduct(b.dataset.editProduct));
  document.querySelectorAll("[data-delete-product]").forEach(b=>b.onclick=()=>removeProduct(b.dataset.deleteProduct));
}
$("product-list-category").addEventListener("change",renderProductList);
function resetCategory(){$("category-form").reset();$("category-id").value="";$("category-order").value=categories.length;$("category-published").checked=true;}
function resetProduct(){
  $("product-form").reset();$("product-id").value="";$("product-order").value=products.length;$("product-published").checked=true;$("product-variants").value="";customFields=[];productPriceTiers=[];renderCustomFields();renderProductPriceTiers();toggleCustomFields();
  $("product-image-file-id").value="";$("product-image-file").value="";setImagePreview("");message($("product-image-status"),"");
}
function legacyFields(product){
  if(Array.isArray(product.customFields)&&product.customFields.length)return product.customFields;
  if(product.type==="photo")return [{label:"Qual tamanho você deseja?",type:"select",required:true,options:["10 × 15 cm","13 × 18 cm","20 × 25 cm","20 × 30 cm","Outro tamanho"].map(label=>({label}))},{label:"Se escolheu outro tamanho, informe as dimensões",type:"text",required:false,placeholder:"Ex.: 15 × 21 cm"}];
  if(product.type==="mug")return [{label:"Como deseja personalizar?",type:"buttons",required:true,options:[{label:"Vou enviar minha arte"},{label:"Quero ajuda com a arte"}]}];
  if(product.type==="shirt")return [{label:"Qual tamanho você deseja?",type:"select",required:true,options:(product.variants||[]).map(v=>({label:v.label||v.value,price:v.price??null}))}];
  return [];
}
function toggleCustomFields(){const visible=$("product-type").value==="custom";$("custom-fields-editor").hidden=!visible;}
function renderCustomFields(){
  const root=$("custom-fields-list");if(!root)return;
  root.innerHTML=customFields.map((field,index)=>`<div class="custom-field-card" data-field-index="${index}"><div class="custom-field-top"><strong>Campo ${index+1}</strong><button type="button" class="text-button" data-remove-field="${index}">Remover</button></div><label>Título da pergunta<input data-field-label="${index}" value="${safe(field.label||"")}" placeholder="Ex.: Qual tamanho você deseja?"></label><div class="form-row"><label>Formato<select data-field-type="${index}"><option value="buttons" ${field.type==="buttons"?"selected":""}>Botões</option><option value="select" ${field.type==="select"?"selected":""}>Lista suspensa</option><option value="text" ${field.type==="text"?"selected":""}>Texto livre</option></select></label><label class="check-label"><input type="checkbox" data-field-required="${index}" ${field.required?"checked":""}> Obrigatório</label></div>${field.type==="text"?`<label>Texto de exemplo<input data-field-placeholder="${index}" value="${safe(field.placeholder||"")}" placeholder="Ex.: Informe as dimensões"></label>`:`<div class="custom-options"><strong>Opções</strong>${(field.options||[]).map((option,oi)=>`<div class="custom-option-card"><div class="custom-option-row"><input data-option-label="${index}:${oi}" value="${safe(option.label||"")}" placeholder="Texto da opção"><input data-option-price="${index}:${oi}" type="number" min="0" step="0.01" value="${option.price??""}" placeholder="Preço fixo (opcional)"><button type="button" class="text-button" data-remove-option="${index}:${oi}" aria-label="Remover opção">×</button></div></div>`).join("")}<button type="button" class="text-button" data-add-option="${index}">+ Adicionar opção</button></div>`}</div>`).join("")||'<p class="image-help">Nenhum campo adicionado. Clique em “Adicionar campo” para começar.</p>';
  root.querySelectorAll("[data-remove-field]").forEach(b=>b.onclick=()=>{customFields.splice(Number(b.dataset.removeField),1);renderCustomFields();});
  root.querySelectorAll("[data-add-option]").forEach(b=>b.onclick=()=>{customFields[Number(b.dataset.addOption)].options.push({label:"",price:null});renderCustomFields();});
  root.querySelectorAll("[data-remove-option]").forEach(b=>b.onclick=()=>{const [fi,oi]=b.dataset.removeOption.split(":").map(Number);customFields[fi].options.splice(oi,1);renderCustomFields();});
  root.querySelectorAll("[data-field-label]").forEach(i=>i.oninput=()=>customFields[Number(i.dataset.fieldLabel)].label=i.value);
  root.querySelectorAll("[data-field-type]").forEach(i=>i.onchange=()=>{const f=customFields[Number(i.dataset.fieldType)];f.type=i.value;if(f.type!=="text"&&!Array.isArray(f.options))f.options=[];renderCustomFields();});
  root.querySelectorAll("[data-field-required]").forEach(i=>i.onchange=()=>customFields[Number(i.dataset.fieldRequired)].required=i.checked);
  root.querySelectorAll("[data-field-placeholder]").forEach(i=>i.oninput=()=>customFields[Number(i.dataset.fieldPlaceholder)].placeholder=i.value);
  root.querySelectorAll("[data-option-label]").forEach(i=>i.oninput=()=>{const [fi,oi]=i.dataset.optionLabel.split(":").map(Number);customFields[fi].options[oi].label=i.value;});
  root.querySelectorAll("[data-option-price]").forEach(i=>i.oninput=()=>{const [fi,oi]=i.dataset.optionPrice.split(":").map(Number);customFields[fi].options[oi].price=i.value===""?null:Number(i.value);});
}
function renderProductPriceTiers(){
  const root=$("product-price-tiers-list");if(!root)return;
  root.innerHTML=productPriceTiers.map((tier,index)=>`<div class="tier-row"><label>A partir de<input data-product-tier-min="${index}" type="number" min="1" step="1" value="${tier.min??1}"></label><label>Preço unitário (R$)<input data-product-tier-price="${index}" type="number" min="0" step="0.01" value="${tier.price??""}" placeholder="0,00"></label><button type="button" class="text-button" data-remove-product-tier="${index}" aria-label="Remover faixa">×</button></div>`).join("")||'<p class="image-help">Nenhuma faixa cadastrada. O produto utilizará o preço fixo informado acima.</p>';
  root.querySelectorAll("[data-product-tier-min]").forEach(input=>input.oninput=()=>productPriceTiers[Number(input.dataset.productTierMin)].min=Math.max(1,Number(input.value)||1));
  root.querySelectorAll("[data-product-tier-price]").forEach(input=>input.oninput=()=>productPriceTiers[Number(input.dataset.productTierPrice)].price=input.value===""?null:Number(input.value));
  root.querySelectorAll("[data-remove-product-tier]").forEach(button=>button.onclick=()=>{productPriceTiers.splice(Number(button.dataset.removeProductTier),1);renderProductPriceTiers();});
}
$("add-product-price-tier").addEventListener("click",()=>{const next=productPriceTiers.length?Math.max(...productPriceTiers.map(t=>Number(t.min)||1))+1:1;productPriceTiers.push({min:next,price:null});renderProductPriceTiers();});
$("product-type").addEventListener("change",toggleCustomFields);
$("add-custom-field").addEventListener("click",()=>{customFields.push({label:"",type:"buttons",required:false,options:[{label:""}]});renderCustomFields();});

function editCategory(id){const c=categories.find(x=>x.id===id);if(!c)return;$("category-id").value=id;$("category-name").value=c.name||"";$("category-description").value=c.description||"";$("category-order").value=c.order??0;$("category-published").checked=c.published===true;$("category-name").focus();}
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;$("product-id").value=id;$("product-name").value=p.name||"";$("product-category").value=p.category||"";$("product-description").value=p.description||"";$("product-details").value=p.details||"";$("product-price").value=p.price??"";$("product-type").value=(p.type==="simple"?"simple":"custom");customFields=legacyFields(p).map(field=>({...field,options:(field.options||[]).map(option=>({...option}))}));productPriceTiers=Array.isArray(p.priceTiers)?p.priceTiers.map(tier=>({...tier})):[];renderProductPriceTiers();renderCustomFields();toggleCustomFields();$("product-image").value=p.image||"";$("product-image-file-id").value=p.imageFileId||"";setImagePreview(p.image||"");$("product-image-file").value="";message($("product-image-status"),"");$("product-tag").value=p.tag||"";$("product-variants").value="";$("product-order").value=p.order??0;$("product-featured").checked=p.featured===true;$("product-published").checked=p.published===true;$("product-name").focus();}

function setImagePreview(url){
  if(localImagePreviewUrl && url!==localImagePreviewUrl){URL.revokeObjectURL(localImagePreviewUrl);localImagePreviewUrl="";}
  const wrap=$("product-image-preview-wrap"),preview=$("product-image-preview");
  if(!url){preview.removeAttribute("src");wrap.hidden=true;return;}
  preview.src=url;wrap.hidden=false;
}

$("product-image-file").addEventListener("change",e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  if(!ALLOWED_IMAGE_TYPES.includes(file.type)){e.target.value="";message($("product-image-status"),"Formato não permitido. Use JPG, PNG, WEBP ou GIF.");return;}
  if(file.size>MAX_IMAGE_SIZE){e.target.value="";message($("product-image-status"),"A imagem ultrapassa o limite de 10 MB.");return;}
  if(localImagePreviewUrl)URL.revokeObjectURL(localImagePreviewUrl);
  localImagePreviewUrl=URL.createObjectURL(file);setImagePreview(localImagePreviewUrl);
  message($("product-image-status"),"Pré-visualização local. Clique em Enviar imagem para armazená-la no ImageKit.");
});
$("product-image").addEventListener("input",e=>setImagePreview(e.target.value.trim()));
$("product-image-preview").addEventListener("error",()=>{
  $("product-image-preview-wrap").hidden=true;
  message($("product-image-status"),"Não foi possível carregar a pré-visualização desta imagem.");
});
$("remove-product-image").addEventListener("click",()=>{
  $("product-image").value="";$("product-image-file-id").value="";$("product-image-file").value="";
  setImagePreview("");message($("product-image-status"),"Imagem removida do formulário. Salve o produto para confirmar.");
});
$("upload-product-image").addEventListener("click",async()=>{
  const file=$("product-image-file").files?.[0];
  if(!file){message($("product-image-status"),"Selecione uma imagem antes de enviar.");return;}
  if(!ALLOWED_IMAGE_TYPES.includes(file.type)){message($("product-image-status"),"Formato não permitido. Use JPG, PNG, WEBP ou GIF.");return;}
  if(file.size>MAX_IMAGE_SIZE){message($("product-image-status"),"A imagem ultrapassa o limite de 10 MB.");return;}
  if(!IMAGE_UPLOAD_ENDPOINT){message($("product-image-status"),"O serviço de upload ainda precisa ser publicado no Cloudflare e configurado no admin.js.");return;}
  const button=$("upload-product-image");button.disabled=true;message($("product-image-status"),"Enviando imagem...");
  try{
    const user=auth.currentUser;
    if(!user)throw new Error("Sua sessão expirou. Entre novamente no painel.");
    const token=await user.getIdToken();
    const body=new FormData();body.append("file",file);body.append("fileName",file.name);
    const response=await fetch(IMAGE_UPLOAD_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${token}`},body});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||`Falha no envio (HTTP ${response.status}).`);
    if(!result.url)throw new Error("O serviço não retornou a URL da imagem.");
    $("product-image").value=result.url;$("product-image-file-id").value=result.fileId||"";
    setImagePreview(result.url);message($("product-image-status"),"Imagem enviada. Salve o produto para publicar a alteração.");
  }catch(error){message($("product-image-status"),error.message||"Não foi possível enviar a imagem.");}
  finally{button.disabled=false;}
});

$("category-form").addEventListener("submit",async e=>{e.preventDefault();const id=$("category-id").value;const data={name:$("category-name").value.trim(),description:$("category-description").value.trim(),order:Number($("category-order").value)||0,published:$("category-published").checked};try{if(id)await updateCategory(id,data);else await createCategory(data);resetCategory();await refresh();message(dashboardFeedback,"Categoria salva.");}catch(error){message(dashboardFeedback,"Não foi possível salvar a categoria: "+error.message);}});
$("product-form").addEventListener("submit",async e=>{e.preventDefault();const id=$("product-id").value;const type=$("product-type").value;for(const tier of productPriceTiers){if(!Number.isInteger(Number(tier.min))||Number(tier.min)<1||tier.price==null||!Number.isFinite(Number(tier.price))||Number(tier.price)<0){message(dashboardFeedback,"Revise as faixas de preço progressivo. Informe uma quantidade inicial e um preço unitário válido em cada faixa.");return;}}if(new Set(productPriceTiers.map(t=>Number(t.min))).size!==productPriceTiers.length){message(dashboardFeedback,"Existem faixas de quantidade repetidas no preço progressivo.");return;}if(productPriceTiers.length&&Math.min(...productPriceTiers.map(t=>Number(t.min)))!==1){message(dashboardFeedback,"A primeira faixa do preço progressivo precisa começar em 1 unidade.");return;}if(type==="custom"){for(let i=0;i<customFields.length;i++){const field=customFields[i];if(!field.label.trim()){message(dashboardFeedback,`Informe o título do campo ${i+1}.`);return;}if(field.type!=="text"&&(!field.options.length||field.options.some(option=>!option.label.trim()))){message(dashboardFeedback,`Preencha todas as opções do campo “${field.label}”.`);return;}}}const rawPrice=$("product-price").value;const data={name:$("product-name").value.trim(),category:$("product-category").value,description:$("product-description").value.trim(),details:$("product-details").value.trim(),price:rawPrice===""?null:Number(rawPrice),priceTiers:productPriceTiers.map(tier=>({min:Number(tier.min),price:Number(tier.price)})),type,image:$("product-image").value.trim(),imageFileId:$("product-image-file-id").value.trim()||null,tag:$("product-tag").value.trim()||"FOTOMANIA",customFields:type==="custom"?customFields.map(field=>({...field,options:(field.options||[]).map(option=>({...option}))})):[],variants:[],order:Number($("product-order").value)||0,featured:$("product-featured").checked,published:$("product-published").checked};try{if(id)await updateProduct(id,data);else await createProduct(data);resetProduct();await refresh();message(dashboardFeedback,"Produto salvo.");}catch(error){message(dashboardFeedback,"Não foi possível salvar o produto: "+error.message);}});
async function removeCategory(id){const c=categories.find(x=>x.id===id);if(!c||!await showAdminConfirm(`Excluir a categoria “${c.name}”? Produtos vinculados não serão excluídos automaticamente.`,"Excluir categoria?"))return;try{await deleteCategory(id);await refresh();message(dashboardFeedback,"Categoria excluída.");}catch(error){message(dashboardFeedback,error.message);}}
async function removeProduct(id){
  const p=products.find(x=>x.id===id);
  if(!p||!await showAdminConfirm(`Excluir o produto “${p.name}”?${p.imageFileId?" A imagem será removida do ImageKit se nenhum outro produto a utilizar.":""}`,"Excluir produto?"))return;
  try{
    // Primeiro remove o registro. Em seguida, verifica se a imagem ainda está em uso.
    await deleteProduct(id);
    await refresh();
    if(p.imageFileId){
      const stillInUse=await isImageFileInUse(p.imageFileId);
      if(!stillInUse){
        try{
          const user=auth.currentUser;
          if(!user)throw new Error("Sessão expirada. Entre novamente para concluir a remoção da imagem.");
          const token=await user.getIdToken();
          const response=await fetch(IMAGE_UPLOAD_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action:"delete",fileId:p.imageFileId})});
          const result=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(result.error||`Falha ao excluir a imagem (HTTP ${response.status}).`);
          message(dashboardFeedback,result.alreadyMissing?"Produto excluído. A imagem já não existia no ImageKit.":"Produto e imagem excluídos com sucesso.");
          return;
        }catch(imageError){
          message(dashboardFeedback,`Produto excluído, mas não foi possível remover a imagem do ImageKit: ${imageError.message} Código do arquivo: ${p.imageFileId}`);
          return;
        }
      }
      message(dashboardFeedback,"Produto excluído. A imagem foi preservada porque ainda está sendo utilizada por outro produto.");
      return;
    }
    message(dashboardFeedback,"Produto excluído. Não havia um arquivo do ImageKit associado para remover.");
  }catch(error){message(dashboardFeedback,error.message||"Não foi possível excluir o produto.");}
}
$("category-cancel").addEventListener("click",resetCategory);$("product-cancel").addEventListener("click",resetProduct);
resetCategory();resetProduct();

// Textareas do painel: crescem conforme o conteúdo, sem perder o redimensionamento manual.
function fitAdminTextarea(textarea){
 if(!textarea || textarea.hidden || textarea.type==="hidden")return;
 textarea.style.height="auto";
 textarea.style.height=`${Math.max(textarea.scrollHeight, textarea.dataset.minHeight ? Number(textarea.dataset.minHeight) : 0)}px`;
}
function setupAdminTextareas(){
 document.querySelectorAll("textarea").forEach(textarea=>{
  if(textarea.type==="hidden" || textarea.hidden)return;
  const computed=getComputedStyle(textarea);
  textarea.dataset.minHeight=String(parseFloat(computed.minHeight)||0);
  fitAdminTextarea(textarea);
  textarea.addEventListener("input",()=>fitAdminTextarea(textarea));
 });
}
setupAdminTextareas();

