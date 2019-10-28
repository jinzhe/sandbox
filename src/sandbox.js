const md5 = require('js-md5');
const extension = {
	mp3: {
		ContentType: 'audio/mp3'
	},
	mp4: {
		ContentType: 'audio/mp4'
	},
	txt: {
		ContentType: 'text/plain'
	},
	css: {
		ContentType: 'text/css'
	},
	avi: {
		ContentType: 'video/x-msvideo'
	},
	html: {
		ContentType: 'text/html'
	},
	mxml: {
		ContentType: 'application/xv+xml'
	},
	rss: {
		ContentType: 'application/rss+xml'
	},
	xml: {
		ContentType: 'application/xml'
	},
	js: {
		ContentType: 'application/javascript'
	},
	json: {
		ContentType: 'application/json'
	},
	xhtml: {
		ContentType: 'application/xhtml+xml'
	},
	pdf: {
		ContentType: 'application/pdf'
	},
	jpg: {
		ContentType: 'image/jpeg'
	},
	jpeg: {
		ContentType: 'image/jpeg'
	},
	png: {
		ContentType: 'image/png'
	},
	other: {
		ContentType: 'text/plain',
		Charset: 'UTF-8',
		fileName: 'Uknown',
		fileExtension: ''
	}
};
export default class sandbox {
	constructor(files, options) {
		if (files.length == 0 || !window.chrome) {
			console.error('Only chrome browser is supported');
			return;
		}
		window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
		window.directoryEntry = window.directoryEntry || window.webkitDirectoryEntry;
		window.requestFileSystem(
			window.TEMPORARY,
			0,
			(fs) => {
				this.root = fs.root;

				this.tree = {};
				if (files.length > 0) {
					this.readDir('/', (sandboxFiles) => {
						let index = 0;
						let max = files.length;

						(function step(that) {
							if (!sandboxFiles.includes(that.getHash(files[index]))) {
								that.createFileByPath({
									path: files[index],
									callback: (hash, url) => {
										that.tree[hash] = url;
										index++;
										if (index == max) {
											//缓存完列表
											options && options['success'] && options['success'](that.tree);
										} else {
											step(that);
										}
									}
								});
							} else {
								that.getUrl(files[index], (url) => {
									that.tree[that.getHash(files[index])] = url;
									index++;
									if (index == max) {
										options && options['success'] && options['success'](that.tree);
										return;
									}
									step(that);
								});
							}
						})(this);
					});
				}
			},
			function(e) {
				console.log(e);
			}
		);
	}

	get(path) {
		return this.tree[this.getHash(path)];
	}

	getUrl(path, callback = new Function()) {
		this.root.getFile(
			this.getHash(path),
			{},
			function(fileEntry) {
				callback(fileEntry.toURL());
			},
			callback
		);
	}

	// 根据url创建沙盒文件
	createFileByPath(options) {
		console.log(options);
		const xhr = new XMLHttpRequest();
		xhr.open('get', options['path']);
		xhr.responseType = 'blob'; // ""|"text"-字符串 "blob"-Blob对象 "arraybuffer"-ArrayBuffer对象
		xhr.onload = () => {
			let hash = this.getHash(options['path']);

			this.root.getFile(
				hash,
				{
					create: true
				},
				function(fileEntry) {
					let url = fileEntry.toURL();

					fileEntry.createWriter(function(fileWriter) {
						var truncated = false;
						fileWriter.onwriteend = function() {
							if (!truncated) {
								truncated = true;
								this.truncate(this.position);
								return;
							}
							options.callback && options.callback(hash, url);
						};
						fileWriter.onerror = options.callback;

						fileWriter.write(xhr.response);
					}, options.callback);
				},
				options.callback
			);
		};
		xhr.send();
	}

	getHash(path) {
		let hash = md5(path);
		let ext = this.getExt(path);
		return hash + '.' + ext;
	}

	getExt(path) {
		let temp = path.split('.');
		let name = temp[temp.length - 1];
		return name;
	}

	readFile(path, callback = new Function()) {
		this.root.getFile(
			path,
			{},
			function(fileEntry) {
				fileEntry.file(function(file) {
					var reader = new FileReader();
					reader.onloadend = function() {
						callback(this.result);
					};
					// TODO: find a way to read as binary too
					reader.readAsText(file);
				}, callback);
			},
			callback
		);
	}

	createFile(path, contents, callback = new Function()) {
		this.root.getFile(
			path,
			{ create: true },
			function(fileEntry) {
				fileEntry.createWriter(function(fileWriter) {
					var truncated = false;
					fileWriter.onwriteend = function() {
						if (!truncated) {
							truncated = true;
							this.truncate(this.position);
							return;
						}
						callback();
					};
					fileWriter.onerror = callback;
					// TODO: find a way to write as binary too
					var pathSplit = path.split('.');
					var ext = 'text/plain';
					if (pathSplit.length > 0) {
						ext = extension[pathSplit[pathSplit.length - 1]];
					}
					fileWriter.write(new Blob([ contents ], { type: ext }));
				}, callback);
			},
			callback
		);
	}

	// 删除文件
	removeFile(path, callback = new Function()) {
		this.root.getFile(
			path,
			{},
			function(fileEntry) {
				fileEntry.remove(function() {
					callback();
				}, callback);
			},
			callback
		);
	}

	readDir(path, callback = new Function()) {
		this.root.getDirectory(
			path,
			{},
			function(dirEntry) {
				var dirReader = dirEntry.createReader();
				var entries = [];

				(function readEntries() {
					dirReader.readEntries(function(results) {
						if (!results.length) {
							callback(entries);
						} else {
							entries = entries.concat(
								Array.prototype.slice.call(results).map(function(entry) {
									return entry.name + (entry.isDirectory ? '/' : '');
								})
							);
							readEntries();
						}
					}, callback);
				})();
			},
			callback
		);
	}

	createDir(path, callback = new Function()) {
		this.root.getDirectory(
			path,
			{ create: true },
			function() {
				callback();
			},
			callback
		);
	}

	removeDir(path, callback = new Function()) {
		this.root.getDirectory(
			path,
			{},
			function(dirEntry) {
				dirEntry.removeRecursively(function() {
					callback && callback();
				}, callback);
			},
			callback
		);
	}

	copy(src, dest, callback = new Function()) {
		this.root.getFile(
			src,
			{},
			(fileEntry) => {
				this.root.getDirectory(
					dest,
					{},
					function(dirEntry) {
						fileEntry.copyTo(
							dirEntry,
							function() {
								callback();
							},
							callback
						);
					},
					callback
				);
			},
			callback
		);
	}

	move(src, dest, callback) {
		this.root.getFile(
			src,
			{},
			(fileEntry) => {
				this.root.getDirectory(
					dest,
					{},
					(dirEntry) => {
						fileEntry.moveTo(
							dirEntry,
							function() {
								callback();
							},
							callback
						);
					},
					callback
				);
			},
			callback
		);
	}
}
