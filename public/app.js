import {quote,coupons} from '/pricing.js';
import {customerUI} from '/customer-ui.js';
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = cents => (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function saved(key,fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function persist(key,value) { try { localStorage.setItem(key,JSON.stringify(value)); } catch { /* O app continua sem armazenamento local. */ } }
const favoriteData=saved('zfood-favorites',[]);
const state={restaurants:[],products:[],user:null,cart:[],coupon:'',favorites:new Set(Array.isArray(favoriteData)?favoriteData:[]),category:'Todos',restaurant:null,query:'',view:'home',authMode:'login',checkoutKey:null,checkoutDraft:{},orders:[],sort:'featured',profile:null};
const customer=customerUI({state,api,esc,toast,updateAccount,renderCart});
let toastTimer,pollTimer;
function toast(message) { clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,4000); }
async function api(path,options={}) {
  const res=await fetch(path,{...options,headers:{...(options.body && {'Content-Type':'application/json'}),...options.headers},body:options.body && JSON.stringify(options.body)});
  const data=await res.json();
  if(!res.ok) { const error=new Error(data.error || 'Não foi possível continuar.');error.status=res.status;throw error; }
  return data;
}
function cartItems(){ return state.cart.map(i=>({...state.products.find(p=>p.id===i.id),quantity:i.quantity})); }
function totals() {
  const items=cartItems();
  const subtotal=items.reduce((n,i)=>n+i.price*i.quantity,0);
  const fee=state.restaurants.find(r=>r.id===items[0]?.restaurantId)?.fee || 0;
  try{return quote(items,fee,state.coupon);}catch(error){return {...quote(items,fee),couponError:error.message};}
}
function saveCart(){persist('zfood-cart',{items:state.cart,coupon:state.coupon});$('#cart-count').textContent=state.cart.reduce((s,i)=>s+i.quantity,0);state.checkoutKey=null;const dock=$('#cart-dock');dock.hidden=!state.cart.length;dock.innerHTML='<span>🛍 '+state.cart.reduce((s,i)=>s+i.quantity,0)+' itens</span><b>Ver sacola →</b><span>'+money(totals().total)+'</span>';}
function updateAccount() {
  $('#account').textContent=state.user ? `${state.user.name.split(' ')[0]} · Minha conta`:'Entrar ↗';
  $('#admin-nav').hidden=state.user?.role!=='admin';
}
function renderCatalog(){
  const categories=[['Todos','✦'],['Combos','🔥'],['Hambúrgueres','🍔'],['Pizzas','🍕'],['Saudável','🥗'],['Doces','🍩'],['Porções','🍟'],['Bebidas','🍹']];
  $('#categories').innerHTML=categories.map(([name,icon])=>`<button class="category ${state.category===name?'active':''}" data-category="${name}" aria-pressed="${state.category===name}"><span>${icon}</span>${name}</button>`).join('');
  $('#restaurants').innerHTML=state.restaurants.map(r=>`<button class="restaurant ${state.restaurant===r.id?'selected':''}" data-restaurant="${r.id}" aria-pressed="${state.restaurant===r.id}"><img class="restaurant-cover" src="${r.imageUrl}" alt="" loading="lazy"><span class="restaurant-content"><span class="restaurant-emoji">${r.emoji}</span><b>${r.name}</b><small><span class="rating">★ ${r.rating}</span> · ${r.category}</small><small>${r.time} · ${money(r.fee)}</small></span></button>`).join('');
  const query=state.query.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu,'');
  const list=state.products.filter(p=>{
    const r=state.restaurants.find(r=>r.id===p.restaurantId);
    const haystack=`${p.name} ${p.description} ${r.name} ${p.category}`.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu,'');
    return (state.category==='Todos'||p.category===state.category) && (!state.restaurant||p.restaurantId===state.restaurant) && (!query||haystack.includes(query)) && (state.view!=='favorites'||state.favorites.has(p.id));
  });
  if(state.sort==='price-asc') list.sort((a,b)=>a.price-b.price);
  if(state.sort==='price-desc') list.sort((a,b)=>b.price-a.price);
  $('#results-title').textContent=state.view==='favorites'?'Seus favoritos':state.restaurant?state.restaurants.find(r=>r.id===state.restaurant).name:'Favoritos da vizinhança';
  $('#results-count').textContent=`${list.length} opções`;
  $('#products').innerHTML=list.length?list.map(p=>`<article class="product"><div class="product-photo"><img loading="lazy" src="${p.imageUrl}" alt="${esc(p.name)}"><span class="image-fallback" hidden>${p.emoji}</span>${p.badge?`<span class="product-badge">${p.badge}</span>`:''}<button class="favorite ${state.favorites.has(p.id)?'saved':''}" data-favorite="${p.id}" aria-label="${state.favorites.has(p.id)?'Remover dos':'Adicionar aos'} favoritos: ${esc(p.name)}" aria-pressed="${state.favorites.has(p.id)}">${state.favorites.has(p.id)?'♥':'♡'}</button></div><div class="product-body"><div class="product-restaurant">${state.restaurants.find(r=>r.id===p.restaurantId).name}</div><h4>${p.name}</h4><p>${p.description}</p><div class="product-bottom"><span class="product-price">${p.oldPrice?`<del>${money(p.oldPrice)}</del>`:''}${money(p.price)}</span><button class="add-button" data-add="${p.id}" aria-label="Adicionar ${esc(p.name)} à sacola">+</button></div></div></article>`).join(''):'<div class="empty"><span>⌕</span><b>Nenhuma gostosura por aqui ainda.</b><p>Tente outra busca ou salve um prato nos favoritos.</p><button class="secondary" data-reset>Explorar todos os pratos</button></div>';
  renderPromotions();
  document.querySelectorAll('.product-photo img').forEach(img=>img.addEventListener('error',()=>{img.hidden=true;img.nextElementSibling.hidden=false;},{once:true}));
}
function add(id){
  const p=state.products.find(p=>p.id===id);
  const current=cartItems()[0];
  if(current && current.restaurantId!==p.restaurantId){toast('Sua sacola é de outro restaurante. Finalize ou esvazie antes de trocar.');return;}
  const row=state.cart.find(i=>i.id===id);
  if(row?.quantity===20){toast('O limite é de 20 unidades por item.');return;}
  if(row) row.quantity++; else state.cart.push({id,quantity:1});
  saveCart();toast(`${p.name} na sacola!`);
}
function renderCart(){
  const existing=$('#checkout-form');
  if(existing)state.checkoutDraft=Object.fromEntries(new FormData(existing));
  const items=cartItems(),t=totals();
  if(!items.length){$('#cart-content').innerHTML='<div class="empty"><span>🛍️</span><h3>Sua sacola quer uma gostosura.</h3><p>Explore os pratos e descubra os combos da temporada.</p><button class="primary" data-close="cart-dialog">Explorar cardápio →</button></div>';return;}
  const restaurant=state.restaurants.find(r=>r.id===items[0].restaurantId);
  $('#cart-content').innerHTML=`<div class="cart-restaurant">${restaurant.emoji} <b>${restaurant.name}</b><span>${restaurant.time} · estimativa ilustrativa</span></div><div class="checkout-section-title"><span>✓</span><h3>Suas escolhas</h3></div>${items.map(i=>`<div class="cart-row"><img src="${i.imageUrl}" alt="" width="58" height="58"><div class="cart-row-main"><b>${esc(i.name)}</b><small>${money(i.price*i.quantity)}</small></div><div class="quantity"><button data-quantity="${i.id}" data-delta="-1" aria-label="Diminuir ${esc(i.name)}">−</button><span>${i.quantity}</span><button data-quantity="${i.id}" data-delta="1" aria-label="Aumentar ${esc(i.name)}">+</button></div></div>`).join('')}<button class="text-button" id="clear-cart">Esvaziar sacola</button><form id="coupon-form" class="coupon-form"><input name="coupon" aria-label="Cupom de desconto" placeholder="Insira seu cupom" value="${esc(state.coupon)}" maxlength="30"><button class="secondary">Aplicar</button></form>${t.couponError?`<p class="form-error">${esc(t.couponError)}</p>`:''}<div class="summary"><div><span>Subtotal</span><b>${money(t.subtotal)}</b></div><div><span>Taxa de entrega</span><b>${money(t.fee)}</b></div>${t.discount?`<div class="discount"><span>${esc(state.coupon)}</span><b>− ${money(t.discount)}</b></div>`:''}<div class="total"><span>Total</span><span>${money(t.total)}</span></div></div>${state.user?`<form id="checkout-form">${customer.fields()}<p id="checkout-error" class="form-error" role="alert"></p><button type="submit" class="primary full" ${t.couponError?'disabled':''}>Fazer pedido · ${money(t.total)} →</button></form>`:'<button id="checkout-login" class="primary full">Entrar para continuar →</button>'}<p class="cart-notice">Demonstração Zfood. Pedidos, pagamentos e entregas são simulados.</p>`;
  const form=$('#checkout-form');
  if(form){
    for(const [key,value] of Object.entries(state.checkoutDraft)){
      const field=form.elements.namedItem(key);
      if(field)field.value=value;
    }
    syncCheckoutFields();
  }
}
function syncCheckoutFields(){
  const form=$('#checkout-form');if(!form)return;
  const selected=form.elements.namedItem('addressId')?.value;
  const manual=form.elements.namedItem('address');
  manual.disabled=Boolean(selected);manual.required=!selected;$('#manual-address-label').hidden=Boolean(selected);
  $('#change-label').hidden=form.elements.namedItem('payment').value!=='cash';
}

