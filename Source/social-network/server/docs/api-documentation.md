# API 接口文档

## 目录
1. [认证相关](#1-认证相关)
2. [用户相关](#2-用户相关)
3. [帖子相关](#3-帖子相关)
4. [好友相关](#4-好友相关)
5. [会话管理](#5-会话管理)
6. [管理员功能](#6-管理员功能)

## 1. 认证相关

### 1.1 用户登录
```javascript
POST /api/users/login

请求体:
{
    "email": "string",     // 用户邮箱
    "password": "string",  // 用户密码
    "deviceInfo": {        // 可选的设备信息
        "userAgent": "string",
        "platform": "string",
        "language": "string"
    }
}

响应:
{
    "token": "string",     // JWT令牌
    "sessionId": "string", // 会话ID
    "user": {
        "_id": "string",
        "username": "string",
        "email": "string",
        "avatar": "string",
        "bio": "string",
        "website": "string",
        "privacy": Object,
        "role": "string",
        "createdAt": "date"
    }
}
```

### 1.2 用户注册
```javascript
POST /api/users/register

请求体:
{
    "username": "string", // 3-20个字符
    "email": "string",    // 有效邮箱
    "password": "string"  // 至少8位，包含大小写字母和数字
}

响应:
{
    "token": "string",
    "user": {
        "_id": "string",
        "username": "string",
        "email": "string",
        "avatar": "string",
        "createdAt": "date"
    }
}
```

## 2. 用户相关

### 2.1 获取当前用户信息
```javascript
GET /api/users/me

请求头:
Authorization: Bearer <token>

响应:
{
    "_id": "string",
    "username": "string",
    "email": "string",
    "avatar": "string",
    "bio": "string",
    "website": "string",
    "privacy": Object,
    "role": "string"
}
```

### 2.2 更新用户资料
```javascript
PUT /api/users/profile

请求头:
Authorization: Bearer <token>

请求体: (multipart/form-data)
{
    "avatar": File,       // 可选，头像文件
    "username": "string", // 可选
    "bio": "string",      // 可选
    "website": "string",  // 可选
    "privacySettings": JSON字符串 // 可选，隐私设置
}

响应:
{
    // 更新后的用户完整信息
}
```

### 2.3 搜索用户
```javascript
GET /api/users/search?query=<搜索关键词>

请求头:
Authorization: Bearer <token>

响应:
[
    {
        "_id": "string",
        "username": "string",
        "avatar": "string",
        "bio": "string",
        "isPrivate": boolean,
        "isFriend": boolean,
        "statistics": {
            "friendsCount": number
        }
    }
]
```

## 3. 帖子相关

### 3.1 创建帖子
```javascript
POST /api/posts

请求头:
Authorization: Bearer <token>

请求体: (multipart/form-data)
{
    "content": "string",  // 帖子内容
    "image": File        // 可选，图片文件
}

响应:
{
    "_id": "string",
    "author": {
        "_id": "string",
        "username": "string",
        "avatar": "string"
    },
    "content": "string",
    "image": "string",
    "createdAt": "date"
}
```

### 3.2 获取动态流
```javascript
GET /api/posts/feed/page/:page

请求头:
Authorization: Bearer <token>

响应:
{
    "posts": [
        {
            "_id": "string",
            "author": Object,
            "content": "string",
            "image": "string",
            "likes": Array,
            "comments": Array,
            "createdAt": "date"
        }
    ],
    "total": number,
    "currentPage": number,
    "totalPages": number
}
```

### 3.3 点赞帖子
```javascript
POST /api/posts/:postId/like

请求头:
Authorization: Bearer <token>

响应:
{
    // 更新后的帖子信息
}
```

### 3.4 评论帖子
```javascript
POST /api/posts/:id/comment

请求头:
Authorization: Bearer <token>

请求体:
{
    "content": "string"
}

响应:
{
    "user": Object,
    "content": "string",
    "createdAt": "date"
}
```

## 4. 好友相关

### 4.1 发送好友请求
```javascript
POST /api/friends/request/:userId

请求头:
Authorization: Bearer <token>

响应:
{
    "message": "好友请求已发送"
}
```

### 4.2 接受好友请求
```javascript
POST /api/friends/accept/:userId

请求头:
Authorization: Bearer <token>

响应:
{
    "message": "已接受好友请求"
}
```

### 4.3 获取社交分析数据
```javascript
GET /api/friends/influence-analysis

请求头:
Authorization: Bearer <token>

响应:
{
    "totalReach": number,           // 总影响范围
    "distribution": [               // 影响力分布
        {
            "level": number,        // 社交距离层级
            "count": number         // 用户数量
        }
    ]
}
```

### 4.4 获取社交圈子分析
```javascript 
GET /api/friends/analysis/circles

请求头:
Authorization: Bearer <token>

响应:
{
    "circles": [
        {
            "type": "close",     // 亲密圈子
            "members": [User],   // 成员列表
            "size": number      // 圈子大小
        },
        {
            "type": "distant",  // 普通圈子
            "members": [User],
            "size": number
        }
    ]
}
```

## 5. 会话管理

### 5.1 获取用户会话列表
```javascript
GET /api/sessions

请求头:
Authorization: Bearer <token>

响应:
[
    {
        "sessionId": "string",
        "deviceInfo": Object,
        "loginTime": "date",
        "lastActive": "date"
    }
]
```

### 5.2 删除会话
```javascript
DELETE /api/sessions/:sessionId

请求头:
Authorization: Bearer <token>

响应:
{
    "message": "会话已删除"
}
```

## 6. 管理员功能

### 6.1 获取缓存监控信息
```javascript
GET /api/admin/cache-monitor/memory-usage

请求头:
Authorization: Bearer <token>

响应:
{
    "used_memory": "string",
    "used_memory_peak": "string",
    "mem_fragmentation_ratio": "string"
}
```

### 6.2 获取缓存命中率
```javascript
GET /api/admin/cache-monitor/hit-rate

请求头:
Authorization: Bearer <token>

响应:
{
    "hits": number,
    "misses": number,
    "hit_rate": "string"
}
```

## 注意事项

1. 认证
- 除了登录和注册，所有接口都需要在请求头中携带 JWT token
- Token 格式: `Authorization: Bearer <token>`

2. 错误处理
- 400: 请求参数错误
- 401: 未授权
- 403: 权限不足
- 404: 资源不存在
- 500: 服务器错误

3. 文件上传
- 支持的图片格式: jpg, jpeg, png
- 最大文件大小: 5MB

4. 分页
- 默认每页 10 条记录
- 页码从 1 开始