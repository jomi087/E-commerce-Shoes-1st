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
 

/*  the below version is Simpler / Direct & the above version is More Advanced / Scalable (SMTP Config on above is done	Explicit (smtp.gmail.com, port 587, TLS) in below is an	Abstracted (service: 'gmail')
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_email_password' // or app password
  }
});

const mailOptions = {
  from: 'your_email@gmail.com',
  to: 'recipient@example.com',
  subject: 'Hello from Node.js',
  text: 'This is a test email sent programmatically.'
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
 */


