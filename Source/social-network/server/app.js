const express = require('express');
const app = express();

// 添加静态文件服务
app.use('/uploads', express.static('uploads')); 