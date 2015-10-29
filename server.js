var restify = require('restify');
var fs = require('fs');
var pg = require('pg');
// db settings
  pg.defaults.database =  'hpd';
  pg.defaults.host = process.env.OPENSHIFT_POSTGRESQL_DB_HOST || 'localhost';
  pg.defaults.user = process.env.OPENSHIFT_POSTGRESQL_DB_USERNAME || 'mrbuttons';
  pg.defaults.password = process.env.OPENSHIFT_POSTGRESQL_DB_PASSWORD || 'mrbuttons';
  if (process.env.OPENSHIFT_POSTGRESQL_DB_PORT) {
    pg.defaults.port = process.env.OPENSHIFT_POSTGRESQL_DB_PORT;
  }
// server settings
var server_port = process.env.OPENSHIFT_NODEJS_PORT || '8080';
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || 'localhost';

var server = restify.createServer({
  name: 'Inside-HPD-Data'
});

server.listen(server_port, server_ip_address);

// this functions runs for all requests
server.use(function(req, res, next){
  return next();
});

//var corporate_owners;
//retrive_corporate_owners_json('top500.txt', function(data){
//  corporate_owners = data;
//});

///////////
//routes//
/////////
 

/// search by corporation name
server.get('/corplookup/:name', function(req, res, next){
  corporate_name_search(req.params.name, function(result){
    //console.log(result);
    res.send(result.rows[0]);
    next();
  });
});

// search by property address
server.get('/address/:add', function(req, res, next){
  
});

//  corporate_owners names by corporate_owners id
server.get('/id/corpnames/:id', function(req, res, next){
  //console.log('request for: ' + req.params.id);
  get_corporate_names(req.params.id, function(result){
    res.send(result.rows[0].uniqnames);
    next();
  });
});

// list of buildings of corporate_owners by corporate_owners id
server.get('/id/buildings/:id', function(req, res, next){
  get_buildings_by_id(req.params.id, function(result){
    res.send(result.rows);
    next();
  });
});

// get lat/lng of corporate_owner by id
server.get('/id/latlng/:id', function(req,res,next){
  get_corporate_owner_lat_lng(req.params.id, function(result){
    res.send(result.rows[0]);
    next();
  });
});

//serves static files from html folder
server.get(/.*/, restify.serveStatic({
    'directory': __dirname + '/html',
  'default': 'index.html'
}));

//////////////
//FUNCTIONS//
////////////

function get_buildings_latlng(id, callback){
  var query = 'SELECT r. lat, r. lng FROM (select unnest (regids) as regid from corporate_owners where id = $1) as x JOIN registrations as r on r. registrationid = x. regid WHERE r. lat IS NOT NULL';
  var a =[];
  a.push(id);
  do_query(query, a, callback);
}

  function get_corporate_owner_lat_lng (id, callback) {
    var query = "SELECT lat, lng FROM corporate_owners WHERE id = $1";
    var a = [];
    a.push(Number(id));
    do_query(query, a, callback);
  }

  function retrive_corporate_owners_json(fileName, callback) {
  fs.readFile(fileName, 'utf8', function(err, data){
    if (err) throw Error;
    callback(JSON.parse(data));
  });
}

function get_corporate_names(id, callback) {
  var query = "SELECT uniqnames FROM corporate_owners WHERE id=$1";
  var a = [];
  a.push(Number(id));
  do_query(query, a, callback);
}

function get_buildings_by_id(id, callback) {
  var query = "SELECT corporate_owner.regid as regid, r.housenumber as h, r.streetname as st, r.zip as zip, r.boro as b, r.lat as lat, r.lng as lng, c.corporationname as corp FROM (SELECT DISTINCT unnest(regids) as regid FROM corporate_owners WHERE id = $1) as corporate_owner JOIN registrations as r on corporate_owner.regid = r.registrationid JOIN (SELECT * FROM contacts WHERE registrationcontacttype = 'CorporateOwner') as c on corporate_owner.regid = c.registrationid";
  var a = [];
  a.push(Number(id));
  do_query(query, a, callback);
}

// change from ILIKE to fullcaps?
function corporate_name_search(name, callback) {
  var query = "SELECT id FROM corporate_owners where $1 ILIKE ANY(uniqnames)";
  var a = [];
  var prepared_name = '%' + name + '%';
  a.push(prepared_name);
  do_query(query, a, callback);
}

// POSTGRES QUERY
// input: string, array, callback
function do_query(sql, params, callback) {
  pg.connect(function(err, client, done){
    if(err) {
      return console.error('error fetching client from pool', err);
    }
    client.query(sql, params, function(err, result){
            if (err){
        console.error('query error', err);
        callback(null);
      } else {
        //callback with results
        callback(result);
      }
      done();
    });
  });
}

