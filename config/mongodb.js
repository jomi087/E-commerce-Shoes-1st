const mongoose = require('mongoose');


async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');
    } catch (err) {
        
        console.error('Failed to connect to MongoDB', err);
    }
}

module.exports =  connectToDatabase

