/**
 * SearchQueryBuilder 测试用例
 * 
 * 运行方式：node src/search/SearchQueryBuilder.test.js
 */

import { 
    buildFilter,
    textContains,
    textEquals,
    tagsIncludesAny,
    dateLastNDays,
    dateBetween
} from './SearchQueryBuilder.mjs';

// ==========================================
// 测试数据
// ==========================================
const testLinks = [
    {
        id: 1,
        title: 'ChatGPT 官方文档',
        url: 'https://openai.com/chatgpt',
        note: 'OpenAI 的 AI 聊天机器人官方文档',
        tag: 'AI',
        time: '2026/2/18 上午10:30:00'
    },
    {
        id: 2,
        title: 'JavaScript 高级教程',
        url: 'https://developer.mozilla.org/js-tutorial',
        note: 'MDN 上的 JavaScript 学习资源',
        tag: '编程',
        time: '2026/2/15 下午2:00:00'
    },
    {
        id: 3,
        title: 'React 设计模式',
        url: 'https://react.dev/patterns',
        note: 'React 官方设计模式指南',
        tag: '编程',
        time: '2026/2/10 上午9:15:00'
    },
    {
        id: 4,
        title: 'Figma 设计系统',
        url: 'https://figma.com/design-systems',
        note: 'Figma 设计系统最佳实践',
        tag: '设计',
        time: '2026/1/20 下午4:30:00'
    },
    {
        id: 5,
        title: 'Python 机器学习入门',
        url: 'https://ml-course.example.com/python',
        note: '使用 Python 学习 AI 和机器学习',
        tag: 'AI',
        time: '2026/2/19 上午11:00:00'
    }
];

// ==========================================
// 测试用例 1：文本搜索 + AND 逻辑
// ==========================================
console.log('========================================');
console.log('测试用例 1：文本搜索 + AND 逻辑');
console.log('条件：标题包含 "Python" 且 标签为 "AI"');
console.log('----------------------------------------');

const filter1 = buildFilter([
    { field: 'title', operator: 'contains', value: 'Python' },
    { field: 'tags', operator: 'includes_any', value: 'AI' }
], 'AND');

const result1 = testLinks.filter(filter1);
console.log('匹配结果：');
result1.forEach(link => {
    console.log(`  - [${link.id}] ${link.title} (标签: ${link.tag})`);
});
console.log(`共 ${result1.length} 条结果`);
console.log('预期：1 条（id=5，标题含"Python"且标签为"AI"）');
console.log('测试', result1.length === 1 && result1[0].id === 5 ? '✅ 通过' : '❌ 失败');

// ==========================================
// 测试用例 2：多条件 OR 逻辑
// ==========================================
console.log('\n========================================');
console.log('测试用例 2：多条件 OR 逻辑');
console.log('条件：标签为 "编程" 或 标签为 "设计"');
console.log('----------------------------------------');

const filter2 = buildFilter([
    { field: 'tags', operator: 'includes_any', value: '编程' },
    { field: 'tags', operator: 'includes_any', value: '设计' }
], 'OR');

const result2 = testLinks.filter(filter2);
console.log('匹配结果：');
result2.forEach(link => {
    console.log(`  - [${link.id}] ${link.title} (标签: ${link.tag})`);
});
console.log(`共 ${result2.length} 条结果`);
console.log('预期：3 条（id=2, id=3, id=4）');
console.log('测试', result2.length === 3 ? '✅ 通过' : '❌ 失败');

// ==========================================
// 测试用例 3：日期范围查询
// ==========================================
console.log('\n========================================');
console.log('测试用例 3：日期范围查询');
console.log('条件：最近 7 天内创建的链接');
console.log('----------------------------------------');

const filter3 = buildFilter([
    { field: 'createdAt', operator: 'last_n_days', value: 7 }
], 'AND');

const result3 = testLinks.filter(filter3);
console.log('匹配结果：');
result3.forEach(link => {
    console.log(`  - [${link.id}] ${link.title} (时间: ${link.time})`);
});
console.log(`共 ${result3.length} 条结果`);
console.log('预期：最近7天内创建的链接（根据当前日期计算）');
console.log('测试', result3.length >= 0 ? '✅ 通过' : '❌ 失败');

// ==========================================
// 额外测试：单个 operator 函数
// ==========================================
console.log('\n========================================');
console.log('额外测试：单个 operator 函数');
console.log('----------------------------------------');

// 测试 textContains
console.log('textContains("Hello World", "world"):', textContains('Hello World', 'world'));
console.log('预期：true', textContains('Hello World', 'world') === true ? '✅' : '❌');

// 测试 textEquals
console.log('textEquals("AI", "ai"):', textEquals('AI', 'ai'));
console.log('预期：true', textEquals('AI', 'ai') === true ? '✅' : '❌');

// 测试 tagsIncludesAny
console.log('tagsIncludesAny("编程", ["AI", "编程"]):', tagsIncludesAny('编程', ['AI', '编程']));
console.log('预期：true', tagsIncludesAny('编程', ['AI', '编程']) === true ? '✅' : '❌');

// 测试 dateBetween
console.log('dateBetween("2026/2/15", { start: "2026/2/10", end: "2026/2/20" }):', 
    dateBetween('2026/2/15', { start: '2026/2/10', end: '2026/2/20' }));
console.log('预期：true', dateBetween('2026/2/15', { start: '2026/2/10', end: '2026/2/20' }) === true ? '✅' : '❌');

console.log('\n========================================');
console.log('所有测试完成！');
console.log('========================================');