(function($) {
	var FAILED_LIMIT = 100;

	// NAVBAR related
	var
		$window = $(window),
		$document = $(document),
		$popoverLink = $('[data-popover]'),
		$body = $('body'),
		$nav = $('.navbar'),
		navOffsetTop = $nav.offset().top,
		epochTimestamp = 1459468800000;


	function resize() {
		$body.removeClass('has-docked-nav');
		navOffsetTop = $nav.offset().top;
		onScroll();
	}

	function onScroll() {
		if(navOffsetTop < $window.scrollTop() && !$body.hasClass('has-docked-nav')) {
			$body.addClass('has-docked-nav');
		}
		if(navOffsetTop > $window.scrollTop() && $body.hasClass('has-docked-nav')) {
			$body.removeClass('has-docked-nav');
		}
	}

	function openPopover(e) {
		e.preventDefault();
		closePopover();
		var popover = $($(this).data('popover'));
		popover.toggleClass('open');
		e.stopImmediatePropagation();
	}

	function closePopover(e) {
		if($('.popover.open').length > 0) {
			$('.popover').removeClass('open');
		}
	}

	function init() {
		$window.on('scroll', onScroll);
		$window.on('resize', resize);
		$popoverLink.on('click', openPopover)
		$document.on('click', closePopover)

		$(document).keyup(function(evt) {
			if (evt.altKey) { return; }
			if (evt.ctrlKey) { return; }

			evt.preventDefault();
			switch(evt.which) {
			case 37:	// arrow left
				$("a[rel=prev]").click();
				break;
			case 39:	// arrow right
				$("a[rel=next]").click();
				break;
			}
		});
	}

	init();

	// Application start
	var app = $.sammy('#main', function() {
		this.use('Mustache', 'html');
		this.use(CatapultTypes);
		this.use(CatapultFormat);

		var host = location.hostname;
		var apiHost = 'http://' + host + ':3000';
		var wsHost = 'ws://' + host + ':3000/ws';
		var getJson = function(a, b, c) {
			$.getJSON(apiHost + a, b, c);
		};

		var wsConnection = new WebSocket(wsHost);
		wsConnection.onopen = function () {
			console.log('connected to websocket', wsHost);
		};
		var blockHandler = undefined;
		var unconfirmedHandler = undefined;
		var additionalStatusHandler = undefined;

		var failedHashes = {};
		var failedStatuses = [];
		var transactionStatusHandler = function(obj) {
			if (obj.hash in failedHashes)
				return;

			app.context_prototype.prototype.fmtTimestamp('deadline', obj, epochTimestamp);

			failedHashes[obj.hash] = true;
			failedStatuses.unshift(obj);

			while (failedStatuses.length > FAILED_LIMIT) {
				var st = failedStatuses.pop();
				delete failedHashes[st.hash];
			}

			if (additionalStatusHandler)
				additionalStatusHandler(obj);
		};

		wsConnection.onmessage = function (e) {
			var obj = JSON.parse(e.data);
			if ('uid' in obj) {
				wsConnection.send('{"uid": "'+obj.uid+'", "subscribe":"block"}');
				wsConnection.send('{"uid": "'+obj.uid+'", "subscribe":"unconfirmedAdded"}');
				wsConnection.send('{"uid": "'+obj.uid+'", "subscribe":"status"}');
			} else {
				if ('block' in obj && blockHandler)
					blockHandler(obj);

				if ('transaction' in obj && unconfirmedHandler)
					unconfirmedHandler(obj);

				if ('status' in obj)
					transactionStatusHandler(obj);
			}
		};

		function defaultBlockHandler(context, obj) {
			context.formatBlock(0, obj, epochTimestamp);
			$('#chain-height').text(obj.block.height_str);
			return obj;
		};

		function setDefaultBlockHandler(context) {
			blockHandler = function blockHandlerWrapper(object) { return defaultBlockHandler(context, object); };
		}

		function setActiveLink(name, context) {
			var ul = $('ul');
			ul.children().removeClass('active');
			ul.find('a[href^="#/'+name+'/"]').parent().addClass('active');
			unconfirmedHandler = undefined;
			additionalStatusHandler = undefined;
			setDefaultBlockHandler(context);
		}

		function createTemplateMap(TxType, prefix) {
			var templatesPrefix = 't/' + prefix;
			return {
				[TxType.AccountLink]: templatesPrefix + '.account.link.html',
				[TxType.AggregateComplete]: templatesPrefix + '.aggregate.html',
				[TxType.AggregateBonded]: templatesPrefix + '.aggregate.html',
				[TxType.HashLock]: templatesPrefix + '.hashlock.html',
				[TxType.SecretLock]: templatesPrefix + '.secretlock.html',
				[TxType.SecretProof]: templatesPrefix + '.secretproof.html',
				[TxType.MosaicDefinition]: templatesPrefix + '.mosaic.html',
				[TxType.MosaicSupplyChange]: templatesPrefix + '.mosaic.supply.html',
				[TxType.RegisterNamespace]: templatesPrefix + '.namespace.html',
				[TxType.AliasAddress]: templatesPrefix + '.alias.address.html',
				[TxType.AliasMosaic]: templatesPrefix + '.alias.mosaic.html',
				[TxType.AddressProperty]: templatesPrefix + '.property.address.html',
				[TxType.MosaicProperty]: templatesPrefix + '.property.mosaic.html',
				[TxType.TransactionTypeProperty]: templatesPrefix + '.property.transactionType.html',
				[TxType.Transfer]: templatesPrefix + '.transfer.html',
				[TxType.ModifyMultisigAccount]: templatesPrefix + '.multisig.html'
			};
		}

		function createTxRenderer(context, tx, fun) {
			var txTemplateMap = createTemplateMap(context.TxType, 'short');
			return function() {
				var type = tx.transaction.type;
				if (!(type in txTemplateMap))
					throw ('template not found t/short.(' + context.int2Hex(type) + ')');
				return fun(context.render(txTemplateMap[type], tx));
			};
		}

		// This is common for pages that display multiple txes
		// (/block/ page, /account/ page, /search/ page)
		var renderTxes = function(context, divName, header, txes, cb) {
			var cbs = [];
			$.each(txes['transfers'], function(i,item){ context.formatTransaction(i, item, epochTimestamp); });
			txes.header = header;

			cbs.push(function() {
				return context.render('t/transactions.html', txes)
					.replace(divName);
			});
			$.each(txes['transfers'], function(i, tx) {
				cbs.push(createTxRenderer(context, tx, function(renderer) {
					return renderer.appendTo('#datarows');
				}));
			});
			cbs.push(function() {
				return context.load($('#empty')).replace('#animation');
			})

			cb(cbs);

			// call funcs in order
			(function foo() {
				if (cbs.length) {
					cbs.shift().call().then(foo);
				}
			})();
		};

		var renderFullTxes = function(context, divName, txes, cb) {
			var cbs = [];
			$.each(txes['transfers'], function(i,item){ context.formatTransaction(i, item, epochTimestamp); });

			cbs.push(function() {
				return context.render('t/transactions.full.html', txes)
					.replace(divName);
			});
			var templateMap = createTemplateMap(context.TxType, 's');
			$.each(txes['transfers'], function(i, tx) {
				cbs.push(function() {
					return context.render(templateMap[tx.transaction.type], tx).appendTo('#aggregate_transactions');
				});
			});
			cbs.push(function() {
				return context.load($('#empty')).replace('#animation');
			})

			cb(cbs);

			// call funcs in order
			(function foo() {
				if (cbs.length) {
					cbs.shift().call().then(foo);
				}
			})();
		};

		$("#searchForm").submit(function(event) {
			app.setLocation('#/search/' + $("input:first").val());
			event.preventDefault();
		});

		// helper redirects

		this.get('#/blocks/', function(context) { this.redirect('#/blocks/0'); });
		this.get('#/blocks', function(context) { this.redirect('#/blocks/0'); });

		this.get('#/account/:account', function(context) { this.redirect('#/account/'+this.params['account']+'/0'); });

		// actual handlers

		/*
		this.get('#/search/:data', function(context) {
			context.app.swap('');
			var fixedData = this.params['data'].replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
			if (fixedData.length && ('S'.indexOf(fixedData[0]) !== -1)) {
				app.runRoute('get', '#/account/'+fixedData+'/0');
				return;
			}
			var hash = context.unfmtHash(fixedData);
			if (hash.length != 64) {
				context.render('t/search.html', {invalidSearch:true})
					.appendTo(context.$element());
				return;
			}

			context.render('t/search.html')
				.appendTo(context.$element());

			$.getJSON(apiHost + '/api3/search', {hash:hash}, function(items) {
				renderTxes(context, '#search_transactions', items, function(cbs){
					var item = items['block'];
					if (item) {
						context.fmtCatapultHeight('height', item);
						context.fmtCatapultValue('fees', item);
						context.fmtCatapultPublicKey('s_printablekey', item);
						cbs.push(function() {
							return context.render('t/blocks.html', {})
								.appendTo('#search_transactions')
								.render('t/blocks.detail.html', item)
								.appendTo('#blocks')
						});
					}
				});
			});
		});
		*/

		function alignDown(height, alignment) {
			return (Math.floor((height - 1) / alignment) * alignment) + 1;
		}

		function array2number(array) {
			return array[1] * 4294967296 + array[0]
		}

		// show blocks up to the specified height
		this.get('#/blocks/:height', function(context) {
			context.app.swap('');
			setActiveLink('blocks', context);

			var blockHeight = parseInt(this.params['height'], 10);
			if (isNaN(blockHeight)) {
				return;
			}

			getJson('/chain/height', function(chainHeightObj) {
				var chainHeight = array2number(chainHeightObj.height);
				var queryHeight = blockHeight;
				if (0 === queryHeight)
					queryHeight = alignDown(chainHeight, 100);

				getJson(`/blocks/${queryHeight}/limit/100`, function(items) {
					$.each(items, function(i, item) {
						context.formatBlock(i, item, epochTimestamp);
					});
					var h = parseInt(items[items.length - 1].block.height, 10);

					var data = {};
					if (items.length == 100) { data['next'] = h + 100; }
					if (h > 100) { data['prev'] = h - 100; }

					data['showNav']=true;
					context.partial('t/blocks.html', data)
						.renderEach('t/blocks.detail.html', items)
						.appendTo('#blocks');

					if (0 !== blockHeight) {
						setDefaultBlockHandler(context);
					} else {
						blockHandler = function handler(obj) {
							var obj = defaultBlockHandler(context, obj);
							obj.className='newRow';
							context.render('t/blocks.detail.html', obj)
								.prependTo('#blocks > tbody').then(function() {
									var body = $('#blocks > tbody')[0];
									while (body.rows.length > 100)
										$('#blocks')[0].deleteRow($('#blocks')[0].rows.length - 1);
								});
						};
					}
				});
			})
		});


		this.get('#/unconfirmed/', function(context) {
			context.app.swap('');
			setActiveLink('unconfirmed', context);

			// collect UTs coming via WS in big dict
			var allUts = { };
			context.render('t/unconfirmed.html', { header: 'Unconfirmed transactions' })
					.replace(context.$element());

			unconfirmedHandler = function handler(obj) {
				obj.className='newRow';

				if (!(obj.meta.hash in allUts)) {
					allUts[obj.meta.hash] = obj;
					var txes = { transfers: [ obj ] };
					context.formatTransaction(Object.keys(allUts).legth, obj, epochTimestamp);
					(createTxRenderer(context, obj, function(renderer) {
						renderer.prependTo('#datarows')
					}))();
				}
			};
		});

		this.get('#/failed/', function(context) {
			context.app.swap('');
			setActiveLink('failed', context);

			context.partial('t/failed.html')
				.renderEach('t/failed.detail.html', failedStatuses)
				.appendTo('#statuses');

			additionalStatusHandler = function handler(obj) {
				context.render('t/failed.detail.html', Object.assign({ className: 'newRow' }, obj))
					.prependTo('#datarows').then(function() {
						var body = $('#datarows')[0];
						while (body.rows.length > FAILED_LIMIT)
							$('#statuses')[0].deleteRow($('#statuses')[0].rows.length - 1);
					});

			};

		});


		function displayBlock(params, context) {
			context.app.swap('');
			setActiveLink('blocks', context);

			var blockHeight = parseInt(params['blockHeight'], 10);
			if (isNaN(blockHeight)) {
				return;
			}
			var txId = params['id'];

			getJson(`/block/${blockHeight}`, function(item) {
				context.fmtCatapultHeight('height', item.block);
				context.fmtCatapultPublicKey('signer', item.block);
				context.fmtTimestamp('timestamp', item.block, epochTimestamp);
				context.fmtCatapultDifficulty('difficulty', item.block);
				context.fmtCatapultValue('totalFee', item.meta);
				context.render('t/block.details.html',item)
					.appendTo(context.$element());

				var options = { pageSize: 100 };
				if (txId)
					options.id = txId;

				getJson('/block/' + blockHeight + '/transactions', options, function(transactions) {
					var txes = { transfers: transactions };
					txes['showNav'] = true;
					if (transactions.length > 0) {
						txes['showNext'] = true;
						var meta = transactions[transactions.length - 1].meta;
						txes['next'] = meta.id;
						txes['height'] = meta.height;
					}

					renderTxes(context, '#block_transactions', 'Block transactions', txes, function(cbs) {
					});
				});
			});
		}

		// show a single block along with it's transactionss
		this.get('#/block/:blockHeight', function(context) {
			displayBlock(this.params, context);
		});

		this.get('#/block/:blockHeight/:id', function(context) {
			displayBlock(this.params, context);
		});

		// show a single tx
		this.get('#/transfer/:txid', function(context) {
			context.app.swap('');
			setActiveLink('transactions', context);

			var txid = context.unfmtHash(this.params.txid);
			if (txid.length != 24) {
				return;
			}

			getJson(`/transaction/${txid}`, function(items) {
				context.formatTransaction(0, items, epochTimestamp);
				context.render('t/s.transfer.html',items)
					.appendTo(context.$element());
			});
		});

		// show a single tx
		function addSupport(self, txName) {
			var uri = '#/' + txName + '/:txid';
			console.log('adding', uri)
			self.get(uri, function(context) {
				context.app.swap('');
				setActiveLink('transactions', context);
				var txid = context.unfmtHash(this.params.txid);
				if (txid.length != 24) {
					return;
				}

				getJson(`/transaction/${txid}`, function(items) {
					context.formatTransaction(0, items, epochTimestamp);
					context.render('t/s.' + txName + '.html',items)
						.appendTo(context.$element());
				});
			});
		}

		addSupport(this, 'accountLink');
		addSupport(this, 'hashlock');
		addSupport(this, 'secretlock');
		addSupport(this, 'secretproof');
		addSupport(this, 'mosaic');
		addSupport(this, 'mosaicSupply');
		addSupport(this, 'namespace');
		addSupport(this, 'aliasAddress');
		addSupport(this, 'aliasMosaic');
		addSupport(this, 'propertyAddress');
		addSupport(this, 'propertyMosaic');
		addSupport(this, 'propertyTransactionType');
		addSupport(this, 'multisig');

		this.get('#/aggregate/:txid', function(context) {
			context.app.swap('');
			setActiveLink('transactions', context);
			var txid = context.unfmtHash(this.params.txid);
			if (txid.length != 24) {
				return;
			}

			getJson(`/transaction/${txid}`, function(items) {
				context.formatTransaction(0, items, epochTimestamp);
				context.render('t/s.aggregate.html',items)
					.appendTo(context.$element());

				var txes = { transfers: items.transaction.transactions };
				/*
				txes['showNav'] = true;
				if (transactions.length > 0) {
					txes['showNext'] = true;
					var meta = transactions[transactions.length - 1].meta;
					txes['next'] = meta.id;
					txes['height'] = meta.height;
				}*/

				renderFullTxes(context, '#aggregate_transactions', txes, function(cbs) {
				});
			});
		});

		// shows specified account
		this.get('#/account/:accountId/:txId', function(context) {
			context.app.swap('');
			setActiveLink('', context);

			var accountId = context.unfmtHash(this.params['accountId']);
			if (accountId.length != 64 && accountId.length != 50) {
				return;
			}

			if (accountId.length !== 64) {
				accountId = base32.encode(context.hex2a(accountId));
			}

			var txId = context.unfmtHash(this.params['txId']);
			if (24 != txId.length)
				txId = '0';

			getJson(`/account/${accountId}`, function(item) {
				context.formatAccount(item);
				context.render('t/account.html', item)
					.appendTo(context.$element());

				var options = {
					pageSize: 10
				};

				if (24 == txId.length) {
					options.id = txId;
				}

				var publicKey = item.account.publicKey;
				getJson(`/account/${publicKey}/transactions`, options, function(transactions) {
					var txes = {};
					txes['transfers'] = transactions;

					renderTxes(context, '#account_transactions', 'Account transactions', txes, function(cbs){
						cbs.push(function() {
							// make paging avail for the account data
							if (transactions.length == options.pageSize) {
								txes['showPrev'] = true;
								txes['prev'] = transactions[transactions.length - 1].meta.id;
							}

							txes['addr'] = publicKey;
							txes['showNav'] = true;

							return context.render('t/account.detail.html', txes)
								.appendTo('#account_transactions')
						});
					});
				});
			});
		});

		function drawTimestamps(heights, timestamps, grouping) {
			for (var i = 0; i < timestamps.length - 1; ++i) {
				timestamps[i] -= timestamps[i + 1];
			}

			var averages = [];
			var sum = 0;
			for (var i = 0; i < grouping; ++i) {
				sum += timestamps[i];
			}
			for (var i = grouping; i < timestamps.length; ++i) {
				averages.push(sum / grouping);
				sum -= timestamps[i - grouping];
				sum += timestamps[i];
			}
			averages.push(0);
			/*
			while (averages.length != timestamps.length)
				averages.push(0);
				*/

			var data = new google.visualization.DataTable();
			data.addColumn('number', 'Height');
			data.addColumn('number', 'Time Difference (in seconds)');
			data.addColumn('number', `Avg Time Difference (per ${grouping} blocks)`);

			for (var i = 0; i < timestamps.length - 1; ++i) {
				data.addRow([heights[i], timestamps[i] / 1000, averages[i] / 1000]);
			}

			var count = heights.length;
			var options = {
				'title': `Block time differences (last ${count} blocks)`,
				'width': 900,
				'height': 400
			};

			var chart = new google.visualization.LineChart(document.getElementById('blockTimes'));
			chart.draw(data, options);
		}

		function drawNumTransactions(heights, numTransactions, shortCount, grouping) {
			var data = new google.visualization.DataTable();
			data.addColumn('number', 'Height');
			data.addColumn('number', 'Number of transactions ');
			data.addColumn('number', `Avg number of transactions (per ${grouping} blocks)`);

			var totalNumTransactions = 0;
			for (var i = 0; i < numTransactions.length - 1; ++i) {
				totalNumTransactions += numTransactions[i];
			}

			var totalShortTransactions = 0;
			for (var i = 0; i < shortCount; ++i) {
				totalShortTransactions += numTransactions[i];
			}

			// Avg

			var averages = [];
			var sum = 0;
			for (var i = 0; i < grouping; ++i) {
				sum += numTransactions[i];
			}
			for (var i = grouping; i < numTransactions.length; ++i) {
				averages.push(sum / grouping);
				sum -= numTransactions[i - grouping];
				sum += numTransactions[i];
			}
			averages.push(0);

			// data

			for (var i = 0; i < numTransactions.length - 1; ++i) {
				data.addRow([heights[i], numTransactions[i], Math.floor(averages[i])]);
			}

			var count = heights.length;
			var options = {
				title: `Transactions per block (last ${count} blocks)`,
				width: 900,
				height: 400,
				lineWidth: 1,
				pointSize: 2
			};

			var chart = new google.visualization.LineChart(document.getElementById('numTransactions'));
			chart.draw(data, options);

			const stats = {
				numTransactions: totalNumTransactions,
				numBlocks: heights.length - 1,
				short: {
					numTransactions: totalShortTransactions,
					numBlocks: shortCount
				},
			};
			return stats;
		}

		function getBlockStats(context, options) {
			var blockCount = options.endHeight - options.startHeight + 1;
			getJson(`/diagnostic/blocks/${options.startHeight}/limit/${blockCount}`, function (items) {
				google.charts.setOnLoadCallback(function drawGraph() {
					var heights = items.map(function (obj) { return context.long2val(obj.block.height); });
					var timestamps = items.map(function (obj) { return context.long2val(obj.block.timestamp); });
					drawTimestamps(heights, timestamps, options.grouping);

					var numTransactions = items.map(function (obj) { return obj.meta.numTransactions; });
					var shortStatsCount = 60;
					var stats = drawNumTransactions(heights, numTransactions, shortStatsCount, options.grouping);

					stats.endTime = context.long2val(items[0].block.timestamp);
					stats.startTime = context.long2val(items[items.length - 1].block.timestamp);
					stats.timeDifference = stats.endTime - stats.startTime;
					stats.rate = (stats.numTransactions / (stats.timeDifference / 1000)).toFixed(2);

					stats.short.endTime = context.long2val(items[0].block.timestamp);
					stats.short.startTime = context.long2val(items[shortStatsCount].block.timestamp);
					stats.short.timeDifference = stats.short.endTime - stats.short.startTime;
					stats.short.rate = (stats.short.numTransactions / (stats.short.timeDifference / 1000)).toFixed(2);

					context.render('t/stats.fun.html', stats)
						.replace('#blockStats');
				});
			});
		}

		this.get('#/statistics/from/:startHeight/to/:endHeight/grouping/:grouping', function(context) {
			context.app.swap('');
			setActiveLink('statistics', context);

			var startHeight = parseInt(this.params['startHeight'], 10);
			var endHeight = parseInt(this.params['endHeight'], 10);
			var grouping = parseInt(this.params['grouping'], 10);

			getJson('/chain/height', function(items) {
				if (0 === endHeight)
					endHeight = items.height[0];

				if (0 === startHeight)
					startHeight = endHeight > 240 ? endHeight - 240 : 1;

				var topHeight = items.height[0];
				if (isNaN(startHeight) || isNaN(endHeight) || endHeight > topHeight || endHeight < startHeight + 60) {
					return;
				}

				if (isNaN(grouping))
					grouping = 60;

				grouping = Math.min(Math.max(1, grouping), endHeight - startHeight);

				getJson('/diagnostic/storage', function(items) {
					context.render('t/statistics.html', items)
						.appendTo(context.$element());

					getBlockStats(context, { startHeight, endHeight, topHeight, grouping });
				});
			});
		});
	});

	$(function() {
		google.charts.load('current', {'packages':['corechart', 'controls']});

		app.run('#/blocks/0');
	});
})(jQuery);
