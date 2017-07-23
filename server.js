var cors = require('cors');
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var app = module.exports = express();
var port = process.env.PORT || 3000;
var router = express.Router();
var mongodb = require('mongodb');
var searchHistory= require('./models/searchHistory');
// Standard URI format: mongodb://[dbuser:dbpassword@]host:port/dbname, details set in .env
var MONGODB_URI = 'mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.DB_PORT+'/'+process.env.DB;
var mongoose = require('mongoose');
var axios =  require('axios');
var moment = require('moment');
var key = process.env.KEY;
var cx = process.env.CX;

app.use(bodyParser.json());

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'views')));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));


mongoose.Promise = global.Promise;
mongoose.connect(MONGODB_URI,{ useMongoClient: true}); 
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'))
.once('open', console.log.bind(console, 'DB Connection established.'));

//render initial page
app.get('/', function(req, res) {
	res.render('index',{
	result : '',
	url: ''});
});

//route to recent terms
app.get('/recent', function(req, res,next) {
//find recent documents
searchHistory.find({})
	.sort({createdAt:-1}).limit(10).exec(function(err, docs){
		if (err) res.send('Error reading database');
		if(docs.length >0){
		var recent= [];
   	  docs.forEach(function(doc){
      //format date using moment.js
      var formatedDate = moment(doc.createdAt).format('LLL');
			recent.push({term:doc.searchText , date : formatedDate});
        })
	
		res.json(recent);
    }else{
      res.send("no results found");
    }
	});

});

//handle form submission 
app.post('/', function(req, res,next) {
    var text =  req.body.text;
    var offset;	
  //offset must contain only numbers
    if(/^\d+$/.test(req.body.offset) === true){
		offset = req.body.offset;
	}else{
		offset = '1';
	}
  //generate the url for /imgsearch
    var url = 'https://clever-cactus.glitch.me/'+ text + '&offset=' +offset+ '&searchType=image';
   //url to use the api GOOGLE CUSTOM SEARCH
    var BASE_API = 'https://www.googleapis.com/customsearch/v1?key='+key+'&cx='+cx+'&q=';
    var API_URL = BASE_API + text + '&offset=' +offset+'&searchType=image';
    var data = new searchHistory(
			{
			searchText : text,
			searchUrl :  API_URL	
			}
			);
  
			//save new document in the database
     data.save(function(err){
			 if(err){
			 	return res.send('Error saving to database');
			 }
        else{
          console.log('data saved');
        }
			});
      
//show the url to see the results in the main page
    res.render('index' ,{       
      result : 'result:',
				url : url
			});
});

app.get('/imgsearch', function(req, res,next) {

searchHistory.find({})
	.sort({createdAt:-1})
	.limit(1)
	.exec(function(err, doc){
		if (err) res.send('Error reading database');
   //extract the last url inserted		
		var findUrl = doc[0].searchUrl;
		
  //use the url to call the api
		axios.get(findUrl)
			.then(function (response) {
			var items = response.data.items
			showData(items);
	
		}).catch(function (error) {
	         console.log(error);
	        });

  //format data received from the api call
		function showData(items){
			var results =[];
			items.forEach(function(item){
				results.push({
					url :  item.link,
					thumbnail : item.image.thumbnailLink,
					snippet : item.snippet,
					context : item.image.contextLink
				  	});
			
				});
			res.json(results)
			}
   	     });
});

app.listen(port,function(){
console.log('app is working on port '+port);
})
