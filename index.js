// Generated by CoffeeScript 1.10.0
(function() {
  var AtomicRPC, _, emitter, ws,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ws = require('ws');

  _ = require('lodash');

  emitter = require('events');

  module.exports = AtomicRPC = (function(superClass) {
    extend(AtomicRPC, superClass);

    function AtomicRPC(args) {
      var socket;
      this.host = args.host, this.port = args.port, this.server = args.server, this.reconnect = args.reconnect, this.timeout = args.timeout;
      this.connections = {};
      this.exposures = {};
      if (this.timeout == null) {
        this.timeout = 2000;
      }
      this.scopes = {};
      this.callbacks = {};
      this.id = 0;
      this.debug = false;
      if (this.server != null) {
        socket = new ws.Server({
          port: this.port
        });
        if (this.debug) {
          setInterval((function(_this) {
            return function() {
              return console.log('CONNECTION COUNT ', _.keys(_this.connections).length);
            };
          })(this), 10000);
        }
        socket.on('connection', (function(_this) {
          return function(client) {
            _this._connectionHandler(client);
            client.on('close', function() {
              return _this._disconnectionHandler(client);
            });
            return client.on('error', function() {
              return _this._errorHandler(error, client);
            });
          };
        })(this));
        socket.on('error', (function(_this) {
          return function(error) {
            return _this._errorHandler(error, socket);
          };
        })(this));
      } else {
        this._connectClient();
      }
    }

    AtomicRPC.prototype._connectClient = function() {
      var socket;
      socket = new ws("ws://" + this.host + ":" + this.port);
      socket.on('open', (function(_this) {
        return function() {
          return _this._connectionHandler(socket);
        };
      })(this));
      socket.on('close', (function(_this) {
        return function() {
          return _this._disconnectionHandler(socket);
        };
      })(this));
      return socket.on('error', (function(_this) {
        return function(error) {
          return _this._errorHandler(error, socket);
        };
      })(this));
    };

    AtomicRPC.prototype.expose = function(method, funk, scope) {
      if (scope == null) {
        scope = null;
      }
      this.exposures[method] = funk;
      if (scope) {
        return this.scopes[method] = scope;
      }
    };

    AtomicRPC.prototype.call = function(arg) {
      var _callback, callback, connectionId, id, message, method, params;
      connectionId = arg.id, method = arg.method, params = arg.params, callback = arg.callback;
      if (connectionId == null) {
        _.every(this.connections, (function(_this) {
          return function(connection, id) {
            _this.call({
              id: id,
              method: method,
              params: params,
              callback: callback
            });
            return true;
          };
        })(this));
        return;
      }
      if (this.connections[connectionId] == null) {
        if (this.debug) {
          console.error("NO SUCH SOCKET: " + connectionId);
        }
        if (callback != null) {
          callback('no such socket');
        }
        return;
      }
      if (params == null) {
        params = {};
      }
      if (callback != null) {
        id = process.hrtime().join('');
        _callback = (function(_this) {
          return function() {
            delete _this.callbacks[id];
            return callback.apply(_this, arguments);
          };
        })(this);
        setTimeout((function(_this) {
          return function() {
            if (_this.callbacks[id] != null) {
              if (_this.debug) {
                console.error("TIMEOUT!!! method: " + method + ", socket: " + connectionId);
              }
              return _this.callbacks[id].call(null, 'timeout');
            }
          };
        })(this), this.timeout);
        this.callbacks[id] = _callback;
      }
      message = {
        id: id,
        method: method,
        params: params
      };
      if (this.debug) {
        console.warn("MESSAGE TO " + connectionId, message);
      }
      return this.connections[connectionId].send(JSON.stringify(message));
    };

    AtomicRPC.prototype._messageHandler = function(socket, message) {
      var args, error, id, method, params, ref, result;
      message = JSON.parse(message);
      id = message.id, method = message.method, params = message.params, error = message.error, result = message.result;
      this.emit('message', message);
      if (this.debug) {
        console.info("MESSAGE FROM " + socket.id, message);
      }
      if (method != null) {
        args = [params];
        if (id != null) {
          args.push(function(error, result) {
            message = {
              id: id
            };
            if (error != null) {
              message.error = error;
            }
            if (result != null) {
              message.result = result;
            }
            if (this.debug) {
              console.warn("MESSAGE TO " + socket.id, message);
            }
            return socket.send(JSON.stringify(message));
          });
        }
        args.push(socket.id);
        return this.exposures[method].apply(this.scopes[method] || this, args);
      } else if ((error != null) || (result != null)) {
        return (ref = this.callbacks[id]) != null ? ref.call(this, error, result) : void 0;
      }
    };

    AtomicRPC.prototype._connectionHandler = function(socket) {
      socket.on('message', (function(_this) {
        return function(message) {
          return _this._messageHandler(socket, message);
        };
      })(this));
      this.connections[this.id] = socket;
      socket.id = this.id;
      this.id++;
      if (this.debug) {
        console.info("CONNECTED " + socket.id);
      }
      return this.emit('connect', socket);
    };

    AtomicRPC.prototype._errorHandler = function(error, socket) {
      if (this.debug) {
        console.error(error);
      }
      return this._disconnectionHandler(socket);
    };

    AtomicRPC.prototype._disconnectionHandler = function(socket) {
      this.emit('disconnect', socket);
      if (this.debug) {
        console.error("DISCONNECTED " + socket.id);
      }
      delete this.connections[socket.id];
      if (this.reconnect != null) {
        return setTimeout((function(_this) {
          return function() {
            if (_this.debug) {
              console.log('RECONNECTING...');
            }
            return _this._connectClient();
          };
        })(this), 5000);
      }
    };

    return AtomicRPC;

  })(emitter);

}).call(this);
