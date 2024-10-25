const User = require("../../model/userModel")

/*********************************Dashboard*********************************************/
const loadDashboard = async(req,res)=>{
    try {
        const adminData = await User.findById({ _id : req.session.admin_id })
        // console.log(adminData);
        res.render('adminDashboard')
    } catch (error) {
        console.log(error.message);
        // return res.status(500).redirect('/error');
    }
} 

module.exports  = {
    loadDashboard
}