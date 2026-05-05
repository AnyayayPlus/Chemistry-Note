---
layout: home

description: "Anyayay's Chemistry Note 是基于高中教科书的免费化学笔记，涵盖原子结构、元素性质、微粒间作用力、分子空间结构、有机化学基础、化学物质概念、元素化合物、化学实验、反应能量与速率、化学平衡和热效应等十大板块，提供知识点讲解和解题技巧。"

hero:
  name: "Anyayay's \nChemistry Note"
  text: "化学笔记"
  tagline: "覆盖原子结构、有机化学、化学实验等十大板块，持续更新中"
  image:
    src: /images/icon.svg
    alt: Anyayay's Chemistry Note
  actions:
    - theme: brand
      text: 开始阅读
      link: /00%20说明/Readme
    - theme: alt
      text: 下载完整 PDF
      link: https://umami.seeridia.top/q/e8e52FUHV

features:
  - title: 01 原子结构与元素性质
    details: 核外电子排布、构造原理、元素周期律等。
    link: /01%20原子结构与元素性质/01%20核外电子排布方式
  - title: 02 微粒间作用力与物质性质
    details: 晶体结构、分子间作用力、化学键等。
    link: /02%20微粒间作用力与物质性质/01%20晶体与晶胞（基础知识）
  - title: 03 分子空间结构与物质性质
    details: VSEPR 模型、杂化轨道理论、配位键等。
    link: /03%20分子空间结构与物质性质/01%20价层电子对互斥模型
  - title: 04 有机化学基础
    details: 有机物结构、分类命名、烃及其衍生物等。
    link: /04%20有机化学基础/01%20研究有机化合物的一般方法
  - title: 05 化学物质基本概念
    details: 物质分类、离子反应、氧化还原反应等。
    link: /05%20化学物质基本概念/01%20物质的组成和分类
  - title: 06 元素及其化合物
    details: 钠、铁、铝、氯、氮、硫等常见元素性质。
    link: /06%20元素及其化合物/01%20钠及其化合物
  - title: 07 化学实验
    details: 实验仪器、过程、常见实验及答题模板。
    link: /07%20化学实验/01%20实验仪器
  - title: 08 化学反应能量与速率
    details: 化学反应速率、限度及其影响因素。
    link: /08%20化学反应能量与速率/01%20化学反应速率与限度
  - title: 09 化学平衡
    details: 化学平衡状态、平衡移动原理等。
    link: /09%20化学平衡/01%20化学平衡状态
  - title: 10 化学反应与能量
    details: 反应热、焓变、盖斯定律等。
    link: /10%20化学反应的热效应/01%20反应热与焓变
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'
import { CCAppreciators, CCFeedbackers } from '/.vitepress/theme/components'

import members from '/data/members'
import feedbackers from '/data/feedbackers.json'
import appreciators from '/data/appreciators.json'

const membersList = members.members
const feedbackersList = feedbackers.feedbackers
const appreciatorsList = appreciators.appreciators
const totalAppreciation = appreciatorsList
  .reduce((sum, item) => sum + Number.parseFloat(item.amount), 0)
  .toFixed(2)
</script>

## 共建与支持

这个项目由共建者、反馈者与赞助者共同维护，感谢每一位参与者。

<div class="home-community__stats">
  <a href="/00%20说明/Readme#共建者名录" class="home-community__stat">
    <span class="label">贡献者 Contributors</span>
    <strong>{{ membersList.length }}</strong>
  </a>
  <a href="/00%20说明/Readme#反馈者名录" class="home-community__stat">
    <span class="label">反馈者 Feedbackers</span>
    <strong>{{ feedbackersList.length }}</strong>
  </a>
  <a href="/00%20说明/Readme#以及" class="home-community__stat">
    <span class="label">赞助者 Appreciators</span>
    <strong>{{ appreciatorsList.length }}</strong>
  </a>
  <a href="/00%20说明/Readme#以及" class="home-community__stat">
    <span class="label">已筹集 Total Raised</span>
    <strong>{{ totalAppreciation }} CNY</strong>
  </a>
</div>

## 共建者 Contributors

参与编辑、补充与校对的朋友。

<VPTeamMembers size="small" :members="membersList" />

## 反馈者 Feedbackers

帮助我们发现问题并持续改进内容的朋友。

<CCFeedbackers :items="feedbackersList" />

<p class="home-inline-tip">
  也发现了错误？欢迎通过
  <a href="/00%20说明/错误反馈">错误反馈</a>
  来帮助我们改善。
</p>

## 赞助者 Appreciators

为项目长期维护提供支持的朋友。

<CCAppreciators :items="appreciatorsList" />

<p class="home-inline-tip">
  本项目对你也有帮助？欢迎查看
  <a href="/00%20说明/Readme#以及">赞助方式</a>。
</p>

<style>
.home-community__stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.home-community__stat {
  border: 1px solid transparent;
  background: var(--vp-c-bg-soft);
  border-radius: 10px;
  padding: 14px 16px;
  color: inherit;
  text-decoration: none !important;
  transition: border-color 0.25s, background-color 0.25s !important;
}

.home-community__stat:hover {
  border-color: var(--vp-c-brand-1);
  text-decoration: none !important;
}

.home-community__stat:visited,
.home-community__stat:active {
  text-decoration: none !important;
}

.home-community__stat .label {
  display: block;
  color: var(--vp-c-text-2);
  font-size: 13px;
  margin-bottom: 6px;
}

.home-community__stat strong {
  font-size: 22px;
  line-height: 1.1;
  color: var(--vp-c-text-1);
}

.home-inline-tip {
  margin: 12px 0 2px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

@media (max-width: 768px) {
  .home-community__stats {
    grid-template-columns: 1fr;
  }
}
</style>
