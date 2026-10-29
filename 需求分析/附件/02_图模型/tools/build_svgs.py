"""Rebuild readable, hand-laid-out SVG views of the requirement models.
Run: python3 tools/build_svgs.py (from any directory).
These SVG views use fixed layouts, not PlantUML auto-layout. Keep text/edges
aligned with the .puml semantic source and the requirements before rebuilding.
"""
from pathlib import Path
from html import escape
import json, shutil, re
ROOT=Path(__file__).resolve().parents[1]
C={'ink':'#142D4E','muted':'#53677F','line':'#60778F','blue':'#EAF2FF','green':'#E9F6EF','amber':'#FFF4DD','red':'#FCEDEA','purple':'#F2ECFA','white':'#FFFFFF','border':'#CED9E5'}
PAGES=[]
class SVG:
 def __init__(self,name,title,sub,w=1440,h=1000):
  self.name=name;self.w=w;self.h=h;self.items=[];self.boxes=[]
  self.items.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(sub)}。V2.0 优化稿，用户规则已确认，待小组评审，非执行验证结果。</desc><defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="{C["line"]}"/></marker></defs>')
  self.rect(0,0,w,h,'#F6F8FC',0)
  self.text(42,47,title,28,'ink',bold=True)
  self.text(42,79,sub,15,'muted')
  self.path([(42,100),(w-42,100)],arrow=False,color='border')
 def rect(self,x,y,w,h,fill='white',r=12,stroke=None):
  fill=C.get(fill,fill);stroke=C.get(stroke,stroke) if stroke else C['border']
  self.items.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
 def text(self,x,y,txt,size=16,color='ink',bold=False,anchor='start'):
  self.items.append(f'<text x="{x}" y="{y}" font-family="PingFang SC,Microsoft YaHei,Noto Sans CJK SC,sans-serif" font-size="{size}" fill="{C.get(color,color)}" font-weight="{600 if bold else 400}" text-anchor="{anchor}">{escape(txt)}</text>')
 def lines(self,x,y,lines,size=16,gap=26,color='muted'):
  for i,l in enumerate(lines):self.text(x,y+i*gap,l,size,color)
 def panel(self,x,y,w,h,title,sub=None):
  self.rect(x,y,w,h,'white',16)
  self.text(x+20,y+32,title,19,bold=True)
  if sub:self.text(x+20,y+58,sub,14,'muted')
 def card(self,key,x,y,w,h,title,lines=(),fill='blue',badge=None):
  assert x>=0 and y>=100 and x+w<=self.w and y+h<=self.h-36,(key,x,y,w,h)
  self.boxes.append((key,x,y,w,h))
  self.rect(x,y,w,h,fill,12)
  self.text(x+16,y+29,title,18,bold=True)
  self.lines(x+16,y+56,lines,15,24)
  if badge:self.text(x+w-14,y+h-12,badge,12,'muted',anchor='end')
 def path(self,pts,label=None,lx=None,ly=None,arrow=True,dash=False,color='line'):
  d='M'+' L'.join(f'{x},{y}' for x,y in pts)
  self.items.append(f'<path d="{d}" fill="none" stroke="{C.get(color,color)}" stroke-width="1.6" stroke-linejoin="round"'+(' stroke-dasharray="6 5"' if dash else '')+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
  if label:self.text(lx,ly,label,13,'muted')
 def edge(self,a,b,label='',side='v',dash=False):
  boxes={r[0]:r[1:] for r in self.boxes};x,y,w,h=boxes[a];xx,yy,ww,hh=boxes[b]
  if side=='v':pts=[(x+w/2,y+h),(xx+ww/2,yy)]
  else:pts=[(x+w,y+h/2),(xx,yy+hh/2)]
  self.path(pts,dash=dash)
  if label:
   mx=(pts[0][0]+pts[1][0])/2;my=(pts[0][1]+pts[1][1])/2
   self.text(mx+8,my-7,label,13,'muted')
 def footer(self,txt='V2.0 · 分模块优化稿 · 规则已确认，业务待验证；图示不代表已实现或测试通过'):
  self.text(42,self.h-18,txt,13,'muted')
 def save(self):
  self.footer();self.items.append('</svg>');(ROOT/self.name).write_text('\n'.join(self.items))
  PAGES.append((self.name,re.sub(r'<[^>]*>','',self.items[2]) if False else self.name))
  return self

# 01: five parallel goal columns; no crossing edges.
s=SVG('M-01-目标树.svg','M-01 业务目标树','阅读顺序：总体目标 → 五项目标 → 可观察的验收行为',1600,790)
s.card('root',430,125,740,90,'G-0 让校园闲置物品流转可查找、可协商、可追溯',['出售 · 免费转让 · 以物易物；线下交付，平台不处理资金'],'blue')
goals=[('G-1 权限与治理',['G-1.1 校园身份与授权','未认证不能发布或下单','G-1.2 举报与处置','结论、理由和执行者可查']),('G-2 发布与流转',['G-2.1 发布与审核','通过后展示，驳回可修订','G-2.2 三类业务闭环','各完成一条正常场景']),('G-3 进度与记录',['G-3.1 商品状态一致','下单即锁定关联物品','G-3.2 订单状态一致','重复/并发不冲突','G-3.3 交付有记录','双方各自确认后完成']),('G-4 反馈与责任',['G-4.1 交易双方可评价','仅本人参与的完成订单','G-4.2 管理处置可追溯','操作人与理由完整留痕']),('G-5 统计与核对',['G-5.1 商品/订单/用户','统一时间与统计口径','汇总与样例明细可核对'])]
for i,(title,ls) in enumerate(goals):
 x=40+i*308;s.card(str(i),x,295,288,285,title,ls,'green' if i%2 else 'blue')
 s.path([(800,215),(800,250),(x+144,250),(x+144,295)])
s.panel(40,620,1520,100,'验证边界','不使用无依据的认证通过率、评价率或处理时长；观察项需转化为场景并实际执行。')
s.save()
# 02: actors on left, central boundary and external candidate on right.
s=SVG('M-02-系统上下文图.svg','M-02 系统上下文','本期仅本校学生；人工审核姓名学号；线下付款不是平台接口',1440,900)
s.card('v',45,150,280,110,'访客',['注册 / 登录','浏览公开商品'],'white')
s.card('u',45,340,280,150,'注册用户',['未认证：资料 / 收藏 / 举报','已认证：发布 / 咨询 / 下单','双方：履约 / 本人确认 / 评价'],'white')
s.card('a',45,570,280,130,'管理员',['认证与商品审核、举报处置','账号与商品管理、异常订单','统计与必要敏感读取留痕'],'white')
s.card('sys',465,250,510,350,'校园二手交易与物品流转平台',['账号认证 │ 商品与发现','咨询订单 │ 交付与双方确认','评价举报 │ 处置与统计','','业务：出售 / 免费转让 / 交换','平台内支付、租用、押金、跑腿不纳入'],'blue')
for key in ['v','u','a']:
 d={q[0]:q[1:] for q in s.boxes};x,y,w,h=d[key];target={'v':310,'u':420,'a':540}[key];s.path([(325,y+h/2),(395,y+h/2),(395,target),(465,target)])
s.card('ext',1110,330,285,155,'本期认证边界',['仅本校学生，提交姓名和学号','管理员线下核验后记录结论','不上传证件，不接统一认证接口'],'amber')
# No external authentication integration in this release.
s.panel(465,665,930,145,'平台之外的实际活动')
s.lines(485,728,['双方当面交付实物；有价款时自行转账。','平台保存约定与声明，不验证银行或微信到账，不代办退款。','站内通知已纳入；订单列表与详情始终提供进度入口。'],16)
s.save()
# 03: actor-specific use case panels; no lifecycle extend arrows.
s=SVG('M-03-用例图.svg','M-03 按参与者分区的用例图','各分区用关联线连接参与者与用例；同名参与者可重复出现；先后步骤不画成 extend',1760,1050)
def usepanel(x,w,title,actor,items,note):
 s.panel(x,125,w,790,title)
 cx=x+42;cy=220
 s.items.append(f'<circle cx="{cx}" cy="{cy-31}" r="10" fill="white" stroke="{C["line"]}"/>')
 s.path([(cx,cy-21),(cx,cy+14)],arrow=False);s.path([(cx-15,cy-9),(cx+15,cy-9)],arrow=False);s.path([(cx,cy+14),(cx-13,cy+32)],arrow=False);s.path([(cx,cy+14),(cx+13,cy+32)],arrow=False)
 s.text(x+17,cy+57,actor,13)
 trunk=x+91
 for i,(id,name) in enumerate(items):
  yy=190+i*73;ex=x+w-142
  s.items.append(f'<ellipse cx="{ex}" cy="{yy+25}" rx="121" ry="25" fill="{C["blue"]}" stroke="{C["border"]}"/>')
  s.text(ex,yy+30,id+' '+name,14,anchor='middle')
  s.path([(trunk,yy+25),(ex-121,yy+25)],arrow=False)
 s.path([(cx+15,cy-9),(trunk,cy-9)],arrow=False)
 s.path([(trunk,215),(trunk,215+(len(items)-1)*73)],arrow=False)
 s.lines(x+18,850,note,13,21)
usepanel(32,402,'公开访问','访客',[('UC-01','注册账号'),('UC-02','登录'),('UC-07','浏览搜索'),('UC-08','查看详情')],['仅公开字段；受保护操作先登录。'])
usepanel(464,402,'一般账号能力','注册用户',[('UC-02','登录 / 退出'),('UC-03','提交校园认证'),('UC-04','维护个人资料'),('UC-07','浏览搜索'),('UC-08','查看详情'),('UC-09','收藏商品'),('UC-17','举报对象'),('UC-23','接收 / 查看通知')],['未认证账号可收藏、举报。','站内通知仅本人可读。'])
usepanel(896,402,'交易能力','已认证用户',[('UC-05','发布商品'),('UC-06','管理本人商品'),('UC-10','发起咨询 / 回复'),('UC-11','买家下单'),('UC-12','卖家接单 / 拒绝'),('UC-13','按阶段取消'),('UC-14','记录线下交付'),('UC-15','双方各自确认'),('UC-16','评价交易对象')],['继承一般账号能力。','另查账号状态、归属与交易阶段。'])
usepanel(1328,400,'管理能力','管理员',[('UC-24','审核校园认证'),('UC-18','审核商品'),('UC-19','处理举报'),('UC-20','限制 / 封禁 / 解禁'),('UC-21','违规下架'),('UC-25','处理异常订单'),('UC-22','查看统计')],['使用管理账号登录（UC-02）。','不代替交易双方确认或评价。'])
s.panel(32,940,1696,58,'授权规则：先检查身份与账号状态，再检查对象归属、交易阶段和暂停状态。')
s.save()
# 04: swimlane vertical main spine and simple loop in margin.
s=SVG('M-04-活动图-商品发布与审核.svg','M-04 商品发布与审核','主线向下；校验失败回草稿；驳回后修改重提，或放弃下架',1440,1060)
s.panel(40,125,890,840,'发布方与系统');s.panel(970,125,430,840,'管理员审核')
for key,x,y,w,h,title,ls,col in [
 ('fill',240,195,480,105,'填写并保存草稿',['物品、方式、图片；出售正价 / 赠送零价 / 交换条件'],'blue'),
 ('check',240,355,480,95,'校验必填与权限',['失败保留原稿，不生成有效审核请求'],'blue'),
 ('submit',240,505,480,95,'提交当前版本',['待审核 · ST-P01；驳回重提 ST-P04'],'blue'),
 ('review',1010,505,350,120,'查看并审查当前版本',['通过或驳回均留痕','不以审核声明已证明实物真实'],'purple'),
 ('live',1010,710,350,95,'通过 → 在售',['ST-P02；可公开、收藏、下单'],'green'),
 ('reject',240,710,480,95,'驳回 → 审核驳回',['ST-P03；卖家查看理由、修改重提'],'amber')]:s.card(key,x,y,w,h,title,ls,col)
s.edge('fill','check');s.edge('check','submit','有效');s.edge('submit','review',side='h');s.edge('review','live','通过')
s.path([(1010,590),(925,590),(925,757),(720,757)],'驳回',935,680)
s.path([(240,755),(125,755),(125,552),(240,552)],'修改重提',62,650)
s.path([(240,400),(170,400),(170,247),(240,247)],'校验失败',70,330)
s.text(260,860,'暂不提交：保留草稿；放弃修改：已下架（ST-P08）。',16)
s.text(260,892,'已下架重提及公开商品关键编辑均需再审核。',16)
s.save()
# 05: sequential spine, branch cards off spine and three-mode detail panel.
s=SVG('M-05-活动图-交易流程.svg','M-05 下单、交付与完成','主线向下；右侧列出本阶段的退出与异常分支；交换同单处理两件物品',1500,1420)
steps=[('1','浏览、咨询与核对约定',['出售：确认价格；赠送：免费；交换：直接填写本人提供物品'],'blue'),('2','创建待确认订单，同时锁定物品',['ST-O01 / ST-P05；保存快照、截止时刻与请求标识','各方式均只锁目标商品；交换提供项仅私有快照，保存失败整单不生效'],'blue'),('3','卖家在截止前接单 → 待交付',['ST-O02；物品保持已预订；双方可查看联系方式'],'blue'),('4','双方线下处理价款并交付实物',['出售自行付款；赠送无价款；交换当面交出并接收物品','交换可协商差价，由约定付款方自行转账；平台不验证到账'],'blue'),('5','卖家记录实际交付 → 待双方确认',['ST-O05；记录时间、地点及全部物品的交付说明','填写记录不自动设置任何一方的确认'],'blue'),('6','双方按任意顺序提交本人确认',['只确认一方仍未完成；重复确认不覆盖他方标记'],'blue'),('7','双方均确认 → 订单与目标商品完成',['ST-O07 / ST-P07；同次业务处理生效，开放评价'],'green')]
for i,(key,title,ls,col) in enumerate(steps):
 y=135+i*160;s.card(key,60,y,820,120,title,ls,col)
 if i:s.edge(str(i),key)
s.card('fail',1010,295,430,120,'下单拒绝',['权限、版本、占用任一不满足即拒绝','不创建半笔订单，不覆盖已变化状态'],'red')
s.path([(880,355),(1010,355)])
s.card('exit',1010,455,430,145,'待确认阶段先发生的有效操作',['买家取消 ST-O03','卖家拒绝 / 超时关闭 ST-O04','接受、取消、超时竞争仅一个生效'],'amber');s.path([(880,515),(1010,515)])
s.card('cancel',1010,655,430,120,'待交付阶段取消',['双方均可申请，须另一方同意','ST-O06；未实际交付才可取消'],'amber');s.path([(880,690),(950,690),(950,715),(1010,715)])
s.card('hold',1010,860,430,150,'任何进行中阶段：人工核实',['管理员暂停 ST-O08，保留物品占用','暂停阻止普通操作与自动超时关闭','恢复 / 有据终止见 M-09','不能代双方确认或自动完成'],'purple')
s.panel(60,1290,1380,75,'取消 / 关闭后的统一出口：BR-22 判断目标商品去向','发布者正常、认证有效、无违规且配额≤20才恢复在售；否则已下架，违规下架保持；提供项保留私有快照，关联更新整体生效。')
s.save()
# 06: branches and resolution separate, no unconditional fork.
s=SVG('M-06-活动图-举报处理.svg','M-06 举报核实与关联处置','举报结果与订单结果分别保存；提交举报本身不自动暂停交易',1440,1120)
for key,x,y,w,h,t,ls,col in [
 ('input',410,135,620,100,'提交举报并校验',['正常或限制状态的已登录用户，含未认证；对象须有权访问'],'blue'),
 ('record',410,295,620,100,'保存原始举报 → 待处理',['保留举报人、证据与关联订单；分组不扩大访问范围'],'blue'),
 ('review',410,455,620,100,'管理员受理并核实',['记录依据；根据对象和实际阶段选择处置，不强制同时封禁与下架'],'purple'),
 ('no',60,640,470,110,'不成立',['写明理由与处理结论','仅向举报人展示与其相关的结果'],'amber'),
 ('yes',790,640,590,110,'成立：执行有依据的账号 / 商品处置',['在售或已预订商品可违规下架','涉及进行中订单须同时暂停 ST-O08'],'red'),
 ('order',790,815,590,150,'异常订单单独处理 UC-25',['原因消除且满足条件 → 原阶段恢复 ST-O09','依据充分、遗留事项解决 → 已关闭 ST-O10','未解决继续暂停；不代双方完成'],'purple')]:s.card(key,x,y,w,h,t,ls,col)
s.edge('input','record');s.edge('record','review')
s.path([(600,555),(600,595),(295,595),(295,640)],'不成立',320,582)
s.path([(830,555),(830,595),(1085,595),(1085,640)],'成立',1100,582)
s.edge('yes','order','存在关联进行中订单')
s.panel(60,995,1320,65,'所有处置留痕；举报已处理 ≠ 订单已完成；举报人身份与其他投诉证据不对被举报方公开。')
s.save()
# class detail helpers

def cls(s,key,x,y,w,title,fields,fill='blue'):
 h=67+len(fields)*25;s.card(key,x,y,w,h,title,fields,fill);return h

def assoc(s,a,b,left,right,side='h',label=''):
 d={k:(x,y,w,h) for k,x,y,w,h in s.boxes};x,y,w,h=d[a];xx,yy,ww,hh=d[b]
 if side=='h':
  y1=y+h/2;y2=yy+hh/2;s.path([(x+w,y1),(xx,y2)],arrow=False)
  s.text(x+w+8,y1-9,left,13);s.text(xx-8,y2-9,right,13,anchor='end')
  if label:s.text((x+w+xx)/2,(y1+y2)/2+22,label,13,anchor='middle')
 else:
  s.path([(x+w/2,y+h),(xx+ww/2,yy)],arrow=False)
  s.text(x+w/2+9,y+h+20,left,13);s.text(xx+ww/2+9,yy-10,right,13)
  if label:s.text(x+w/2+20,(y+h+yy)/2,label,13)
# M07 main: core associations, details split explicitly.
s=SVG('M-07-领域类图.svg','M-07 领域模型 · 核心交易关系','只展示核心对象与数量关系；完整字段及支撑对象分见 M-07A / B / C，合计16个对象',1560,1130)
cls(s,'user',50,160,350,'User 用户',['账号角色 / 账号状态','认证资格与账号状态分别判断'])
cls(s,'order',600,160,390,'Order 订单',['买家 / 卖家 / 方式 / 金额 / 差价','生命周期 / 正常或暂停','确认截止 / 结束原因 / 取消申请'])
cls(s,'event',1190,160,320,'OrderEvent 事件',['请求标识 / 执行者 / 时间','前后状态 / 处置引用'])
assoc(s,'user','order','1','0..*',label='买家 / 卖家（不同用户）');assoc(s,'order','event','1','1..*',label='追加历史')
cls(s,'item',600,475,390,'OrderItem 订单物品项',['目标关联商品；提供项仅私有资料','交出与接收方向 / 不可覆盖快照'])
cls(s,'product',50,475,350,'Product 商品',['发布者 / 方式 / 价格 / 状态','内容版本 / 交换期望'])
assoc(s,'order','item','1','1..2','v','订单内物品');assoc(s,'product','item','0..1','0..*',label='仅目标项关联；提供项为空')
cls(s,'delivery',600,790,390,'DeliveryRecord 交付记录',['实际交付与记录时间 / 地点','逐件说明；不代替双方确认'])
s.path([(990,275),(1130,275),(1130,735),(795,735),(795,790)],arrow=False)
s.text(1000,263,'1',13);s.text(807,776,'0..1',13);s.text(1140,635,'有效交付记录',13)
cls(s,'confirm',1190,790,320,'DeliveryConfirmation 确认',['订单 / 本人 / 首次确认时间','同单同人最多一条'])
s.path([(990,295),(1160,295),(1160,700),(1350,700),(1350,790)],arrow=False)
s.text(1000,313,'1',13);s.text(1360,776,'0..2',13);s.text(1190,690,'本人确认',13)
s.panel(50,760,350,220,'核心约束')
s.lines(68,824,['订单 → 交付记录：1 对 0..1','订单 → 本人确认：1 对 0..2','出售 / 赠送恰好 1 个物品项','交换 2 项，提供项不预发布','暂停仍占用目标，不自动释放'],14,27)
s.panel(50,1015,1460,65,'详细模型：M-07A 账号与商品 · M-07B 订单与履约 · M-07C 反馈与治理；数量标注见各关系端点。')
s.save()
# A
s=SVG('M-07A-账号与商品.svg','M-07A 领域模型 · 账号、认证与商品','M-07 分图 1/3 · 认证保留提交版本；草稿允许无图，提交审核至少一图',1560,1000)
cls(s,'user',50,150,400,'User 用户',['userId / username / passwordHash','展示名 / 联系方式（受限）','role / accountStatus','restrictionUntil / createdAt'])
cls(s,'cert',1010,150,500,'CampusCertification 认证申请',['certId / userId / submissionVersion','姓名 / 学号（私有，仅此两项）','status / submittedAt','审核人 / 时间 / 结论与理由'])
assoc(s,'user','cert','1','0..*',label='提交历史；同时最多一条待审核')
cls(s,'product',50,560,510,'Product 商品',['productId / ownerId / categoryId','标题 / 描述 / 成色 / 交易方式','price / exchangeExpectation','status / contentVersion / 创建与更新时间'])
s.path([(250,317),(250,560)],arrow=False);s.text(265,344,'1',13);s.text(265,542,'0..* 发布',13)
cls(s,'image',1010,560,500,'ProductImage 商品图片',['imageId / productId','assetRef / sortOrder','快照所引用的旧图片版本不可替换'])
assoc(s,'product','image','1','0..*',label='提交时至少一张')
cls(s,'cat',640,340,300,'Category 分类',['categoryId / name','单级分类，无父分类'],'green')
s.path([(790,457),(790,515),(430,515),(430,560)],arrow=False);s.text(800,485,'1',13);s.text(440,545,'0..* 商品',13)
s.panel(50,845,1460,90,'约束','发布者不可由用户换绑；出售正价、赠送 0；交换无商品售价，差价及方向单列；认证通过记录与正常/限制/封禁分别判断。')
s.save()
# B
s=SVG('M-07B-订单与履约.svg','M-07B 领域模型 · 订单、交付与历史','M-07 分图 2/3 · 关联线表示业务归属，不授权级联删除证据',1680,1260)
cls(s,'order',590,135,500,'Order 订单',['orderId / buyerId ≠ sellerId','tradeType / agreedAmount / currency / 差价与方向','lifecycleStatus / handlingStatus / 取消申请状态','confirmationDeadline / creationRequestKey','创建 / 接受 / 完成 / 结束时间与原因'])
cls(s,'item',40,520,470,'OrderItem 物品项 + 快照',['orderId / productId（提供项为空）','itemRole / 交出与接收方 / 目标版本','标题 / 描述 / 分类 / 成色 / 图片快照','方式 / 价格 / 交换期望快照'])
cls(s,'delivery',605,520,470,'DeliveryRecord 交付记录',['orderId / recordedBy','occurredAt / recordedAt / location','itemHandoverNotes（全部物品项）'])
cls(s,'confirm',1170,520,470,'DeliveryConfirmation 本人确认',['orderId / userId / confirmedAt','只允许买家或卖家本人','同一订单同一人最多一条'])
for target,top,bot,xx in [('item','1','1..2',750),('delivery','1','0..1',840),('confirm','1','0..2',930)]:
 d={k:(x,y,w,h) for k,x,y,w,h in s.boxes};x,y,w,h=d[target];cx=x+w/2;mid=430 if target=='item' else 455 if target=='delivery' else 480
 s.path([(xx,327),(xx,mid),(cx,mid),(cx,520)],arrow=False);s.text(xx+9,350,top,13);s.text(cx+9,506,bot,13)
cls(s,'event',605,870,470,'OrderEvent 追加事件',['orderId / actionType / actor / time','requestKey / 前后生命周期与处理状态','reason / adminActionId（可选）','deadlineBefore / deadlineAfter'])
s.path([(1090,245),(1120,245),(1120,810),(840,810),(840,870)],arrow=False);s.text(1100,232,'1',13);s.text(852,855,'1..*',13)
s.panel(40,870,470,200,'物品项约束')
s.lines(58,932,['出售 / 赠送：1 个目标项','交换：目标项 + 本人提供项，共 2 项','提供者直接填物品资料，不先发布审核','仅已发布目标有唯一占用，不识别实物重复描述'],14,27)
s.panel(1170,870,470,200,'确认与历史约束')
s.lines(1188,932,['创建、快照、锁定与事件整体生效','交付记录不自动产生本人确认','暂停保留目标锁定、原阶段与确认','恢复时记录新旧截止；历史不覆盖'],14,27)
s.save()
# C
s=SVG('M-07C-反馈与治理.svg','M-07C 领域模型 · 反馈、咨询与治理','M-07 分图 3/3 · 用户/订单/商品为重复引用；仅画本分图所需关系',1640,1560)
cls(s,'user',50,145,350,'User 用户（引用）',['普通用户或管理账号','管理操作须管理员权限'])
cls(s,'order',660,145,350,'Order 订单（引用）',['双方和阶段可验证','举报背景关联为可选'])
cls(s,'product',1230,145,350,'Product 商品（引用）',['有权访问才可举报','收藏不扩大访问资格'])
cls(s,'review',50,485,440,'Review 评价',['orderId / reviewerId / revieweeId','rating / content / createdAt','replyContent / repliedBy / repliedAt'])
cls(s,'report',600,485,440,'Report 举报',['reporterId / targetType / targetId','relatedOrderId（可选）/ evidenceRefs','status / 处理人时间 / result','groupRef 分组不扩大访问'])
cls(s,'consult',1150,485,440,'Consultation 咨询',['productId / askerId / content','reply / repliedBy / repliedAt','仅提问者与发布者可读'])
s.path([(225,262),(225,485)],arrow=False);s.text(237,290,'1 评价人 / 被评价人',13);s.text(237,470,'0..*',13)
s.path([(835,262),(835,355),(270,355),(270,485)],arrow=False);s.text(846,290,'1',13);s.text(282,446,'0..2',13)
s.path([(400,205),(530,205),(530,415),(820,415),(820,485)],arrow=False);s.text(415,192,'1 举报人',13);s.text(834,470,'0..*',13)
s.path([(940,262),(940,485)],arrow=False);s.text(950,288,'0..1 订单背景',13);s.text(951,470,'0..*',13)
s.path([(1405,262),(1405,485)],arrow=False);s.text(1416,290,'1',13);s.text(1416,470,'0..*',13)
cls(s,'fav',1150,900,440,'Favorite 收藏',['userId / productId / createdAt','同用户同商品最多一条'])
s.path([(1580,205),(1610,205),(1610,850),(1370,850),(1370,900)],arrow=False);s.text(1540,190,'1',13);s.text(1384,882,'0..*',13)
cls(s,'audit',50,900,700,'AdminAction 管理员记录',['adminId / actionType / 主对象与关联对象 / time','reason / evidenceRefs / beforeAfterSummary','记录审核、处置、异常订单处理及敏感读取'])
s.path([(50,215),(25,215),(25,840),(225,840),(225,900)],arrow=False);s.text(40,825,'1 管理员 → 0..* 操作',13)
s.text(800,950,'其他关联（不穿越主图）：',16,bold=True)
s.lines(800,981,['User 1 → 0..* Favorite / Consultation','Product 1 → 0..* Favorite','AdminAction 0..1 → 0..* OrderEvent','Report 的对象是商品或用户；不扩展访问权'],14,25)
cls(s,'notification',50,1190,700,'Notification 站内通知',['notificationId / recipientId / eventKey','type / subjectRef / content / createdAt / readAt','同接收人同事件唯一，仅本人读取及标记已读'])
s.path([(50,190),(12,190),(12,1280),(50,1280)],arrow=False)
s.text(65,1430,'User 1 → 0..* Notification；通知失败可重试，不回滚交易结果。',16)
s.save()
# 08: main state spine plus explicit transition table to avoid crossing return paths.
s=SVG('M-08-状态图-商品.svg','M-08 商品状态 · 主线与补充分支','主线从左向右；下方逐项列出回退、下架和重新审核规则，避免回路交叉',1640,1250)
for key,x,title,ls,col in [('draft',40,'草稿',['可保存，未提交不公开'],'blue'),('review',355,'待审核',['管理员审查当前版本'],'blue'),('live',670,'在售',['可搜索与下单'],'green'),('reserved',985,'已预订',['进行中订单占用，含暂停'],'blue'),('done',1300,'已成交',['订单完成，历史留存'],'green')]:
 s.card(key,x,180,280,105,title,ls,col)
for a,b,label in [('draft','review','P01'),('review','live','P02'),('live','reserved','P05'),('reserved','done','P07')]:
 s.edge(a,b,side='h')
 d={q[0]:q[1:] for q in s.boxes};xx,yy,ww,hh=d[a];s.text(xx+ww+17,164,label,13,anchor='middle')
s.panel(40,325,1560,70,'主线语义：提交审核 → 审核通过 → 下单成功即锁定 → 双方确认后共同完成。')
s.card('reject',60,445,460,115,'审核驳回',['不公开；可按理由修改后重新提交','也可放弃修改，转为已下架'],'amber')
s.card('off',590,445,460,115,'已下架',['可编辑后重新提交审核','不直接恢复公开，不是终态'],'amber')
s.card('violate',1120,445,460,115,'违规下架',['终态，不可重新上架','涉及预订物品时，关联订单同时暂停'],'red')
s.panel(40,610,1560,460,'补充分支与转换编号（完整定义见正文 5.4 节）')
rows=[('ST-P03','待审核 → 审核驳回','管理员驳回，必须说明理由'),('ST-P04','审核驳回 → 待审核','本人按理由修订；重提后发布配额≤20'),('ST-P06','已预订 → 在售 / 已下架','订单取消或关闭后，逐件按 BR-22 判断；违规下架保持'),('ST-P08','在售 / 审核驳回 → 已下架','本人撤下；有进行中订单时不允许主动下架或改关键约定'),('ST-P09','在售 / 已预订 → 违规下架','管理员记录依据；预订物品同步暂停订单'),('ST-P10','已下架 → 待审核','本人重新提交，必须再审，不直接回在售'),('ST-P11','草稿 → 删除','仅本人、未进入审核及交易；不得删除已关联交易证据')]
for i,(id,route,condition) in enumerate(rows):
 y=700+i*48
 s.text(65,y,id,16,bold=True);s.text(215,y,route,16);s.text(700,y,condition,15,'muted')
 if i<6:s.path([(65,y+16),(1570,y+16)],arrow=False,color='border')
s.panel(40,1110,1560,75,'BR-22 恢复条件','发布者正常、认证有效、商品无违规且无其他进行中订单，恢复后配额≤20才上架；仅目标商品判断恢复，提供项快照保留，不生成或恢复商品。')
s.save()
# 09: lifecycle separate from processing state: no crossing transitions.
s=SVG('M-09-状态图-订单.svg','M-09 订单生命周期与暂停处理','生命周期与处理状态分别记录；下方独立区域说明暂停 / 恢复 / 终止',1640,1430)
for key,x,title,ls,col in [('pending',50,'待确认',['下单 ST-O01'], 'blue'),('deliver',450,'待交付',['卖家接受 ST-O02'],'blue'),('confirm',850,'待双方确认',['卖家记录交付 ST-O05'],'blue'),('done',1250,'已完成',['双方确认 ST-O07'],'green')]:s.card(key,x,170,330,105,title,ls,col)
s.edge('pending','deliver',side='h');s.edge('deliver','confirm',side='h');s.edge('confirm','done',side='h')
s.text(415,154,'截止前接单',13,anchor='middle');s.text(815,154,'实际交付',13,anchor='middle');s.text(1215,154,'双方确认',13,anchor='middle')
s.card('cancel',250,430,330,100,'已取消',['买家 ST-O03 / 协商 ST-O06'],'amber')
s.card('closed',750,430,330,100,'已关闭',['拒绝 / 超时 ST-O04；异常终止 O10'],'red')
s.path([(130,275),(130,375),(330,375),(330,430)],'买家取消 O03',145,340)
s.path([(540,275),(540,430)],'对方同意且未交付 O06',555,355)
s.path([(235,275),(235,320),(915,320),(915,430)],'拒绝 / 达到确认截止 O04',655,307)
s.panel(50,610,1530,320,'独立处理状态：仅作用于进行中订单')
s.card('normal',100,700,390,115,'正常',['允许符合权限及阶段的操作'],'green')
s.card('paused',690,700,390,115,'暂停',['原生命周期不变，保留锁定和确认','禁止普通推进、取消和超时关闭'],'purple')
s.path([(490,730),(690,730)],'管理员核实后 O08',505,714)
s.path([(690,790),(490,790)],'原因消除且满足条件 O09',492,847)
s.lines(1130,728,['O10 有证据终止 → 已关闭','不代双方确认，不改已完成','线下遗留争议未解决则继续暂停','恢复待确认需记录新旧截止'],14,28)
s.panel(50,975,1530,120,'统一守卫条件与关联结果')
s.lines(70,1033,['普通生命周期转换仅在处理状态正常时执行；第三人、管理员均不能代双方确认。','取消 / 关闭只释放目标商品；完成同步订单与目标，提供快照留存；一方确认或重复请求不提前完成。'],16,28)
s.panel(50,1140,1530,190,'待交付阶段的取消申请（独立字段，不新增订单生命周期）')
s.lines(70,1200,['任一方填理由 → 待回应；另一方同意且未实际交付 → ST-O06 已取消；拒绝 → 保持待交付。','申请本身不释放目标商品；同单最多一份待回应申请，双方交叉申请不等于同意。','待回应不登记交付；申请人可撤回恢复履约；争议请求管理员介入，不自动取消。'],16,36)
s.save()
# 10: acceptance stages and evidence boundaries.
s=SVG('M-10-验收执行流程.svg','M-10 验收执行与证据流程','从配置确认到有证据的限定结论；VT-01～35 当前全部未执行',1480,1250)
steps=[('v1','1 确认规则、验收配置及评审版本',['V2.0 / 账号与数据 / 时长 / 图片字节边界','UD-06～08规则已确认；具名评审记录另补'],'blue'),('v2','2 准备可复现环境与初始数据',['记录代码、系统、浏览器、数据版本及模拟范围','每个场景独立重置，使用虚构身份资料'],'blue'),('v3','3 功能权限 → 并发故障 → 质量测量',['先三类闭环与拒绝，再并发、故障及截止边界','随后性能、兼容、审计及演示备份恢复'],'blue'),('v4','4 保存实际结果、来源与证据',['请求响应、脱敏截图、数据状态及关联事件','区分用户决定、AI建议、图示检查和业务执行'],'blue'),('v5','5 问题登记 → 修订 → 针对性复测',['权限泄露、重复成交、半笔交换阻断通过','修订后保存新证据，不以旧版本结果替代'],'amber'),('v6','6 形成限定结论并登记评审基线',['必测场景完成、有证据，阻断问题已关闭','具名确认后存文件清单；哈希不代表批准'],'green')]
for i,(key,title,ls,color) in enumerate(steps):
 y=135+i*157;s.card(key,50,y,880,115,title,ls,color)
 if i:s.edge('v'+str(i),key)
s.panel(1010,135,420,265,'五种执行状态')
s.lines(1030,200,['未执行：尚未进行','通过：结果与数据满足预期','失败：存在明确差异','阻塞：缺少执行条件，注明原因','不适用：提供本轮范围依据'],15,32)
s.panel(1010,450,420,225,'证据边界')
s.lines(1030,515,['文档检查不等于业务验证','图示可读不等于状态机已实现','界面走通不等于接口权限通过','模拟响应不等于真实性能达标'],15,32)
s.panel(1010,725,420,240,'测量要求')
s.lines(1030,790,['固定负载并明确执行环境','保留原始时延、错误和超时样本','P95 与失败数同时报告','确认阈值用于本轮验收','不据此承诺生产容量和恢复指标'],15,30)
s.panel(50,1120,1380,70,'关联：QR-01～11 / AC-01～18 / VT-01～35；详细步骤见《验收场景清单.md》。')
s.save()
# Gallery uses relative SVG media, no network or runtime dependency.
order=[x[0] for x in PAGES]
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>需求模型图册 V2.0</title><style>body{margin:0;background:#f1f5fa;color:#142d4e;font:16px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}h1{margin:0 0 12px}p{line-height:1.8;color:#53677f}nav{display:flex;gap:10px;flex-wrap:wrap}a{color:#2459a9}nav a{padding:9px 14px;background:white;border-radius:8px;text-decoration:none}section{background:white;border:1px solid #d6dfeb;border-radius:14px;margin:28px 0;overflow:hidden}section h2{font-size:18px;margin:0;padding:18px 24px;border-bottom:1px solid #e2e8f1}img{display:block;width:100%;height:auto}small{display:block;padding:0 24px 18px;color:#53677f}@media print{nav{display:none}section{break-inside:avoid;page-break-after:always}header,main{padding:0}}</style><header><h1>校园二手交易与物品流转平台 · 需求模型图册</h1><p>V2.0 优化稿。按主流程、异常分支和领域分图阅读；点击标题可打开原尺寸 SVG。业务规则已确认，业务待验证，图示不代表功能已实现或测试通过。图中字体保持 13–28 px，缩小时可打开原图放大。</p><nav>'''
for i,name in enumerate(order):html+=f'<a href="#g{i}">{escape(name[:-4])}</a>'
html+='</nav></header><main>'
for i,name in enumerate(order):html+=f'<section id="g{i}"><h2><a href="{escape(name)}" target="_blank">{escape(name[:-4])} ↗</a></h2><img src="{escape(name)}" alt="{escape(name[:-4])}" loading="lazy"><small>固定排版 SVG · 可缩放 · 完整字段与规则以正文及 .puml 语义源文件为准</small></section>'
html+='</main></html>';(ROOT/'图册.html').write_text(html)
# Keep classroom copy in sync, while leaving archived material untouched.
classroom=ROOT.parents[3]/'实验/需求分析课堂材料'
if classroom.exists():shutil.copy2(ROOT/'M-03-用例图.svg',classroom/'02_用例图.svg')
print(json.dumps({'generated':order,'gallery':str(ROOT/'图册.html')},ensure_ascii=False,indent=2))
