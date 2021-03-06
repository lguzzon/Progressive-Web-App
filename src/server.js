import express from "express";
import React from "react";
import { renderToString, } from 'react-dom/server';
import { createServerRenderContext } from 'react-router';
import { serverRoute } from "./routers/routes";
import path from "path";
import webpush from 'web-push';
import bodyParser from 'body-parser';
import EventEmitter from 'events';

var app = express();
var queue = [];
var em = new EventEmitter;
//Point to static files
app.use(express.static('dist/'));
app.use(express.static('static/'))
app.use(bodyParser.json());

app.post('/api/push', function(req, res) {
	let sub = req.body.subscription;
	queue.push(sub);
	res.send('OK');
});
app.post('/api/offline', function(req, res) {
	res.json(req.body);
});
app.get('/api/sse', function(req, res) {
	em.on('sseevent', function (data) {
		res.write('event: sse\n');
	  res.write('data: ' + JSON.stringify({ msg : data }) + '\n\n');
	});
  res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*"
  });
  res.write("retry: 10000\n\n");
});


app.get('*', function(req, res) {
    let context = createServerRenderContext();
    let router = serverRoute(req, context);
    // render the first time
    let markup = renderToString(
		router
	);
	
    // get the result
    const result = context.getResult()
    if (result.redirect) {
        res.writeHead(301, {
            Location: result.redirect.pathname
        })
        res.end()
    } else {
        if (result.missed) {
            res.writeHead(404);
            markup = "nei";
            res.write(markup)
            res.end()
        }
    }
	res.send(markup)
});

function timedEventEmitter() {
	setInterval(() => {
		em.emit('sseevent', 'message with number: #'+ Math.round(Math.random(2000, 1000000)*100000))
	}, 5000);
}

function pushService() {
	setInterval(() => {
		let i = queue.length;
		while(i--) {
			const pushSubscription = queue.pop(); //your subscription object
			const payload = 'This is the push message you asked for :)';
			if(pushSubscription) {
				const options = {
				  vapidDetails: {
				    subject: 'http://localhost:4000/',
				    publicKey: 'BHVJ8n4KMCPy7YOTwNTwn-M3lSKOP_J1PgPQ5lau8ExQ_HwhpbwjYwxtne9vFaOGMzVj_ETeLu5uv8sCZGwFFFc', //These are the keys you generated in step 1
				    privateKey: 'FLuaKQ7j6ZDxwM_5q0Yr69f0MPaV-M-EBMtC8dgo_Ao' //These are the keys you generated in step 1
				  },
				  TTL: 90000,
				  headers: {
				    //'< header name >': '< header value >'
				  }
				}
				webpush.sendNotification(
				  pushSubscription,
				  payload,
				  options
				).then((res) => {
				    console.log(res);
				}).catch((err) => {
				    console.log(err);
				});
			}
		}
	}, 60000);
}
//Listen on port
app.listen(3005);
pushService();
timedEventEmitter()
