const nodemailer = require('nodemailer');

// console.log(nodemailer);

const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:process.env.SMTP_PORT,
    secure:false,
    requireTLS:true,
    auth:{
        user:process.env.SMTP_MAIL,
        pass:process.env.SMTP_PASSWORD,
    }
})

const sendMaiL = async(email,subject,content)=>{  //here sendMail is an identifier
    try {
        let mailOptions={
            from:process.env.SMTP_MAIL,
            to: email,
            subject : subject,
            html :  content
        }

        transporter.sendMail(mailOptions,(error,info)=>{  //overhere sendMAil is a method  not an identifier  
            if(error){
                console.log(error.message);
            }
            console.log('Mail has been sent ',)
        })
    } catch (error) {
        console.log(error.message);
    }
}

module.exports={
    sendMaiL
}
 
