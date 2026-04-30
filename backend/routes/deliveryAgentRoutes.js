const express = require('express');
const { 
    getAllAgents, 
    getAgentById, 
    createAgent, 
    updateAgent, 
    deleteAgent,
    getActiveAgents 
} = require('../controllers/deliveryAgentController');

const router = express.Router();

// Get all agents
router.get('/', getAllAgents);

// Get active agents only
router.get('/active', getActiveAgents);

// Get agent by ID
router.get('/:id', getAgentById);

// Create new agent
router.post('/', createAgent);

// Update agent
router.put('/:id', updateAgent);

// Delete agent
router.delete('/:id', deleteAgent);

module.exports = router;
