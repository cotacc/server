const express = require('express');
const route = express.Router();
const path = require('path');
const { memoreceivesendthismonth,Isgooglecalendarsave,googlecalendersave,memoreceivethismonth, displayMemo, showusermemo, memodetails, isAcknowledgememo, read, memoIcreate, Iacknowledge, memodate, getMyNotifications, Allreport,createdmemo,uploads,createddetails,pdfdetails} = require('../controllers/memo');
const { isAuthenticated, isAdmin, checkRole } = require('../middleware/auth');


route.get('/showmemo',isAuthenticated,showusermemo);
route.get('/memo/list', displayMemo);
route.get('/memo/details/:memoId',isAuthenticated, memodetails);
route.post('/memo/acknowledge/:memoId', isAuthenticated,isAcknowledgememo);
route.post('/memo/sendmemo',isAuthenticated,uploads);
route.post('/Iacknowledge/:memoId',isAuthenticated, Iacknowledge);
route.post('/memo/read',isAuthenticated, read);
route.get('/memo/created/:memoId',isAuthenticated,createdmemo);
route.get('/memo/pdfdetails/:memoId',isAuthenticated,pdfdetails);
route.get('/memo/created_details/:memoId',isAuthenticated,createddetails);
route.get('/memoIcreate',isAuthenticated, memoIcreate);
route.post('/memo/send-and-recieve',isAuthenticated,memodate);
route.post('/getMynotifications',isAuthenticated, getMyNotifications);
route.post('/allreport',isAuthenticated, Allreport);
route.get('/getmemoofthismonth',isAuthenticated,memoreceivethismonth);
route.get('/isgooglecalendarsave',isAuthenticated,Isgooglecalendarsave);
route.post('/googlecalendersave',isAuthenticated,googlecalendersave);
route.get('/memoreceivesendthismonth',isAuthenticated,memoreceivesendthismonth);
// Error handling middleware
route.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = route;
