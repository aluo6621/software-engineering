export function createMessages({$, api, e, emptyState, heading, peerAvatar, getUser, getPage}) {
  let chatState=null,pendingChatSend=null,chatSyncing=false;
  function chatMessages(messages){
    return messages.length?messages.map(m=>`<div class="chat-message ${m.sender_id===getUser().id?'chat-mine':''}"><div class="chat-bubble">${e(m.content)}</div><small>${new Date(m.created_at).toLocaleString()}${m.sender_id===getUser().id?(m.read_at?' · 已读':' · 已发送'):''}</small></div>`).join(''):'<p class="muted chat-empty">还没有消息，先打个招呼吧。</p>';
  }
  function conversationList(chats){
    return chats.length?chats.map(c=>`<button class="conversation-row" data-page="messages/${c.id}">${peerAvatar(c.peer_id,c.peer_name,c.peer_avatar_version,'conversation-avatar')}<span class="conversation-copy"><strong>${e(c.peer_name)}</strong><span>${e(c.product_title)}</span><small>${e(c.last_message||'尚未发送消息')}</small></span><span>${c.unread?`<span class="unread-count">${c.unread}</span>`:''}<small>${new Date(c.updated_at).toLocaleString()}</small></span></button>`).join(''):emptyState('还没有私信','从商品详情的“联系卖家”，或订单的“联系对方”开始沟通。');
  }
  async function updateUnread(){
    if(!getUser()){const badge=$('#messageUnread');if(badge)badge.hidden=true;return;}
    const accountId=getUser().id;
    const chats=await api('/conversations');
    if(getUser()?.id!==accountId)return;
    const badge=$('#messageUnread'),count=chats.reduce((n,c)=>n+c.unread,0);
    if(badge){badge.textContent=count>99?'99+':String(count);badge.hidden=!count;}
    if(getPage()==='messages'&&$('#conversationList')){const html=conversationList(chats);if($('#conversationList').innerHTML!==html)$('#conversationList').innerHTML=html;}
  }
  async function markChatRead(){
    if(!chatState||getPage()!=='messages/'+chatState.id||!chatState.messages.length)return;
    await api('/conversations/'+chatState.id+'/read','POST',{throughId:chatState.messages.at(-1).id},true);
  }
  async function syncChat(older=false){
    if(chatSyncing||!chatState||getPage()!=='messages/'+chatState.id)return;
    chatSyncing=true;
    const id=chatState.id;
    try{
      const before=older&&chatState.messages.length?'?before='+chatState.messages[0].id:'';
      const data=await api('/conversations/'+id+before);
      if(getPage()!=='messages/'+id||chatState?.id!==id)return;
      const messages=new Map(chatState.messages.map(m=>[m.id,m]));for(const m of data.messages)messages.set(m.id,m);
      chatState.messages=[...messages.values()].sort((a,b)=>a.id-b.id);if(older)chatState.hasMore=data.hasMore;
      const log=$('#chatLog'),atBottom=log.scrollHeight-log.scrollTop-log.clientHeight<80,previousHeight=log.scrollHeight;
      const html=chatMessages(chatState.messages);if(log.innerHTML!==html)log.innerHTML=html;
      if(older)log.scrollTop+=log.scrollHeight-previousHeight;else if(atBottom)log.scrollTop=log.scrollHeight;
      $('#olderMessages').hidden=!chatState.hasMore;$('#chatStatus').textContent='每5秒自动更新';
      if(!document.hidden)await markChatRead();await updateUnread();
    }finally{chatSyncing=false;}
  }

  async function renderPage(page) {
        if(page==='messages'){
          const chats=await api('/conversations');
          return heading('私信','与交易对方沟通物品、时间和交货地点。')+`<section class="panel"><div id="conversationList">${conversationList(chats)}</div></section>`;
        }
        if(/^messages\/\d+$/.test(page)){
          const chat=await api('/conversations/'+Number(page.split('/')[1]));
          chatState={id:chat.id,messages:chat.messages,hasMore:chat.hasMore};pendingChatSend=null;
          return `<div class="title chat-title"><a class="peer-avatar-link" href="#users/${chat.peer_id}" aria-label="查看${e(chat.peer_name)}的主页">${peerAvatar(chat.peer_id,chat.peer_name,chat.peer_avatar_version,'avatar-large')}</a><div><span class="eyebrow">CAMPUS CIRCULAR</span><h1>与 ${e(chat.peer_name)} 的私信</h1><p class="muted">关于：${e(chat.product_title)}</p><a class="peer-profile-link" href="#users/${chat.peer_id}">查看对方主页 →</a></div></div>`+`<section class="panel chat-panel"><div class="row"><button data-page="messages">返回会话列表</button><span class="muted" id="chatStatus" role="status">每5秒自动更新</span></div><div class="chat-context"><strong>关联物品</strong> ${e(chat.product_title)}</div><button id="olderMessages" data-action="older-messages" ${chat.hasMore?'':'hidden'}>加载更早消息</button><div id="chatLog" class="chat-log" role="log" aria-label="聊天记录" aria-live="polite">${chatMessages(chat.messages)}</div><form id="messageform"><div class="field"><label for="messageContent">消息</label><textarea id="messageContent" required maxlength="2000" placeholder="聊聊物品细节或约定交付时间…" ${getUser().certified&&getUser().role==='student'?'':'disabled'}></textarea></div><div class="row"><small class="muted">${getUser().certified&&getUser().role==='student'?'仅支持文字，每条最多2000字。':'通过学生认证后才能发送消息。'}</small><button class="primary" ${getUser().certified&&getUser().role==='student'?'':'disabled'}>发送</button></div></form></section>`;
        }
  }

  async function sendMessage() {
        const content=$('#messageContent').value.trim();if(!content)throw Error('消息不能为空');
        const id=chatState.id;
        if(!pendingChatSend||pendingChatSend.id!==id||pendingChatSend.content!==content)pendingChatSend={id,content,requestKey:crypto.randomUUID()};
        await api('/conversations/'+id+'/messages','POST',pendingChatSend);
        pendingChatSend=null;
        if(getPage()==='messages/'+id){if($('#messageContent').value.trim()===content)$('#messageContent').value='';await syncChat();}
  }

  function afterRender() {
    if(/^messages\/\d+$/.test(getPage())){const log=$('#chatLog');if(log){log.scrollTop=log.scrollHeight;markChatRead().catch(()=>{});}}
    updateUnread().catch(()=>{});
  }

  let unreadTick=0;
  function poll() {
    if(!getUser()||document.hidden)return;
    if(/^messages\/\d+$/.test(getPage()))syncChat().catch(()=>{if($('#chatStatus'))$('#chatStatus').textContent='连接暂不可用，正在重试；输入内容已保留';});
    else if(++unreadTick%3===0)updateUnread().catch(()=>{});
  }

  async function openConversation(target) {
    const chat = await api('/conversations', 'POST', target);
    return 'messages/' + chat.id;
  }

  return {renderPage, afterRender, sendMessage, syncChat, poll, openConversation};
}
