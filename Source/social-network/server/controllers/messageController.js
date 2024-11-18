const MessageService = require('../services/MessageService');

const messageController = {
    // 发送消息
    async sendMessage(req, res) {
        try {
            const { receiverId, content, type } = req.body;
            const message = await MessageService.sendMessage(
                req.user._id,
                receiverId,
                content,
                type
            );
            res.json(message);
        } catch (error) {
            res.status(500).json({ message: '发送消息失败' });
        }
    },

    // 获取聊天历史
    async getChatHistory(req, res) {
        try {
            const { userId } = req.params;
            const { page = 1 } = req.query;
            const messages = await MessageService.getChatHistory(
                req.user._id,
                userId,
                parseInt(page)
            );
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: '获取聊天历史失败' });
        }
    },

    // 标记消息已读
    async markAsRead(req, res) {
        try {
            const { senderId } = req.params;
            await MessageService.markAsRead(req.user._id, senderId);
            res.json({ message: '消息已标记为已读' });
        } catch (error) {
            res.status(500).json({ message: '标记消息已读失败' });
        }
    },

    // 获取未读消息数
    async getUnreadCount(req, res) {
        try {
            const unreadCounts = await MessageService.getUnreadCount(req.user._id);
            res.json(unreadCounts);
        } catch (error) {
            res.status(500).json({ message: '获取未读消息数失败' });
        }
    },

    // 获取最近的聊天列表
    async getRecentChats(req, res) {
        try {
            const chats = await MessageService.getRecentChats(req.user._id);
            res.json(chats);
        } catch (error) {
            res.status(500).json({ message: '获取最近聊天列表失败' });
        }
    },

    // 搜索消息
    async searchMessages(req, res) {
        try {
            const { query } = req.query;
            const { page = 1 } = req.query;
            const messages = await MessageService.searchMessages(
                req.user._id,
                query,
                parseInt(page)
            );
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: '搜索消息失败' });
        }
    },

    // 删除消息
    async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;
            await MessageService.deleteMessage(messageId, req.user._id);
            res.json({ message: '消息已删除' });
        } catch (error) {
            res.status(500).json({ message: '删除消息失败' });
        }
    },

    // 添加群聊相关接口
    async createGroupChat(req, res) {
        try {
            const { name, memberIds } = req.body;
            const chat = await MessageService.createGroupChat(
                req.user._id,
                name,
                memberIds
            );
            res.json(chat);
        } catch (error) {
            res.status(500).json({ message: '创建群聊失败' });
        }
    },

    // 添加消息撤回接口
    async recallMessage(req, res) {
        try {
            const { messageId } = req.params;
            await MessageService.recallMessage(messageId, req.user._id);
            res.json({ message: '消息已撤回' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // 添加消息转发接口
    async forwardMessage(req, res) {
        try {
            const { messageId, receiverIds } = req.body;
            const messages = await MessageService.forwardMessage(
                messageId,
                req.user._id,
                receiverIds
            );
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: '转发消息失败' });
        }
    },

    // 添加缺失的群聊相关方法
    async getGroupMessages(req, res) {
        try {
            const { groupId } = req.params;
            const { page = 1 } = req.query;
            const messages = await MessageService.getGroupMessages(groupId, parseInt(page));
            res.json(messages);
        } catch (error) {
            res.status(500).json({ message: '获取群聊消息失败' });
        }
    },

    async addGroupMembers(req, res) {
        try {
            const { groupId } = req.params;
            const { memberIds } = req.body;
            await MessageService.addGroupMembers(groupId, memberIds);
            res.json({ message: '成功添加群成员' });
        } catch (error) {
            res.status(500).json({ message: '添加群成员失败' });
        }
    },

    async removeGroupMember(req, res) {
        try {
            const { groupId, memberId } = req.params;
            await MessageService.removeGroupMember(groupId, memberId);
            res.json({ message: '成功移除群成员' });
        } catch (error) {
            res.status(500).json({ message: '移除群成员失败' });
        }
    },

    // 添加消息状态相关方法
    async markMessageRead(req, res) {
        try {
            const { messageId } = req.params;
            await MessageService.markMessageRead(messageId, req.user._id);
            res.json({ message: '消息已标记为已读' });
        } catch (error) {
            res.status(500).json({ message: '标记消息已读失败' });
        }
    },

    async sendTypingStatus(req, res) {
        try {
            const { userId } = req.params;
            await MessageService.sendTypingStatus(req.user._id, userId);
            res.json({ message: '已发送输入状态' });
        } catch (error) {
            res.status(500).json({ message: '发送输入状态失败' });
        }
    }
};

module.exports = messageController;