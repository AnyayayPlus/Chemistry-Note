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
    link: /01%20原子结构与元素性质/
  - title: 02 微粒间作用力与物质性质
    details: 晶体结构、分子间作用力、化学键等。
    link: /02%20微粒间作用力与物质性质/
  - title: 03 分子空间结构与物质性质
    details: VSEPR 模型、杂化轨道理论、配位键等。
    link: /03%20分子空间结构与物质性质/
  - title: 04 有机化学基础
    details: 有机物结构、分类命名、烃及其衍生物等。
    link: /04%20有机化学基础/
  - title: 05 化学物质基本概念
    details: 物质分类、离子反应、氧化还原反应等。
    link: /05%20化学物质基本概念/
  - title: 06 元素及其化合物
    details: 钠、铁、铝、氯、氮、硫等常见元素性质。
    link: /06%20元素及其化合物/
  - title: 07 化学实验
    details: 实验仪器、过程、常见实验及答题模板。
    link: /07%20化学实验/
  - title: 08 化学反应能量与速率
    details: 反应热、焓变、盖斯定律、化学反应速率、限度及其影响因素。
    link: /08%20化学反应能量与速率/
  - title: 09 化学平衡
    details: 化学平衡状态、平衡移动原理等。
    link: /09%20化学平衡/
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'
import { CCAppreciators, CCFeedbackers } from '/.vitepress/theme/components'

import { useCommunity } from '/.vitepress/theme/composables/useCommunity'

const { community, status, loadCommunity, totalAppreciation } = useCommunity()
</script>

## 共建与支持

这个项目由共建者、反馈者与赞助者共同维护，感谢每一位参与者。

<p v-if="status === 'loading'" role="status">名单加载中…</p>
<p v-else-if="status === 'error'" role="status">
  名单暂时无法加载。<button type="button" style="color: var(--vp-c-brand-1); text-decoration: underline" @click="loadCommunity">重试</button>
</p>

<div class="home-community__stats">
  <a href="/00%20说明/Readme#共建者名录" class="home-community__stat">
    <span class="label">贡献者 Contributors</span>
    <strong>{{ status === 'ready' ? community.members.length : '—' }}</strong>
  </a>
  <a href="/00%20说明/Readme#反馈者名录" class="home-community__stat">
    <span class="label">反馈者 Feedbackers</span>
    <strong>{{ status === 'ready' ? community.feedbackers.length : '—' }}</strong>
  </a>
  <a href="/00%20说明/Readme#以及" class="home-community__stat">
    <span class="label">赞助者 Appreciators</span>
    <strong>{{ status === 'ready' ? community.appreciators.length : '—' }}</strong>
  </a>
  <a href="/00%20说明/Readme#以及" class="home-community__stat">
    <span class="label">已筹集 Total Raised</span>
    <strong>{{ status === 'ready' ? `${totalAppreciation} CNY` : '—' }}</strong>
  </a>
</div>

## 共建者 Contributors

参与编辑、补充与校对的朋友。

<VPTeamMembers v-if="status === 'ready'" size="small" :members="community.members" />

## 反馈者 Feedbackers

帮助我们发现问题并持续改进内容的朋友。

<CCFeedbackers v-if="status === 'ready'" :items="community.feedbackers" />

<p class="home-inline-tip">
  也发现了错误？欢迎通过
  <a href="/00%20说明/错误反馈">错误反馈</a>
  来帮助我们改善。
</p>

## 赞助者 Appreciators

为项目长期维护提供支持的朋友。

<CCAppreciators v-if="status === 'ready'" :items="community.appreciators" />

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
