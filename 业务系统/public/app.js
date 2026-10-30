const $=s=>document.querySelector(s),e=s=>String(s??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
let user=null,csrf='',page=location.hash.slice(1)||'market',selected=null,loading=false;
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
function formError(error, form = $('#app form')) {
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
async function api(path, method = 'GET', data, background = false) {
  const controls = method === 'GET' || background ? [] : [...document.querySelectorAll('#app button, #account button')].filter(b => !b.disabled);
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
const field=(name,title,type='text',extra='')=>{
  const input=`<input id="${name}" name="${name}" type="${type}" ${extra}>`;
  return `<div class="field"><label for="${name}">${title}</label>${type==='password'?`<div class="password-control">${input}<button type="button" class="password-toggle" data-password-toggle="${name}" aria-controls="${name}" aria-label="显示${title}" aria-pressed="false">显示</button></div>`:input}</div>`;
};
function heading(t,s=''){
  return `<div class="title"><div><span class="eyebrow">CAMPUS CIRCULAR</span><h1>${e(t)}</h1><p class="muted">${e(s)}</p></div></div>`
}
function card(p){
  return `<article class="card" data-detail="${p.id}" role="button" tabindex="0" aria-label="查看${e(p.title)}详情">${p.images[0]?`<img src="${p.images[0]}" alt="${e(p.title)}" class="card-image" width="600" height="450" loading="lazy">`:''}<div class="cardbody"><span class="badge" data-status="${e(p.status)}">${label(p.status)} · ${label(p.trade_type)}</span><h3>${e(p.title)}</h3><p class="muted">${e(p.category)} · ${e(p.condition_text)}</p><div class="row"><span class="price">${money(p.price)}</span></div>${p.review_reason?`<p>${e(p.review_reason)}</p>`:''}</div></article>`
}
let chatState=null,pendingChatSend=null,chatSyncing=false;
function chatMessages(messages){
  return messages.length?messages.map(m=>`<div class="chat-message ${m.sender_id===user.id?'chat-mine':''}"><div class="chat-bubble">${e(m.content)}</div><small>${new Date(m.created_at).toLocaleString()}${m.sender_id===user.id?(m.read_at?' · 已读':' · 已发送'):''}</small></div>`).join(''):'<p class="muted chat-empty">还没有消息，先打个招呼吧。</p>';
}
function conversationList(chats){
  return chats.length?chats.map(c=>`<button class="conversation-row" data-page="messages/${c.id}">${peerAvatar(c.peer_id,c.peer_name,c.peer_avatar_version,'conversation-avatar')}<span class="conversation-copy"><strong>${e(c.peer_name)}</strong><span>${e(c.product_title)}</span><small>${e(c.last_message||'尚未发送消息')}</small></span><span>${c.unread?`<span class="unread-count">${c.unread}</span>`:''}<small>${new Date(c.updated_at).toLocaleString()}</small></span></button>`).join(''):emptyState('还没有私信','从商品详情的“联系卖家”，或订单的“联系对方”开始沟通。');
}
async function updateUnread(){
  if(!user){const badge=$('#messageUnread');if(badge)badge.hidden=true;return;}
  const accountId=user.id;
  const chats=await api('/conversations');
  if(user?.id!==accountId)return;
  const badge=$('#messageUnread'),count=chats.reduce((n,c)=>n+c.unread,0);
  if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=!count;}
  if(page==='messages'&&$('#conversationList')){const html=conversationList(chats);if($('#conversationList').innerHTML!==html)$('#conversationList').innerHTML=html;}
}
async function markChatRead(){
  if(!chatState||page!=='messages/'+chatState.id||!chatState.messages.length)return;
  await api('/conversations/'+chatState.id+'/read','POST',{throughId:chatState.messages.at(-1).id},true);
}
async function syncChat(older=false){
  if(chatSyncing||!chatState||page!=='messages/'+chatState.id)return;
  chatSyncing=true;
  const id=chatState.id;
  try{
    const before=older&&chatState.messages.length?'?before='+chatState.messages[0].id:'';
    const data=await api('/conversations/'+id+before);
    if(page!=='messages/'+id||chatState.id!==id)return;
    const messages=new Map(chatState.messages.map(m=>[m.id,m]));for(const m of data.messages)messages.set(m.id,m);
    chatState.messages=[...messages.values()].sort((a,b)=>a.id-b.id);if(older)chatState.hasMore=data.hasMore;
    const log=$('#chatLog'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<80,previousHeight=log.scrollHeight;
    const html=chatMessages(chatState.messages);if(log.innerHTML!==html)log.innerHTML=html;
    if(older)log.scrollTop+=log.scrollHeight-previousHeight;else if(atBottom)log.scrollTop=log.scrollHeight;
    $('#olderMessages').hidden=!chatState.hasMore;$('#chatStatus').textContent='每5秒自动更新';
    if(!document.hidden)await markChatRead();await updateUnread();
  }finally{chatSyncing=false;}
}
function peerAvatar(id,name,version,cls=''){
  return version?`<img class="avatar ${cls}" src="/api/users/${id}/avatar?v=${encodeURIComponent(version)}" alt="${e(name)}的头像">`:`<span class="avatar avatar-default ${cls}" aria-label="默认头像">${e(name.slice(0,1).toUpperCase())}</span>`;
}
function avatarMarkup(cls=''){
  return user.avatarVersion?`<img class="avatar ${cls}" src="/api/profile/avatar?v=${encodeURIComponent(user.avatarVersion)}" alt="我的头像">`:`<span class="avatar avatar-default ${cls}" aria-label="默认头像">${e(user.username.slice(0,1).toUpperCase())}</span>`;
}
function certificationStatus(cs,full){
  const latest=cs[0],approved=cs.find(c=>c.status==='approved');
  if(user.certified)return `<div class="cert-status"><span class="badge" data-status="approved">已通过认证</span><h3>学生身份已认证</h3>${approved?`<p>姓名：${e(approved.real_name)}</p><p>学号：${e(approved.student_no)}</p>`:''}<p class="muted">可以发布物品、咨询与参与交易。认证信息不能通过修改资料变更。</p></div>`;
  if(latest?.status==='pending')return `<div class="cert-status"><span class="badge" data-status="pending">审核中</span><h3>申请已提交，请耐心等待</h3><p>姓名：${e(latest.real_name)}</p><p>学号：${e(latest.student_no)}</p><p class="muted">提交时间：${new Date(latest.created_at).toLocaleString()}。请勿重复申请。</p></div>`;
  const status=latest?.status==='rejected'?`<span class="badge" data-status="rejected">未通过认证</span><p>驳回原因：${e(latest.reason||'请核对身份信息后重新提交')}</p>`:'<p class="muted">尚未认证。完成认证后即可发布物品和参与交易。</p>';
  if(!full)return status+'<button data-page="cert" class="primary">'+(latest?'重新申请认证':'前往身份认证')+'</button>';
  return status+`<form id="certform">${field('realName','姓名','text',`required maxlength="40" value="${e(latest?.real_name||'')}"`)}${field('studentNo','学号','text',`required maxlength="40" value="${e(latest?.student_no||'')}"`)}<button class="primary">提交申请</button></form>`;
}
async function render(){
  if(loading)return;
  loading=true;
  $('#app').setAttribute('aria-busy','true');
  if(focusedPage!==page)$('#app').innerHTML='<div class="loading-state" role="status">正在加载页面…</div>';
  try{
    $('#account').innerHTML=user?`${e(user.username)} · ${user.role==='admin'?'管理员':user.certified?'已认证学生':'未认证'} <button data-page="profile" class="account-profile">${avatarMarkup()}<span>我的</span></button> ${btn('logout','退出')}`:btn('auth','登录 / 注册');
    $('[data-page="admin"]').hidden=user?.role!=='admin';
    document.querySelectorAll('[data-page]').forEach(b=>{
      const active=b.dataset.page===page||(b.dataset.page==='messages'&&page.startsWith('messages/'));
      b.classList.toggle('active',active);
      if(active)b.setAttribute('aria-current','page');
      else b.removeAttribute('aria-current');
    }
    );
    let html='';
    if(page==='auth'||page==='register'){
      const registering=page==='register';
      html=`<section class="panel auth-panel auth-card"><span class="eyebrow">CAMPUS CIRCULAR</span><h1>${registering?'开启你的校园流转':'欢迎回来'}</h1><p class="muted">${registering?'创建账号，让闲置遇见需要它的人。':'登录账号，继续你的校园好物流转。'}</p><form id="${registering?'registerform':'authform'}">${field('username','用户名','text','required minlength="4" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" aria-describedby="username-help"')}<p class="field-help" id="username-help">4～20位字母、数字或下划线</p>${field('password','密码','password',`required ${registering?'minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-help"':'autocomplete="current-password"'}`)}${registering?`<p class="field-help" id="password-help">至少8位，须包含字母和数字</p>${field('confirmPassword','确认密码','password','required autocomplete="new-password" aria-describedby="confirm-help"')}<p class="field-help" id="confirm-help">请再次输入密码</p><fieldset class="cert-choice"><legend>注册后，是否立即进行学生认证？</legend><label><input type="radio" name="certChoice" value="now" checked><span><strong>立即认证</strong><small>填写姓名和学号，提交人工审核</small></span></label><label><input type="radio" name="certChoice" value="later"><span><strong>暂时跳过</strong><small>先逛逛，发布和交易前再完成认证</small></span></label></fieldset>`:''}<button type="submit" class="primary auth-submit">${registering?'创建账号':'登录'}</button></form><div class="auth-switch">${registering?'已有账号？':'还没有账号？'} <a href="${registering?'#auth':'#register'}">${registering?'返回登录':'注册新账号'}</a></div></section>`;
    }
    else if(page==='market'){
      const ps=await api('/products');
      let emptyAction='',emptyHint='过段时间再来看看，也欢迎分享你的闲置。';
      if(!user)emptyAction=btn('auth','登录，发布闲置','primary');
      else if(user.role==='student')emptyAction=user.certified?'<button data-page="publish" class="primary">发布我的闲置</button>':'<button data-page="cert" class="primary">前往身份认证</button>';
      else if(user.role==='admin')emptyHint='新的校园好物正在等待上架，稍后再来看看吧。';
      const empty=`<section class="empty-state market-empty"><div class="empty-illustration" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M14 23h36v29H14zM10 23l9-12h26l9 12M32 12v11M25 34c2 5 12 5 14 0"/><path d="M48 6v8M44 10h8"/></svg></div><h2>好物暂时歇个脚</h2><p>目前暂无在售闲置。<br>${emptyHint}</p>${emptyAction}</section>`;
      html=heading('让闲置继续发光','发布前人工审核，下单即锁定物品，交付后双方确认完成。')+`<div class="grid">${ps.map(card).join('')||empty}</div>`
    }
    else if(page==='detail'){
      const p=await api('/products/'+selected);
      html=heading(p.title)+`<div class="twocol"><section class="panel">${p.images.map(url=>`<img src="${url}" alt="商品图片" class="product-image">`).join('')}<p>${e(p.description)}</p><span class="badge" data-status="${e(p.status)}">${label(p.status)}</span><p>${e(p.owner_name)} · ${e(p.condition_text)}</p><span class="price">${money(p.price)}</span></section><section class="panel"><h2>核对交易约定</h2><div class="delivery-location"><strong>建议交货地点</strong><p>${e(p.delivery_location||'尚未填写，请与卖家协商')}</p><small>最终地点由双方协商确认</small></div><p>资金双方线下处理，平台不验证到账。</p>${p.trade_type==='exchange'?`<form id="offerform">${field('offerTitle','提供物品名称','text','required')}${field('offerCondition','成色','text','required')}<div class="field"><label for="offerDescription">提供物品描述</label><textarea id="offerDescription" required></textarea></div>${field('offerImages','1～6张物品图片','file','accept="image/png,image/jpeg" multiple required')}${field('topup','差价（元）','number','value="0" min="0" max="99999.99" step="0.01"')}<div class="field"><label for="payer">差价付款方向</label><select id="payer"><option value="buyer">买家付给卖家</option><option value="seller">卖家付给买家</option></select></div></form>`:''}${p.status==='live'&&user?.id!==p.owner_id?`<button data-contact-product="${p.id}">联系卖家</button>`:''}${p.status==='live'?btn('buy','确认下单','primary'):'<p>物品暂不可交易。</p>'}<p class="muted">卖家48小时内接单，约定变更须结束原单后重新下单。</p></section></div>`
    }
    else{
      if(!user){
        page='auth';
        loading=false;
        return render()
      }
      if(page==='messages'){
        const chats=await api('/conversations');
        html=heading('私信','与交易对方沟通物品、时间和交货地点。')+`<section class="panel"><div id="conversationList">${conversationList(chats)}</div></section>`;
      }
      if(/^messages\/\d+$/.test(page)){
        const chat=await api('/conversations/'+Number(page.split('/')[1]));
        chatState={id:chat.id,messages:chat.messages,hasMore:chat.hasMore};pendingChatSend=null;
        html=`<div class="title chat-title"><a class="peer-avatar-link" href="#users/${chat.peer_id}" aria-label="查看${e(chat.peer_name)}的主页">${peerAvatar(chat.peer_id,chat.peer_name,chat.peer_avatar_version,'avatar-large')}</a><div><span class="eyebrow">CAMPUS CIRCULAR</span><h1>与 ${e(chat.peer_name)} 的私信</h1><p class="muted">关于：${e(chat.product_title)}</p><a class="peer-profile-link" href="#users/${chat.peer_id}">查看对方主页 →</a></div></div>`+`<section class="panel chat-panel"><div class="row"><button data-page="messages">返回会话列表</button><span class="muted" id="chatStatus" role="status">每5秒自动更新</span></div><div class="chat-context"><strong>关联物品</strong> ${e(chat.product_title)}</div><button id="olderMessages" data-action="older-messages" ${chat.hasMore?'':'hidden'}>加载更早消息</button><div id="chatLog" class="chat-log" role="log" aria-label="聊天记录" aria-live="polite">${chatMessages(chat.messages)}</div><form id="messageform"><div class="field"><label for="messageContent">消息</label><textarea id="messageContent" required maxlength="2000" placeholder="聊聊物品细节或约定交付时间…" ${user.certified&&user.role==='student'?'':'disabled'}></textarea></div><div class="row"><small class="muted">${user.certified&&user.role==='student'?'仅支持文字，每条最多2000字。':'通过学生认证后才能发送消息。'}</small><button class="primary" ${user.certified&&user.role==='student'?'':'disabled'}>发送</button></div></form></section>`;
      }
      if(/^users\/\d+$/.test(page)){
        const data=await api('/users/'+Number(page.split('/')[1])),p=data.profile,name=p.nickname||p.username;
        html=heading('个人主页')+`<section class="panel"><div class="profile-hero">${peerAvatar(p.id,name,p.avatarVersion,'avatar-large')}<div><h2>${e(name)}</h2><p class="muted">@${e(p.username)} · ${p.certified?'已认证学生':'未认证学生'}</p></div></div><p class="profile-bio">${e(p.bio||'这位同学还没有填写个人简介。')}</p><button data-page="messages">返回私信</button></section><h2>在售闲置</h2><div class="grid">${data.products.map(card).join('')||emptyState('暂时没有在售物品','这位同学目前没有公开在售的闲置。')}</div>`;
      }
      if(page==='profile'||page==='profile-edit'){
        avatarCrop=null;avatarReset=false;avatarReadVersion++;
        const profile=await api('/profile');
        const cs=user.role==='student'?await api('/certifications'):[];
        const editing=page==='profile-edit';
        const content=editing?`<h2>修改资料</h2><p class="muted">登录用户名：${e(profile.username)}</p><form id="profileform"><div class="avatar-settings"><div id="avatarPreview">${avatarMarkup('avatar-large')}</div><div class="avatar-editor">${field('avatarFile','选择头像原图','file','accept="image/png,image/jpeg" aria-describedby="avatar-help"')}<p class="muted" id="avatar-help">PNG / JPEG，原图最大15 MiB、4000万像素。裁剪后自动压缩为512 × 512头像。</p><div id="avatarCropArea" hidden><p class="muted" id="crop-help">拖动图片调整范围，圆形区域就是头像效果。也可用下方方向按钮微调。</p><canvas id="avatarCanvas" width="512" height="512" aria-label="头像裁剪预览" aria-describedby="crop-help"></canvas><label for="avatarZoom">缩放</label><input id="avatarZoom" type="range" min="1" max="4" step="0.01" value="1"><div class="crop-move" aria-label="移动裁剪图片"><button type="button" data-crop-move="left" aria-label="图片向左移动">←</button><button type="button" data-crop-move="up" aria-label="图片向上移动">↑</button><button type="button" data-crop-move="down" aria-label="图片向下移动">↓</button><button type="button" data-crop-move="right" aria-label="图片向右移动">→</button></div><p id="avatarSize" class="muted" role="status"></p></div><div class="actions"><button type="button" data-action="reset-avatar" ${user.avatarVersion?'':'disabled'}>恢复默认头像</button></div></div></div>${field('nickname','昵称','text',`maxlength="40" value="${e(profile.nickname)}" placeholder="怎么称呼你"`)}<div class="field"><label for="bio">个人简介</label><textarea id="bio" maxlength="300" placeholder="简单介绍一下自己">${e(profile.bio)}</textarea></div><div class="actions"><button id="saveProfile" class="primary">保存修改</button><button type="button" data-page="profile">返回个人主页</button></div></form>`:`<div class="profile-hero">${avatarMarkup('avatar-large')}<div><span class="eyebrow">我的校园主页</span><h2>${e(profile.nickname||profile.username)}</h2><p class="muted">@${e(profile.username)} · ${user.role==='admin'?'管理员':user.certified?'已认证学生':'未认证学生'}</p></div></div><p class="profile-bio">${e(profile.bio||'还没有填写个人简介。')}</p><button data-page="profile-edit" class="primary">修改资料</button>`;
        html=heading(editing?'编辑个人资料':'个人主页',editing?'调整头像、昵称和简介。':'记录你的校园流转生活。')+`<div class="profile-layout"><section class="panel">${content}</section><section class="panel"><h2>身份认证</h2>${user.role==='admin'?'<p class="muted">管理员账号无需学生认证。</p>':certificationStatus(cs,false)}</section></div>`;
      }
      if(page==='cert'){
        const cs=await api('/certifications');
        html=heading('学生身份认证','认证姓名与学号由人工核验，与普通个人资料分开管理。')+`<section class="panel"><div class="actions"><button data-page="profile">返回我的</button></div>${user.role==='admin'?'<p>管理员账号无需学生认证。</p>':certificationStatus(cs,true)}</section>`;
      }
      if(page==='publish')html=heading('发布校园闲置','1～6张JPG/PNG，每张不超过5 MiB，提交后等待审核。')+`<section class="panel"><form id="publishform">${field('title','标题','text','required maxlength="80"')}<div class="formgrid">${field('category','分类','text','required placeholder="如：书籍教材"')}${field('condition','成色','text','required')}<div class="field"><label for="tradeType">交易方式</label><select id="tradeType"><option value="sale">出售</option><option value="gift">免费转让</option><option value="exchange">以物易物</option></select></div>${field('price','出售价格（元）','number','value="1" min="0" max="99999.99" step="0.01"')}</div><div class="field"><label for="description">描述</label><textarea id="description" required></textarea></div>${field('deliveryLocation','建议交货地点','text','required maxlength="200" placeholder="如：北校区图书馆正门"')}<p class="muted">填写校内公共地点，具体交付时间与地点可由双方协商。</p>${field('expectation','期望交换条件（交换必填）')}${field('images','图片','file','accept="image/png,image/jpeg" multiple required')}<button class="primary">提交审核</button></form></section>`;
      if(page==='mine'){
        const ps=await api('/products/mine');
        html=heading('我的发布')+`<div class="grid">${ps.map(card).join('')||emptyState('还没有发布物品','整理书桌和宿舍，让闲置物品开启下一段使用旅程。')}</div>`
      }
      if(page==='notifications'){
        const ns=await api('/notifications');
        html=heading('站内通知')+`<section class="panel">${ns.map(n=>`<div class="notice row"><div>${e(n.message)}<p class="muted">${new Date(n.created_at).toLocaleString()}</p></div><button data-read="${n.id}">${n.read_at?'已读':'标记已读'}</button></div>`).join('')||'暂无通知。'}</section>`
      }
      if(page==='orders'||/^orders\/\d+$/.test(page)){
        const orders=await api('/orders');
        const detail=page!=='orders';
        const os=detail?orders.filter(o=>o.id===Number(page.split('/')[1])):orders;
        if(detail&&!os.length)throw Error('订单不存在或你无权查看');
        html=detail?heading('订单详情','核对交换物品与交易约定，再决定是否接单。')+`<div class="actions"><button data-page="orders">返回订单列表</button></div>`:heading('交易订单');
        let exchangeContent='';
        if(detail&&os[0].offer){
          const o=os[0],seller=user.id===o.seller_id;
          const target=await api('/products/'+o.product_id);
          const item=(p,images,condition)=>`<section class="exchange-item"><div class="exchange-item-copy"><h2>${e(p.title)}</h2><p class="muted">成色：${e(condition)}</p><p class="offer-description">${e(p.description)}</p></div><div class="offer-gallery">${images.length?images.map((url,i)=>`<img src="${e(url)}" alt="${e(p.title)}，图片${i+1}" loading="lazy">`).join(''):'<p class="muted">暂无物品图片</p>'}</div></section>`;
          exchangeContent=`<p class="exchange-intro">${seller?'对方希望用：':'您希望用：'}</p>${item(o.offer,o.offer.images,o.offer.condition)}<div class="exchange-divider"><span aria-hidden="true">⇅</span><strong>${seller?'来交换您的':'来交换对方的'}</strong></div>${item(o.snapshot,target.images,o.snapshot.condition_text)}<p class="exchange-topup">${o.topup===0?'双方无须补差价':`${o.payer==='seller'?'卖家向买家':'买家向卖家'}补差价 ${money(o.topup)}`}</p><p class="muted">物品文字信息以下单时保存的约定为准。</p>`;
        }
        html+=os.map(o=>`<section class="panel order-card ${exchangeContent?'exchange-pair':''}" ${!detail?`data-order-detail="${o.id}" tabindex="0" role="group" aria-label="订单${o.id}，${e(o.snapshot.title)}，按回车查看详情"`:""}><div class="row"><h2>#${o.id} ${e(o.snapshot.title)}</h2><span class="badge" data-status="${e(o.status)}">${o.status==='pending'?'待卖家确认':label(o.status)}</span></div>${exchangeContent}<p>我是${user.id===o.buyer_id?'买家':'卖家'} · ${money(o.snapshot.price)}</p>${o.offer&&!detail?`<p>交换提供：${e(o.offer.title)} · 差价${money(o.topup)} · ${o.topup===0?'无须补差价':o.payer==='seller'?'卖家付款':'买家付款'}</p>`:''}<div class="delivery-location"><strong>建议交货地点</strong><p>${e(o.snapshot.delivery_location||'尚未填写，请与对方协商')}</p></div>${o.delivery?`<div class="delivery-location"><strong>实际交付记录</strong><p>${e(JSON.parse(o.delivery).location)}</p><p>${e(JSON.parse(o.delivery).note)}</p><small>${new Date(JSON.parse(o.delivery).occurredAt).toLocaleString()}</small></div>`:''}<p class="muted">截止：${new Date(o.deadline).toLocaleString()}；买家${o.buyer_confirmed?'已':'未'}确认 / 卖家${o.seller_confirmed?'已':'未'}确认</p>${o.cancel_status?`<p>取消申请：${({pending:'待回应',agreed:'已同意',denied:'已拒绝',withdrawn:'已撤回'})[o.cancel_status]} · ${e(o.cancel_reason)}</p>`:''}<div class="actions ${detail?'order-detail-actions':''}"><button data-contact-order="${o.id}">联系对方</button>${o.status==='pending'?user.id===o.seller_id?orderBtn(o,'accept','接单')+orderBtn(o,'reject','拒绝'):orderBtn(o,'cancel','取消'):''}${o.status==='delivery'?o.cancel_status==='pending'?user.id===o.cancel_by?orderBtn(o,'withdraw_cancel','撤回申请'):orderBtn(o,'agree_cancel','同意取消')+orderBtn(o,'deny_cancel','拒绝取消'):orderBtn(o,'request_cancel','申请取消')+(user.id===o.seller_id?orderBtn(o,'deliver','记录交付'):''):''}${o.status==='confirmation'?orderBtn(o,'confirm','提交本人完成确认'):''}</div><div class="muted order-events" aria-label="订单操作记录">${o.events.map(ev=>`<div>${e(eventNames[ev.action]||ev.action)} · ${e(ev.detail)} · ${new Date(ev.created_at).toLocaleString()}</div>`).join('')}</div></section>`).join('');
        if(!os.length)html+=emptyState('每一笔流转，都从发现开始','目前没有交易订单。先去发现闲置，找到需要的物品。')
      }
      if(page==='admin'){
        if(user.role!=='admin')throw Error('需要管理员权限');
        const q=await api('/admin/queue');
        html=heading('人工审核工作台','请在线下核验身份后审核。审核操作在服务端验证管理员权限。')+`<section class="panel"><h2>身份审核</h2>${q.certifications.map(c=>`<div class="notice"><b>${e(c.real_name)} · ${e(c.student_no)}</b><p>${e(c.username)}</p><button data-review="certifications:${c.id}:approve">已线下核验，通过</button> <button data-review="certifications:${c.id}:reject">驳回</button></div>`).join('')||'暂无待审申请'}</section><section class="panel"><h2>商品审核</h2>${q.products.map(p=>`<div class="notice"><h3>${e(p.title)}</h3><p>${e(p.description)}</p>${p.images.map(url=>`<img src="${url}" alt="审核图片" class="review-image" loading="lazy">`).join('')}<p>${label(p.trade_type)} · ${money(p.price)}</p><button data-review="products:${p.id}:approve">通过</button> <button data-review="products:${p.id}:reject">驳回</button></div>`).join('')||'暂无待审商品'}</section>`
      }
    }
    $('#app').innerHTML=html;
    if(/^messages\/\d+$/.test(page)){const log=$('#chatLog');log.scrollTop=log.scrollHeight;markChatRead().catch(()=>{});}
    updateUnread().catch(()=>{});
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
let avatarCrop=null,avatarReset=false,avatarReadVersion=0;
function drawAvatarCrop(){
  if(!avatarCrop||!$('#avatarCanvas'))return;
  const c=avatarCrop,scale=c.base*c.zoom;
  const maxX=(c.image.width*scale-512)/2,maxY=(c.image.height*scale-512)/2;
  c.x=Math.max(-maxX,Math.min(maxX,c.x));c.y=Math.max(-maxY,Math.min(maxY,c.y));
  const ctx=$('#avatarCanvas').getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,512,512);
  ctx.drawImage(c.image,256-c.image.width*scale/2+c.x,256-c.image.height*scale/2+c.y,c.image.width*scale,c.image.height*scale);
}
document.addEventListener('change',async ev=>{
  if(ev.target.id!=='avatarFile')return;
  const version=++avatarReadVersion;
  avatarCrop=null;avatarReset=false;$('#avatarCropArea').hidden=true;$('#saveProfile').disabled=true;
  try{
    const file=ev.target.files[0];
    if(!file){$('#saveProfile').disabled=false;return;}
    if(!['image/png','image/jpeg'].includes(file.type))throw Error('头像仅支持PNG或JPEG图片');
    if(file.size>15*1024*1024)throw Error('头像原图不能超过15 MiB');
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('图片读取失败'));reader.readAsDataURL(file);});
    const image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('图片无法读取，请选择有效图片'));image.src=data;});
    if(version!==avatarReadVersion||!$('#avatarCanvas'))return;
    if(image.naturalWidth*image.naturalHeight>40000000)throw Error('原图像素过大，请选择4000万像素以内的图片');
    const resized=document.createElement('canvas'),ratio=Math.min(1,2048/Math.max(image.naturalWidth,image.naturalHeight));
    resized.width=Math.max(1,Math.round(image.naturalWidth*ratio));resized.height=Math.max(1,Math.round(image.naturalHeight*ratio));
    const ctx=resized.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,resized.width,resized.height);
    avatarCrop={image:resized,base:512/Math.min(resized.width,resized.height),zoom:1,x:0,y:0};
    $('#avatarZoom').value='1';$('#avatarCropArea').hidden=false;drawAvatarCrop();$('#saveProfile').disabled=false;
    const encoded=$('#avatarCanvas').toDataURL('image/jpeg',.88);
    $('#avatarSize').textContent=`原图 ${(file.size/1024/1024).toFixed(1)} MiB，初始裁剪约 ${Math.ceil(encoded.length*.75/1024)} KiB；仅上传裁剪结果。`;
  }catch(error){
    if(version!==avatarReadVersion||!$('#avatarCropArea'))return;
    ev.target.value='';avatarCrop=null;$('#avatarCropArea').hidden=true;$('#saveProfile').disabled=false;toast(error.message,'error');
  }
});
let avatarDrag=null;
document.addEventListener('pointerdown',ev=>{
  if(ev.target.id!=='avatarCanvas'||!avatarCrop)return;
  avatarDrag={id:ev.pointerId,x:ev.clientX,y:ev.clientY};ev.target.setPointerCapture(ev.pointerId);
});
document.addEventListener('pointermove',ev=>{
  if(!avatarDrag||ev.pointerId!==avatarDrag.id||!avatarCrop||ev.target.id!=='avatarCanvas')return;
  const factor=512/ev.target.getBoundingClientRect().width;
  avatarCrop.x+=(ev.clientX-avatarDrag.x)*factor;avatarCrop.y+=(ev.clientY-avatarDrag.y)*factor;
  avatarDrag.x=ev.clientX;avatarDrag.y=ev.clientY;drawAvatarCrop();
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,()=>{avatarDrag=null;});
document.addEventListener('input',ev=>{
  if(ev.target.id==='avatarZoom'&&avatarCrop){avatarCrop.zoom=Number(ev.target.value);drawAvatarCrop();}
  if(ev.target.closest('#registerform')&&['password','confirmPassword'].includes(ev.target.id)){
    $('#confirmPassword').removeAttribute('aria-invalid');
    $('#confirm-help').textContent='请再次输入密码';
  }
});
document.addEventListener('submit',async ev=>{
  ev.preventDefault();
  try{
    if(ev.target.id==='messageform'){
      const content=$('#messageContent').value.trim();if(!content)throw Error('消息不能为空');
      const id=chatState.id;
      if(!pendingChatSend||pendingChatSend.id!==id||pendingChatSend.content!==content)pendingChatSend={id,content,requestKey:crypto.randomUUID()};
      await api('/conversations/'+id+'/messages','POST',pendingChatSend);
      pendingChatSend=null;
      if(page==='messages/'+id){if($('#messageContent').value.trim()===content)$('#messageContent').value='';await syncChat();}
    }
    if(ev.target.id==='authform'){
      const m=await api('/login','POST',{
        username:$('#username').value,password:$('#password').value
      }
      );
      user=m.user;
      csrf=m.csrf;
      page=user.role==='admin'?'admin':'market';
      history.replaceState(null,'','#'+page);
      await render()
    }
    if(ev.target.id==='registerform'){
      const password=$('#password').value;
      const confirm=$('#confirmPassword');
      confirm.removeAttribute('aria-invalid');
      if(password!==confirm.value){
        confirm.setAttribute('aria-invalid','true');
        $('#confirm-help').textContent='两次输入的密码不一致，请重新确认';
        throw Error('两次输入的密码不一致');
      }
      const username=$('#username').value;
      const next=$('input[name="certChoice"]:checked').value==='now'?'cert':'market';
      await api('/register','POST',{username,password});
      try{
        const m=await api('/login','POST',{username,password});
        user=m.user;csrf=m.csrf;
      }catch(error){
        page='auth';await render();
        toast('账号已创建，请登录后继续。'+error.message,'error');
        return;
      }
      page=next;
      // 成功后替换地址，刷新时不再回到注册表单。
      history.replaceState(null,'','#'+next);
      await render();
      toast(next==='cert'?'注册成功，请提交学生认证':'注册成功，欢迎先逛逛校园闲置');
    }
    if(ev.target.id==='profileform'){
      const data={nickname:$('#nickname').value,bio:$('#bio').value};
      if(avatarCrop)data.avatar=$('#avatarCanvas').toDataURL('image/jpeg',.88);
      else if(avatarReset)data.avatar='';
      await api('/profile','PUT',data);
      page='profile';history.replaceState(null,'','#profile');await refresh();toast('修改已保存');
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
        title:$('#title').value,category:$('#category').value,condition:$('#condition').value,description:$('#description').value,tradeType:$('#tradeType').value,price:Number($('#price').value),expectation:$('#expectation').value,deliveryLocation:$('#deliveryLocation').value,images:await files('#images')
      }
      );
      toast('物品已提交审核');
      page='mine';
      await render()
    }
  }
  catch(err){
    formError(err,ev.target)
  }
}
);
document.addEventListener('keydown',ev=>{
  const card=ev.target.closest('.card[data-detail], .order-card[data-order-detail]');
  if(card&&ev.target===card&&(ev.key==='Enter'||ev.key===' ')){
    ev.preventDefault();
    card.click();
  }
});
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('button, [data-detail], [data-order-detail]');
  if(!b)return;
  if(b.dataset.passwordToggle){
    const input=document.getElementById(b.dataset.passwordToggle);
    const showing=input.type==='password';
    input.type=showing?'text':'password';
    b.textContent=showing?'隐藏':'显示';
    b.setAttribute('aria-pressed',String(showing));
    b.setAttribute('aria-label',(showing?'隐藏':'显示')+document.querySelector(`label[for="${input.id}"]`).textContent);
    return;
  }
  try{
    if(b.dataset.contactProduct||b.dataset.contactOrder){
      if(!user){page='auth';history.replaceState(null,'','#auth');return render();}
      const body=b.dataset.contactOrder?{orderId:Number(b.dataset.contactOrder)}:{productId:Number(b.dataset.contactProduct)};
      const chat=await api('/conversations','POST',body);
      page='messages/'+chat.id;history.replaceState(null,'','#'+page);return render();
    }
    if(b.dataset.action==='older-messages'){await syncChat(true);return;}
    if(b.dataset.cropMove&&avatarCrop){
      const shifts={left:[-16,0],right:[16,0],up:[0,-16],down:[0,16]};
      const [x,y]=shifts[b.dataset.cropMove];avatarCrop.x+=x;avatarCrop.y+=y;drawAvatarCrop();return;
    }
    if(b.dataset.action==='reset-avatar'){
      avatarReadVersion++;avatarCrop=null;avatarReset=true;
      $('#avatarFile').value='';$('#avatarCropArea').hidden=true;$('#saveProfile').disabled=false;
      $('#avatarPreview').innerHTML=`<span class="avatar avatar-default avatar-large" aria-label="默认头像">${e(user.username.slice(0,1).toUpperCase())}</span>`;
      toast('已选择默认头像，点击保存修改后生效');return;
    }
    if(b.dataset.page){
      page=b.dataset.page;
      history.replaceState(null,'','#'+page);
      return render()
    }
    if(b.dataset.orderDetail){
      page='orders/'+b.dataset.orderDetail;
      history.replaceState(null,'','#'+page);
      return render();
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
      history.replaceState(null,'','#auth');
      return render()
    }
    if(b.dataset.action==='logout'){
      await api('/logout','POST');
      page='market';
      history.replaceState(null,'','#market');
      return refresh()
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
let unreadTick=0;
setInterval(()=>{
  if(!user||document.hidden||loading)return;
  if(/^messages\/\d+$/.test(page))syncChat().catch(()=>{if($('#chatStatus'))$('#chatStatus').textContent='连接暂不可用，正在重试；输入内容已保留';});
  else if(++unreadTick%3===0)updateUnread().catch(()=>{});
},5000);
refresh().catch(error=>{
  $('#app').innerHTML=emptyState('暂时无法连接服务','请确认本地服务器正在运行，然后刷新页面重试。');
  toast(error.message,'error')
}
);
