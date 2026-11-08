import { getPublicCatalog } from "./catalog-service.js";

// O Firestore é a fonte oficial do catálogo público.
let categories = [];
let products = [];
let catalogLoaded = false;

const homeView=document.querySelector("#home-view"),categoryView=document.querySelector("#category-view"),categoryGrid=document.querySelector("#category-grid"),featuredGrid=document.querySelector("#featured-grid"),productGrid=document.querySelector("#product-grid"),searchInput=document.querySelector("#search-input"),emptyState=document.querySelector("#empty-state"),productCount=document.querySelector("#product-count"),activeFilterLabel=document.querySelector("#active-filter-label"),clearFiltersButton=document.querySelector("#clear-filters");
const modal=document.querySelector("#product-modal"),modalContent=document.querySelector("#modal-content"),drawer=document.querySelector("#cart-drawer"),backdrop=document.querySelector("#ui-backdrop");
let activeCategory=null,searchTerm="",modalQuantity=1,selectedPhotoSize="10x15",selectedMugArt="own";
let cart=[];
try{const saved=JSON.parse(localStorage.getItem("fotomania-cart")||"[]");if(Array.isArray(saved))cart=saved;}catch(_){cart=[];}
const money=value=>value==null?"A confirmar":value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function slugify(value){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");}
function navigateToCategory(category){const url=new URL(location.href);url.searchParams.set("categoria",slugify(category));url.hash="";history.pushState({},"",url);renderRoute();scrollTo({top:0,behavior:"smooth"});}
function navigateHome(){const url=new URL(location.href);url.searchParams.delete("categoria");url.hash="";history.pushState({},"",url);renderRoute();scrollTo({top:0,behavior:"smooth"});}
function renderCategoryCards(){
  if(!catalogLoaded){categoryGrid.innerHTML='<p class="catalog-status">Carregando categorias…</p>';return;}
  if(!categories.length){categoryGrid.innerHTML='<p class="catalog-status">Nenhuma categoria disponível no momento.</p>';return;}
  categoryGrid.innerHTML=categories.map(category=>{
    const count=products.filter(product=>product.category===category.name).length;
    return `<a class="category-text-card" href="?categoria=${encodeURIComponent(slugify(category.name))}" data-category-link="${category.id}"><span class="category-card-name">${category.name}</span><span class="category-card-meta">${count} ${count===1?"produto":"produtos"}</span><span class="category-card-arrow" aria-hidden="true">↗</span></a>`;
  }).join("");
  categoryGrid.querySelectorAll("[data-category-link]").forEach(link=>link.addEventListener("click",event=>{
    event.preventDefault();const category=categories.find(item=>item.id===link.dataset.categoryLink);if(category)navigateToCategory(category.name);
  }));
}
function productCard(product){const startingPrice=getTierPrice(product,1);return `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"><span class="product-tag">${product.tag}</span></div><div class="product-info"><span class="product-category">${product.category}</span><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><div class="product-price">${money(startingPrice)}<small>${startingPrice==null?"Consulte opções e valores":""}</small></div><button class="product-more" type="button" data-product="${product.id}">Ver opções <span aria-hidden="true">↗</span></button></div></div></article>`;}
function attachImageFallbacks(root=document){root.querySelectorAll("img").forEach(img=>{if(img.dataset.fallbackReady)return;img.dataset.fallbackReady="true";const useFallback=()=>{if(img.closest(".cart-item")){const placeholder=document.createElement("div");placeholder.className="cart-item-image-placeholder";placeholder.setAttribute("aria-label","Imagem do produto indisponível");placeholder.textContent="Fotomania";img.replaceWith(placeholder);return;}if(img.classList.contains("modal-image")){const placeholder=document.createElement("div");placeholder.className="modal-image-placeholder";placeholder.setAttribute("aria-label","Imagem do produto indisponível");placeholder.textContent="Fotomania";img.replaceWith(placeholder);return;}img.classList.add("image-load-failed");if(img.parentElement)img.parentElement.classList.add("image-fallback");img.alt="";};if(!img.getAttribute("src")||!img.getAttribute("src").trim()||img.getAttribute("src").trim()==="undefined"||img.getAttribute("src").trim()==="null"){useFallback();return;}img.addEventListener("error",useFallback,{once:true});});}
// Delegação global: mantém o botão funcional mesmo quando os cards são recriados dinamicamente.
document.addEventListener("click",event=>{const button=event.target.closest("[data-product]");if(!button)return;event.preventDefault();openProductModal(button.dataset.product);});
// Delegação no contêiner persistente: o botão de adicionar continua funcional mesmo após recriar o conteúdo do modal.
modalContent.addEventListener("click",event=>{const button=event.target.closest("#modal-add");if(!button)return;event.preventDefault();const productId=modalContent.dataset.productId;const product=products.find(item=>String(item.id)===String(productId));if(product)addConfiguredProduct(product);});
function renderFeaturedProducts(){
  const featured=products.filter(product=>product.featured).slice(0,4);
  featuredGrid.innerHTML=featured.map(productCard).join("");
  if(catalogLoaded&&!featured.length)featuredGrid.innerHTML='<p class="catalog-status">Nenhum produto em destaque no momento.</p>';
  attachImageFallbacks(featuredGrid);
}
function renderCategoryProducts(){const filtered=products.filter(p=>{const text=`${p.name} ${p.category} ${p.description}`.toLocaleLowerCase("pt-BR");return p.category===activeCategory&&text.includes(searchTerm);});productGrid.innerHTML=filtered.map(productCard).join("");attachImageFallbacks(productGrid);productCount.textContent=`${filtered.length} ${filtered.length===1?"produto":"produtos"}`;activeFilterLabel.textContent=searchTerm?`Resultados em ${activeCategory}`:`Todos os produtos de ${activeCategory}`;clearFiltersButton.hidden=!searchTerm;emptyState.hidden=filtered.length!==0;productGrid.hidden=filtered.length===0;}
function renderRoute(){const slug=new URL(location.href).searchParams.get("categoria"),category=categories.find(item=>slugify(item.name)===slug);activeCategory=category?.name||null;searchTerm="";if(searchInput)searchInput.value="";const categoryPage=Boolean(activeCategory);homeView.hidden=categoryPage;categoryView.hidden=!categoryPage;document.body.classList.toggle("is-category-page",categoryPage);if(categoryPage){document.title=`${activeCategory} | Fotomania`;document.querySelector("#category-page-title").textContent=activeCategory;document.querySelector("#breadcrumb-category").textContent=activeCategory;document.querySelector("#category-description").textContent=`Confira os produtos disponíveis na categoria ${activeCategory}.`;renderCategoryProducts();}else document.title="Fotomania | Categorias e produtos";}
function showOverlay(which){backdrop.hidden=false;document.body.classList.add("overlay-open");modal.hidden=which!=="modal";drawer.hidden=which!=="cart";}
function closeOverlays(){modal.hidden=true;drawer.hidden=true;backdrop.hidden=true;document.body.classList.remove("overlay-open");}
function optionButtons(options,selected,name){return options.map(o=>`<button type="button" class="option-button ${o.value===selected?"selected":""}" data-option-group="${name}" data-option-value="${o.value}">${o.label}</button>`).join("");}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function getProductFields(product){
  if(Array.isArray(product.customFields)&&product.customFields.length)return product.customFields;
  // Compatibilidade: converte os formatos antigos para o configurador genérico.
  if(product.type==="photo")return [{label:"Qual tamanho você deseja?",type:"select",required:true,options:["10 × 15 cm","13 × 18 cm","20 × 25 cm","20 × 30 cm","Outro tamanho"].map(label=>({label}))},{label:"Informe as dimensões (se escolheu outro tamanho)",type:"text",required:false,placeholder:"Ex.: 15 × 21 cm"}];
  if(product.type==="mug")return [{label:"Como deseja personalizar?",type:"buttons",required:true,options:[{label:"Vou enviar minha arte"},{label:"Quero ajuda com a arte"}]}];
  if(product.type==="shirt")return [{label:"Qual tamanho você deseja?",type:"select",required:true,options:(product.variants||[]).map(v=>({label:v.label||v.value,price:v.price??null}))}];
  return [];
}
function getCartProductQuantity(productId){return cart.reduce((sum,item)=>sum+(String(item.productId)===String(productId)?Number(item.quantity)||0:0),0);}
function getTierPrice(product,quantity){
 const tiers=Array.isArray(product?.priceTiers)?product.priceTiers.filter(t=>Number(t.min)>=1&&Number.isFinite(Number(t.price))).sort((a,b)=>Number(a.min)-Number(b.min)):[];
 let chosen=null;for(const tier of tiers){if(quantity>=Number(tier.min))chosen=tier;else break;}
 return chosen?Number(chosen.price):product?.price!=null?Number(product.price):null;
}
function getConfiguredUnitPrice(product,quantity,selectedOption){
 const progressive=getTierPrice(product,quantity);
 if(Array.isArray(product?.priceTiers)&&product.priceTiers.length)return progressive;
 if(selectedOption?.price!=null)return Number(selectedOption.price);
 return progressive;
}
function updateModalPrice(product,fields){
 const pricingQuantity=getCartProductQuantity(product.id)+modalQuantity;let unitPrice=getTierPrice(product,pricingQuantity);
 for(let index=0;index<fields.length;index++){
  const select=modalContent.querySelector(`select[data-custom-field="${index}"]`);
  const selected=select?select.value?fields[index].options[Number(select.value)]:null:(modalContent.querySelector(`[data-custom-choice="${index}"].selected`)?fields[index].options[Number(modalContent.querySelector(`[data-custom-choice="${index}"].selected`).dataset.optionValue)]:null);
  if(selected){const price=getConfiguredUnitPrice(product,pricingQuantity,selected);if(price!=null)unitPrice=price;}
 }
 const priceNode=modalContent.querySelector(".modal-price");if(priceNode)priceNode.textContent=money(unitPrice)+(unitPrice!=null?` cada · ${money(unitPrice*modalQuantity)} no total`:"");
}
function openProductModal(id){
 const p=products.find(item=>String(item.id??"")===String(id??""));if(!p){console.warn("Produto não encontrado para abrir as opções:",id);return;}
 modalQuantity=1;const fields=getProductFields(p);let config="";
 if(fields.length)config=fields.map((field,index)=>{const required=field.required?" *":"";if(field.type==="text")return `<div class="config-group"><label for="custom-field-${index}">${escapeHtml(field.label)}${required}</label><input class="config-input" id="custom-field-${index}" data-custom-field="${index}" type="text" maxlength="240" placeholder="${escapeHtml(field.placeholder||"Digite sua resposta")}" ${field.required?"required":""}></div>`;const options=(field.options||[]).map((option,oi)=>({value:String(oi),label:option.label,price:option.price}));const controls=field.type==="select"?`<select class="config-select" data-custom-field="${index}"><option value="">Selecione uma opção</option>${options.map(o=>`<option value="${o.value}">${escapeHtml(o.label)}</option>`).join("")}</select>`:`<div class="option-list">${options.map(o=>`<button type="button" class="option-button" data-custom-choice="${index}" data-option-value="${o.value}">${escapeHtml(o.label)}</button>`).join("")}</div>`;return `<div class="config-group"><label>${escapeHtml(field.label)}${required}</label>${controls}</div>`;}).join("");
 else config=`<div class="config-group"><p class="config-hint">Produto sem opções adicionais.</p></div>`;
 modalContent.dataset.productId=String(p.id);
 modalContent.innerHTML=`<div class="modal-layout">${p.image?`<img class="modal-image" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">`:`<div class="modal-image-placeholder" aria-label="Imagem do produto indisponível">Fotomania</div>`}<div class="modal-copy"><span class="eyebrow"><i></i> ${escapeHtml(String(p.category||"Produto").toUpperCase())}</span><h2 id="modal-title">${escapeHtml(p.name)}</h2><p>${escapeHtml(p.details)}</p><div class="modal-price">${money(getTierPrice(p,getCartProductQuantity(p.id)+modalQuantity))}${getTierPrice(p,getCartProductQuantity(p.id)+modalQuantity)!=null?` cada · ${money(getTierPrice(p,getCartProductQuantity(p.id)+modalQuantity)*modalQuantity)} no total`:""}</div>${config}<div class="config-group"><label>Quantidade</label><div class="quantity-control"><button type="button" id="quantity-minus" aria-label="Diminuir quantidade">−</button><output id="modal-quantity">1</output><button type="button" id="quantity-plus" aria-label="Aumentar quantidade">+</button></div></div><button class="modal-add" id="modal-add" type="button">Adicionar à sacola</button></div></div>`;
 attachImageFallbacks(modalContent);
 modalContent.querySelectorAll("[data-custom-choice]").forEach(button=>button.addEventListener("click",()=>{const fieldIndex=button.dataset.customChoice;modalContent.querySelectorAll(`[data-custom-choice="${fieldIndex}"]`).forEach(item=>item.classList.remove("selected"));button.classList.add("selected");updateModalPrice(p,fields);}));
 modalContent.querySelectorAll("select[data-custom-field]").forEach(control=>control.addEventListener("change",()=>updateModalPrice(p,fields)));
 document.querySelector("#quantity-minus").addEventListener("click",()=>{modalQuantity=Math.max(1,modalQuantity-1);document.querySelector("#modal-quantity").textContent=modalQuantity;updateModalPrice(p,fields);});document.querySelector("#quantity-plus").addEventListener("click",()=>{modalQuantity=Math.min(99,modalQuantity+1);document.querySelector("#modal-quantity").textContent=modalQuantity;updateModalPrice(p,fields);});showOverlay("modal");document.querySelector("#modal-close").focus();
}
function addConfiguredProduct(p){
 if(!p||p.id==null){showNotice("Não foi possível identificar este produto. Feche e abra as opções novamente.","Não foi possível adicionar");return;}
 const fields=getProductFields(p),options={};let selectedOptionPrice=null;
 for(let index=0;index<fields.length;index++){const field=fields[index];let answer="",selectedOption=null;
  if(field.type==="text"){answer=modalContent.querySelector(`[data-custom-field="${index}"]`)?.value.trim()||"";if(field.required&&!answer){showNotice(`Preencha: ${field.label}`,"Campo obrigatório");return;}}
  else {const select=modalContent.querySelector(`select[data-custom-field="${index}"]`);if(select){if(!select.value&&field.required){showNotice(`Selecione: ${field.label}`,"Campo obrigatório");return;}if(select.value){selectedOption=field.options[Number(select.value)];answer=selectedOption?.label||"";}}
   else {const selected=modalContent.querySelector(`[data-custom-choice="${index}"].selected`);if(!selected&&field.required){showNotice(`Selecione: ${field.label}`,"Campo obrigatório");return;}if(selected){selectedOption=field.options[Number(selected.dataset.optionValue)];answer=selectedOption?.label||"";}}
  }
  if(answer){options[field.label]=answer;if(selectedOption?.price!=null)selectedOptionPrice=Number(selectedOption.price);}
 }
 const productTiers=Array.isArray(p.priceTiers)?p.priceTiers.map(t=>({min:Number(t.min),price:Number(t.price)})):[];
 const basePrice=productTiers.length?getTierPrice(p,modalQuantity):selectedOptionPrice??p.price;
 const key=JSON.stringify([p.id,options]);const existing=cart.find(item=>item.key===key);
 if(existing){existing.quantity=Math.min(99,existing.quantity+modalQuantity);existing.productPriceTiers=productTiers;existing.price=basePrice;}
 else cart.push({key,productId:p.id,name:p.name,image:p.image,quantity:modalQuantity,options,price:basePrice,productPriceTiers});
 persistCart();closeOverlays();openCart();
}
function persistCart(){try{localStorage.setItem("fotomania-cart",JSON.stringify(cart));}catch(_){}document.querySelector("#cart-count").textContent=cart.reduce((sum,item)=>sum+item.quantity,0);}
function renderCart(){
 const root=document.querySelector("#cart-items");
 const clearButton=document.querySelector("#clear-cart-button");
 if(!cart.length){root.innerHTML='<div class="cart-empty">Sua sacola ainda está vazia.<br>Explore as categorias e escolha seus produtos.</div>';document.querySelector("#checkout-button").disabled=true;clearButton.disabled=true;return;}
 document.querySelector("#checkout-button").disabled=false;clearButton.disabled=false;
 root.innerHTML=cart.map((item,index)=>`<article class="cart-item">${item.image&&String(item.image).trim()&&String(item.image).trim()!=="undefined"&&String(item.image).trim()!=="null"?`<img src="${escapeHtml(item.image)}" alt="">`:`<div class="cart-item-image-placeholder" aria-label="Imagem do produto indisponível">Fotomania</div>`}<div class="cart-item-details"><h3>${escapeHtml(item.name)}</h3><p>${Object.entries(item.options||{}).map(([key,value])=>`${escapeHtml(key)}: ${escapeHtml(value)}`).join(" · ")||"Produto simples"}</p><div class="cart-item-quantity"><span>Quantidade</span><div class="cart-quantity-control"><button type="button" data-cart-quantity="minus" data-cart-index="${index}" aria-label="Diminuir quantidade" ${item.quantity<=1?"disabled":""}>−</button><output aria-live="polite">${item.quantity}</output><button type="button" data-cart-quantity="plus" data-cart-index="${index}" aria-label="Aumentar quantidade" ${item.quantity>=99?"disabled":""}>+</button></div></div><strong>${money(getTierPrice({price:item.price,priceTiers:item.productPriceTiers},getCartProductQuantity(item.productId)))}${getTierPrice({price:item.price,priceTiers:item.productPriceTiers},getCartProductQuantity(item.productId))!=null?" cada":""}</strong><small class="cart-item-subtotal">Subtotal: ${money((getTierPrice({price:item.price,priceTiers:item.productPriceTiers},getCartProductQuantity(item.productId))??0)*item.quantity)}</small></div><button class="cart-item-remove" type="button" data-remove-item="${index}">Remover</button></article>`).join("");
 attachImageFallbacks(root);
 root.querySelectorAll("[data-cart-quantity]").forEach(button=>button.addEventListener("click",()=>{const item=cart[Number(button.dataset.cartIndex)];if(!item)return;item.quantity=Math.max(1,Math.min(99,(Number(item.quantity)||1)+(button.dataset.cartQuantity==="plus"?1:-1)));persistCart();renderCart();}));
 root.querySelectorAll("[data-remove-item]").forEach(button=>button.addEventListener("click",()=>{cart.splice(Number(button.dataset.removeItem),1);persistCart();renderCart();}));
}
async function clearCart(){if(!cart.length)return;if(!await showSiteConfirm("Tem certeza de que deseja remover todos os produtos da sacola?","Limpar sacola?"))return;cart=[];persistCart();renderCart();}
function openCart(){renderCart();showOverlay("cart");document.querySelector("#cart-close").focus();}
function checkoutWhatsApp(){if(!cart.length)return;const lines=cart.map((item,i)=>`${i+1}. ${item.name}\n   Quantidade: ${item.quantity}\n   Valor unitário: ${money(getTierPrice({price:item.price,priceTiers:item.productPriceTiers},getCartProductQuantity(item.productId)))}\n   Subtotal: ${money((getTierPrice({price:item.price,priceTiers:item.productPriceTiers},getCartProductQuantity(item.productId))??0)*item.quantity)}\n   ${Object.entries(item.options).map(([k,v])=>`${k}: ${v}`).join("\n   ")}`).join("\n\n");const message=`Olá! Gostaria de solicitar um orçamento para os itens da minha sacola:\n\n${lines}\n\nPode me informar os valores e os próximos passos?`;window.open(`https://wa.me/5575982604989?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");}
function clearSearch(){searchTerm="";searchInput.value="";renderCategoryProducts();searchInput.focus();}
searchInput.addEventListener("input",e=>{searchTerm=e.target.value.trim().toLocaleLowerCase("pt-BR");renderCategoryProducts();});clearFiltersButton.addEventListener("click",clearSearch);document.querySelector("#clear-empty").addEventListener("click",clearSearch);window.addEventListener("popstate",renderRoute);
document.querySelector("#brand-home").addEventListener("click",e=>{e.preventDefault();navigateHome();});document.querySelector("#nav-home").addEventListener("click",e=>{e.preventDefault();navigateHome();});
function goToCategories(){
  const menu=document.querySelector("#main-nav");
  menu.classList.remove("open");
  document.querySelector("#menu-toggle").setAttribute("aria-expanded","false");
  document.querySelector("#menu-toggle").textContent="☰";
  if(activeCategory){navigateHome();}
  requestAnimationFrame(()=>{
    const target=document.querySelector("#categorias");
    if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
    const url=new URL(location.href);url.hash="categorias";history.replaceState({},"",url);
  });
}
document.querySelector("#nav-categories").addEventListener("click",e=>{e.preventDefault();goToCategories();});document.querySelectorAll(".breadcrumb-home").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();navigateHome();}));
document.querySelector("#menu-toggle").addEventListener("click",e=>{const menu=document.querySelector("#main-nav"),open=menu.classList.toggle("open");e.currentTarget.setAttribute("aria-expanded",String(open));e.currentTarget.textContent=open?"×":"☰";});document.querySelectorAll("#main-nav a").forEach(a=>a.addEventListener("click",()=>{document.querySelector("#main-nav").classList.remove("open");document.querySelector("#menu-toggle").setAttribute("aria-expanded","false");document.querySelector("#menu-toggle").textContent="☰";}));
document.querySelector("#year").textContent=new Date().getFullYear();document.querySelector("#cart-open").addEventListener("click",openCart);document.querySelector("#cart-close").addEventListener("click",closeOverlays);document.querySelector("#modal-close").addEventListener("click",closeOverlays);backdrop.addEventListener("click",closeOverlays);document.querySelector("#checkout-button").addEventListener("click",checkoutWhatsApp);document.querySelector("#clear-cart-button").addEventListener("click",clearCart);document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!backdrop.hidden)closeOverlays();});
// Tema claro/escuro persistente.
const themeToggle=document.querySelector("#theme-toggle"),themeIcon=themeToggle.querySelector(".theme-toggle-icon"),themeColor=document.querySelector('meta[name="theme-color"]');function applyTheme(theme){document.documentElement.dataset.theme=theme;const dark=theme==="dark";themeIcon.textContent=dark?"☀":"☾";themeToggle.setAttribute("aria-label",dark?"Ativar modo claro":"Ativar modo escuro");themeToggle.title=dark?"Ativar modo claro":"Ativar modo escuro";themeColor.setAttribute("content",dark?"#171416":"#b51f32");}let savedTheme=null;try{savedTheme=localStorage.getItem("fotomania-theme");}catch(_){}applyTheme(savedTheme==="dark"||savedTheme==="light"?savedTheme:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));themeToggle.addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="dark"?"light":"dark";applyTheme(next);try{localStorage.setItem("fotomania-theme",next);}catch(_){}});
renderCategoryCards();renderFeaturedProducts();renderRoute();persistCart();

// Carrega somente registros publicados; em caso de falha, não exibe dados fictícios.
try {
  const remote = await getPublicCatalog();
  categories = remote.categories.filter(item=>item.published===true&&item.name).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
  const validCategoryNames = new Set(categories.map(category=>category.name));
  products = remote.products.filter(item=>item.published===true&&validCategoryNames.has(item.category)).map(item=>({
    id:item.id,name:item.name||"Produto",category:item.category,description:item.description||"",
    details:item.details||item.description||"",price:item.price??null,priceTiers:Array.isArray(item.priceTiers)?item.priceTiers:[],tag:item.tag||"FOTOMANIA",
    featured:item.featured===true,type:item.type||"simple",variants:Array.isArray(item.variants)?item.variants:[],customFields:Array.isArray(item.customFields)?item.customFields:[],
    image:item.image||"",order:Number(item.order)||0
  })).sort((a,b)=>a.order-b.order);
  catalogLoaded=true;
  renderCategoryCards();renderFeaturedProducts();renderRoute();
} catch(error) {
  console.error("Não foi possível carregar o catálogo do Firestore:",error);
  catalogLoaded=true;categories=[];products=[];
  categoryGrid.innerHTML='<p class="catalog-status">Não foi possível carregar as categorias. Tente novamente mais tarde.</p>';
  featuredGrid.innerHTML='<p class="catalog-status">Não foi possível carregar os produtos.</p>';
  renderRoute();
}


function siteDialog(message,{title="Atenção",confirmText="Entendi",cancelText="Cancelar",showCancel=false}={}){return new Promise(resolve=>{const root=document.querySelector("#site-dialog"),ok=document.querySelector("#site-dialog-confirm"),cancel=document.querySelector("#site-dialog-cancel");document.querySelector("#site-dialog-title").textContent=title;document.querySelector("#site-dialog-message").textContent=message;ok.textContent=confirmText;cancel.textContent=cancelText;cancel.hidden=!showCancel;root.hidden=false;const finish=value=>{root.hidden=true;ok.removeEventListener("click",yes);cancel.removeEventListener("click",no);root.removeEventListener("click",outside);document.removeEventListener("keydown",escape);resolve(value);};const yes=()=>finish(true),no=()=>finish(false),outside=e=>{if(e.target===root)no();},escape=e=>{if(e.key==="Escape")no();};ok.addEventListener("click",yes);cancel.addEventListener("click",no);root.addEventListener("click",outside);document.addEventListener("keydown",escape);(showCancel?cancel:ok).focus();});}
function showNotice(message,title="Atenção"){return siteDialog(message,{title,confirmText:"Entendi"});}
function showSiteConfirm(message,title="Confirmar ação"){return siteDialog(message,{title,confirmText:"Confirmar",cancelText:"Cancelar",showCancel:true});}