function auth(mode='login'){
  state.authMode=mode;
  $('#auth-title').textContent=mode==='login'?'Que bom ter você aqui.':'Seu lugar à mesa está pronto.';
  $('#auth-description').textContent=mode==='login'?'Entre para salvar seus pedidos e pedir do seu jeito.':'Crie sua conta. Use uma senha com pelo menos 10 caracteres.';
  $('#name-label').hidden=mode==='login';
  $('#auth-form').elements.name.required=mode!=='login';
  const password=$('#auth-form').elements.password;
  password.minLength=mode==='login'?1:10;
  password.autocomplete=mode==='login'?'current-password':'new-password';
  $('#auth-form button[type=submit]').textContent=mode==='login'?'Entrar':'Criar minha conta';
  $('#auth-toggle').textContent=mode==='login'?'Primeira vez? Crie sua conta':'Já tem conta? Entre aqui';
  $('#auth-error').textContent='';
  if(!$('#auth-dialog').open) $('#auth-dialog').showModal();
}
const labels={placed:'Pedido recebido',preparing:'Em preparo',delivering:'Saiu para entrega',delivered:'Entregue',canceled:'Cancelado'};
function orderCard(o,admin=false){
  const stage=['placed','preparing','delivering','delivered'].indexOf(o.status);
  const next={placed:'preparing',preparing:'delivering',delivering:'delivered'}[o.status];
  const markup = `<article class="order"><div class="order-head"><div><b>${esc(o.number)} · ${esc(o.restaurant)}</b><small>${new Date(o.createdAt).toLocaleString('pt-BR')}</small></div><span class="status ${o.status}">${labels[o.status]}</span></div>${o.status!=='canceled'?`<div class="progress" aria-label="Etapa ${stage+1} de 4">${[0,1,2,3].map(i=>`<span class="${i<=stage?'done':''}"></span>`).join('')}</div>`:''}<div class="order-items">${o.items.map(i=>`${i.quantity}× ${esc(i.name)} · ${money(i.price*i.quantity)}`).join('<br>')}</div><div class="order-foot"><span>${esc(o.address)}</span><b>${money(o.total)} · ${paymentName(o.payment)}</b></div>${o.notes?`<div class="order-details">Observações: ${esc(o.notes)}</div>`:''}${admin?`<div class="order-details">${esc(o.customer)} · ${esc(o.phone)}<br>Subtotal ${money(o.subtotal)} · Entrega ${money(o.fee)} · Desconto ${money(o.discount)}</div><div class="order-actions">${next?`<button class="primary" data-status="${next}" data-order="${o.id}">${labels[next]} →</button>`:''}${['placed','preparing'].includes(o.status)?`<button class="secondary" data-status="canceled" data-order="${o.id}">Cancelar pedido</button>`:''}</div>`:''}</article>`;
  return markup.replace('</article>',orderExtras(o,admin)+'</article>');
}

