const DeliveryAgent = require('../models/DeliveryAgent');

// ==================== GET ALL DELIVERY AGENTS ====================
exports.getAllAgents = async (req, res) => {
    try {
        const agents = await DeliveryAgent.find();
        res.json(agents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==================== GET AGENT BY ID ====================
exports.getAgentById = async (req, res) => {
    try {
        const agent = await DeliveryAgent.findById(req.params.id);
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }
        res.json(agent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==================== CREATE DELIVERY AGENT ====================
exports.createAgent = async (req, res) => {
    const { agentName, contactNo, email, status } = req.body;
    
    try {
        if (!agentName || !contactNo) {
            return res.status(400).json({ message: 'Agent name and contact number are required' });
        }

        // Generate unique agent ID
        const agentId = `AGENT-${Date.now()}`;
        
        const newAgent = await DeliveryAgent.create({
            agentId,
            agentName,
            contactNo,
            email,
            status: status || 'active'
        });
        
        if (global.io) {
            global.io.emit('admin:agentCreated', newAgent);
        }
        
        res.status(201).json({
            message: 'Delivery agent created successfully',
            agent: newAgent
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==================== UPDATE DELIVERY AGENT ====================
exports.updateAgent = async (req, res) => {
    const { agentName, contactNo, email, status } = req.body;
    
    try {
        const agent = await DeliveryAgent.findByIdAndUpdate(
            req.params.id,
            {
                agentName,
                contactNo,
                email,
                status
            },
            { new: true }
        );
        
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }
        
        if (global.io) {
            global.io.emit('admin:agentUpdated', agent);
        }
        
        res.json({
            message: 'Delivery agent updated successfully',
            agent
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==================== DELETE DELIVERY AGENT ====================
exports.deleteAgent = async (req, res) => {
    try {
        const agent = await DeliveryAgent.findByIdAndDelete(req.params.id);
        
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        if (global.io) {
            global.io.emit('admin:agentDeleted', agent);
        }

        res.json({ message: 'Delivery agent deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==================== GET ACTIVE AGENTS ====================
exports.getActiveAgents = async (req, res) => {
    try {
        const agents = await DeliveryAgent.find({ status: 'active' });
        res.json(agents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
