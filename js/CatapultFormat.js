var CatapultFormat = function(app) {

	this.helpers({
	hex2a: function (hexx) {
		var hex = hexx.toString();
		var str = '';
		for (var i = 0; i < hex.length; i += 2)
			str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
		return str;
	},
	bin2hex: function (binData) {
		var hex = '';
		for (var i = 0; i < binData.length; ++i) {
			var chr = binData.charCodeAt(i).toString(16);
			hex += chr.length < 2 ? '0' + chr : chr;
		}
		return hex;
	},
	long2val: function (data) {
		return data[0] + data[1] * 4294967296;
	},
	int2Hex: function(value) {
		return ("0000000" + ((value|0)+4294967296).toString(16)).substr(-8);
	},
	int2ShortHex: function(value) {
		return ("0000" + value.toString(16)).substr(-4);
	},

	// region low-level fmt functions

	fmtUnbaseUtf8: function(key, data) {
		if (!(key in data)) { return; }
		var o = data[key].toString();
		data[key + '_fmt'] = atob(o);
	},
	fmtUnbase: function(key, data) {
		if (!(key in data)) { return; }
		var o = data[key].toString();
		data[key + '_fmt'] = this.bin2hex(atob(o));
	},
	fmtSecretProof: function(key, data) {
		if (!(key in data)) { return; }
		var str = this.hex2a(data[key]);

		if (! /[\x00-\x1F\x80-\xFF]/.test(str)) {
			data[key + '_fmt']  = str;
		}
	},
	fmtCatapultHeight: function(key, data) {
		if (!(key in data)) { return; }
		var o = this.long2val(data[key]).toString();
		data[key + '_str'] = o;
		var padded = Array(12 + 1 - o.length).join('&nbsp;') + o + '&nbsp;&nbsp;';
		data[key + '_fmt'] = padded;
	},
	fmtTimestamp: function(key, data, epochTimestamp) {
		if (!(key in data)) { return; }

		var millis = this.long2val(data[key]) + epochTimestamp;
		var d = new Date(0);
		d.setUTCMilliseconds(millis);

		data[key + '_str'] = d.toUTCString();
		data[key + '_fmt'] = d.toUTCString();
	},
	fmtDuration: function(key, data) {
		if (!(key in data)) { return; }
		var o = this.long2val(data[key]).toString();
		data[key + '_str'] = o;
		data[key + '_fmt'] = o;
	},
	fmtCatapultId: function(key, data) {
		if (!(key in data)) { return; }
		data[key + '_str'] = "0x" + this.int2Hex(data[key][1]) + "<span class='sep'></span>" + this.int2Hex(data[key][0]);
		data[key + '_fmt'] = "0x" + this.int2Hex(data[key][1]) + "<span class='sep'></span>" + this.int2Hex(data[key][0]);
	},
	fmtMosaicId: function(key, data) {
		if (!(key in data)) { return; }
		this.fmtCatapultId(key, data);

		if (data[key][1] === 0x941299b2 && data[key][0] === 0xb7e1291c) {
			data[key + '_str'] += " (cat.harvest)";
			data[key + '_fmt'] += " (cat.harvest)";
		} else if (data[key][1] === 0x85bbea6c && data[key][0] === 0xc462b244) {
			data[key + '_str'] += " (cat.currency)";
			data[key + '_fmt'] += " (cat.currency)";
		}
	},
	fmtMosaicNonce: function(key, data) {
		data[key + '_str'] = "0x" + this.int2Hex(data[key]);
		data[key + '_fmt'] = "0x" + this.int2Hex(data[key]);
	},
	fmtMosaicPropertyValue: function(key, data) {
		if (!(key in data)) { return; }
		data[key + '_str'] = "0x" + this.int2Hex(data[key][1]) + "<span class='sep'></span>" + this.int2Hex(data[key][0]);
		data[key + '_fmt'] = "0x" + this.int2Hex(data[key][1]) + "<span class='sep'></span>" + this.int2Hex(data[key][0]);
	},
	fmtMosaicPropertyId: function(key, data) {
		if (!(key in data)) { return; }
		var mapping = {
			0: 'flags',
			1: 'divisibility',
			2: 'duration'
		};
		var value = mapping[data[key]];
		data[key + '_str'] = value;
		data[key + '_fmt'] = value;
	},
	fmtHashAlgorithm: function(key, data) {
		if (!(key in data)) { return; }
		var mapping = {
			0: 'Op_Sha3',
			1: 'Op_Keccak',
			2: 'Op_Hash_160 (bitcoin)',
			3: 'Op_Hash_256 (bitcoin)'
		};
		var value = mapping[data[key]];
		data[key + '_str'] = value;
		data[key + '_fmt'] = value;
	},
	fmtSupplyDirection: function(key, data) {
		if (!(key in data)) { return; }
		var mapping = {
			0: 'decrease',
			1: 'increase'
		};
		var value = mapping[data[key]];
		data[key + '_str'] = value;
		data[key + '_fmt'] = value;
	},
	fmtCatapultSupply: function(key,data) {
		if (data===null || !(key in data)) { return; }
		var o = this.long2val(data[key]);
		if (! o) {
			o = "0";
		} else {
			var b = o;
			var r = "<span class='sep'>" + b + "</span>";
			o = r;
		}
		data[key + '_fmt'] = o;
	},
	fmtPropertyType: function(key, data) {
		if (!(key in data)) { return; }

		// todo: adjust for blocking

		var mapping = {
			1: 'address',
			2: 'mosaic id',
			4: 'transaction type'
		};
		var value = mapping[data[key]];
		data[key + '_str'] = value;
		data[key + '_fmt'] = value;
	},

	fmtCatapultValue: function(key,data) {
		if (data===null || !(key in data)) { return; }
		var o = this.long2val(data[key]);
		if (! o) {
			o = "0.<span class='dim'>000000</span>";
		} else {
			o = o / 1000000;
			var b = o.toFixed(6).split('.');
			var r = "<span class='sep'>" +b[0].split(/(?=(?:...)*$)/).join("</span><span class='sep'>") + "</span>";
			o = r + ".<span class='dim'>" + b[1] + "</span>";
		}
		data[key + '_fmt'] = o;
	},
	fmtType: function(key, data) {
		if (data===null || !(key in data)) { return; }
		var o = data[key];
		if (o === 12) {
			o = 'levy';
		} else {
			o = '';
		}
		data[key + '_fmt'] = o;
	},
	calculateDiff: function(diff) {
		return Math.floor(diff / 10000000000) / 100;
	},
	fmtCatapultDifficulty: function(key, data) {
		data[key + '_str'] = "0x" + this.int2Hex(data[key][1]) + "<span class='sep'></span>" + this.int2Hex(data[key][0]);
		data[key + '_fmt'] = (this.long2val(data[key]) / 1000000000000).toFixed(2);
	},
	fmtCatapultPublicKey: function(key, data) {
		if (data===null || !(key in data)) { return; }
		data[key + '_fmt'] = data[key].match(/.{1,6}/g).join('-');
	},
	fmtCatapultAddress: function(key, data) {
		if (data===null || !(key in data)) { return; }
		data[key + '_fmt'] = base32.encode(this.hex2a(data[key])).match(/.{1,6}/g).join('-');
	},
	unfmtCatapultPublicKey: function(data) {
		return data.replace(/[^a-zA-Z2-7]/g, "").toUpperCase();
	},
	unfmtHash: function(data) {
		return data.replace(/[^a-fA-F0-9]/g, "").toUpperCase();
	},
	fmtMsg: function(data) {
		if (!data) { return; }
		/*
		if (data['message_data'].length > 0) {
			data['hasMsg'] = true;
		}
		if (data['message_type'] == 1) {
			data['plain'] = true;
			if (data['message_data'].substring(0,2) == 'fe') {
				data['message_data_fmt'] = data['message_data'].substring(2);
				data['message_hex'] = true;
			} else {
				data['message_data_fmt'] = this.hex2a(data['message_data']);
			}
		}
		if (data['message_type'] == 2) { data['enc'] = true; }
		*/
	},
	fmtNemImportanceScore: function(key, data) {
		if (!(key in data)) { return; }
		var o = this.long2val(data[key]);
		if (o) {
			o /= 90000;
			o = o.toFixed(4).split('.');
			o = o[0] + ".<span class='dim'>" + o[1] + "</span>";
		}
		data[key + '_fmt'] = o;
	},
	fmtPropertyModificationType: function (key, data) {
		if (!(key in data)) { return; }
		var mapping = {
			0: 'Add',
			1: 'Remove'
		};
		var value = mapping[data[key]];
		data[key + '_str'] = value;
		data[key + '_fmt'] = value;
	},
	fmtTransactionTypeName: function (key, data) {
		if (!(key in data)) { return; }
		const TxType = this.TxType;
		var mapping = {
			[TxType.AccountLink]: 'account link',
			[TxType.AggregateComplete]: 'aggregate complete',
			[TxType.AggregateBonded]: 'aggregate bonded',
			[TxType.HashLock]: 'hash lock',
			[TxType.SecretLock]: 'secret lock',
			[TxType.SecretProof]: 'secret proof',
			[TxType.MosaicDefinition]: 'mosaic definition',
			[TxType.MosaicSupplyChange]: 'mosaic supply',
			[TxType.RegisterNamespace]: 'register namespace',
			[TxType.AliasAddress]: 'address alias',
			[TxType.AliasMosaic]: 'mosaic alias',
			[TxType.AddressProperty]: 'address property',
			[TxType.MosaicProperty]: 'mosaic property',
			[TxType.TransactionTypeProperty]: 'transaction type property',
			[TxType.Transfer]: 'transfer property',
			[TxType.ModifyMultisigAccount]: 'modify multisig account'
		};
		const value = data[key];
		var valueName = 'unknown transaction type';
		if (value in mapping)
			valueName = mapping[value];

		data[key + '_str'] = valueName;
		data[key + '_fmt'] = valueName + " <span class='dim'>(0x" + this.int2ShortHex(value) + ")</span>";
	},

	// endformat

	// region high-level format functions

	formatAccount: function(item) {
		this.fmtCatapultAddress('address', item.account);
		this.fmtCatapultPublicKey('publicKey', item.account);
		this.fmtNemImportanceScore('importance', item.account);

		var self = this;
		$.each(item.account.mosaics, function(j, at){
			self.fmtCatapultValue('amount', at);
			self.fmtMosaicId('id', at);
		});
	},
	formatMultisigTransaction: function(i, item) {
		var self = this;
		$.each(item.transaction.modifications, function(j, cosig){
			self.fmtCatapultPublicKey('cosignatoryPublicKey', cosig);
		});
	},
	formatTransferTransaction: function(i, item) {
		this.fmtCatapultAddress('recipient', item.transaction);
		var self = this;
		$.each(item.transaction.mosaics, function(j, at){
			self.fmtCatapultValue('amount', at);
			self.fmtMosaicId('id', at);
		});
		this.fmtMsg(item.transaction.message);
	},
	formatRegisterNamespaceTransaction: function(i, item) {
		this.fmtCatapultId('namespaceId', item.transaction);
		this.fmtCatapultId('parentId', item.transaction);
		this.fmtDuration('duration', item.transaction);
	},
	formatMosaicDefinitionTransaction: function(i, item) {
		this.fmtCatapultId('mosaicId', item.transaction);
		this.fmtMosaicNonce('mosaicNonce', item.transaction);
		var self = this;
		$.each(item.transaction.properties, function(j, at){
			self.fmtMosaicPropertyId('id', at);
			self.fmtMosaicPropertyValue('value', at);
		});
	},
	formatMosaicSupplyTransaction: function(i, item) {
		this.fmtMosaicId('mosaicId', item.transaction);
		this.fmtCatapultSupply('delta', item.transaction);
		this.fmtSupplyDirection('direction', item.transaction);
	},
	formatAggregateTransaction: function(i, item) {
	},
	formatLockTransaction: function(i, item) {
		this.fmtDuration('duration', item.transaction);
		this.fmtMosaicId('mosaicId', item.transaction);
		this.fmtCatapultValue('amount', item.transaction);
	},
	formatHashLockTransaction: function(i, item) {
		this.formatLockTransaction(i, item);
	},
	formatSecretLockTransaction: function(i, item) {
		this.formatLockTransaction(i, item);
		this.fmtHashAlgorithm('hashAlgorithm', item.transaction);
		this.fmtCatapultAddress('recipient', item.transaction);
	},
	formatSecretProofTransaction: function(i, item) {
		this.fmtHashAlgorithm('hashAlgorithm', item.transaction);
		this.fmtSecretProof('proof', item.transaction);
	},
	formatAliasAddressTransaction: function(i, item) {
		this.fmtCatapultAddress('address', item.transaction);
		// use fmtMosaicId deliberately here
		this.fmtMosaicId('namespaceId', item.transaction);
	},
	formatAliasMosaicTransaction: function(i, item) {
		this.fmtMosaicId('mosaicId', item.transaction);
		// use fmtMosaicId deliberately here
		this.fmtMosaicId('namespaceId', item.transaction);
	},
	formatAccountLinkTransaction: function(i, item) {
		// temporary
		this.fmtUnbase('bin', item.transaction);
	},
	formatAddressProperty: function(i, item) {
		this.fmtPropertyType('propertyType', item.transaction);
		var self = this;
		$.each(item.transaction.modifications, function(j, at){
			self.fmtPropertyModificationType('type', at);
			self.fmtCatapultAddress('value', at);
		});
	},
	formatMosaicProperty: function(i, item) {
		this.fmtPropertyType('propertyType', item.transaction);
		console.log('mosaic property', item.transaction);
		var self = this;
		$.each(item.transaction.modifications, function(j, at){
			self.fmtPropertyModificationType('type', at);
			self.fmtMosaicId('value', at);
		});
	},
	formatTransactionTypeProperty: function(i, item) {
		this.fmtPropertyType('propertyType', item.transaction);
		console.log('transaction type property', item.transaction);
		var self = this;
		$.each(item.transaction.modifications, function(j, at){
			self.fmtPropertyModificationType('type', at);
			self.fmtTransactionTypeName('value', at);
		});
	},
	formatTransaction: function(i, item, epochTimestamp) {
		this.fmtCatapultHeight('height', item.meta);
		this.fmtCatapultValue('fee', item.transaction);
		this.fmtTimestamp('deadline', item.transaction, epochTimestamp);
		this.fmtCatapultPublicKey('signer', item.transaction);

		var TxType = app.context_prototype.prototype.TxType;
		var dispatcher = {
			[TxType.AccountLink]: this.formatAccountLinkTransaction,
			[TxType.AggregateComplete]: this.formatAggregateTransaction,
			[TxType.AggregateBonded]: this.formatAggregateTransaction,
			[TxType.HashLock]: this.formatHashLockTransaction,
			[TxType.SecretLock]: this.formatSecretLockTransaction,
			[TxType.SecretProof]: this.formatSecretProofTransaction,
			[TxType.MosaicDefinition]: this.formatMosaicDefinitionTransaction,
			[TxType.MosaicSupplyChange]: this.formatMosaicSupplyTransaction,
			[TxType.RegisterNamespace]: this.formatRegisterNamespaceTransaction,
			[TxType.AliasAddress]: this.formatAliasAddressTransaction,
			[TxType.AliasMosaic]: this.formatAliasMosaicTransaction,
			[TxType.AddressProperty]: this.formatAddressProperty,
			[TxType.MosaicProperty]: this.formatMosaicProperty,
			[TxType.TransactionTypeProperty]: this.formatTransactionTypeProperty,
			[TxType.Transfer]: this.formatTransferTransaction,
			[TxType.ModifyMultisigAccount]: this.formatMultisigTransaction
		};

		var txType = item.transaction.type
		if (!(txType in dispatcher))
			console.log('unknown transaction type', i, item);
		else
			dispatcher[txType].call(this, i, item);
	},
	formatBlock: function(i, item, epochTimestamp) {
		this.fmtCatapultValue('totalFee', item.meta);
		this.fmtCatapultHeight('height', item.block);
		this.fmtCatapultPublicKey('signer', item.block);
		this.fmtTimestamp('timestamp', item.block, epochTimestamp);
	}
	/*,
	fmtTime: function(key, data) {
		if (!(key in data)) { return; }
		var o = data[key];
		var t = (new Date(o*1000));
		var now = (new Date).getTime();
		data[key + '_fmt'] = t.toUTCString();
		data[key + '_sec'] = ((now/1000) - o).toFixed(0);
	}
	*/
	//var nemEpoch = Date.UTC(2015, 2, 29, 0, 6, 25, 0)
	});

	// endregion
};
