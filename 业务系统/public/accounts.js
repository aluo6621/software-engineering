function certificationStatus(cs,full,user,e,field){
  const latest=cs[0],approved=cs.find(c=>c.status==='approved');
  if(user.certified)return `<div class="cert-status"><span class="badge" data-status="approved">已通过认证</span><h3>学生身份已认证</h3>${approved?`<p>姓名：${e(approved.real_name)}</p><p>学号：${e(approved.student_no)}</p>`:''}<p class="muted">可以发布物品、咨询与参与交易。认证信息不能通过修改资料变更。</p></div>`;
  if(latest?.status==='pending')return `<div class="cert-status"><span class="badge" data-status="pending">审核中</span><h3>申请已提交，请耐心等待</h3><p>姓名：${e(latest.real_name)}</p><p>学号：${e(latest.student_no)}</p><p class="muted">提交时间：${new Date(latest.created_at).toLocaleString()}。请勿重复申请。</p></div>`;
  const status=latest?.status==='rejected'?`<span class="badge" data-status="rejected">未通过认证</span><p>驳回原因：${e(latest.reason||'请核对身份信息后重新提交')}</p>`:'<p class="muted">尚未认证。完成认证后即可发布物品和参与交易。</p>';
  if(!full)return status+'<button data-page="cert" class="primary">'+(latest?'重新申请认证':'前往身份认证')+'</button>';
  return status+`<form id="certform">${field('realName','姓名','text',`required maxlength="40" value="${e(latest?.real_name||'')}"`)}${field('studentNo','学号','text',`required maxlength="40" value="${e(latest?.student_no||'')}"`)}<button class="primary">提交申请</button></form>`;
}

export async function renderAccountPage({page, user, api, e, field, heading, avatarMarkup, peerAvatar, card, emptyState, resetAvatarEditor}) {
  let html = '';
  if(page==='auth'||page==='register'){
    const registering=page==='register';
    html=`<section class="panel auth-panel auth-card"><span class="eyebrow">CAMPUS CIRCULAR</span><h1>${registering?'开启你的校园流转':'欢迎回来'}</h1><p class="muted">${registering?'创建账号，让闲置遇见需要它的人。':'登录账号，继续你的校园好物流转。'}</p><form id="${registering?'registerform':'authform'}">${field('username','用户名','text','required minlength="4" maxlength="20" pattern="[A-Za-z0-9_]+" autocomplete="username" aria-describedby="username-help"')}<p class="field-help" id="username-help">4～20位字母、数字或下划线</p>${field('password','密码','password',`required ${registering?'minlength="8" maxlength="128" autocomplete="new-password" aria-describedby="password-help"':'autocomplete="current-password"'}`)}${registering?`<p class="field-help" id="password-help">至少8位，须包含字母和数字</p>${field('confirmPassword','确认密码','password','required autocomplete="new-password" aria-describedby="confirm-help"')}<p class="field-help" id="confirm-help">请再次输入密码</p><fieldset class="cert-choice"><legend>注册后，是否立即进行学生认证？</legend><label><input type="radio" name="certChoice" value="now" checked><span><strong>立即认证</strong><small>填写姓名和学号，提交人工审核</small></span></label><label><input type="radio" name="certChoice" value="later"><span><strong>暂时跳过</strong><small>先逛逛，发布和交易前再完成认证</small></span></label></fieldset>`:''}<button type="submit" class="primary auth-submit">${registering?'创建账号':'登录'}</button></form><div class="auth-switch">${registering?'已有账号？':'还没有账号？'} <a href="${registering?'#auth':'#register'}">${registering?'返回登录':'注册新账号'}</a></div></section>`;
  }
    if(/^users\/\d+$/.test(page)){
      const data=await api('/users/'+Number(page.split('/')[1])),p=data.profile,name=p.nickname||p.username;
      html=heading('个人主页')+`<section class="panel"><div class="profile-hero">${peerAvatar(p.id,name,p.avatarVersion,'avatar-large')}<div><h2>${e(name)}</h2><p class="muted">@${e(p.username)} · ${p.certified?'已认证学生':'未认证学生'}</p></div></div><p class="profile-bio">${e(p.bio||'这位同学还没有填写个人简介。')}</p><button data-page="messages">返回私信</button></section><h2>在售闲置</h2><div class="grid">${data.products.map(card).join('')||emptyState('暂时没有在售物品','这位同学目前没有公开在售的闲置。')}</div>`;
    }
    if(page==='profile'||page==='profile-edit'){
      resetAvatarEditor();
      const profile=await api('/profile');
      const cs=user.role==='student'?await api('/certifications'):[];
      const editing=page==='profile-edit';
      const content=editing?`<h2>修改资料</h2><p class="muted">登录用户名：${e(profile.username)}</p><form id="profileform"><div class="avatar-settings"><div id="avatarPreview">${avatarMarkup('avatar-large')}</div><div class="avatar-editor">${field('avatarFile','选择头像原图','file','accept="image/png,image/jpeg" aria-describedby="avatar-help"')}<p class="muted" id="avatar-help">PNG / JPEG，原图最大15 MiB、4000万像素。裁剪后自动压缩为512 × 512头像。</p><div id="avatarCropArea" hidden><p class="muted" id="crop-help">拖动图片调整范围，圆形区域就是头像效果。也可用下方方向按钮微调。</p><canvas id="avatarCanvas" width="512" height="512" aria-label="头像裁剪预览" aria-describedby="crop-help"></canvas><label for="avatarZoom">缩放</label><input id="avatarZoom" type="range" min="1" max="4" step="0.01" value="1"><div class="crop-move" aria-label="移动裁剪图片"><button type="button" data-crop-move="left" aria-label="图片向左移动">←</button><button type="button" data-crop-move="up" aria-label="图片向上移动">↑</button><button type="button" data-crop-move="down" aria-label="图片向下移动">↓</button><button type="button" data-crop-move="right" aria-label="图片向右移动">→</button></div><p id="avatarSize" class="muted" role="status"></p></div><div class="actions"><button type="button" data-action="reset-avatar" ${user.avatarVersion?'':'disabled'}>恢复默认头像</button></div></div></div>${field('nickname','昵称','text',`maxlength="40" value="${e(profile.nickname)}" placeholder="怎么称呼你"`)}<div class="field"><label for="bio">个人简介</label><textarea id="bio" maxlength="300" placeholder="简单介绍一下自己">${e(profile.bio)}</textarea></div><div class="actions"><button id="saveProfile" class="primary">保存修改</button><button type="button" data-page="profile">返回个人主页</button></div></form>`:`<div class="profile-hero">${avatarMarkup('avatar-large')}<div><span class="eyebrow">我的校园主页</span><h2>${e(profile.nickname||profile.username)}</h2><p class="muted">@${e(profile.username)} · ${user.role==='admin'?'管理员':user.certified?'已认证学生':'未认证学生'}</p></div></div><p class="profile-bio">${e(profile.bio||'还没有填写个人简介。')}</p><button data-page="profile-edit" class="primary">修改资料</button>`;
      html=heading(editing?'编辑个人资料':'个人主页',editing?'调整头像、昵称和简介。':'记录你的校园流转生活。')+`<div class="profile-layout"><section class="panel">${content}</section><section class="panel"><h2>身份认证</h2>${user.role==='admin'?'<p class="muted">管理员账号无需学生认证。</p>':certificationStatus(cs,false,user,e,field)}</section></div>`;
    }
    if(page==='cert'){
      const cs=await api('/certifications');
      html=heading('学生身份认证','认证姓名与学号由人工核验，与普通个人资料分开管理。')+`<section class="panel"><div class="actions"><button data-page="profile">返回我的</button></div>${user.role==='admin'?'<p>管理员账号无需学生认证。</p>':certificationStatus(cs,true,user,e,field)}</section>`;
    }
  return html;
}

