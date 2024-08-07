const express = require('express');
const { verify } = require('jsonwebtoken');
const route = express.Router();
const {updateDepartment,initializeGoogleSignIn,getallinstructors,getallbsatexcludesender,getallbsetexcludesender,getallbsitexcludesender,getallbsftexcludesender,getalladminexcludesender,getallsecretaryexcludesender,getalladmin,getallsecretary,getallregularusers,login,logout,Userprofile,invite,updaterole,getmyrole,getalluser, deleteuser,getallbsat,getallbsit,getallbset,getallbsft,getrole,updateuserrole, createevent,showAllevent,Eventonthismonth ,getallroleuser} = require('../controllers/auth');
const {isAuthenticated,afterlogin,isAdmin} = require('../middleware/auth');


route.post('/login',login);
route.post('/logout',logout);
route.get('/getme',isAuthenticated,Userprofile);


route.post('/invite',isAuthenticated,invite)
route.post('/updaterole',isAuthenticated,updaterole);


route.post('/create_event',isAuthenticated,createevent);
route.post('/getevent',isAuthenticated,showAllevent);
route.post('/Eventonthismonth',isAuthenticated,Eventonthismonth );
route.post('/initialize_google_sign_in', isAuthenticated,initializeGoogleSignIn);

route.post('/deletethisuser',isAuthenticated,deleteuser);

route.get('/role',getrole);
route.post('/updateuserrole',isAuthenticated,updateuserrole);
route.post('/updateDepartment',isAuthenticated,updateDepartment);

route.get('/getallbsat',isAuthenticated,getallbsat);
route.get('/getallbsit',isAuthenticated,getallbsit);
route.get('/getallbset',isAuthenticated,getallbset);
route.get('/getallbsft',isAuthenticated,getallbsft);
route.get('/getuserhaverole',isAuthenticated,getallroleuser);
route.get('/getallsecretary',isAuthenticated,getallsecretary);
route.get('/getalladmin',isAuthenticated,getalladmin);

route.get('/getallinstructors', isAuthenticated, getallinstructors);


route.get('/getallusers',isAuthenticated,getalluser);
route.get('/getmyrole',getmyrole);


route.get('/getsecretary',isAuthenticated,getallsecretaryexcludesender);
route.get('/getadmin',isAuthenticated,getalladminexcludesender);
route.get('getbsft',isAuthenticated,getallbsftexcludesender);
route.get('/getbsit',isAuthenticated,getallbsitexcludesender);
route.get('/getbsat',isAuthenticated,getallbsatexcludesender);
route.get('/getbset',isAuthenticated,getallbsetexcludesender);
route.get('/getallregularuser',isAuthenticated,getallregularusers);

module.exports = route;