function orderExtras(order,admin){
  const history=order.history || [{status:'placed',at:order.createdAt,actor:'customer'}];
  const timeline='<ol class="order-timeline" aria-label="Histórico do pedido">'+history.map(event=>'<li><b>'+esc(labels[event.status]||event.status)+'</b>'+new Date(event.at).toLocaleString('pt-BR')+' · '+(event.actor==='admin'?'Restaurante':'Cliente')+'</li>').join('')+'</ol>';
  const actions=admin?'':'<div class="order-actions"><button class="secondary" data-reorder="'+order.id+'">Pedir novamente ↻</button>'+(order.status==='placed'?'<button class="secondary" data-cancel="'+order.id+'">Cancelar pedido</button>':'')+'</div>';
  return paymentPanel(order,admin)+timeline+actions;
}
function confirmAction(title,message,label){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='confirm-dialog';
    dialog.innerHTML='<h2>'+esc(title)+'</h2><p>'+esc(message)+'</p><div class="confirm-actions"><button class="secondary" data-no>Voltar</button><button class="primary" data-yes>'+esc(label)+'</button></div>';
    document.body.append(dialog);let confirmed=false;
    dialog.querySelector('[data-yes]').onclick=()=>{confirmed=true;dialog.close();};
    dialog.querySelector('[data-no]').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>{dialog.remove();resolve(confirmed);},{once:true});
    dialog.showModal();dialog.querySelector('[data-no]').focus();
  });
}

