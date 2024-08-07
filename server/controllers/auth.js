const User = require('../models/user');
const Code = require('../models/code');
const ErrorRespond = require('../utils/errorResponds');

const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const CalendarEvent = require('../models/calendarevent')
const jwt_key = process.env.JWT_SECRET;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GMAIL_ID);

const oauth2Client = new OAuth2Client(
  process.env.GMAIL_ID,
  process.env.GMAIL_SECRET,
  process.env.URL
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN 
});


//invite user by the admin 
exports.invite = async (req, res, next) => {
  const { recipient, code, role, token } = req.body;
  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    
    if (user.role != 1) {
      return res.status(400).json({ success: false, message: "You do not have access!" });
    }
     
    const sender =user.name;
    const senderEmail =user.email;
 
    const savedCode = await Code.create({ code: code, role: role, recipient: recipient });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const utf8Subject = `=?utf-8?B?${Buffer.from("Invitation From COT Department").toString('base64')}?=`;
    const messageParts = [
      `From: "${sender}" <${senderEmail}>`,
      `To: ${recipient}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: ${utf8Subject}`,
      '',
      `Hello, I am the admin of this system. Please go to this site: https://collabsiaclient.vercel.app and use this code ${code}. Do not share this code with others.`
    ];
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const resGmail = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    res.status(200).json({ success: true, savedCode, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};




//login
exports.login = async (req, res, next) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GMAIL_ID,
    });

    const payload = ticket.getPayload();
    const emailFromGoogle = payload.email;
    const nameFromGoogle = payload.name;
    const picFromGoogle = payload.picture;

    let user = await User.findOne({ email: emailFromGoogle });

    if (!user) {
      user = await User.create({
        name: nameFromGoogle,
        email: emailFromGoogle,
        picture: picFromGoogle,
      });
    }

    const tokenToSend = user.webtokenjwt();
    let redirectUrl = '';

    switch (user.role) {
      case 1:
        redirectUrl = '/admin/dashboard';
        message ="Login successful!";
        break;
      case 2:
        redirectUrl = '/secretary/dashboard';
        message ="Login successful!";
        break;
      case 3:
        redirectUrl = '/user/dashboard';
        message ="Login successful!";
        break;
      case 0:
        redirectUrl = '/Unregisteruser/dashboard';
        message ="Register successful!";
        break;
      default:
        throw new ErrorRespond('Invalid role', 400);
    }

    res.status(200).json({
      success: true,
      token: tokenToSend,
      redirectUrl: redirectUrl,
      message
    
    });
    
  } catch (err) {
    next(new ErrorRespond('An error occurred', 500));
  }
};


//logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ success: true, message: "Logged out successfully." });
};


