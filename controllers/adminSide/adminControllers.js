const User = require("../../model/userModel")

const bcrypt = require('bcrypt')
/**********************************  LOGIN  ******************************************/
const loadLogin = async(req,res)=>{
    try {
        res.render('adminLogin')
    } catch (error) {
        console.log(error.message)
        return res.redirect('/error');
    }
}
/*********************************** VERIFY LOGIN ******************************************/
const verifyLogin = async(req,res)=>{
    try {
        adminEmail = req.body.email
        password = req.body.password
        
        const userData = await User.findOne({email:adminEmail})

        if(userData){
            const passwordMatch =  await bcrypt.compare(password,userData.password)

            if(passwordMatch){
                if(userData.isAdmin === true){
                    req.session.admin_id = userData._id
                        res.redirect('/admin/dashboard')
                }else{
                    res.render('adminLogin',{message : 'Invalid email & password'})
                }
            }else{
                res.render('adminLogin',{message : 'Invalid email & Password'})
            }
        }else{
            res.render('adminLogin',{message : 'Invalid Email & password'})
        }

    } catch (error) {
        console.log(error.message);
        return res.status(500).redirect('/error');
    }
}

/*****************************************************************************/
const adminLogout = async(req,res)=>{
    try {
        req.session.destroy()
        res.redirect('/admin')
    } catch (error) {
        console.log(error.message)
        return res.status(500).redirect('/error');
    }
}
/*****************************************************************************/
const errorpage = async(req,res)=>{
    res.render('errorCatch')
}

const page404 = async(req,res)=>{
    res.render('pageNotFound')
}

/*****************************************************************************/
module.exports ={
    loadLogin,
        verifyLogin,
        adminLogout,

    errorpage,
    page404,

}
