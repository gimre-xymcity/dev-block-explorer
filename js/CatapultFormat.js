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
		if (typeof data !== 'string')
			throw 'String expected as a param to long2val';

		return parseInt(data, 10);
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
		data[key + '_str'] = data[key];
		data[key + '_fmt'] = data[key];
	},
	fmtMosaicId: function(key, data) {
		if (!(key in data)) { return; }
		this.fmtCatapultId(key, data);

		var mosaicId = data[key];
		if (this.aliasResolvers) {
			var resolutions = this.aliasResolvers.mosaic(mosaicId);
			if (resolutions !== mosaicId) {
				data[key + '_orig'] = data[key];
				data[key + '_str_orig'] = data[key + '_str'];
				data[key + '_fmt_orig'] = data[key + '_fmt']

				// todo: figure out how to handle multiple resolutions...
				mosaicId = resolutions[0].resolved;
				data[key] = mosaicId;
				this.fmtCatapultId(key, data);
			}
		}

		var name = '';
		if (mosaicId === "941299b2b7e1291c") {
			name = 'cat.harvest';
		} else if (mosaicId === "85bbea6cc462b244") {
			name = 'cat.currency;'
		} else if (mosaicId === "26514E2A1EF33824") {
			name = 'RAW cat.harvest';
		} else if (mosaicId === "0DC67FBE1CAD29E3") {
			name = 'RAW cat.currency';
		}

		if (name) {
			var current = data[key + '_str'];
			data[key + '_str'] = `${name} <span class='dim'>(${current})</span>`;
			current = data[key + '_fmt'];
			data[key + '_fmt'] = `${name} <span class='dim'>(${current})</span>`;
		}

		if ((key + '_orig') in data) {
			data[key + '_alias_fmt'] = data[key + '_fmt_orig'];
		}
	},
	fmtMosaicNonce: function(key, data) {
		data[key + '_str'] = "0x" + this.int2Hex(data[key]);
		data[key + '_fmt'] = "0x" + this.int2Hex(data[key]);
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
	fmtCatapultAddressImpl: function(key, data) {
		if (data===null || !(key in data)) { return; }
		data[key + '_fmt'] = base32.encode(this.hex2a(data[key])).match(/.{1,6}/g).join('-');
	},
	fmtCatapultAddress: function(key, data) {
		this.fmtCatapultAddressImpl(key, data);

		var address = data[key];
		if (this.aliasResolvers) {
			var resolutions = this.aliasResolvers.address(address);
			if (resolutions !== address) {
				data[key + '_orig'] = data[key];
				data[key + '_fmt_orig'] = data[key + '_fmt']

				// todo: figure out how to handle multiple resolutions...
				address = resolutions[0].resolved;
				data[key] = address;
				this.fmtCatapultAddressImpl(key, data);
			}
		}

		if ((key + '_orig') in data) {
			const unresolved = data[key + '_orig'];
			var loStr = unresolved.substr(8, 2) + unresolved.substr(6, 2) + unresolved.substr(4, 2) + unresolved.substr(2, 2);
			var hiStr = unresolved.substr(16, 2) + unresolved.substr(14, 2) + unresolved.substr(12, 2) + unresolved.substr(10, 2);
			data[key + '_alias'] = hiStr + loStr;
			this.fmtCatapultId(key + '_alias', data);
		}
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
		const Names = this.TxTypeName;
		const value = data[key];
		var valueName = 'unknown transaction type';
		if (value in Names)
			valueName = Names[value];

		data[key + '_str'] = valueName;
		data[key + '_fmt'] = valueName + " <span class='dim'>(0x" + this.int2ShortHex(value) + ")</span>";
	},
	fmtAliasAction: function (key, data) {
		if (!(key in data)) { return; }
		var mapping = {
			0: 'Unlink',
			1: 'Link'
		};
		var value = mapping[data[key]];
		data[key + '_str'] = value;
		data[key + '_fmt'] = value;
	},

	// endregion

	// region high-level transaction format functions

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
		this.fmtCatapultAddress('recipientAddress', item.transaction);
		var self = this;
		$.each(item.transaction.mosaics, function(j, at){
			self.fmtCatapultValue('amount', at);
			self.fmtMosaicId('id', at);
		});
		this.fmtMsg(item.transaction.message);
	},
	formatRegisterNamespaceTransaction: function(i, item) {
		this.fmtCatapultId('id', item.transaction);
		this.fmtCatapultId('parentId', item.transaction);
		this.fmtDuration('duration', item.transaction);
	},
	formatMosaicDefinitionTransaction: function(i, item) {
		this.fmtCatapultId('id', item.transaction);
		this.fmtMosaicNonce('nonce', item.transaction);

		this.fmtDuration('duration', item.transaction);
		//this.fmtCatapultValue('flags', item.transaction);
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
		this.fmtAliasAction('aliasAction', item.transaction);
		// use fmtMosaicId deliberately here
		this.fmtMosaicId('namespaceId', item.transaction);

		console.log(item);
	},
	formatAliasMosaicTransaction: function(i, item) {
		this.fmtMosaicId('mosaicId', item.transaction);
		this.fmtAliasAction('aliasAction', item.transaction);
		// use fmtMosaicId deliberately here
		this.fmtMosaicId('namespaceId', item.transaction);
	},
	formatAccountLinkTransaction: function(i, item) {
		// temporary
		//this.fmtUnbase('remotePublicKey', item.transaction);
		this.fmtAliasAction('linkAction', item.transaction);
		console.log(item);
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
		var self = this;
		$.each(item.transaction.modifications, function(j, at){
			self.fmtPropertyModificationType('type', at);
			self.fmtMosaicId('value', at);
		});
	},
	formatTransactionTypeProperty: function(i, item) {
		this.fmtPropertyType('propertyType', item.transaction);
		var self = this;
		$.each(item.transaction.modifications, function(j, at){
			self.fmtPropertyModificationType('type', at);
			self.fmtTransactionTypeName('value', at);
		});
	},
	formatAccountMetadataTransaction(i, item) {
		console.log(item);
		this.fmtCatapultPublicKey('targetPublicKey', item);
	},
	formatMosaicMetadataTransaction(i, item) {
		console.log(item);
		this.fmtCatapultPublicKey('targetPublicKey', item);
		this.fmtMosaicId('targetMosaicId', item);
	},
	formatNamespaceMetadataTransaction(i, item) {
		this.fmtCatapultPublicKey('targetPublicKey', item);
		// use fmtMosaicId deliberately here
		this.fmtMosaicId('targetNamespaceId', item);
	},
	formatTransaction: function(i, item, epochTimestamp) {
		this.fmtCatapultHeight('height', item.meta);
		this.fmtCatapultValue('maxFee', item.transaction);
		this.fmtTimestamp('deadline', item.transaction, epochTimestamp);
		this.fmtCatapultPublicKey('signer', item.transaction);

		var TxType = app.context_prototype.prototype.TxType;
		var dispatcher = {
			[TxType.AccountLink]: this.formatAccountLinkTransaction,
			[TxType.AggregateComplete]: this.formatAggregateTransaction,
			[TxType.AggregateBonded]: this.formatAggregateTransaction,
			[TxType.AccountMetadata]: this.formatAccountMetadataTransaction,
			[TxType.MosaicMetadata]: this.formatMosaicMetadataTransaction,
			[TxType.NamespaceMetadata]: this.formatNamespaceMetadataTransaction,
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
		this.fmtCatapultPublicKey('signerPublicKey', item.block);
		this.fmtCatapultPublicKey('beneficiaryPublicKey', item.block);
		this.fmtTimestamp('timestamp', item.block, epochTimestamp);
	},

	// endregion

	// region low-level receipt format functions

	fmtReceiptTypeName: function(key, data) {
		if (!(key in data)) { return; }
		const Names = this.ReceiptTypeName;
		const value = data[key];
		var valueName = 'unknown receipt type';
		if (value in Names)
			valueName = Names[value];

		data[key + '_str'] = valueName;
		data[key + '_fmt'] = valueName + " <span class='dim'>(0x" + this.int2ShortHex(value) + ")</span>";
	},

	// endregion

	// region high-level receipt format functions

	formatOtherReceipt: function(i, item) {
	},
	formatBalanceTransferReceipt: function(i, item) {
		this.fmtCatapultPublicKey('senderPublicKey', item);
		this.fmtCatapultAddress('recipientAddress', item);
		this.fmtMosaicId('mosaicId', item);
		this.fmtCatapultValue('amount', item);
	},
	formatBalanceCreditReceipt: function(i, item) {
		this.fmtCatapultPublicKey('account', item);
		this.fmtMosaicId('mosaicId', item);
		this.fmtCatapultValue('amount', item);

		item['balance_change_sign'] = '+';
		item['balance_change_description'] = 'increase';
	},
	formatBalanceDebitReceipt: function(i, item) {
		this.fmtCatapultPublicKey('account', item);
		this.fmtMosaicId('mosaicId', item);
		this.fmtCatapultValue('amount', item);

		item['balance_change_sign'] = '-';
		item['balance_change_description'] = 'decrease';
	},
	formatArtifactExpiryReceipt: function(i, item) {
		console.log(item);

		const prototype = app.context_prototype.prototype;
		if (prototype.ReceiptType.MosaicExpired === item.type)
			this.fmtMosaicId('artifactId', item);
		else if (prototype.ReceiptType.NamespaceExpired == item.type)
			this.fmtCatapultId('artifactId', item);
	},
	formatInflationReceipt: function(i, item) {
		this.fmtMosaicId('mosaicId', item);
		this.fmtCatapultValue('amount', item);
	},
	formatAggregateReceipt: function(i, item) {
	},
	formatAliasResolutionReceipt: function(i, item) {
	},
	formatReceipt: function (i, item) {
		this.fmtReceiptTypeName('type', item);
		const prototype = app.context_prototype.prototype;
		const basicReceiptType = prototype.ReceiptTypeToBasicReceiptType(item.type);
		var dispatcher = {
			[prototype.BasicReceiptType.Other]:           this.formatOtherReceipt,
			[prototype.BasicReceiptType.BalanceTransfer]: this.formatBalanceTransferReceipt,
			[prototype.BasicReceiptType.BalanceCredit]:   this.formatBalanceCreditReceipt,
			[prototype.BasicReceiptType.BalanceDebit]:    this.formatBalanceDebitReceipt,
			[prototype.BasicReceiptType.ArtifactExpiry]:  this.formatArtifactExpiryReceipt,
			[prototype.BasicReceiptType.Inflation]:       this.formatInflationReceipt,
			[prototype.BasicReceiptType.Aggregate]:       this.formatAggregateReceipt,
			[prototype.BasicReceiptType.AliasResolution]: this.formatAliasResolutionReceipt,
		};

		if (!(basicReceiptType in dispatcher))
			console.log('unknown receipt type', i, item);
		else
			dispatcher[basicReceiptType].call(this, i, item);
	},

	// endregion

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
};
