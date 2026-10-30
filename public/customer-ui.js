export function customerUI({state,api,esc,toast,updateAccount,renderCart}){
  function syncLocation(){
    const a=state.profile?.addresses.find(a=>a.id===state.profile.defaultAddressId);
    document.querySelector('#delivery-location').innerHTML=`<span>⌖</span><span><small>Entregar em</small><b>${a?esc(a.street+', '+a.number):'Escolher endereço'} ⌄</b></span>`;
  }
  async function load(){
    if(!state.user){state.profile=null;syncLocation();return;}
    const id=state.user.id;
    const profile=await api('/api/profile');
    if(state.user?.id!==id)return;
    state.profile=profile;state.user=profile.user;updateAccount();syncLocation();
  }
  function render(){
    const target=document.querySelector('#profile-content');
    if(!state.user){target.innerHTML='<div class="guest-card"><span>👋</span><h2>Seu cantinho no Zfood.</h2><p>Entre para salvar endereços, acompanhar pedidos e repetir suas gostosuras favoritas.</p><button class="primary" data-login>Entrar ou criar conta</button></div>';return;}
    if(!state.profile){target.innerHTML='<p>Carregando seus dados…</p>';return;}
    const profile=state.profile;
    target.innerHTML=`<div class="customer-layout"><section class="customer-panel"><div class="profile-avatar">${esc(state.user.name.charAt(0).toUpperCase())}</div><h2>Olá, ${esc(state.user.name.split(' ')[0])}!</h2><p>Seu próximo pedido começa por aqui.</p><form id="profile-form"><label>Seu nome<input name="name" required minlength="2" maxlength="80" autocomplete="name" value="${esc(state.user.name)}"></label><label>Email<input type="email" value="${esc(state.user.email)}" disabled></label><label>Telefone com DDD<input name="phone" type="tel" maxlength="20" autocomplete="tel" value="${esc(profile.phone)}" placeholder="(11) 99999-9999"></label><p class="form-error" role="alert"></p><button class="primary full" type="submit">Salvar meus dados</button></form><button class="text-button full" id="logout">Sair da conta</button></section><section><div class="section-head"><div><span class="eyebrow">SEU SABOR TEM DESTINO</span><h2>Meus endereços</h2></div><button class="secondary" data-new-address>+ Novo endereço</button></div><div class="address-grid">${profile.addresses.length?profile.addresses.map(a=>`<article class="address-card ${a.id===profile.defaultAddressId?'is-default':''}"><div class="address-card-top"><span>${a.label.toLowerCase().includes('trabalho')?'▣':'⌂'}</span><b>${esc(a.label)}</b>${a.id===profile.defaultAddressId?'<small>Padrão</small>':''}</div><p>${esc(a.street)}, ${esc(a.number)}${a.complement?' · '+esc(a.complement):''}<br>${esc(a.district)} · ${esc(a.city)}/${esc(a.state)}<br>CEP ${esc(a.zip)}</p><div class="address-actions"><button class="text-button" data-edit-address="${a.id}">Editar</button><button class="text-button" data-default-address="${a.id}">Usar como padrão</button><button class="text-button" data-delete-address="${a.id}">Excluir</button></div></article>`).join(''):'<div class="empty-address"><span>⌖</span><h3>Aonde vamos levar sua fome?</h3><p>Salve casa, trabalho ou seu lugar favorito.</p><button class="primary" data-new-address>Adicionar primeiro endereço</button></div>'}</div><aside class="help-card"><span>♡</span><div><b>Precisa de uma mão?</b><p>Confira como funcionam os pedidos, cupons e pagamentos desta demonstração.</p><button class="text-button" data-help>Abrir central de ajuda →</button></div></aside></section></div>`;
  }
  async function show(){document.querySelector('#profile-content').innerHTML='<p role="status">Carregando seus dados…</p>';try{await load();render();}catch(error){render();toast(error.message);}}
  function addressForm(id){
    const a=state.profile?.addresses.find(a=>a.id===id)||{};
    const dialog=document.querySelector('#address-dialog');
    document.querySelector('#address-title').textContent=id?'Editar endereço':'Um novo destino para suas gostosuras';
    document.querySelector('#address-form-content').innerHTML=`<form id="address-form" data-id="${esc(id||'')}"><div class="form-grid"><label class="span-two">Nome do endereço<input name="label" placeholder="Casa, Trabalho…" required minlength="2" maxlength="40" value="${esc(a.label||'Casa')}"></label><label>CEP<input name="zip" inputmode="numeric" autocomplete="postal-code" required minlength="8" maxlength="9" placeholder="00000-000" value="${esc(a.zip)}"></label><label>Estado<select name="state" autocomplete="address-level1">${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf=>`<option ${uf===(a.state||'SP')?'selected':''}>${uf}</option>`).join('')}</select></label><label class="span-two">Rua ou avenida<input name="street" required minlength="3" maxlength="120" autocomplete="address-line1" value="${esc(a.street)}"></label><label>Número<input name="number" required maxlength="15" value="${esc(a.number)}"></label><label>Complemento<input name="complement" maxlength="80" autocomplete="address-line2" placeholder="Apto, bloco…" value="${esc(a.complement)}"></label><label>Bairro<input name="district" required minlength="2" maxlength="80" value="${esc(a.district)}"></label><label>Cidade<input name="city" required minlength="2" maxlength="80" autocomplete="address-level2" value="${esc(a.city)}"></label><label class="span-two">Ponto de referência<input name="reference" maxlength="100" placeholder="Opcional" value="${esc(a.reference)}"></label></div><p class="form-error" role="alert"></p><button class="primary full" type="submit">Salvar endereço</button></form>`;
    dialog.showModal();
  }
  document.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b)return;
    try{
      if(b.hasAttribute('data-new-address'))addressForm();
      if(b.dataset.editAddress)addressForm(b.dataset.editAddress);
      if(b.dataset.defaultAddress){await api(`/api/addresses/${b.dataset.defaultAddress}/default`,{method:'POST',body:{}});await show();toast('Endereço padrão atualizado.');}
      if(b.dataset.deleteAddress){
        // A seleção é uma exclusão recuperável por novo cadastro; pedidos preservam seu endereço.
        await api(`/api/addresses/${b.dataset.deleteAddress}`,{method:'DELETE',body:{}});await show();toast('Endereço removido da sua lista.');
      }
      if(b.hasAttribute('data-help'))document.querySelector('#help-dialog').showModal();
    }catch(error){toast(error.message);}
  });
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!['profile-form','address-form'].includes(form.id))return;
    event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
    const id=state.user?.id;
    try{
      const data=Object.fromEntries(new FormData(form));
      if(form.id==='profile-form')await api('/api/profile',{method:'PATCH',body:data});
      else await api('/api/addresses'+(form.dataset.id?'/'+form.dataset.id:''),{method:form.dataset.id?'PATCH':'POST',body:data});
      if(state.user?.id!==id)return;
      if(form.id==='address-form')document.querySelector('#address-dialog').close();
      await show();toast(form.id==='address-form'?'Endereço salvo!':'Seus dados foram atualizados.');
    }catch(error){form.querySelector('.form-error').textContent=error.message;}
    finally{button.disabled=false;}
  });
  function fields(){
    const addresses=state.profile?.addresses||[];
    const selected=state.checkoutDraft.addressId??(state.checkoutDraft.address?'':state.profile?.defaultAddressId||'');
    return `<div class="checkout-section-title"><span>1</span><h3>Onde você quer receber?</h3></div>${addresses.length?`<label>Endereço salvo<select name="addressId" id="checkout-address-select"><option value="">Digitar outro endereço</option>${addresses.map(a=>`<option value="${a.id}" ${selected===a.id?'selected':''}>${esc(a.label)} · ${esc(a.street)}, ${esc(a.number)}</option>`).join('')}</select></label>`:''}<label id="manual-address-label" ${selected?'hidden':''}>Endereço completo<input name="address" ${selected?'disabled':'required'} minlength="10" maxlength="600" autocomplete="street-address" placeholder="Rua, número, bairro, cidade e estado"></label><button type="button" class="text-button" id="manage-addresses">Gerenciar meus endereços →</button><label>Telefone para contato<input name="phone" required type="tel" minlength="10" maxlength="20" autocomplete="tel" value="${esc(state.profile?.phone||'')}" placeholder="(11) 99999-9999"></label><label>Observações do pedido<textarea name="notes" maxlength="500" placeholder="Algum detalhe sobre o preparo ou a entrega?"></textarea></label><div class="checkout-section-title"><span>2</span><h3>Como prefere pagar?</h3></div><div class="demo-callout">✦ Tudo aqui é uma demonstração. Nenhuma cobrança será feita.</div><div class="payment-options">${[['pix_demo','◇','Pix','Aprovação simulada após o pedido'],['card_demo','▤','Cartão de teste','•••• 4242 · aprovação automática'],['cash','$','Dinheiro','Pagamento na entrega'],['card_delivery','▣','Cartão na entrega','Maquininha demonstrativa']].map(([value,icon,title,detail])=>`<label class="payment-option"><input type="radio" name="payment" value="${value}" ${(state.checkoutDraft.payment||'pix_demo')===value?'checked':''}><span>${icon}</span><div><b>${title}</b><small>${detail}</small></div></label>`).join('')}</div><label id="change-label" ${state.checkoutDraft.payment==='cash'?'':'hidden'}>Troco para quanto? (R$)<input name="changeReais" type="number" min="0" max="1000" step="0.01" placeholder="Deixe vazio se não precisar de troco"></label>`;
  }
  return {load,show,fields,syncLocation};
}
