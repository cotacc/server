const Memo = require('../models/memo');
const User = require('../models/user');

const Notification = require('../models/notification');
const fs = require('fs');
const Errorrespond = require('../utils/errorResponds');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream'); // Import gridfs-stream
const path = require('path'); // Import path module
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { ObjectId } = mongoose.Types;

const mongouri = process.env.MONGO_URL || "mongodb+srv://User1:Test1234@cluster0.0zxzgnl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const jwt = require('jsonwebtoken');
const jwt_key = process.env.JWT_SECRET;
const oauth2Client = new OAuth2Client({
  clientId: process.env.GMAIL_ID,
  clientSecret: process.env.GMAIL_SECRET,
  redirectUri: process.env.URL
});

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN
});




const conn = mongoose.createConnection(mongouri);
let gfs;

conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo); // Initialize gridfs-stream
  gfs.collection('uploads');
});

// Initialize GridFsStorage
const storage = new GridFsStorage({
  url: mongouri,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads'
        };
        resolve(fileInfo);
      });
    });
  }
});

const formatDateTime = (dateString) => {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true // For 12-hour format with AM/PM
  };
  return new Date(dateString).toLocaleString(undefined, options);
};

const upload = multer({ storage: storage });


exports.uploads = async (req, res, next) => {
    try {
   
      upload.single('file')(req, res, async (err) => {
        if (err) {
          console.error('File upload error:', err);
          return res.status(500).json({ success: false, error: 'File upload failed.' });
        }
  
        if (!req.file) {
          return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }
  
        if (req.file.mimetype !== 'application/pdf') {
          console.error('Unsupported file type:', req.file.mimetype);
          return res.status(400).json({ success: false, error: 'Only PDF files are supported.' });
        }
  
        const token = req.body.token;
        const decoded = jwt.verify(token, jwt_key);
        const user = await User.findById(decoded.id);
  
        if (!user) {
          return res.status(404).json({ success: false, error: 'User not found.' });
        }
  
        const file = req.file;
        const senderName = user.name;
        const senderEmail = req.body.senderEmail || user.email; // Allow override of sender email
        const content = req.file.filename;
        const recipients = JSON.parse(req.body.recipients);
        const title = req.body.title;
        const startAt = req.body.startDate;
        const endAt = req.body.endDate;
  
        if (!senderName || !senderEmail || !startAt || !endAt) {
          return res.status(400).json({ success: false, error: 'Sender email, name, start date, and end date are required.' });
        }
  
        const formattedStartAt = formatDateTime(startAt);
        const formattedEndAt = formatDateTime(endAt);
  
        try {
          // Send emails to all recipients before creating the memo
          for (const recipient of recipients) {
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            const utf8Subject = `=?utf-8?B?${Buffer.from('New Memo Notification').toString('base64')}?=`;
            const messageParts = [
              `From: <${senderEmail}>`,
              `To: ${recipient.useremail}`,
              'Content-Type: text/html; charset=utf-8',
              'MIME-Version: 1.0',
              `Subject: ${utf8Subject}`,
              '',
              `Hello ${recipient.username},<br><br>This is to notify you that a new memo titled "${title}" has been created by ${senderName} (${senderEmail}).<br><br>Effective Dates:<br>Start Date: ${formattedStartAt}<br>End Date: ${formattedEndAt}<br><br>Please log in to the system at <a href="${process.env.URL}">${process.env.URL}</a> to view the details.<br><br>Thank you.`,
            ];
            const message = messageParts.join('\n');
  
            try {
              await gmail.users.messages.send({
                userId: 'me', // Use 'me' to indicate the authenticated user
                requestBody: {
                  raw: Buffer.from(message).toString('base64'),
                },
              });
            
            } catch (emailError) {
           
              return res.status(500).json({ success: false, error: 'Failed to send email .' });
            }
          }
  
          const memo = await Memo.create({
            sender: senderName,
            senderEmail,
            content,
            title,
            startAt,
            endAt,
            recipients,
            fileId: new ObjectId(file.id),
          });
  
          for (const recipient of recipients) {
            await Notification.create({
              recipientEmail: recipient.useremail,
              recipientName: recipient.username,
              senderEmail,
              senderName: senderName,
              type: 'New Memo',
              memoId: memo._id,
            });
          }
  
          res.status(201).json({ success: true, memo });
        } catch (dbError) {
   
          res.status(500).json({ success: false, error: 'Failed to create memo.' });
        }
      });
    } catch (uploadError) {
    
      res.status(500).json({ success: false, error: 'Failed to upload file.' });
    }
  };
