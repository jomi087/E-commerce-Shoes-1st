const User = require('../model/userModel');

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
        console.log(error.message);
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
        console.log(error.message);
    }
}

module.exports={
    isLogin,
    isLogout,
}
