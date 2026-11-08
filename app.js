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
function productCard(product){return `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"><span class="product-tag">${product.tag}</span></div><div class="product-info"><span class="product-category">${product.category}</span><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><div class="product-price">${money(product.price)}<small>${product.price==null?"Consulte opções e valores":""}</small></div><button class="product-more" type="button" data-product="${product.id}">Ver opções <span aria-hidden="true">↗</span></button></div></div></article>`;}
function attachImageFallbacks(root=document){root.querySelectorAll("img").forEach(img=>{if(img.dataset.fallbackReady)return;img.dataset.fallbackReady="true";const useFallback=()=>{if(img.classList.contains("modal-image")){const placeholder=document.createElement("div");placeholder.className="modal-image-placeholder";placeholder.setAttribute("aria-label","Imagem do produto indisponível");placeholder.textContent="Fotomania";img.replaceWith(placeholder);return;}img.classList.add("image-load-failed");if(img.parentElement)img.parentElement.classList.add("image-fallback");img.alt="";};if(!img.getAttribute("src")||!img.getAttribute("src").trim()){useFallback();return;}img.addEventListener("error",useFallback,{once:true});});}
// Delegação global: mantém o botão funcional mesmo quando os cards são recriados dinamicamente.
document.addEventListener("click",event=>{const button=event.target.closest("[data-product]");if(!button)return;event.preventDefault();openProductModal(button.dataset.product);});
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
function openProductModal(id){const p=products.find(item=>String(item.id??"")===String(id??""));if(!p){console.warn("Produto não encontrado para abrir as opções:",id);return;}modalQuantity=1;selectedPhotoSize="10x15";selectedMugArt="own";let config="";
 if(p.type==="photo")config=`<div class="config-group"><label>Tamanho da revelação</label><div class="option-list" id="photo-sizes">${optionButtons([{value:"10x15",label:"10 × 15 cm"},{value:"13x18",label:"13 × 18 cm"},{value:"20x25",label:"20 × 25 cm"},{value:"20x30",label:"20 × 30 cm"},{value:"custom",label:"Outro tamanho"}],selectedPhotoSize,"photo-size")}</div><div id="custom-dimensions" hidden class="config-two" style="margin-top:10px"><input class="config-input" id="photo-width" type="number" min="1" max="200" placeholder="Largura (cm)"><input class="config-input" id="photo-height" type="number" min="1" max="200" placeholder="Altura (cm)"></div><p class="config-hint">Tamanhos personalizados e valores serão confirmados pelo WhatsApp.</p></div>`;
 if(p.type==="mug")config=`<div class="config-group"><label>Como deseja personalizar?</label><div class="option-list">${optionButtons([{value:"own",label:"Vou enviar minha arte"},{value:"create",label:"Quero ajuda com a arte"}],selectedMugArt,"mug-art")}</div><p class="config-hint">A arte, aprovação e detalhes da personalização serão tratados pelo WhatsApp.</p></div>`;
 if(p.type==="shirt")config=`<div class="config-group"><label for="shirt-size">Tamanho da camisa</label><select class="config-select" id="shirt-size"><option value="">Selecione um tamanho</option>${p.variants.map(v=>`<option value="${v.value}" data-price="${v.price??""}">${v.label}</option>`).join("")}</select><p class="config-hint">O preço varia conforme o tamanho. A equipe confirma o valor antes da produção.</p></div>`;
 if(p.type==="simple")config=`<div class="config-group"><p class="config-hint">Produto sem opções adicionais. Se necessário, você poderá combinar os detalhes com a equipe pelo WhatsApp.</p></div>`;
 modalContent.innerHTML=`<div class="modal-layout">${p.image?`<img class="modal-image" src="${p.image}" alt="${p.name}">`:`<div class="modal-image-placeholder" aria-label="Imagem do produto indisponível">Fotomania</div>`}<div class="modal-copy"><span class="eyebrow"><i></i> ${String(p.category||"Produto").toUpperCase()}</span><h2 id="modal-title">${p.name}</h2><p>${p.details}</p><div class="modal-price">${money(p.price)}</div>${config}<div class="config-group"><label>Quantidade</label><div class="quantity-control"><button type="button" id="quantity-minus" aria-label="Diminuir quantidade">−</button><output id="modal-quantity">1</output><button type="button" id="quantity-plus" aria-label="Aumentar quantidade">+</button></div></div><button class="modal-add" id="modal-add" type="button">Adicionar à sacola</button></div></div>`;
 attachImageFallbacks(modalContent);modalContent.querySelectorAll("[data-option-group]").forEach(btn=>btn.addEventListener("click",()=>{const group=btn.dataset.optionGroup;modalContent.querySelectorAll(`[data-option-group="${group}"]`).forEach(b=>b.classList.remove("selected"));btn.classList.add("selected");if(group==="photo-size"){selectedPhotoSize=btn.dataset.optionValue;document.querySelector("#custom-dimensions").hidden=selectedPhotoSize!=="custom";}if(group==="mug-art")selectedMugArt=btn.dataset.optionValue;}));
 document.querySelector("#quantity-minus").addEventListener("click",()=>{modalQuantity=Math.max(1,modalQuantity-1);document.querySelector("#modal-quantity").textContent=modalQuantity;});document.querySelector("#quantity-plus").addEventListener("click",()=>{modalQuantity=Math.min(99,modalQuantity+1);document.querySelector("#modal-quantity").textContent=modalQuantity;});const shirtSelect=document.querySelector("#shirt-size");if(shirtSelect)shirtSelect.addEventListener("change",()=>{const variant=p.variants.find(v=>v.value===shirtSelect.value);document.querySelector(".modal-price").textContent=money(variant?.price??null);});document.querySelector("#modal-add").addEventListener("click",()=>addConfiguredProduct(p));showOverlay("modal");document.querySelector("#modal-close").focus();}
