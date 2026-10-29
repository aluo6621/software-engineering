const $=s=>document.querySelector(s),e=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
let user=null,csrf='',page='market',selected=null,loading=false;
const labels={
  pending:'待审核',approved:'通过',rejected:'驳回',live:'在售',reserved:'已预订',sold:'已成交',off:'已下架',delivery:'待交付',confirmation:'待双方确认',completed:'已完成',cancelled:'已取消',closed:'已关闭',sale:'出售',gift:'免费转让',exchange:'以物易物'
}
;
const eventNames={
  create:'创建订单',accept:'卖家接单',reject:'卖家拒绝',cancel:'买家取消',request_cancel:'申请取消',withdraw_cancel:'撤回取消申请',deny_cancel:'拒绝取消申请',agree_cancel:'同意取消',deliver:'记录交付',confirm:'提交本人确认',timeout:'超时关闭'
}
;
const label=s=>labels[s]||s;
const money=p=>p===null?'交换':p===0?'免费':'¥ '+(p/100).toFixed(2);
const btn=(a,t,cls='')=>`<button data-action="${a}" class="${cls}">${t}</button>`;
let toastTimer;
function toast(t, tone = 'success') {
  clearTimeout(toastTimer);
  const notice = $('#toast');
  notice.textContent = t;
  notice.dataset.tone = tone;
  notice.style.display = 'block';
  toastTimer = setTimeout(() => notice.style.display = 'none', 6500);
}
function formError(error) {
  const form = $('#app form');
  if (!form) return toast(error.message, 'error');
  let summary = form.querySelector('.form-error');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'form-error';
    summary.setAttribute('role', 'alert');
    summary.tabIndex = -1;
    form.prepend(summary);
  }
  summary.textContent = error.message + '。请检查输入后重试，已填写内容将保留。';
  summary.focus();
}
function emptyState(title, detail, action = '') {
  return `<section class="empty-state"><h2>${title}</h2><p>${detail}</p>${action}</section>`;
}
let focusedPage = null;
async function api(path, method = 'GET', data) {
  const controls = method === 'GET' ? [] : [...document.querySelectorAll('#app button, #account button')].filter(b => !b.disabled);
  controls.forEach(b => {
    b.disabled = true;
    b.setAttribute('aria-busy', 'true');
  }
  );
  try {
    const r = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json', 'X-CSRF-Token': csrf
      }
      ,
      body: data === undefined ? undefined : JSON.stringify(data)
    }
    );
    const b = await r.json();
    if (!r.ok) throw Error(b.error || '请求失败');
    return b;
  }
  catch (error) {
    if (error instanceof TypeError) throw Error('网络连接失败，请检查本地服务是否已启动');
    throw error;
  }
  finally {
    controls.forEach(b => {
      b.disabled = false;
      b.removeAttribute('aria-busy');
    }
    );
  }
}
const field=(name,title,type='text',extra='')=>`<div class="field"><label for="${name}">${title}</label><input id="${name}" name="${name}" type="${type}" ${extra}></div>`;
function heading(t,s=''){
  return `<div class="title"><div><span class="eyebrow">CAMPUS CIRCULAR</span><h1>${t}</h1><p class="muted">${s}</p></div></div>`
}
function card(p){
  return `<article class="card">${p.images[0]?`<img src="${p.images[0]}" alt="${e(p.title)}" class="card-image" width="600" height="450" loading="lazy">`:''}<div class="cardbody"><span class="badge" data-status="${e(p.status)}">${label(p.status)} · ${label(p.trade_type)}</span><h3>${e(p.title)}</h3><p class="muted">${e(p.category)} · ${e(p.condition_text)}</p><div class="row"><span class="price">${money(p.price)}</span><button data-detail="${p.id}">查看详情</button></div>${p.review_reason?`<p>${e(p.review_reason)}</p>`:''}</div></article>`
}
async function render(){
  if(loading)return;
  loading=true;
  $('#app').setAttribute('aria-busy','true');
  if(focusedPage!==page)$('#app').innerHTML='<div class="loading-state" role="status">正在加载页面…</div>';
  try{
    $('#account').innerHTML=user?`${e(user.username)} · ${user.role==='admin'?'管理员':user.certified?'已认证学生':'未认证'} ${btn('logout','退出')}`:btn('auth','登录 / 注册');
    document.querySelectorAll('[data-page]').forEach(b=>{
      const active=b.dataset.page===page;
      b.classList.toggle('active',active);
      if(active)b.setAttribute('aria-current','page');
      else b.removeAttribute('aria-current');
    }
    );
    let html='';
    if(page==='auth'){
      html=heading('欢迎回到校园流转','先注册账号，再提交姓名学号进行人工认证。')+`<section class="panel auth-panel"><form id="authform">${field('username','用户名（4～20位字母数字下划线）','text','required autocomplete="username"')}${field('password','密码（至少8位，含字母数字）','password','required autocomplete="current-password"')}<div class="actions"><button type="submit" class="primary">登录</button>${btn('register','注册新账号')}</div></form></section>`
    }
    else if(page==='market'){
      const ps=await api('/products');
      html=heading('让闲置继续发光','发布前人工审核，下单即锁定物品，交付后双方确认完成。')+`<div class="grid">${ps.map(card).join('')||emptyState('校园好物，即将相遇','这里还没有在售物品。你可以先完成认证，发布第一件闲置。',btn('auth','登录后开始','primary'))}</div>`
    }
    else if(page==='detail'){
      const p=await api('/products/'+selected);
      html=heading(p.title)+`<div class="twocol"><section class="panel">${p.images.map(url=>`<img src="${url}" alt="商品图片" class="product-image">`).join('')}<p>${e(p.description)}</p><span class="badge" data-status="${e(p.status)}">${label(p.status)}</span><p>${e(p.owner_name)} · ${e(p.condition_text)}</p><span class="price">${money(p.price)}</span></section><section class="panel"><h2>核对交易约定</h2><p>资金双方线下处理，平台不验证到账。</p>${p.trade_type==='exchange'?`<form id="offerform">${field('offerTitle','提供物品名称','text','required')}${field('offerCondition','成色','text','required')}<div class="field"><label for="offerDescription">提供物品描述</label><textarea id="offerDescription" required></textarea></div>${field('offerImages','1～6张物品图片','file','accept="image/png,image/jpeg" multiple required')}${field('topup','差价（元）','number','value="0" min="0" max="99999.99" step="0.01"')}<div class="field"><label for="payer">差价付款方向</label><select id="payer"><option value="buyer">买家付给卖家</option><option value="seller">卖家付给买家</option></select></div></form>`:''}${p.status==='live'?btn('buy','确认下单','primary'):'<p>物品暂不可交易。</p>'}<p class="muted">卖家48小时内接单，约定变更须结束原单后重新下单。</p></section></div>`
    }
    else{
      if(!user){
        page='auth';
        loading=false;
        return render()
      }
      if(page==='cert'){
        const cs=await api('/certifications');
        html=heading('学生身份认证','仅收集姓名、学号。管理员在线下核验后记录结论。')+`<section class="panel"><form id="certform">${field('realName','姓名','text','required maxlength="40"')}${field('studentNo','学号','text','required maxlength="40"')}<button class="primary">提交申请</button></form>${cs.map(c=>`<div class="notice">${e(c.real_name)} ${e(c.student_no)} · ${label(c.status)} ${e(c.reason)}</div>`).join('')}</section>`
      }
      if(page==='publish')html=heading('发布校园闲置','1～6张JPG/PNG，每张不超过5 MiB，提交后等待审核。')+`<section class="panel"><form id="publishform">${field('title','标题','text','required maxlength="80"')}<div class="formgrid">${field('category','分类','text','required placeholder="如：书籍教材"')}${field('condition','成色','text','required')}<div class="field"><label for="tradeType">交易方式</label><select id="tradeType"><option value="sale">出售</option><option value="gift">免费转让</option><option value="exchange">以物易物</option></select></div>${field('price','出售价格（元）','number','value="1" min="0" max="99999.99" step="0.01"')}</div><div class="field"><label for="description">描述</label><textarea id="description" required></textarea></div>${field('expectation','期望交换条件（交换必填）')}${field('images','图片','file','accept="image/png,image/jpeg" multiple required')}<button class="primary">提交审核</button></form></section>`;
      if(page==='mine'){
        const ps=await api('/products/mine');
        html=heading('我的发布')+`<div class="grid">${ps.map(card).join('')||emptyState('还没有发布物品','整理书桌和宿舍，让闲置物品开启下一段使用旅程。')}</div>`
      }
      if(page==='notifications'){
        const ns=await api('/notifications');
        html=heading('站内通知')+`<section class="panel">${ns.map(n=>`<div class="notice row"><div>${e(n.message)}<p class="muted">${new Date(n.created_at).toLocaleString()}</p></div><button data-read="${n.id}">${n.read_at?'已读':'标记已读'}</button></div>`).join('')||'暂无通知。'}</section>`
      }
      if(page==='orders'){
        const os=await api('/orders');
        html=heading('交易订单')+os.map(o=>`<section class="panel order-card"><div class="row"><h2>#${o.id} ${e(o.snapshot.title)}</h2><span class="badge" data-status="${e(o.status)}">${o.status==='pending'?'待卖家确认':label(o.status)}</span></div><p>我是${user.id===o.buyer_id?'买家':'卖家'} · ${money(o.snapshot.price)}</p>${o.offer?`<p>交换提供：${e(o.offer.title)} · 差价${money(o.topup)} · ${o.payer==='seller'?'卖家付款':'买家付款'}</p>`:''}<p class="muted">截止：${new Date(o.deadline).toLocaleString()}；买家${o.buyer_confirmed?'已':'未'}确认 / 卖家${o.seller_confirmed?'已':'未'}确认</p>${o.cancel_status?`<p>取消申请：${({pending:'待回应',agreed:'已同意',denied:'已拒绝',withdrawn:'已撤回'})[o.cancel_status]} · ${e(o.cancel_reason)}</p>`:''}<div class="actions">${o.status==='pending'?user.id===o.seller_id?orderBtn(o,'accept','接单')+orderBtn(o,'reject','拒绝'):orderBtn(o,'cancel','取消'):''}${o.status==='delivery'?o.cancel_status==='pending'?user.id===o.cancel_by?orderBtn(o,'withdraw_cancel','撤回申请'):orderBtn(o,'agree_cancel','同意取消')+orderBtn(o,'deny_cancel','拒绝取消'):orderBtn(o,'request_cancel','申请取消')+(user.id===o.seller_id?orderBtn(o,'deliver','记录交付'):''):''}${o.status==='confirmation'?orderBtn(o,'confirm','提交本人完成确认'):''}</div><div class="muted order-events" aria-label="订单操作记录">${o.events.map(ev=>`<div>${e(eventNames[ev.action]||ev.action)} · ${e(ev.detail)} · ${new Date(ev.created_at).toLocaleString()}</div>`).join('')}</div></section>`).join('');
        if(!os.length)html+=emptyState('每一笔流转，都从发现开始','目前没有交易订单。先去发现闲置，找到需要的物品。')
      }
      if(page==='admin'){
        if(user.role!=='admin')throw Error('需要管理员权限');
        const q=await api('/admin/queue');
        html=heading('人工审核工作台','请在线下核验身份后审核。审核操作在服务端验证管理员权限。')+`<section class="panel"><h2>身份审核</h2>${q.certifications.map(c=>`<div class="notice"><b>${e(c.real_name)} · ${e(c.student_no)}</b><p>${e(c.username)}</p><button data-review="certifications:${c.id}:approve">已线下核验，通过</button> <button data-review="certifications:${c.id}:reject">驳回</button></div>`).join('')||'暂无待审申请'}</section><section class="panel"><h2>商品审核</h2>${q.products.map(p=>`<div class="notice"><h3>${e(p.title)}</h3><p>${e(p.description)}</p>${p.images.map(url=>`<img src="${url}" alt="审核图片" class="review-image" loading="lazy">`).join('')}<p>${label(p.trade_type)} · ${money(p.price)}</p><button data-review="products:${p.id}:approve">通过</button> <button data-review="products:${p.id}:reject">驳回</button></div>`).join('')||'暂无待审商品'}</section>`
      }
    }
    $('#app').innerHTML=html;
    if(focusedPage!==page){
      $('#app').focus({
        preventScroll:true
      }
      );
      focusedPage=page;
    }
  }
  catch(err){
    $('#app').innerHTML=heading('暂时无法显示')+`<section class="panel">${e(err.message)}</section>`;
    toast(err.message,'error')
  }
  finally{
    loading=false;
    $('#app').setAttribute('aria-busy','false');
  }
}
function orderBtn(o,a,t){
  return `<button data-order="${o.id}:${a}">${t}</button>`
}
async function refresh(){
  const m=await api('/me');
  user=m.user;
  csrf=m.csrf||'';
  await render()
}
async function files(id){
  const fs=[...$(id).files];
  if(fs.length<1||fs.length>6)throw Error('图片须1～6张');
  return Promise.all(fs.map(f=>{
    if(f.size>5242880)throw Error('每张图片最多5 MiB');
    return new Promise((resolve,reject)=>{
      const r=new FileReader;
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(f)
    }
    )
  }
  ))
}
document.addEventListener('submit',async ev=>{
  ev.preventDefault();
  try{
    if(ev.target.id==='authform'){
      const m=await api('/login','POST',{
        username:$('#username').value,password:$('#password').value
      }
      );
      user=m.user;
      csrf=m.csrf;
      page=user.role==='admin'?'admin':'market';
      await render()
    }
    if(ev.target.id==='certform'){
      await api('/certifications','POST',{
        realName:$('#realName').value,studentNo:$('#studentNo').value
      }
      );
      toast('已提交审核');
      await render()
    }
    if(ev.target.id==='publishform'){
      await api('/products','POST',{
        title:$('#title').value,category:$('#category').value,condition:$('#condition').value,description:$('#description').value,tradeType:$('#tradeType').value,price:Number($('#price').value),expectation:$('#expectation').value,images:await files('#images')
      }
      );
      toast('物品已提交审核');
      page='mine';
      await render()
    }
  }
  catch(err){
    formError(err)
  }
}
);
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('button');
  if(!b)return;
  try{
    if(b.dataset.page){
      page=b.dataset.page;
      return render()
    }
    if(b.dataset.detail){
      selected=+b.dataset.detail;
      page='detail';
      return render()
    }
    if(b.dataset.review){
      const [kind,id,action]=b.dataset.review.split(':');
      const reason=action==='reject'?prompt('驳回理由'):'';
      if(action==='reject'&&!reason)return;
      if(kind==='certifications'&&action==='approve'&&!confirm('确认你已在线下核验该学生的姓名、学号及在读身份？'))return;
      await api(`/admin/${kind}/${id}`,'POST',{
        action,reason,offlineVerified:kind==='certifications'&&action==='approve'
      }
      );
      toast('审核已保存');
      return render()
    }
    if(b.dataset.read){
      await api('/notifications/'+b.dataset.read+'/read','POST');
      return render()
    }
    if(b.dataset.order){
      const [id,action]=b.dataset.order.split(':');
      let data={
        action
      }
      ;
      if(action==='request_cancel'){
        data.reason=prompt('取消原因');
        if(!data.reason)return
      }
      if(action==='deliver'){
        data.location=prompt('实际交付地点');
        if(!data.location)return;
        data.note=prompt('交付说明，交换须说明全部物品');
        if(!data.note)return;
        data.occurredAt=Date.now()
      }
      await api('/orders/'+id+'/action','POST',data);
      toast('订单已更新');
      return render()
    }
    if(b.dataset.action==='auth'){
      page='auth';
      return render()
    }
    if(b.dataset.action==='logout'){
      await api('/logout','POST');
      page='market';
      return refresh()
    }
    if(b.dataset.action==='register'){
      await api('/register','POST',{
        username:$('#username').value,password:$('#password').value
      }
      );
      toast('注册成功，请登录')
    }
    if(b.dataset.action==='buy'){
      if(!user){
        page='auth';
        return render()
      }
      const data={
        productId:selected,requestKey:crypto.randomUUID()
      }
      ;
      if($('#offerform')){
        if(!$('#offerform').reportValidity())return;
        data.offer={
          title:$('#offerTitle').value,description:$('#offerDescription').value,condition:$('#offerCondition').value,images:await files('#offerImages')
        }
        ;
        data.topup=Number($('#topup').value);
        data.payer=$('#payer').value
      }
      await api('/orders','POST',data);
      toast('下单成功，目标已锁定');
      page='orders';
      return render()
    }
  }
  catch(err){
    if(['register','buy'].includes(b.dataset.action))formError(err);
    else toast(err.message,'error')
  }
}
);
window.addEventListener('hashchange',()=>{
  page=location.hash.slice(1)||'market';
  render()
}
);
refresh().catch(error=>{
  $('#app').innerHTML=emptyState('暂时无法连接服务','请确认本地服务器正在运行，然后刷新页面重试。');
  toast(error.message,'error')
}
);
