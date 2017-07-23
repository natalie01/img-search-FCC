var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var searchSchema = new Schema({
searchText : String,
searchUrl : String,
},{timestamps: true});


var ModelClass = mongoose.model('searchHistory',searchSchema );

module.exports = ModelClass;
