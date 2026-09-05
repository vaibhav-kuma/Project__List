const { Group, User, GroupMember } = require('../models');

// Create a new group
exports.createGroup = async (req, res) => {
    try {
        const { name, memberIds } = req.body;
        const group = await Group.create({ name });

        // Add creator to the group
        await GroupMember.create({ groupId: group.id, userId: req.user.id });

        // Add other members if provided
        if (memberIds && memberIds.length > 0) {
            const members = memberIds.map(id => ({ groupId: group.id, userId: id }));
            await GroupMember.bulkCreate(members);
        }

        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get user's groups
exports.getGroups = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: {
                model: Group,
                through: { attributes: [] } // Exclude join table data
            }
        });
        res.json(user.Groups);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// Get detailed group view with members
exports.getGroupDetail = async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id, {
            include: {
                model: User,
                attributes: ['id', 'username', 'email'],
                through: { attributes: [] }
            }
        });

        if (!group) return res.status(404).json({ message: 'Group not found' });
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};
