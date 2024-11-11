const express = require('express');
const app = express()

require('dotenv').config() 

const connectToDatabase = require('./config/mongodb')
connectToDatabase();

// const morgan = require('morgan');
// app.use(morgan('dev'));
const PORT =  process.env.SERVER_PORT||3000

const schedulePendingPaymentCheck = require('./helpers/backgoundTask');
// schedulePendingPaymentCheck()  

//for user_routes
const userRoute = require('./routes/userRoute');
app.use('/',userRoute)

//for admin_routes     //recomended to give separate routed
const adminRoute = require('./routes/adminRoute')
app.use('/admin',adminRoute)
 
app.listen(PORT,()=>{
    console.log(`http://localhost:${PORT}/`);
    console.log(`http://43.204.245.198:${PORT}/`);
    console.log(`https://jomi.shop/`);
})


