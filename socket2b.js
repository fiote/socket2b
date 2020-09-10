class Socket2b {

	cbid = 0;
	open = false;
	listeners = [];
	callbacks = {};
	internals = ['open','close','error'];

	constructor(ws) {
		this.ws = ws;

		this.internals.forEach(method => {
			this.ws.addEventListener(method, ev => {
				this.trigger(method, ev.data);
				if (method == 'open') this.setOpen();
				if (method == 'close') this.setClosed();
			});
		});

		this.ws.addEventListener('message',ev => {
			const { channel, cbid, data } = this.parseEvent(ev);
			if (channel == 'callback') return this.parseCallback(cbid, data);
			this.trigger(channel, data, cbid);
		});
	}

	setOpen() {
		this.open = true;
	}

	setClosed() {
		this.open = false;
		this.callbacks = [];
		this.listeners = [];
	}

	parseEvent(ev) {
		let feed = {};
		try {
			feed = JSON.parse(ev.data);
		} catch(e) {
			feed = {channel: 'global', data: {event:'message', message:ev.data}};
		}
		return feed;
	}

	parseCallback(cbid, data) {
		const callback = this.callbacks[cbid];
		delete this.callbacks[cbid];
		if (callback) callback(data);
	}

	trigger(channel, data, cbid) {
		this.listeners.forEach(entry => {
			if (entry.channel === channel) {
				entry.callback(data,payback => {
					if (cbid !== undefined) this.emitback(cbid, payback);
				});
			}
		});
	}

	emit(channel, data, callback) {
		const message = {channel, data};
		if (callback) {
			message.cbid = this.cbid++;
			 this.callbacks[message.cbid] = callback;
		}
		this.ws.send(JSON.stringify(message));
	}

	emitback(cbid, data) {
		const message = {channel: 'callback', cbid, data};
		this.ws.send(JSON.stringify(message));
	}

	on(channel, callback) {
		this.listeners.push({channel, callback});
	}

	close() {
		this.ws.close();
	}
}