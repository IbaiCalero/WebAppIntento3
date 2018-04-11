$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

 

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  var socket = io();

    /*----------------- Mensaje de notificacion de nuevo participante -----*/
  function addParticipantsMessage (data) {
      var message = '';
      if (data.numUsers == 1) {
          message = username + " estás sol@ en la sala. Recuerda que podrán leerte al conectarse";
          document.getElementById("infoAmigos").innerHTML = message;
    } else {
      message +=  data.numUsers + " usuarios en la sala: ";
      for (i = 0; i < data.listaUsuarios.length + 1; i++) {
          if (data.listaUsuarios[i] != null && data.listaUsuarios[i].localeCompare("null") != 0) {
				if (i == (data.listaUsuarios.length)-1){			
					message += data.listaUsuarios[i];
				}
				else{				
					message += data.listaUsuarios[i] + ", ";				
				}
			}		  
	  	}
      }    
    document.getElementById("infoAmigos").innerHTML = message;
  }

    /*----------------- Mensaje de notificacion de nuevo participante -----*/


    /*----------------- Ajustar el nombre del usuario -----------*/
  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }
    /*----------------- Ajustar el nombre del usuario -----------*/


    /*----------------- Mandar un mensaje de un usuario -----------*/
  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
      // if there is a non-empty message and a socket connection
    var comp_espacio = message.trim();
    if (message && connected && comp_espacio) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message',message);
    }
  }
    /*----------------- Mandar un mensaje de un usuario -----------*/

  /*---- Enviar log (mensaje, entrada en sala...) ---- */   
  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }
    /*---- Enviar log (mensaje, entrada en sala...) ---- */ 
    
    /*--------- Visualizar mensaje de chat---------------- */   
    // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }
    var soyYo = 0;
    if (username == data.username) {
        data.username = "Yo";
        soyYo = 1;
    }
    if (soyYo == 0) {
        var $usernameDiv = $('<span class="username" style="padding: 3px 0px 3px 5px; font-family serif; font-size:auto; border-radius: 3px 0px 0px 3px; border-left: 1px solid black; background-color: #EEEEEE;  border-top: 1px solid black;  border-bottom: 1px solid black;"/>')
          .text(data.username)
          .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody" style="padding: 3px 5px 3px 7px; border-radius: 0px 3px 3px 0px; border-right: 1px solid black; background-color: #EEEEEE ; border-top: 1px solid black;  border-bottom: 1px solid black;">')
          .text(data.message);
    } else {
        var $usernameDiv = $('<span class="username" style="padding: 3px 0px 3px 5px; font-family serif; font-size:auto; border-radius: 3px 0px 0px 3px; border-left: 1px solid black; background-color: #90EE90 ;  border-top: 1px solid black;  border-bottom: 1px solid black;"/>')
          .text(data.username)
          .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody" style="padding: 3px 5px 3px 7px; border-radius: 0px 3px 3px 0px; border-right: 1px solid black; background-color: #90EE90 ; border-top: 1px solid black;  border-bottom: 1px solid black;">')
          .text(data.message);
    }
    
    var typingClass = data.typing ? 'typing' : '';
    if (soyYo == 1) {
        var $messageDiv = $('<li class="message" style="margin: 20px; text-align:right;"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);
    } else {
        var $messageDiv = $('<li class="message" style="margin: 20px;"/>')
          .data('username', data.username)
          .addClass(typingClass)
          .append($usernameDiv, $messageBodyDiv);
    }
    addMessageElement($messageDiv, options);
  }
    /*--------- Visualizar mensaje de chat---------------- */

    /*--------- Visualizar que alguien escribe en el chat---------------- */
  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = 'está escribiendo';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

    /*--------- Visualizar que alguien escribe en el chat---------------- */

    /* -----srcoll + cascada de mensajes-----*/
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

    /* -----srcoll + cascada de mensajes-----*/


  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

    /*---- Esfrescar datos, importante!!!!----*/
  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

    /*---- Esfrescar datos, importante!!!!----*/

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

    /*----- Funciones para saber si se deja de escribir, escribe y/o envía datos-----------*/ 
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

    /*----- Funciones para saber si se deja de escribir, escribe y/o envía datos-----------*/


    /*------IMPORTANTE -> LOS SOCKETS EVENTS----*/
  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the participants messages
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' se ha unido');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
  if(data.username.localeCompare("null")!=0){
    log(data.username + ' se ha ido');
    addParticipantsMessage(data);
    removeChatTyping(data);
  }
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

    socket.on('disconnect', function () {
        log('Te has desconectado');        
    });

    socket.on('disconnect sala llena', function () {
        log('Te has desconectado porque se ha llenado la sala');
        window.close();       
    });
  
    socket.on('nombre_coincide', function () {
        alert("Mala suerte, alguien se te adelantó al elegir nombre");
        location.reload();    
    });

    socket.on('reconnect', function () {
        log('Has sido reconectado');
        if (username) {
            socket.emit('add user', username);
        }
    });

    socket.on('reconnect_error', function () {
        log('Fallo al reconectarse');
    });
  
  
  socket.on('update userList', function (data) {
    addParticipantsMessage(data);
  });

  socket.on('desconectar', function () {
	window.close();
	window.open("http://localhost:3000/");
        
  });
    /*----- socket events-----------*/

});
