// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('../..')(server);
var mongoose = require('mongoose');
var open = require("open");
// mongodb://nombreDB:passDB@ds239309.mlab.com:39309/dbprueba -> mLab proporciona el link
var url = 'mongodb://DavidIbai:passDavidIbai@ds239309.mlab.com:39309/dbprueba';
var port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/public'));

/*----- Conectamos con mongoDB mediante mLab -----*/
mongoose.connect(url, function(err){
	if(!err){
		console.log('Conexión correcta con la DB en mLab');
	}else{
		throw err;
	}
});

/*----- Conectamos con mongoDB mediante mLab -----*/

/* ----- Creación de los objetos, Schema y mensajes en la DB -----*/
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Mensaje = new Schema({
	username: String,
	mensaje: String
});
var Mensaje = mongoose.model('Mensaje', Mensaje);

/* ----- Creación de los objetos y el schema -----*/

/* ---- Activamos el puerto 3000 en escucha ----- */
server.listen(port, function () {
  console.log('Puerto %d en escucha', port);
});
/* ---- Activamos el puerto 3000 en escucha ----- */

/* ---- Variables para controlar los usuarios de la sala ---*/
var numUsers = 0;
var sockets = [];
var actualizarLista=0;

/* ---- Variables para controlar los usuarios de la sala ---*/

/* ---- Conexión del socket.io ------*/
io.on('connection', function (socket) {
    var addedUser = false;
	sockets.push(socket);
	console.log('Numero de usuarios %d', numUsers);
	if (numUsers>2) {
        // If the user has an existing socket connection
        // from the previously opened tab,
        // Send disconnection request to the previous socket
		console.log('Mando desconexion %d', socket.id);
        io.to(socket.id).emit('disconnect sala llena');
        socket.disconnect();
    }

    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data});
    var mensaje = new Mensaje({
		username: socket.username,
		mensaje: data});
    mensaje.save(function (err) {
	    if (!err) {
	        console.log('Mensaje subido a la DB');
	    }else{
	        console.log('Error al subir mensaje a la DB');
	    }
    });
});

  // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
        var distinto = true;	  
        socket.username = username;	  
        var numeroCoincide =0;
        for (i = 0; i < sockets.length-1; i++) {
	        if (sockets[i].username != undefined && sockets[i].username.localeCompare(username) == 0) {
	        numeroCoincide++;
	        }  
        }
        numeroCoincide = numeroCoincide - 1;
        if (numeroCoincide < 0) {
            numeroCoincide = 0;
        }
        console.log("Hay las siguientes coincidencias: %d", numeroCoincide);
        if(numeroCoincide>0){
            distinto = false;
            socket.emit('disconnect');
            socket.emit('nombre_coincide', {
		        numUsers: numUsers
        });
	  }
    if (numUsers<3 && distinto==true) {  
	    if (addedUser) return;		
	    // we store the username in the socket session for this client		
	    ++numUsers;
	    addedUser = true;		
		var listaUsuarios = [];
	    for (i=0; i<sockets.length; i++){
	  	console.log(sockets[i].username);
		if(sockets[i].username!=null){
			listaUsuarios[i] = sockets[i].username;
		}
		console.log("--------------");
	    }		
	    socket.emit('login', {
		    numUsers: numUsers,
		    listaUsuarios: listaUsuarios
	    });		
	    socket.broadcast.emit('user joined', {
		username: socket.username,
		numUsers: numUsers,
		listaUsuarios: listaUsuarios
   		});   		 
   		Mensaje.find({}, function (err,docs) {
		//console.log(docs);
		for(i=docs.length-1;i>=0;i--){
		socket.emit('new message', {
      		username: docs[i]["username"],
      		message: docs[i]["mensaje"]
    	});
   		}
	}).sort({_id:-1}).limit(10);   		 
}else{
	socket.disconnect();
	sockets.pop(socket);
	//socket.username="null";		
}
});

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        if (addedUser) {
            --numUsers;
            console.log('Numero de usuarios %d', numUsers);
            var nombre=socket.username;
            socket.username="null";
            socket.disconnect();
            sockets.pop(socket);		
            var listaUsuarios = [];
            for (i=0; i<sockets.length; i++){			
	            if(sockets[i].username!=null){
		            listaUsuarios[i] = sockets[i].username;
	            }
            }
            // echo globally that this client has left
            socket.broadcast.emit('user left', {
            username: nombre,
            numUsers: numUsers,
            listaUsuarios: listaUsuarios
            });      
        }
    });
    if(actualizarLista==0){
        actualizarLista=1;
        var intervalID = setInterval(function () {
            var listaUsuarios = [];
            for (i = 0; i < sockets.length; i++) {
                if (sockets[i].username != null) {
                    listaUsuarios[i] = sockets[i].username;
                }
            }
            socket.broadcast.emit('update userList', {
                numUsers: numUsers,
                listaUsuarios: listaUsuarios
            }); console.log('Actualizada la lista de amigos');
        }, 5000);
    }			
});