// details of received memo for the recipient
exports.memodetails = async (req, res) => {
  const { memoId } = req.params;
  const token = req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'Token is required.' });
  }

  try {
    const decoded = jwt.verify(token,jwt_key);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const memo = await Memo.findById(memoId);
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found.' });
    }

    const isRecipient = memo.recipients.some(recipient => recipient.useremail === user.email);
    if (!isRecipient) {
      const previousPage = req.header('referer') || '/';
      return res.redirect(previousPage);
    }

    res.status(200).json({ success: true, memo });
  } catch (error) {
    console.error('Error fetching memo details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




exports.createdmemo = async (req, res, next) => {
  const { memoId } = req.params;
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const userEmail = user.email;
    const memo = await Memo.findById(memoId);
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    if (memo.senderEmail !== userEmail) {
      console.log("User email doesn't match sender email");
      const previousPage = req.header('referer') || '/'; // Get the previous page from the referer header or default to '/'
      return res.redirect(previousPage);
    }

    const gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: 'uploads' // Replace 'uploads' with your bucket name
    });

    const downloadStream = gfs.openDownloadStream(memo.fileId);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${memo.filename}`);

    // Stream the PDF directly to the response
    downloadStream.pipe(res);

  } catch (error) {
    console.error('Error fetching memo details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// details of the memo for the sender
exports.createddetails = async (req, res, next) => {
  const { memoId } = req.params;
  const token = req.query.token

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const userEmail = user.email;

    const showmemo = await Memo.findById(memoId);
    
    if (!showmemo) {
      return res.status(404).json({ success: false, message: "No memo found for the user." });
    }

    if (showmemo.senderEmail !== userEmail) {
      return res.status(403).json({ success: false, message: "Access denied. You are not the sender of this memo." });
    }
    
    res.status(200).json({ success: true, memo: showmemo });
  
  } catch (error) {
    console.error('Error fetching memo details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};






// display the memo
exports.displayMemo = async (req, res, next) => {
  const pageSize = 2;
  const page = Number(req.query.pageNumber) || 1;
  const count = await Memo.find({}).estimatedDocumentCount();

  try {
    const memos = await Memo.find() // Fetch a list of memos
    .skip(pageSize * (page - 1)).limit(pageSize)
  
    res.status(200).json({ success: true, memos ,page,pages:Math.ceil(count / pageSize),count}); 
  } catch (error) {
    console.error(error);
    next(error); 
  }
};



exports.pdfdetails = async (req, res, next) => {
  const { memoId } = req.params;
  const token = req.query.token

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const userEmail = user.email;
    const memo = await Memo.findById(memoId);
    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    // Check if the user's email is in the memo's recipients
    const isRecipient = memo.recipients.some(recipient => recipient.useremail === userEmail);

    if (!isRecipient) {
      // Redirect the user back to the previous page
      const previousPage = req.header('referer') || '/'; // Get the previous page from the referer header or default to '/'
      return res.redirect(previousPage);
    }

    const gfs = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: 'uploads' // Replace 'uploads' with your bucket name
    });

    const downloadStream = gfs.openDownloadStream(memo.fileId);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=${memo.filename}`);

    // Stream the PDF directly to the response
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error fetching memo details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.showusermemo = async (req, res, next) => {
  const token = req.query.token; 
  try {
    const decoded = jwt.verify(token,jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const showmemo = await Memo.find({ 'recipients.useremail': email });
    res.status(200).json({ success: true, showmemo });
  } catch (error) {
    console.error(error);
    next(error);
  }
};





// check if the user acknowledge the memo or not
exports.isAcknowledgememo = async (req, res, next) => {
  const token = req.body.token;
  const memoId = req.params.memoId;

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const name = user.name;
    const memo = await Memo.findById(memoId);
    const senderEmail = memo.senderEmail;
    const senderName = memo.senderName;
    if (!memo) {
      return res.status(404).json({ success: false, message: 'Memo not found' });
    }

    const recipient = memo.recipients.find(recipient => recipient.useremail === email);

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found fdor thasd  is memo' });
    }

    await Notification.create({recipientEmail:senderEmail,recipientName:senderName,senderName:name,senderEmail:email,type:'Acknowledge',memoId:memoId})

    recipient.acknowledge = true;
    await memo.save();

    res.status(200).json({ success: true, message: 'Memo acknowledged successfully' });
  } catch (error) {
    console.error('Error acknowledging memo:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};





// user acknowledge the memo
exports.Iacknowledge = async (req, res, next) => {
  const token = req.body.token;
  const memoId = req.params.memoId;

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const memo = await Memo.findById(memoId);

    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    const recipient = memo.recipients.find(
      recipient => recipient.useremail === email
    );

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }


    const acknowledgeStatus = recipient.acknowledge;

    res.status(200).json({ acknowledgeStatus });
  } catch (error) {
    console.error('Error in Iacknowledge:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.googlecalendersave = async (req, res, next) => {
  const token = req.body.token;
  const memoId = req.body.memoId;
  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const name = user.name;
    const memo = await Memo.findById(memoId);
    const senderEmail = memo.senderEmail;
    const senderName = memo.senderName;
    if (!memo) {
      return res.status(404).json({ success: false, message: 'Memo not found' });
    }

    const recipient = memo.recipients.find(recipient => recipient.useremail === email);

    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found fdor thasd  is memo' });
    }

    recipient.googlecalendar = true;
    await memo.save();

    res.status(200).json({ success: true, message: ' Successfully Save!' });
  } catch (error) {
    console.error('Error acknowledging memo:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.Isgooglecalendarsave = async (req, res, next) => {
  const { token, memoId } = req.query; // Extracting from query parameters

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const memo = await Memo.findById(memoId);

    if (!memo) {
      return res.status(404).json({ message: 'Memo not found' });
    }

    const recipient = memo.recipients.find(
      recipient => recipient.useremail === email
    );

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const isGoogleCalendarSaved = recipient.googlecalendar;

    res.status(200).json({ isGoogleCalendarSaved });
  } catch (error) {
    console.error('Error in Isgooglecalendarsave:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// active read if the user read the memo
exports.read = async (req, res, next) => {
  const token = req.body.token;
  const memoId = req.body.memoId;

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;

    const memo = await Memo.findById({ _id: memoId }); 

    if (!memo) {
      const notFoundMemoResponse = {
        success: false,
        message: memoId
      };

      console.log('JSON Response:', JSON.stringify(notFoundMemoResponse, null, 2));

      return res.status(404).json(notFoundMemoResponse);
    }

    const recipient = memo.recipients.find(recipient => recipient.useremail === email);

    if (!recipient) {
      const notFoundRecipientResponse = {
        success: false,
        message: 'Recipient not found for this memo'
      };



      return res.status(404).json(notFoundRecipientResponse);
    }

    if (recipient.read === true) {
      const alreadyReadResponse = {
        success: true
      };

  

      return res.status(200).json(alreadyReadResponse);
    }

    recipient.read = true;
    await memo.save();

    const successResponse = {
      success: true
    };


    res.status(200).json(successResponse);
  } catch (error) {
    console.error('Error acknowledging memo:', error);

    const errorResponse = {
      success: false,
      message: 'Internal server error'
    };

    console.log('JSON Response:', JSON.stringify(errorResponse, null, 2));

    res.status(500).json(errorResponse);
  }
};






// display the memo that sender sent to the recipients
exports.memoIcreate = async (req, res, next) => {
 
  const token = req.query.token;

  try {
    const decoded = jwt.verify(token,jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const showmemo = await Memo.find({ senderEmail: email });
  
    if (showmemo.length === 0) {
    
      return res.status(404).json({ success: false, message: "No memo found for the user." });
    }
    if (showmemo[0].senderEmail !== email) {
      
      return res.status(403).json({ success: false, message: "Access denied. You are not the sender of this memo." });
    }
    
    res.status(200).json({ success: true, showmemo });
  } catch (error) {
    console.error(error);
    next(error);
  }
};


//
exports.memodate = async (req, res, next) => {
  const { token, date } = req.body;   

  try {
    const decoded = jwt.verify(token,jwt_key);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const myemail = user.email;

    const sentMemos = await Memo.find({
      senderEmail: myemail,
      createdAt: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) }
    }).lean();

    const receivedMemos = await Memo.find({
      'recipients.useremail': myemail,
      createdAt: { $gte: new Date(date), $lt: new Date(new Date(date).getTime() + 86400000) }
    }).lean();

    if (sentMemos.length === 0 && receivedMemos.length === 0) {
      return res.status(200).json({ success: true, memo: [] });
    }

    const sentMemosWithType = sentMemos.map(memo => ({ ...memo, type: 'Sent' }));
    const receivedMemosWithType = receivedMemos.map(memo => ({ ...memo, type: 'Received' }));

    const memo = [...sentMemosWithType, ...receivedMemosWithType];

    res.status(200).json({ success: true, memo });
  } catch (error) {
    console.error(error);
    next(error);
  }
};



const getStartAndEndOfMonth = (date) => {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  return { startOfMonth, endOfMonth };
};

exports.memoreceivethismonth = async (req, res, next) => {
  const { token } = req.query; // Retrieve token from query parameters

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const myemail = user.email;
    const { startOfMonth, endOfMonth } = getStartAndEndOfMonth(new Date());

    const receivedMemos = await Memo.find({
      'recipients.useremail': myemail,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth }
    }).lean();

    if (receivedMemos.length === 0) {
      return res.status(200).json({ success: true, memo: [] });
    }

    const receivedMemosWithType = receivedMemos.map(memo => ({ ...memo, type: 'Received' }));

    res.status(200).json({ success: true, memo: receivedMemosWithType });
  } catch (error) {
    console.error(error);
    next(error);
  }
};



