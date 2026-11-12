export function createConversationRoutes({db, now, auth, body, fail, text, hash}) {
  async function handleCollection(req, send) {
    const method = req.method;
    if(method==='GET'){
      const u=auth(req);
      const rows=db.prepare(`SELECT c.*,p.title product_title,
       CASE WHEN c.buyer_id=? THEN COALESCE(NULLIF(s.nickname,''),s.username) ELSE COALESCE(NULLIF(b.nickname,''),b.username) END peer_name,
       CASE WHEN c.buyer_id=? THEN s.id ELSE b.id END peer_id,
       CASE WHEN c.buyer_id=? THEN s.avatar ELSE b.avatar END peer_avatar,
       (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY id DESC LIMIT 1) last_message,
       COALESCE((SELECT MAX(created_at) FROM messages WHERE conversation_id=c.id),c.created_at) updated_at,
       (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_id<>? AND read_at IS NULL) unread
       FROM conversations c JOIN products p ON p.id=c.product_id JOIN users b ON b.id=c.buyer_id JOIN users s ON s.id=c.seller_id
       WHERE c.buyer_id=? OR c.seller_id=? ORDER BY updated_at DESC,c.id DESC`).all(u.id,u.id,u.id,u.id,u.id,u.id);
      return send(200,rows.map(({peer_avatar,...c})=>({...c,peer_avatar_version:peer_avatar?hash(peer_avatar).slice(0,16):null})));
    }
    if(method==='POST'){
      const u=auth(req,'student'),b=await body(req);if(!b||typeof b!=='object')fail(400,'请选择商品或订单');
      let product,buyer,seller;
      if(b.orderId!==undefined){
        const o=db.prepare('SELECT * FROM orders WHERE id=?').get(Number(b.orderId));
        if(!o||![o.buyer_id,o.seller_id].includes(u.id))fail(403,'不是订单参与者');
        product=o.product_id;buyer=o.buyer_id;seller=o.seller_id;
      }else{
        const p=db.prepare('SELECT * FROM products WHERE id=?').get(Number(b.productId));
        if(!p||p.status!=='live')fail(404,'商品不存在或暂不可咨询');
        if(p.owner_id===u.id)fail(400,'不能给自己发送私信');
        product=p.id;buyer=u.id;seller=p.owner_id;
      }
      const peer=db.prepare('SELECT role,certified FROM users WHERE id=?').get(u.id===buyer?seller:buyer);
      if(!peer||peer.role!=='student'||!peer.certified)fail(403,'对方暂不可接收私信');
      db.prepare('INSERT OR IGNORE INTO conversations(product_id,buyer_id,seller_id,created_at) VALUES(?,?,?,?)').run(product,buyer,seller,now());
      return send(200,{id:db.prepare('SELECT id FROM conversations WHERE product_id=? AND buyer_id=? AND seller_id=?').get(product,buyer,seller).id});
    }
    fail(405,'不支持的请求');
  }

  async function handleConversation(req, url, send, match) {
    const method = req.method;
    const u=auth(req),id=Number(match[1]),action=match[2];
    const c=db.prepare('SELECT * FROM conversations WHERE id=?').get(id);
    if(!c||![c.buyer_id,c.seller_id].includes(u.id))fail(404,'会话不存在或无权查看');
    if(!action&&method==='GET'){
      const peer=db.prepare('SELECT id,username,nickname,avatar FROM users WHERE id=?').get(u.id===c.buyer_id?c.seller_id:c.buyer_id);
      const before=url.searchParams.get('before');const boundary=before===null?Number.MAX_SAFE_INTEGER:Number(before);
      if(!Number.isSafeInteger(boundary)||boundary<1)fail(400,'消息分页参数不合法');
      const rows=db.prepare('SELECT id,sender_id,content,created_at,read_at FROM messages WHERE conversation_id=? AND id<? ORDER BY id DESC LIMIT 101').all(id,boundary);
      return send(200,{id,product_id:c.product_id,product_title:db.prepare('SELECT title FROM products WHERE id=?').get(c.product_id).title,peer_id:peer.id,peer_username:peer.username,peer_name:peer.nickname||peer.username,peer_avatar_version:peer.avatar?hash(peer.avatar).slice(0,16):null,messages:rows.slice(0,100).reverse(),hasMore:rows.length>100});
    }
    if(action==='messages'&&method==='POST'){
      auth(req,'student');
      const b=await body(req);if(!b)fail(400,'消息不能为空');
      const content=text(b.content,1,2000),key=text(b.requestKey,8,100);
      const old=db.prepare('SELECT * FROM messages WHERE sender_id=? AND request_key=?').get(u.id,key);
      if(old){if(old.conversation_id!==id||old.content!==content)fail(409,'请求标识已用于其他消息');return send(200,{id:old.id});}
      const r=db.prepare('INSERT INTO messages(conversation_id,sender_id,content,request_key,created_at) VALUES(?,?,?,?,?)').run(id,u.id,content,key,now());
      return send(201,{id:Number(r.lastInsertRowid)});
    }
    if(action==='read'&&method==='POST'){
      const b=await body(req),through=Number(b?.throughId);
      if(!Number.isSafeInteger(through)||through<0)fail(400,'已读消息编号不合法');
      db.prepare('UPDATE messages SET read_at=? WHERE conversation_id=? AND sender_id<>? AND id<=? AND read_at IS NULL').run(now(),id,u.id,through);
      return send(200,{ok:true});
    }
    fail(405,'不支持的请求');
  }

  return async function handleConversationRequest(req, url, send) {
    if (url.pathname === '/api/conversations') {
      await handleCollection(req, send);
      return true;
    }

    const match = url.pathname.match(/^\/api\/conversations\/(\d+)(?:\/(messages|read))?$/);
    if (!match) return false;

    await handleConversation(req, url, send, match);
    return true;
  };
}