async function loadOrders(admin=false){
  const target=$(admin?'#admin-list':'#orders-list');
  const accountId=state.user?.id;
  if(target.dataset.account!==accountId){
    target.replaceChildren();
    if(!admin)state.orders=[];
    target.dataset.account=accountId || '';
  }
  if(!state.user){target.innerHTML='<div class="empty"><span>🧾</span><p>Entre para acompanhar os seus pedidos.</p><button class="primary" data-login>Entrar na minha conta</button></div>';return;}
  try{
    const {orders}=await api(admin?'/api/admin/orders':'/api/orders');
    if(state.user?.id!==accountId)return;
    if(!admin) state.orders=orders;
    target.innerHTML=orders.length?orders.map(o=>orderCard(o,admin)).join(''):'<div class="empty"><span>🧾</span><b>Ainda não há pedidos por aqui.</b><p>Os próximos pedidos vão aparecer neste espaço.</p></div>';
    if(admin){
      const active=orders.filter(o=>!['delivered','canceled'].includes(o.status));
      $('#admin-stats').innerHTML=`<div class="admin-stat"><b>${active.length}</b><small>Em andamento</small></div><div class="admin-stat"><b>${orders.filter(o=>o.status==='delivered').length}</b><small>Entregues</small></div><div class="admin-stat"><b>${money(orders.filter(o=>o.status!=='canceled').reduce((sum,o)=>sum+o.total,0))}</b><small>Total de pedidos não cancelados</small></div>`;
    }
  }catch(error){if(state.user?.id===accountId)target.innerHTML=`<p class="form-error">${esc(error.message)}</p>`;}
}
function view(name){
  if(name==='admin' && state.user?.role!=='admin') return;
  state.view=name;
  $('#home-view').hidden=['orders','admin','profile'].includes(name);$('#profile-view').hidden=name!=='profile';
  $('#orders-view').hidden=name!=='orders';$('#admin-view').hidden=name!=='admin';
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(name==='home'||name==='favorites'||name==='deals'){
    state.category='Todos';state.restaurant=null;state.query='';$('#search').value='';renderCatalog();
    if(name==='favorites') $('#catalog').scrollIntoView();else if(name==='deals')$('#promotions').scrollIntoView();else window.scrollTo(0,0);
  }else{if(name==='profile')customer.show();else loadOrders(name==='admin');window.scrollTo(0,0);}
  clearInterval(pollTimer);
  if(['orders','admin'].includes(name)) pollTimer=setInterval(()=>{if(!document.hidden) loadOrders(name==='admin');},15000);
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.close){$('#'+button.dataset.close).close();return;}
  if(button.dataset.view){view(button.dataset.view);return;}
  if(button.dataset.add){add(button.dataset.add);return;}
  if(button.dataset.favorite){const id=button.dataset.favorite;state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);persist('zfood-favorites',[...state.favorites]);renderCatalog();return;}
  if(button.dataset.category){state.category=button.dataset.category;state.restaurant=null;renderCatalog();return;}
  if(button.dataset.restaurant){state.restaurant=state.restaurant===button.dataset.restaurant?null:button.dataset.restaurant;state.category='Todos';renderCatalog();return;}
  if(button.dataset.quantity){
    const item=state.cart.find(i=>i.id===button.dataset.quantity);
    item.quantity=Math.min(20,item.quantity+Number(button.dataset.delta));state.cart=state.cart.filter(i=>i.quantity>0);saveCart();renderCart();return;
  }
  if(button.id==='reset-filters'||button.hasAttribute('data-reset')){view('home');$('#catalog').scrollIntoView();return;}
  if(button.id==='cart-open'||button.id==='cart-dock'){renderCart();$('#cart-dialog').showModal();return;}
  if(button.id==='clear-cart'){state.cart=[];state.coupon='';saveCart();renderCart();return;}
  if(button.id==='use-coupon'){state.coupon='HALLOWEEN10';saveCart();toast('Cupom HALLOWEEN10 aplicado à sua sacola.');return;}
  if(button.id==='auth-toggle'){auth(state.authMode==='login'?'register':'login');return;}
  if(button.id==='checkout-login'){$('#cart-dialog').close();auth();return;}
  if(button.hasAttribute('data-login')){auth();return;}
  if(button.id==='account'){if(!state.user)auth();else view('profile');return;}
  if(button.id==='delivery-location'||button.id==='manage-addresses'){if($('#cart-dialog').open)$('#cart-dialog').close();view('profile');return;}
  if(button.dataset.offer){state.coupon=button.dataset.offer;saveCart();if(state.cart.length){renderCart();$('#cart-dialog').showModal();}else{$('#catalog').scrollIntoView();toast('Cupom selecionado. Adicione seus pratos para usar.');}return;}
  if(button.dataset.demoPay){button.disabled=true;try{await api('/api/orders/'+button.dataset.demoPay+'/demo-payment',{method:'POST',body:{}});await loadOrders();toast('Pagamento aprovado na demonstração!');}catch(error){toast(error.message);button.disabled=false;}return;}
  if(button.id==='logout'){
    try{await api('/api/logout',{method:'POST',body:{}});state.user=null;state.profile=null;customer.syncLocation();state.orders=[];state.checkoutDraft={};document.querySelectorAll('#orders-list,#admin-list,#admin-stats,#profile-content').forEach(el=>{el.replaceChildren();delete el.dataset.account;});$('#cart-content').replaceChildren();updateAccount();view('home');toast('Você saiu da sua conta.');}catch(error){toast(error.message);}return;
  }
  if(button.id==='refresh-orders'||button.id==='refresh-admin'){await loadOrders(button.id==='refresh-admin');return;}
  if(button.dataset.reorder){
    const order=state.orders.find(o=>o.id===button.dataset.reorder);if(!order)return;
    if(order.items.some(i=>!state.products.some(p=>p.id===i.id))){toast('Um dos pratos não está mais no cardápio. Escolha um novo pedido.');return;}
    if(state.cart.length && !await confirmAction('Substituir a sacola?','Os itens atuais serão trocados pelos pratos deste pedido.','Substituir sacola'))return;
    state.cart=order.items.map(i=>({id:i.id,quantity:Math.min(20,i.quantity)}));state.coupon='';
    state.checkoutDraft={address:order.address,phone:order.phone,notes:order.notes,payment:'cash'};
    $('#cart-content').replaceChildren();saveCart();renderCart();$('#cart-dialog').showModal();
    toast('Pedido na sacola com os preços atuais. Revise antes de confirmar.');return;
  }
  if(button.dataset.cancel){
    if(!await confirmAction('Cancelar este pedido?','O cancelamento só é permitido enquanto o restaurante ainda não iniciou o preparo.','Cancelar pedido'))return;
    button.disabled=true;
    try{await api('/api/orders/'+button.dataset.cancel+'/cancel',{method:'POST',body:{}});await loadOrders();toast('Pedido cancelado.');}catch(error){toast(error.message);await loadOrders();}return;
  }
  if(button.dataset.status){
    button.disabled=true;
    try{await api(`/api/admin/orders/${button.dataset.order}`,{method:'PATCH',body:{status:button.dataset.status}});await loadOrders(true);toast('Status atualizado.');}catch(error){toast(error.message);button.disabled=false;}
  }
});
$('#sort').addEventListener('change',event=>{state.sort=event.target.value;renderCatalog();});
$('#search').addEventListener('input',event=>{state.query=event.target.value;renderCatalog();});
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('dialog[open]')){event.preventDefault();view('home');$('#search').focus();}});
document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!['auth-form','coupon-form','checkout-form'].includes(form.id))return;
  event.preventDefault();const data=Object.fromEntries(new FormData(form));
  if(form.id==='coupon-form'){
    const coupon=data.coupon.trim().toUpperCase();
    try{quote(cartItems(),totals().fee,coupon);}catch(error){toast(error.message);return;}
    state.coupon=coupon;saveCart();renderCart();toast(coupon?'Cupom aplicado! Confira o desconto.':'Cupom removido.');return;
  }
  const submit=form.querySelector('button[type=submit]');submit.disabled=true;
  try{
    if(form.id==='auth-form'){
      const result=await api(`/api/${state.authMode}`,{method:'POST',body:data});state.user=result.user;await customer.load();updateAccount();$('#auth-dialog').close();form.reset();toast(`Bem-vindo, ${state.user.name.split(' ')[0]}!`);
      if(state.view==='orders')await loadOrders();if(state.view==='profile')await customer.show();
      if(state.cart.length){renderCart();$('#cart-dialog').showModal();}
    }else{
      state.checkoutKey ||= crypto.randomUUID();
      const {order}=await api('/api/orders',{method:'POST',headers:{'Idempotency-Key':state.checkoutKey},body:{...data,changeFor:data.changeReais?Math.round(Number(data.changeReais)*100):null,items:state.cart,coupon:state.coupon}});
      state.cart=[];state.coupon='';state.checkoutDraft={};$('#cart-content').replaceChildren();saveCart();$('#cart-dialog').close();view('orders');toast(`Pedido ${order.number} recebido neste ambiente!`);
    }
  }catch(error){
    $(form.id==='auth-form'?'#auth-error':'#checkout-error').textContent=error.message;
    if(error.status===401 && form.id==='checkout-form'){state.user=null;updateAccount();$('#cart-dialog').close();auth();}
  }finally{submit.disabled=false;}
});
async function init(){
  try{
    const catalog=await api('/api/catalog');Object.assign(state,catalog);
    const stored=saved('zfood-cart',{});
    const items=Array.isArray(stored.items)?stored.items:[];
    const seen=new Set();
    state.cart=items.filter(i=>{if(!i||!state.products.some(p=>p.id===i.id)||!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>20||seen.has(i.id))return false;seen.add(i.id);return true;});
    if(new Set(cartItems().map(i=>i.restaurantId)).size>1)state.cart=[];
    state.coupon=coupons.some(c=>c.code===stored.coupon)?stored.coupon:'';
    try{state.user=(await api('/api/me')).user;}catch(error){if(error.status!==401)toast('Não foi possível recuperar sua sessão.');}
    if(state.user)await customer.load();else customer.syncLocation();
    saveCart();updateAccount();renderCatalog();
  }catch(error){$('#products').innerHTML=`<div class="empty"><p>${esc(error.message)}</p><button class="secondary" id="reload-page">Tentar novamente</button></div>`;$('#reload-page').onclick=()=>location.reload();}
}
init();