//sent and receive
exports.memoreceivesendthismonth = async (req, res, next) => {
  const { token } = req.query; // Retrieve token from query parameters

  try {
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const myemail = user.email;
    const { startOfMonth, endOfMonth } = getStartAndEndOfMonth(new Date());

    // Fetch sent memos for the current month
    const sentMemos = await Memo.find({
      senderEmail: myemail,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth }
    }).lean();

    // Fetch received memos for the current month
    const receivedMemos = await Memo.find({
      'recipients.useremail': myemail,
      createdAt: { $gte: startOfMonth, $lt: endOfMonth }
    }).lean();

    // Combine sent and received memos into one array with 'type' field
    const allMemos = [
      ...sentMemos.map(memo => ({ ...memo, type: 'Sent' })),
      ...receivedMemos.map(memo => ({ ...memo, type: 'Received' }))
    ];

    // Return the combined memos as JSON response
    res.status(200).json({ success: true, memo: allMemos });

  } catch (error) {
    console.error(error);
    next(error);
  }
};




// get the user notification
exports.getMyNotifications = async (req, res, next) => {
  const token = req.body.token;
  try {

    const decoded = jwt.verify(token,jwt_key);
    const user = await User.findById(decoded.id);
    const email = user.email;
    const name = user.name;
  
    const ackNotifications = await Notification.find({ recipientEmail: email, type: 'Acknowledge' });

    const receivedMemos = await Notification.find({ recipientEmail: email, recipientName: name, type: 'New Memo' });

    res.json({ ackNotifications, receivedMemos });
  } catch (error) {
    console.error(error);
    next(error);
  }
};




