const User = require('../model/userModel');
const logger = require('../helpers/winstonLogger');

const isLogin = async(req,res,next)=>{
    try {
        if(req.session.user_id ){
            const userData = await User.findOne({_id : req.session.user_id})
            if(userData.isBlocked == false){
                next();
            }else{
                req.session.user_id = null 
                res.redirect('/login')
            }
        }else{
            res.redirect('/login')
        }
       
    }catch(error) {
        logger.error(error.message);
    }
 }

const isLogout = async(req,res,next)=>{
    try {
        if(req.session.user_id){
            res.redirect('/')
        }else{
            next()
        } 
    } catch (error) {
        logger.error(error.message);
    }
}

module.exports={
    isLogin,
    isLogout,
}