function paymentName(method){return {pix_demo:'Pix demo',card_demo:'Cartão de teste',cash:'Dinheiro',card_delivery:'Cartão na entrega'}[method]||'Na entrega';}
function paymentPanel(o,admin){
  if(o.status==='canceled')return '<div class="payment-state canceled-payment">Pedido cancelado · nenhuma cobrança real</div>';
  if(o.paymentStatus==='pending_demo')return '<div class="pix-demo-panel"><div class="demo-qr" role="img" aria-label="Ilustração de Pix demonstrativo, sem código bancário válido"><span>DEMO</span></div><div><span class="eyebrow">PIX DE DEMONSTRAÇÃO</span><h3>Aguardando sua simulação</h3><p>Nenhum dinheiro será transferido. Use o botão para testar a aprovação.</p>'+(admin?'':('<button class="primary" data-demo-pay="'+o.id+'">Simular pagamento Pix →</button>'))+'</div></div>';
  return '<div class="payment-state">'+(o.paymentStatus==='approved_demo'?'✓ Pagamento simulado aprovado · ':'◷ Pagamento na entrega · ')+paymentName(o.payment)+(o.changeFor?' · Troco para '+money(o.changeFor):'')+'</div>';
}
function renderPromotions(){
  $('#offer-cards').innerHTML=coupons.map((c,i)=>'<article class="offer-card offer-'+i+'"><img src="/media/'+['c1','p1','d1'][i]+'.jpg" alt="" loading="lazy"><div><span class="eyebrow">'+['GOSTOSURAS EM OFERTA','UM SUSTO NO PREÇO','MAIS SABOR, MENOS TAXA'][i]+'</span><h3>'+esc(c.title)+'</h3><p>'+esc(c.description)+'</p><button class="offer-code" data-offer="'+c.code+'">'+c.code+' <span>Usar →</span></button></div></article>').join('');
  $('#combo-cards').innerHTML=state.products.filter(p=>p.category==='Combos').map(p=>'<article class="combo-card"><img src="'+p.imageUrl+'" alt="'+esc(p.name)+'" loading="lazy"><div><span class="combo-tag">'+esc(p.badge)+'</span><h3>'+esc(p.name)+'</h3><p>'+esc(p.description)+'</p><div class="combo-bottom"><span><del>'+money(p.oldPrice)+'</del><strong>'+money(p.price)+'</strong></span><button class="primary" data-add="'+p.id+'">Quero esse +</button></div></div></article>').join('');
}
document.addEventListener('change',event=>{if(event.target.closest('#checkout-form'))syncCheckoutFields();});
