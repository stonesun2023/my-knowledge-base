// file-demo.js - 用 Node.js 读写文件

// 引入文件系统模块
const fs = require('fs');

// 1. 写入文件
const content = `这是 Node.js 创建的文件！
创建时间：${new Date().toLocaleString()}
这就是后端的能力！`;

fs.writeFileSync('output.txt', content, 'utf8');
console.log('✅ 文件写入成功！');

// 2. 读取文件
const readContent = fs.readFileSync('output.txt', 'utf8');
console.log('\n📄 文件内容：');
console.log(readContent);

// 3. 查看文件信息
const stats = fs.statSync('output.txt');
console.log('\n📊 文件信息：');
console.log('文件大小：', stats.size, '字节');
console.log('创建时间：', stats.birthtime.toLocaleString());