export function createAccountActions({$, api, e, toast, render, navigate, getUser, setSession}) {
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

  function resetAvatarEditor() {
    avatarCrop = null;
    avatarReset = false;
    avatarReadVersion++;
  }

  async function login() {
    const m=await api('/login','POST',{
      username:$('#username').value,password:$('#password').value
    }
    );
    setSession(m);
    await navigate(m.user.role === 'admin' ? 'admin' : 'market', {replaceHash: true});
  }

  async function register() {
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
      setSession(m);
    }catch(error){
      await navigate('auth');
      toast('账号已创建，请登录后继续。'+error.message,'error');
      return;
    }
    await navigate(next, {replaceHash: true});
    toast(next==='cert'?'注册成功，请提交学生认证':'注册成功，欢迎先逛逛校园闲置');
  }

  async function saveProfile() {
    const data={nickname:$('#nickname').value,bio:$('#bio').value};
    if(avatarCrop)data.avatar=$('#avatarCanvas').toDataURL('image/jpeg',.88);
    else if(avatarReset)data.avatar='';
    await api('/profile','PUT',data);
    await navigate('profile', {replaceHash: true, refreshSession: true});
    toast('修改已保存');
  }

  async function certify() {
    await api('/certifications','POST',{
      realName:$('#realName').value,studentNo:$('#studentNo').value
    }
    );
    toast('已提交审核');
    await render()
  }

  function togglePassword(button) {
    const input=document.getElementById(button.dataset.passwordToggle);
    const showing=input.type==='password';
    input.type=showing?'text':'password';
    button.textContent=showing?'隐藏':'显示';
    button.setAttribute('aria-pressed',String(showing));
    button.setAttribute('aria-label',(showing?'隐藏':'显示')+document.querySelector(`label[for="${input.id}"]`).textContent);
    return;
  }

  function handleAvatarClick(button) {
    if(button.dataset.cropMove&&avatarCrop){
      const shifts={left:[-16,0],right:[16,0],up:[0,-16],down:[0,16]};
      const [x,y]=shifts[button.dataset.cropMove];avatarCrop.x+=x;avatarCrop.y+=y;drawAvatarCrop();return true;
    }
    if(button.dataset.action==='reset-avatar'){
      avatarReadVersion++;avatarCrop=null;avatarReset=true;
      $('#avatarFile').value='';$('#avatarCropArea').hidden=true;$('#saveProfile').disabled=false;
      $('#avatarPreview').innerHTML=`<span class="avatar avatar-default avatar-large" aria-label="默认头像">${e(getUser().username.slice(0,1).toUpperCase())}</span>`;
      toast('已选择默认头像，点击保存修改后生效');return true;
    }
    return false;
  }
  return {login, register, saveProfile, certify, resetAvatarEditor, togglePassword, handleAvatarClick};
}
