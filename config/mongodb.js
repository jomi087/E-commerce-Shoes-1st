const mongoose = require('mongoose');
const logger = require('../helpers/winstonLogger');


async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        logger.info('Connected to MongoDB')
    } catch (err) {
        logger.error(`Failed to connect to MongoDB: ${err.message}`, err);
        process.exit(1);
    }
}

module.exports =  connectToDatabase