//user details
  exports.Userprofile = async (req, res, next) => {
    try {
      const user = req.user; 
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Error fetching user profile' });
    }
  };




 
  

  exports.updaterole = async (req, res, next) => {
    const { code, department, token } = req.body;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
  
      const codeexist = await Code.findOne({ code: code });
      if (!codeexist) {
        return res.status(404).json({ success: false, message: "Code not found!" });
      }
  
      const updatedUser = await User.findByIdAndUpdate(
        decoded.id,
        { $set: { role: codeexist.role, department: department } },
        { new: true }
      );
  
      if (!updatedUser) {
        return res.status(400).json({ success: false, message: 'User not found!' });
      }
  
      await Code.findOneAndDelete({ code: code });
  
      let redirectUrl;
      switch (updatedUser.role) {
        case 1:
          redirectUrl = '/admin/dashboard';
          break;
        case 2:
          redirectUrl = '/secretary/dashboard';
          break;
        case 3:
          redirectUrl = '/user/dashboard';
          break;
        case 0:
        default:
          redirectUrl = '/unregisteruser/dashboard';
          break;
      }
     
      res.json({ success: true, user: updatedUser, redirectUrl, message: "Login successful!" });
  
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ success: false, message: 'Internal server error during role update.' });
    }
  };


  exports.getmyrole = async (req, res, next) => {
    try {
      const code = req.body.code;
  
      const myrole = await Code.findOne({ code: code });
  
      if (!myrole) {
        return res.status(500).json({ success: false, message: 'Error getting the role' });
      }
  
  
      res.json({ success: true, code: code, role: myrole });
    } catch (error) {
      console.error('Error in getmyrole:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };


  //get all users 
  exports.getalluser = async (req, res, next) => {
    const token = req.query.token;
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const role = req.query.role || 0;
      const users = await User.find(role != 0 ? { role } : {});
  
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'No users found' });
      }
  
      return res.status(200).json({ success: true, users });
    } catch (error) {
      console.error('Error retrieving users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  


  exports.getallroleuser = async (req, res, next) => {
    const token = req.query.token;
    try {
      
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);

  
      if (user.role !== 1 && user.role !== 2) {
       
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const users = await User.find({ role: { $ne: 0 }, _id: { $ne: user._id } });
     
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'No users found' });
      }
  
      return res.status(200).json({ success: true, message:"Successfully Retrieve!" ,users });
    } catch (error) {
      
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
  exports.getallsecretaryexcludesender = async (req, res, next) => {
    const token = req.query.token;
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 &&  user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      
      let users = await User.find({ 
        _id: { $ne: user._id }, 
        role: 2 
      });
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'No users found' });
      }
  
      return res.status(200).json({ success: true, message:"Successfully Retrieve!" ,users });
    } catch (error) {
      console.error('Error retrieving users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  
   

  exports.getalladminexcludesender = async (req, res, next) => {
    const token = req.query.token;
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 &&  user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      
      let users = await User.find({ 
        _id: { $ne: user._id }, 
        role: 1 
      });
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'No users found' });
      }
  
      return res.status(200).json({ success: true, message:"Successfully Retrieve!" ,users });
    } catch (error) {
      console.error('Error retrieving users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };

  exports.getallregularusers = async (req, res, next) => {
    const token = req.query.token;
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      let users = await User.find({ 
        _id: { $ne: user._id }, 
        role:3 
      });
      if (users.length === 0) {
        return res.status(404).json({ success: false, message: 'No users found' });
      }
  
      return res.status(200).json({ success: true, message: "Successfully Retrieve!", users });
    } catch (error) {
      console.error('Error retrieving users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };




  exports.getallbsetexcludesender = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsetuser = await User.find({ department: 'Bachelor of Science in Electrical Technology', _id: { $ne: user._id } });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsetuser });
    } catch (error) {
      console.error('Error retrieving BSET users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  



  exports.getallbsatexcludesender = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsatuser = await User.find({ department: 'Bachelor of Science in Automotive Technology',_id: { $ne: user._id }});
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsatuser });
    } catch (error) {
      console.error('Error retrieving BSAT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };


  exports.getallbsitexcludesender = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsituser = await User.find({ department: 'Bachelor of Science and Information Technology' });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsituser });
    } catch (error) {
      console.error('Error retrieving BSIT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };


  exports.getallbsftexcludesender = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsftuser = await User.find({ department: 'Bachelor of Science in Food Technology' });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsftuser });
    } catch (error) {
      console.error('Error retrieving BSFT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

  //





  exports.getallsecretary = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const users = await User.find({ role:2 });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", users });
    } catch (error) {
      console.error('Error retrieving BSAT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };



  

  exports.getalladmin = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const users = await User.find({ role:1 });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", users });
    } catch (error) {
      console.error('Error retrieving BSAT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
    exports.getallinstructors = async (req, res, next) => {
      const token = req.query.token;
    
      try {
        const decoded = jwt.verify(token, jwt_key);
        const user = await User.findById(decoded.id);
    
        if (user.role !== 1 && user.role !== 2) {
          return res.status(403).json({ success: false, message: 'You do not have access!' });
        }
    
        const users = await User.find({ role:3 });
    
        return res.status(200).json({ success: true,message:"Successfully Retrieve!", users });
      } catch (error) {
        console.error('Error retrieving BSAT users:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
    };

  //get all Bachelor of Science in Automotive Technology
  exports.getallbsat = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsatuser = await User.find({ department: 'Bachelor of Science in Automotive Technology' });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsatuser });
    } catch (error) {
      console.error('Error retrieving BSAT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

  
  //get all Bachelor of Science and Information Technology
  exports.getallbsit = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsituser = await User.find({ department: 'Bachelor of Science and Information Technology' });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsituser });
    } catch (error) {
      console.error('Error retrieving BSIT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
 
 
  // get all Bachelor of Science in Food Technology
  exports.getallbsft = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsftuser = await User.find({ department: 'Bachelor of Science in Food Technology' });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsftuser });
    } catch (error) {
      console.error('Error retrieving BSFT users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  


    // get all Bachelor of Science in Electrical Technology'
  exports.getallbset = async (req, res, next) => {
    const token = req.query.token;
  
    try {
      const decoded = jwt.verify(token, jwt_key);
      const user = await User.findById(decoded.id);
  
      if (user.role !== 1 && user.role !== 2) {
        return res.status(403).json({ success: false, message: 'You do not have access!' });
      }
  
      const bsetuser = await User.find({ department: 'Bachelor of Science in Electrical Technology' });
  
      return res.status(200).json({ success: true,message:"Successfully Retrieve!", bsetuser });
    } catch (error) {
      console.error('Error retrieving BSET users:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  };
  

exports.getrole = async (req,res,next) =>{
  try{
    const baseonrole = await User.aggregate([
      { $sort: { role: 1 } },
      { $addFields: { sortOrder: { $cond: { if: { $eq: ['$role', 1] }, then: 0, else: 1 } } } },
      { $sort: { sortOrder: 1 } }
    ]).exec();

    return res.status(200).json({success:true,baseonrole})
  }
  catch(error){
    res.status(404).json({success:false, message:"unable to retrive"})
}
}


// update user role
exports.updateuserrole = async (req, res, next) => {
  const { email, role, token } = req.body;

  try {
    const decoded = jwt.verify(token, jwt_key);
    const userExist = await User.findById(decoded.id);
    const updateuser = await User.find({email});
    

   
    if (!userExist || (userExist.role !== 1 && userExist.role !== 2)) {
      return res.status(403).json({ success: false, message: 'You do not have access to update user roles!' });
    }

    if (userExist.role === 2 && role == 1) {
      return res.status(400).json({ success: false, message: 'You do not have authority!' });
    }

    if (userExist.role === 2 && updateuser.role === 1) {
      return res.status(400).json({ success: false, message: 'You do not have authority!' });
    }
    const updateUser = await User.findOneAndUpdate(
      { email: email },
      { $set: { role: role } },
      { new: true }
    );

    if (!updateUser) {
      return res.status(400).json({ success: false, message: 'Error updating role' });
    }

    res.json({ success: true, user: updateUser });

  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Internal server error during role update.' });
  }
};

exports.updateDepartment = async (req, res, next) => {
  const { department, token } = req.body;

  try {
    const decoded = jwt.verify(token, jwt_key);
    const userId = decoded.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { department: department } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ success: false, message: 'Error updating department' });
    }

    res.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error('Error updating user department:', error);
    res.status(500).json({ success: false, message: 'Internal server error during department update.' });
  }
};
exports.deleteuser = async (req, res, next) => {
  const token = req.body.token;
  const email = req.body.email;
  
  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);

    if (user.role !== 1 && user.role !== 2) {
      return res.status(403).json({ success: false, message: 'You do not have access to delete this user!' });
    }
    const deleteuser = await User.find({email});
    
    if(user.role == 2 &&  deleteuser.role == 1){
      return res.status(403).json({ success: false, message: 'You do not have access to delete this user!' });
    }
   
    if (user.email === email) {
      await User.findByIdAndDelete(user._id);
      res.clearCookie('token');
      return res.status(200).json({ success: true, redirectUrl: "/login", message: "User has been deleted", logout:true});
    }

    const deletecomplete = await User.findOneAndDelete({ email: email });

    if (!deletecomplete) {
      return res.status(404).json({ success: false, message: "Unable to delete or user not found" });
    }

    return res.status(200).json({ success: true, message: "User has been deleted",logout:false });

  } catch (error) {
    console.error('Error in deleteuser:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.initializeGoogleSignIn = async (req, res, next) => {
  try {
    const client_id =  process.env.Gmail_ID;
    const client_secret =  process.env.Gmail_SECRET;
    const redirect_uris =   process.env.URL;

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);

    res.status(200).json({ token: tokens.access_token });
  } catch (error) {
    console.error('Error initializing Google Sign-In:', error);
    next(new ErrorRespond('Unable to initialize Google Sign-In', 400));
  }
};

exports.createGoogleCalendarEvent = async (req, res, next) => {
  try {
    const { token, title, description, startDateTime, endDateTime } = req.body;
    
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: token });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const event = {
      summary: title,
      description,
      start: {
        dateTime: new Date(startDateTime).toISOString(),
        timeZone: 'Asia/Manila',
      },
      end: {
        dateTime: new Date(endDateTime).toISOString(),
        timeZone: 'Asia/Manila',
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.status(200).json({ success: true, event: response.data });
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    next(new ErrorRespond('Unable to create Google Calendar event', 400));
  }
};
  exports.createevent = async (req, res, next) => {
    try {
      const { useremail,summary, description, startDateTime, endDateTime } = req.body;
  
     const donecreate = await CalendarEvent.create({useremail,title:summary,description,startDateTime,endDateTime})
     
  
      res.status(200).json({ success: true, donecreate});
    } catch (error) {
      console.error('Error creating event:', error);
      next(new ErrorRespond('Unable to make event', 400));
    }
  };
  
  exports.showAllevent = async (req, res, next) => {
      const token= req.body.token; 
      const date = req.body.date;
    try {
     
      const decoded = jwt.verify(token,jwt_key);
      const user = await User.findById(decoded.id);
      const useremail = user.email;

      const showEvent = await CalendarEvent.find({
        useremail: useremail,
        startDateTime: { $gte: new Date(date), $lt: new Date(date).setDate(new Date(date).getDate() + 1) }
      }).lean(); //

      if (!showEvent) {
        return res.status(200).json({ success: true, showmyEvents: [] });
      }
      
      const showmyEvents = showEvent.map((event) => ({ ...event, type: 'event' }));
      res.status(200).json({ success: true, showmyEvents });
    } catch (error) {
      console.error('Error retrieving events', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  

  exports.Eventonthismonth = async (req, res, next) => {
    const token= req.body.token; 
    try {

      const decoded = jwt.verify(token,jwt_key);
      const user = await User.findById(decoded.id);
      const email = user.email;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const myEvent = await CalendarEvent.find({
        useremail: email,
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
      });
  
      res.json({ events: myEvent });
    } catch (error) {
      console.error('Error retrieving events', error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  



  

// exports.signup = async (req, res, next) => {
//   const { email, role, token } = req.body;
  
//   try {
//     // Check if the user already exists
//     const userExist = await User.findOne({ email });
//     if (userExist) {
//       return next(new ErrorRespond("Email is already in use!", 400));
//     }

//     // Verify the ID token
//     let ticket;
//     try {
//       ticket = await client.verifyIdToken({
//         idToken: token,
//         audience: '373547344231-uugg2iqm8p52tmq9iptiscn3905h1dlo.apps.googleusercontent.com',
//       });
//     } catch (error) {
//       return next(new ErrorRespond("Invalid token provided!", 401));
//     }

//     // Create the user if the token is verified
//     const user = await User.create(req.body);
//     const tokenToSend = await user.webtokenjwt();

//     // Send the success response
//     const successResponse = {
//       success: true,
//       token: tokenToSend,
//     };

//     res.status(200).json(successResponse);
//   } catch (error) {
//     next(error);
//   }
// };




// exports.singleuser = async(req,res,next)=>{
//   try{
//         const user = await User.findById(req.params.id);
//           res.status(200).json({success:true,user});
          
//       } 
//       catch(error) {
//         next(error);
//         }
//   }
  



  // exports.userhaverole = async(req,res,next) =>{
  //   const {token} = req.query;
  //   try{
  //     const decoded = jwt.verify(token, jwt_key);
  //     const user = await User.findById(decoded.id);
  //      if(!user){
  //       return res.status(400).json({success:false,message:"User not found!"});
  //      }
  //      const users = await User.
  //   }catch(error){
  //     res.status(500).json({ success: false, message: 'Internal server error' });
  //   }
  // }
