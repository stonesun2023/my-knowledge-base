// hello.js - 我的第一个 Node.js 程序

console.log("你好，Node.js！");
console.log("现在的时间是：", new Date().toLocaleString());

// 做一个简单的计算
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("1到5的总和是：", sum);

// 读取系统信息
console.log("操作系统：", process.platform);
console.log("Node.js版本：", process.version); 