function addConfiguredProduct(p){let options={},itemPrice=p.price;if(p.type==="photo"){if(selectedPhotoSize==="custom"){const w=Number(document.querySelector("#photo-width").value),h=Number(document.querySelector("#photo-height").value);if(!w||!h||w<1||h<1){alert("Informe a largura e a altura desejadas em centímetros.");return;}options={Tamanho:`Personalizado: ${w} × ${h} cm`,"Preço":"A confirmar"};}else options={Tamanho:`${selectedPhotoSize} cm`,"Preço":"A confirmar"};}else if(p.type==="mug")options={Arte:selectedMugArt==="own"?"Cliente enviará a própria arte":"Solicita criação de arte pela Fotomania",Personalização:"Detalhes pelo WhatsApp"};else if(p.type==="shirt"){const size=document.querySelector("#shirt-size").value;if(!size){alert("Selecione o tamanho da camisa.");return;}const variant=p.variants.find(v=>v.value===size);itemPrice=variant?.price??null;options={Tamanho:size,"Preço":money(itemPrice)};}
 const key=JSON.stringify([p.id,options]);const existing=cart.find(item=>item.key===key);if(existing)existing.quantity+=modalQuantity;else cart.push({key,productId:p.id,name:p.name,image:p.image,quantity:modalQuantity,options,price:itemPrice});persistCart();closeOverlays();openCart();}
function persistCart(){try{localStorage.setItem("fotomania-cart",JSON.stringify(cart));}catch(_){}document.querySelector("#cart-count").textContent=cart.reduce((sum,item)=>sum+item.quantity,0);}
function renderCart(){const root=document.querySelector("#cart-items");if(!cart.length){root.innerHTML='<div class="cart-empty">Sua sacola ainda está vazia.<br>Explore as categorias e escolha seus produtos.</div>';document.querySelector("#checkout-button").disabled=true;return;}document.querySelector("#checkout-button").disabled=false;root.innerHTML=cart.map((item,index)=>`<article class="cart-item"><img src="${item.image}" alt=""><div><h3>${item.name}</h3><p>${Object.entries(item.options).map(([k,v])=>`${k}: ${v}`).join(" · ")||"Produto simples"}</p><strong>${item.quantity} unidade(s) · ${money(item.price)}</strong></div><button class="cart-item-remove" type="button" data-remove-item="${index}">Remover</button></article>`).join("");attachImageFallbacks(root);root.querySelectorAll("[data-remove-item]").forEach(btn=>btn.addEventListener("click",()=>{cart.splice(Number(btn.dataset.removeItem),1);persistCart();renderCart();}));}
function openCart(){renderCart();showOverlay("cart");document.querySelector("#cart-close").focus();}
function checkoutWhatsApp(){if(!cart.length)return;const lines=cart.map((item,i)=>`${i+1}. ${item.name}\n   Quantidade: ${item.quantity}\n   ${Object.entries(item.options).map(([k,v])=>`${k}: ${v}`).join("\n   ")}`).join("\n\n");const message=`Olá! Gostaria de solicitar um orçamento para os itens da minha sacola:\n\n${lines}\n\nPode me informar os valores e os próximos passos?`;window.open(`https://wa.me/5575982604989?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");}
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
document.querySelector("#year").textContent=new Date().getFullYear();document.querySelector("#cart-open").addEventListener("click",openCart);document.querySelector("#cart-close").addEventListener("click",closeOverlays);document.querySelector("#modal-close").addEventListener("click",closeOverlays);backdrop.addEventListener("click",closeOverlays);document.querySelector("#checkout-button").addEventListener("click",checkoutWhatsApp);document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!backdrop.hidden)closeOverlays();});
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
    details:item.details||item.description||"",price:item.price??null,tag:item.tag||"FOTOMANIA",
    featured:item.featured===true,type:item.type||"simple",variants:Array.isArray(item.variants)?item.variants:[],
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

