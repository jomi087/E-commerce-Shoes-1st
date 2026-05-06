const logger = require('../helpers/winstonLogger');

const isLogin = async(req,res,next)=>{
    try{
        if( req.session.admin_id ){
            next()
        }else{
            res.redirect('/admin/')
        }
    }catch(error){
        logger.error(error.message);
    }
}


const isLogout = async(req,res,next)=>{
    try{
        if(req.session.admin_id){
            res.redirect('/admin/dashboard')
        }else{
            next()
        }
    }catch(error){
        logger.error(error.message);
    }
}

module.exports={
    isLogin,
    isLogout
}