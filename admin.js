import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import { getAdminCatalog, createCategory, updateCategory, deleteCategory, createProduct, updateProduct, deleteProduct } from "./catalog-service.js";

const ADMIN_UIDS = ["nTFrJYgehtOYSPz6z8yMdOftQRn2", "MkBiNVj74keXFeJCFWDUwRJVxD22", "ofBu9ybOYION977yuvNTSXyFaw13"];
const $ = id => document.getElementById(id);
const loginView=$("login-view"), dashboardView=$("dashboard-view"), loginFeedback=$("login-feedback"), dashboardFeedback=$("dashboard-feedback");
let categories=[], products=[];
const message=(el,text)=>{el.textContent=text||"";};
const safe=(value)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

$("login-form").addEventListener("submit",async e=>{e.preventDefault();message(loginFeedback,"Entrando...");try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);}catch(error){message(loginFeedback,authError(error));}});
$("forgot-password").addEventListener("click",async()=>{const email=$("email").value.trim();if(!email){message(loginFeedback,"Informe seu e-mail para receber o link de recuperação.");return;}try{await sendPasswordResetEmail(auth,email);message(loginFeedback,"Se o endereço estiver cadastrado, você receberá o link de recuperação.");}catch(error){message(loginFeedback,authError(error));}});
$("logout").addEventListener("click",()=>signOut(auth));
onAuthStateChanged(auth,async user=>{
  if(!user){loginView.hidden=false;dashboardView.hidden=true;return;}
  if(!ADMIN_UIDS.includes(user.uid)){message(loginFeedback,"Esta conta não está autorizada a administrar a Fotomania.");await signOut(auth);return;}
  loginView.hidden=true;dashboardView.hidden=false;$("admin-email").textContent=user.email||"Administrador autenticado";
  await refresh();
});
function authError(error){if(error.code==="auth/invalid-credential"||error.code==="auth/wrong-password")return"E-mail ou senha incorretos.";if(error.code==="auth/too-many-requests")return"Muitas tentativas. Aguarde um pouco e tente novamente.";return error.message||"Não foi possível concluir a operação.";}
async function refresh(){try{const data=await getAdminCatalog();categories=data.categories;products=data.products;renderLists();message(dashboardFeedback,"");}catch(error){message(dashboardFeedback,"Falha ao carregar dados. Confira as regras do Firestore e a conexão: "+error.message);}}
function renderLists(){
  $("category-list").innerHTML=categories.map(c=>`<div class="record"><div><strong>${safe(c.name)}</strong><small>${c.published?"Publicada":"Oculta"} · ordem ${Number(c.order)||0}</small></div><div class="record-actions"><button data-edit-category="${c.id}">Editar</button><button class="delete" data-delete-category="${c.id}">Excluir</button></div></div>`).join("")||"<p class='status'>Nenhuma categoria cadastrada.</p>";
  $("product-list").innerHTML=products.map(p=>`<div class="record"><div><strong>${safe(p.name)}</strong><small>${safe(p.category)} · ${p.published?"Publicado":"Oculto"}${p.featured?" · Destaque":""}</small></div><div class="record-actions"><button data-edit-product="${p.id}">Editar</button><button class="delete" data-delete-product="${p.id}">Excluir</button></div></div>`).join("")||"<p class='status'>Nenhum produto cadastrado.</p>";
  $("product-category").innerHTML='<option value="">Selecione</option>'+categories.map(c=>`<option value="${safe(c.name)}">${safe(c.name)}</option>`).join("");
  document.querySelectorAll("[data-edit-category]").forEach(b=>b.onclick=()=>editCategory(b.dataset.editCategory));
  document.querySelectorAll("[data-delete-category]").forEach(b=>b.onclick=()=>removeCategory(b.dataset.deleteCategory));
  document.querySelectorAll("[data-edit-product]").forEach(b=>b.onclick=()=>editProduct(b.dataset.editProduct));
  document.querySelectorAll("[data-delete-product]").forEach(b=>b.onclick=()=>removeProduct(b.dataset.deleteProduct));
}
function resetCategory(){$("category-form").reset();$("category-id").value="";$("category-order").value=categories.length;$("category-published").checked=true;}
function resetProduct(){$("product-form").reset();$("product-id").value="";$("product-order").value=products.length;$("product-published").checked=true;$("product-variants").value="";}
function editCategory(id){const c=categories.find(x=>x.id===id);if(!c)return;$("category-id").value=id;$("category-name").value=c.name||"";$("category-description").value=c.description||"";$("category-order").value=c.order??0;$("category-published").checked=c.published===true;$("category-name").focus();}
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;$("product-id").value=id;$("product-name").value=p.name||"";$("product-category").value=p.category||"";$("product-description").value=p.description||"";$("product-details").value=p.details||"";$("product-price").value=p.price??"";$("product-type").value=p.type||"simple";$("product-image").value=p.image||"";$("product-tag").value=p.tag||"";$("product-variants").value=p.variants?.length?JSON.stringify(p.variants,null,2):"";$("product-order").value=p.order??0;$("product-featured").checked=p.featured===true;$("product-published").checked=p.published===true;$("product-name").focus();}
$("category-form").addEventListener("submit",async e=>{e.preventDefault();const id=$("category-id").value;const data={name:$("category-name").value.trim(),description:$("category-description").value.trim(),order:Number($("category-order").value)||0,published:$("category-published").checked};try{if(id)await updateCategory(id,data);else await createCategory(data);resetCategory();await refresh();message(dashboardFeedback,"Categoria salva.");}catch(error){message(dashboardFeedback,"Não foi possível salvar a categoria: "+error.message);}});
$("product-form").addEventListener("submit",async e=>{e.preventDefault();const id=$("product-id").value;let variants=[];try{variants=$("product-variants").value.trim()?JSON.parse($("product-variants").value):[];if(!Array.isArray(variants))throw new Error("As variantes precisam estar em uma lista JSON.");}catch(error){message(dashboardFeedback,"JSON de variantes inválido: "+error.message);return;}const rawPrice=$("product-price").value;const data={name:$("product-name").value.trim(),category:$("product-category").value,description:$("product-description").value.trim(),details:$("product-details").value.trim(),price:rawPrice===""?null:Number(rawPrice),type:$("product-type").value,image:$("product-image").value.trim(),tag:$("product-tag").value.trim()||"FOTOMANIA",variants,order:Number($("product-order").value)||0,featured:$("product-featured").checked,published:$("product-published").checked};try{if(id)await updateProduct(id,data);else await createProduct(data);resetProduct();await refresh();message(dashboardFeedback,"Produto salvo.");}catch(error){message(dashboardFeedback,"Não foi possível salvar o produto: "+error.message);}});
async function removeCategory(id){const c=categories.find(x=>x.id===id);if(!c||!confirm(`Excluir a categoria “${c.name}”? Produtos vinculados não serão excluídos automaticamente.`))return;try{await deleteCategory(id);await refresh();message(dashboardFeedback,"Categoria excluída.");}catch(error){message(dashboardFeedback,error.message);}}
async function removeProduct(id){const p=products.find(x=>x.id===id);if(!p||!confirm(`Excluir o produto “${p.name}”?`))return;try{await deleteProduct(id);await refresh();message(dashboardFeedback,"Produto excluído.");}catch(error){message(dashboardFeedback,error.message);}}
$("category-cancel").addEventListener("click",resetCategory);$("product-cancel").addEventListener("click",resetProduct);
resetCategory();resetProduct();
