var app = require('express')();
//  创建一个app
var express = require('express');
// 需要express 
var http = require('http').Server(app);
// 需要http服务 
var io = require('socket.io')(http);
// 需要scocket

app.get('/', function (req, res) {
	res.send('<h1>Welcome Realtime Server</h1>');
});
// app.use('/public', express.static(__dirname + 'public'));
app.use(express.static('public'))
//  设置静态文件夹

//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;

// 当用前端用户连接
io.on('connection', function (socket) {
	console.log('a user connected');

	//监听新用户加入
	socket.on('login', function (obj) {
		//将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
		socket.name = obj.userid;

		//检查在线列表，如果不在里面就加入
		if (!onlineUsers.hasOwnProperty(obj.userid)) {
			onlineUsers[obj.userid] = obj.username;
			//在线人数+1
			onlineCount++;
		}

		//向所有客户端广播用户加入
		io.emit('login', { onlineUsers: onlineUsers, onlineCount: onlineCount, user: obj });
		console.log(obj.username + '加入了聊天室');
	});

	//监听用户退出
	socket.on('disconnect', function () {
		//将退出的用户从在线列表中删除
		if (onlineUsers.hasOwnProperty(socket.name)) {
			//退出用户的信息
			var obj = { userid: socket.name, username: onlineUsers[socket.name] };

			//删除
			delete onlineUsers[socket.name];
			//在线人数-1
			onlineCount--;

			//向所有客户端广播用户退出
			io.emit('logout', { onlineUsers: onlineUsers, onlineCount: onlineCount, user: obj });
			console.log(obj.username + '退出了聊天室');
		}
	});

	//监听用户发布聊天内容
	socket.on('message', function (obj) {
		//向所有客户端广播发布的消息
		io.emit('message', obj);
		console.log(obj.username + '说：' + obj.content);
	});

});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // files will be saved in 'uploads' folder

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
	if (!req.file) {
		return res.status(400).send('No file uploaded.');
	}
	// Send file path as response
	res.send({ filePath: `/uploads/${req.file.filename}` });
});
app.use('/uploads', express.static('uploads'));
// On the server side (in index.js)
io.on('connection', function (socket) {
	socket.on('file-shared', function (filePath) {
		// Broadcast the file URL to all clients
		io.emit('file-shared', filePath);
	});

	socket.on('file-shared', function (filePath) {
		const messageElement = document.createElement('div');
		const fileExtension = filePath.split('.').pop().toLowerCase();

		if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
			// Display image
			messageElement.innerHTML = `<img src="${filePath}" alt="Shared Image" style="max-width: 200px; max-height: 200px;">`;
		} else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
			// Display video
			messageElement.innerHTML = `<video src="${filePath}" controls style="max-width: 200px; max-height: 200px;"></video>`;
		} else {
			// Display download link for other file types
			messageElement.innerHTML = `<a href="${filePath}" target="_blank">Download File</a>`;
		}

		// Broadcast the file URL to all clients
		io.emit('file-shared', messageElement.innerHTML);
	});
});



http.listen(process.env.PORT || 5050, function () {
	console.log('listening on *:5050');
});