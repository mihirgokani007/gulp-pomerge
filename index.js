'use strict';

var pluginName = require('./package.json').name;
var through = require('through2');
var path = require('path');
var fs = require('fs');
var util = require('util');
var PoFile = require('pofile');

var gUtil = require('gulp-util');

module.exports = function (file, options) {
  options = util._extend({conflicts: 'merge'}, options); // conflicts -> skip|replace|merge
  
  var merged = {comments: [], headers: [], items: []};
  var index = {comments: {}, headers: {}, items: {}};
  var latestFile;
  var latestMod;

  return through.obj(function (file, enc, cb) {
    var self = this;

    if (file.isNull()) {
      self.push(file);
      return cb();
    }
    
    if (file.isStream()) {
      self.emit('error', new gUtil.PluginError(pluginName, 'Streaming not supported'));
      return cb();
    }
    
    // set latest file if not already set,
    // or if the current file was modified more recently.
    if (!latestMod || file.stat && file.stat.mtime > latestMod) {
      latestFile = file;
      latestMod = file.stat && file.stat.mtime;
    }
      
    var pofile = PoFile.parse(file.contents.toString());
    
    // Comments
    pofile.comments.forEach(function(comment) {
      var existing = merged.comments[index.comments[comment]];
      if (existing == null) {
        merged.comments.push(comment);
        index.comments[comment] = merged.comments.length - 1; // the index within merged.comments
      }
    });

    // Headers
    Object.keys(pofile.headers).forEach(function(key) {
      var value = pofile.headers[key];
      var header = {key: key, value: value};
      var existing = merged.headers[index.headers[key]];
      var replace;
      
      header._stats = file.stat;
      // header._stats = fs.statSync(file.path);
      if (existing == null) { // current header is new
        merged.headers.push(header);
        index.headers[key] = merged.headers.length - 1; // the index within merged.headers
      } else { // current header is a duplicate
        if (existing.value && value) {
          replace = options.conflicts === 'replace' ? true
                  : options.conflicts === 'skip' ? false
                  : header._stats.mtime.getTime() > existing._stats.mtime.getTime();
        } else {
          replace = !existing.value;
        }
        if (replace) {
          merged.headers[index.headers[key]] = header;
        }
      }
    });
    
    pofile.items.forEach(function(item) {
      var msgid = item.msgid;
      var msgstr = item.msgstr ? item.msgstr.join('') : '';
      var existing = merged.items[index.items[msgid]];
      var alreadyFilled, replace;
      
      item._stats = file.stat;
      // item._stats = fs.statSync(file.path);
      
      if (existing == null) { // current item is new
        merged.items.push(item);
        index.items[msgid] = merged.items.length - 1; // the index within merged.items
      } else { // current item is a duplicate
        alreadyFilled = existing.msgstr && existing.msgstr.join('');
        
        if (alreadyFilled && msgstr) {
          replace = options.conflicts === 'replace' ? true
                  : options.conflicts === 'skip' ? false
                  : item._stats.mtime.getTime() > existing._stats.mtime.getTime();
        } else {
          replace = !alreadyFilled;
        }
        if (replace) {
          merged.items[index.items[msgid]] = item;
        }
      }
      
    });

    cb();
  
  }, function(cb) {

    var pofile = new PoFile();
    var mergedFile;

    pofile.comments = merged.comments;
    pofile.items = merged.items;
    pofile.headers = {};
    merged.headers.forEach(function(header) {
      pofile.headers[header.key] = header.value;
    });

    // if file opt was a file path
    // clone everything from the latest file
    if (typeof file === 'string') {
      mergedFile = latestFile.clone({contents: false});
      mergedFile.path = path.join(latestFile.base, file);
    } else {
      mergedFile = new File(file);
    }
    mergedFile.contents = new Buffer(pofile.toString());
    
    this.push(mergedFile);
    cb();
  });
};