exports.Allreport = async (req, res, next) => {
  const token = req.body.token;
  const month = req.body.month;
  const year = req.body.year;
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, jwt_key);
    const user = await User.findById(decoded.id);
    const myemail = user.email;

    // Create start and end dates for the month
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    // Log the dates for debugging
    console.log(`Start Date: ${startDate}`);
    console.log(`End Date: ${endDate}`);

    // Check for valid dates
    if (isNaN(startDate.valueOf()) || isNaN(endDate.valueOf())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    // Query sent memos
    const sentMemos = await Memo.find({
      senderEmail: myemail,
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    }).lean();
    console.log(`Sent Memos: ${sentMemos.length}`);

    // Query received memos
    const receivedMemos = await Memo.find({
      'recipients.useremail': myemail,
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    }).lean();
    console.log(`Received Memos: ${receivedMemos.length}`);

    // Check if any memos are found
    if (sentMemos.length === 0 && receivedMemos.length === 0) {
      return res.status(200).json({ success: true, noData: true, receivememo: [], sentmemo: [] });
    }

    // Map memos to include type information
    const sentMemosWithType = sentMemos.map((memo) => ({ ...memo, type: 'sent' }));
    const receivedMemosWithType = receivedMemos.map((memo) => ({ ...memo, type: 'received' }));

    // Send response
    res.status(200).json({
      success: true,
      noData: false,
      receivememo: receivedMemosWithType,
      sentmemo: sentMemosWithType,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
    next(error);
  }
};
