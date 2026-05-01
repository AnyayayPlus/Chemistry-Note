---
description: "Anyayay's Chemistry Note 的使用说明，包括如何浏览、搜索、下载PDF，以及错误反馈方式。"
---

# Readme

![Anyayay's Chemistry Note](/images/Logo.png)

欢迎来到 Anyayay's Chemistry Note！

这是一个基于中国普通高中教科书的化学笔记项目，主要围绕 Bilibili Up主 [@一化儿](https://space.bilibili.com/1526560679/) 的视频展开的，也或许是你见过的 **免费的 最完整的 最真实的** 高中化学笔记，不仅仅是知识点的笔记，也有超多的实战解题技巧，以及我自己总结出来的经验，或一个盲猜技巧，或一个口诀。

## 如何使用？

左侧有目录（移动设备是顶上有一个 Menu 可以展开），可以打开对应章节来查看。

顶部有搜索栏，可以根据关键词来搜索内容，也内置了 AI 搜索功能，会基于本笔记内容来回答你的问题。

## 如何下载 PDF？

1. 顶部的菜单展开后的「下载」可以直接下载当前访问页的 PDF 文件。
2. 点此链接下载全部章节的 PDF 文件合集: [下载 PDF](https://umami.seeridia.top/q/e8e52FUHV)。

## 发现错误？

如果在使用中发现任何问题，欢迎通过 [错误反馈](./错误反馈.md) 来帮助我们改善。我们会在下面的 [反馈者名录](#反馈者名录) 中列出所有帮助反馈问题的朋友。

当然，如果你懒，你也可以直接在对应章节的评论区中直接留言。

如果你希望直接参与完善项目，可以查看 [贡献指南](./贡献指南.md)。

---

> [!NOTE]
> 下面是一个小小的 QQ 群，欢迎加入交流学习，不过目前还没啥人 QwQ
>
> 群号：[1074161116](https://qm.qq.com/q/CljGJy9p8Q)
>
> <img src="./images/qq-group.webp" style="width:200px;"/>

## 共建者名录

<script setup>
import { VPTeamMembers } from 'vitepress/theme'
import { CCAppreciators, CCAppreciatePayments, CCFeedbackers } from '/.vitepress/theme/components'

import appreciators from "/data/appreciators.json"
import members from '/data/members'
import feedbackers from '/data/feedbackers.json'

const appreciatorsList = appreciators.appreciators
const membersList = members.members

const appreciatePayments = [
  {
    type: 'WeChat',
    qrCodeSrc: '/images/wechat-pay.jpg',
    altText: 'WeChat Pay QR Code',
  },
  {
    type: 'Alipay',
    qrCodeSrc: '/images/alipay.jpg',
    altText: 'Alipay QR Code',
  },
]
</script>

如果有空？欢迎加入我们，一起完善这个项目！

<VPTeamMembers size="small" :members="membersList"/>

> [!NOTE]
> 当前该笔记项目正在寻找共建者！（有意者与我联系 seeridia@gmail.com ）

## 反馈者名录

感谢下面这些朋友对本项目中存在的问题进行反馈：

<CCFeedbackers :items="feedbackers.feedbackers" />

> 目前收录的反馈者名单较新（2026 年后），对于之前反馈过问题的朋友，如果没有出现在名单中，请及时与我联系，我会补充上去的！

## 参考资料

1.  Bilibili Up主 [@一化儿](https://space.bilibili.com/1526560679/)
2.  普通高中教科书 化学（人教版、鲁科版、苏教版、沪科技版）[_国家中小学智慧教育平台_](https://www.zxx.edu.cn/elecEdu)
3.  解题觉醒-化学 [天星教育](https://www.tesoon.com/)
4.  [璎晴宫·霁月台·芳兰亭](https://www.zhihu.com/column/c_1266657933414342656)
5.  [维基百科](https://zh.wikipedia.org/)
6.  [维基教科书 《高中化学》](https://zh.wikibooks.org/wiki/%E9%AB%98%E4%B8%AD%E5%8C%96%E5%AD%A6)

7.  高考必刷题 [_众望教育_](https://www.lxzwedu.com/)
8.  一本涂书
9.  教材划重点
10. [Khan Academy](https://zh.khanacademy.org/)

11. 邢其毅等.基础有机化学:第4版[M].北京:北京大学出版社,2016.

## 以及...

本项目从你所看到的这个在线网站到 PDF 文件，都是完全免费的，可以自由下载和使用的，全程没有任何广告和付费墙。

如果这份材料对你的帮助很大，可以考虑下赞赏吗？赞赏也将是支持网站和这份笔记的维护工作。

<CCAppreciatePayments :items="appreciatePayments" />

> [!NOTE]
> 如果您选择赞赏，希望能在备注中留下您的名字或昵称，也可以带上一句话，以便我们在项目的感谢名单中提及您！谢谢您的支持！😊
> 由于赞赏方式是人工统计的，如果您已经赞赏了，但没有出现在名单中，请及时与我联系（QQ: 1528926919），我会补充上去的！

感谢下面这些朋友对本项目的赞赏支持：

<CCAppreciators :items="appreciatorsList" />
