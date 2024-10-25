const User = require("../model/userModel");
const passport = require('passport');
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { google } = require('googleapis');

/************************************************************************************* */

// const axios = require('axios');

// async function inspectToken(accessToken) {
//     try {
//         const response = await axios.get(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
//         console.log('Token Info:', response.data);
//     } catch (error) {
//         console.error('Error inspecting token:', error.response ? error.response.data : error.message);
//     }
// }
/************************************************************************************* */
async function getMyPhoneNumbers(accessToken) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const people = google.people({ version: 'v1', auth: oauth2Client });
    try {
        const response = await people.people.get({
            resourceName: 'people/me',
            personFields: 'names,emailAddresses,phoneNumbers',
        });      

        console.log('API Response:', response.data);

        const phoneNumbers = response.data.phoneNumbers || [];
        // console.log('Phone Numbers:', phoneNumbers);
        
        if (phoneNumbers.length > 0) {
            return phoneNumbers;
        } else {
            // console.log('No phone numbers found.');
            return [];
        }
    } catch (error) {
        console.error('Error fetching phone numbers:', error.response ? error.response.data : error.message);
        throw error; // Propagate the error
    }
}
/*************************************************************************************** */

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:4000/auth/google/callback',
    scope: [
        'profile',
        'email',
        'https://www.googleapis.com/auth/user.phonenumbers.read',
        
    ]
}, async (accessToken, refreshToken, profile, done) => {
    console.log('accessToken inner',accessToken);
    

    // await inspectToken(accessToken);
    

    try {
        let user = await User.findOne({ googleId: profile.id });
        console.log(user);
        

        const phoneNumbers = await getMyPhoneNumbers(accessToken);
        // console.log(phoneNumbers);
        
        const phoneNumber = phoneNumbers.length > 0 ? phoneNumbers[0].value : null;

        if (!user) {
            user = new User({
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                email: profile.emails[0].value,
                googleId: profile.id,
                is_verified: true,
                accessToken,
                mobile: phoneNumber
            });
            const userData = await user.save();
            console.log('New user signed up via Google:', userData);
        } else {
            if (phoneNumber) {
                user.mobile = phoneNumber;
                await user.save();
            }
        }

        return done(null, user);
    } catch (error) {
        console.error('Error in GoogleStrategy callback:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});

module.exports = passport;
