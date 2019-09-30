var CatapultTypes = function(app) {
	var FacilityType = {
		Aggregate: 0x41,           // A
		Core: 0x43,                // C
		Metadata: 0x44,            // D
		LockHash: 0x48,            // H
		AccountLink: 0x4C,         // L
		Mosaic: 0x4D,              // M
		Namespace: 0x4E,           // N
		RestrictionAccount: 0x50,  // P
		LockSecret: 0x52,          // R
		Transfer: 0x54,            // T
		Multisig: 0x55,            // U
	};

	var BasicReceiptType = {
		Other: 0x0,
		BalanceTransfer: 0x1,
		BalanceCredit: 0x2,
		BalanceDebit: 0x3,
		ArtifactExpiry: 0x4,
		Inflation: 0x5,
		Aggregate: 0xE,
		AliasResolution: 0xF
	};

	function makeTransactionType(transaction, facilityType) {
		return 0x4000 | (transaction << 8) | facilityType;
	}

	function makeReceiptType(basicReceiptType, code, facilityType) {
		return (basicReceiptType << 12) | ((code & 0xf) << 8) | facilityType;
	}

	// sorted by "facility" (second byte)
	const TxType = {
		AggregateComplete:         makeTransactionType(1, FacilityType.Aggregate),
		AggregateBonded:           makeTransactionType(2, FacilityType.Aggregate),
		AccountMetadata:           makeTransactionType(1, FacilityType.Metadata),
		MosaicMetadata:            makeTransactionType(2, FacilityType.Metadata),
		NamespaceMetadata:         makeTransactionType(3, FacilityType.Metadata),
		HashLock:                  makeTransactionType(1, FacilityType.LockHash),
		AccountLink:               makeTransactionType(1, FacilityType.AccountLink),
		MosaicDefinition:          makeTransactionType(1, FacilityType.Mosaic),
		MosaicSupplyChange:        makeTransactionType(2, FacilityType.Mosaic),
		RegisterNamespace:         makeTransactionType(1, FacilityType.Namespace),
		AliasAddress:              makeTransactionType(2, FacilityType.Namespace),
		AliasMosaic:               makeTransactionType(3, FacilityType.Namespace),
		AccountAddressRestriction: makeTransactionType(1, FacilityType.RestrictionAccount),
		AccountMosaicRestriction:  makeTransactionType(2, FacilityType.RestrictionAccount),
		AccountTxTypeRestriction:  makeTransactionType(3, FacilityType.RestrictionAccount),
		SecretLock:                makeTransactionType(1, FacilityType.LockSecret),
		SecretProof:               makeTransactionType(2, FacilityType.LockSecret),
		Transfer:                  makeTransactionType(1, FacilityType.Transfer),
		ModifyMultisigAccount:     makeTransactionType(1, FacilityType.Multisig)
	};
	const ReceiptType = {
		HarvestFee:             makeReceiptType(BasicReceiptType.BalanceCredit, 1, FacilityType.Core),
		Inflation:              makeReceiptType(BasicReceiptType.Inflation, 1, FacilityType.Core),
		TransactionGroup:       makeReceiptType(BasicReceiptType.Aggregate, 1, FacilityType.Core),
		AddressAliasResolution: makeReceiptType(BasicReceiptType.AliasResolution, 1, FacilityType.Core),
		MosaicAliasResolution:  makeReceiptType(BasicReceiptType.AliasResolution, 2, FacilityType.Core),

		LockHashCreated:        makeReceiptType(BasicReceiptType.BalanceDebit, 1, FacilityType.LockHash),
		LockHashCompleted:      makeReceiptType(BasicReceiptType.BalanceCredit, 2, FacilityType.LockHash),
		LockHashExpired:        makeReceiptType(BasicReceiptType.BalanceCredit, 3, FacilityType.LockHash),

		LockSecretCreated:      makeReceiptType(BasicReceiptType.BalanceDebit, 1, FacilityType.LockSecret),
		LockSecretCompleted:    makeReceiptType(BasicReceiptType.BalanceCredit, 2, FacilityType.LockSecret),
		LockSecretExpired:      makeReceiptType(BasicReceiptType.BalanceCredit, 3, FacilityType.LockSecret),

		MosaicExpired:          makeReceiptType(BasicReceiptType.ArtifactExpiry, 1, FacilityType.Mosaic),
		MosaicRentalFee:        makeReceiptType(BasicReceiptType.BalanceTransfer, 2, FacilityType.Mosaic),

		NamespaceExpired:       makeReceiptType(BasicReceiptType.ArtifactExpiry, 1, FacilityType.Namespace),
		NamespaceDeleted:       makeReceiptType(BasicReceiptType.ArtifactExpiry, 2, FacilityType.Namespace),
		NamespaceRentalFee:     makeReceiptType(BasicReceiptType.BalanceTransfer, 3, FacilityType.Namespace),
	};

	this.helpers({
		FacilityType: FacilityType,
		TxType: TxType,
		TxDirectoryNames: {
			// note aggregate is handled differently
			[TxType.HashLock]:                  'hashlock',
			[TxType.AccountLink]:               'accountLink',
			[TxType.AccountMetadata]:           'metadataAccount',
			[TxType.MosaicMetadata]:            'metadataMosaic',
			[TxType.NamespaceMetadata]:         'metadataNamespace',
			[TxType.MosaicDefinition]:          'mosaic',
			[TxType.MosaicSupplyChange]:        'mosaicSupply',
			[TxType.RegisterNamespace]:         'namespace',
			[TxType.AliasAddress]:              'aliasAddress',
			[TxType.AliasMosaic]:               'aliasMosaic',
			[TxType.AccountAddressRestriction]: 'restrictionAccountAddress',
			[TxType.AccountMosaicRestriction]:  'restrictionAccountMosaic',
			[TxType.AccountTxTypeRestriction]:  'restrictionAccountTransactionType',
			[TxType.SecretLock]:                'secretlock',
			[TxType.SecretProof]:               'secretproof',
			[TxType.Transfer]:                  'transfer',
			[TxType.ModifyMultisigAccount]:     'multisig'
		},
		TxTypeName: {
			[TxType.AggregateComplete]:         'aggregate complete',
			[TxType.AggregateBonded]:           'aggregate bonded',
			[TxType.AccountMetadata]:           'account metadata',
			[TxType.MosaicMetadata]:            'mosaic metadata',
			[TxType.NamespaceMetadata]:         'namespace metadata',
			[TxType.HashLock]:                  'hash lock',
			[TxType.AccountLink]:               'account link',
			[TxType.MosaicDefinition]:          'mosaic definition',
			[TxType.MosaicSupplyChange]:        'mosaic supply',
			[TxType.RegisterNamespace]:         'register namespace',
			[TxType.AliasAddress]:              'address alias',
			[TxType.AliasMosaic]:               'mosaic alias',
			[TxType.AccountAddressRestriction]: 'address property',
			[TxType.AccountMosaicRestriction]:  'mosaic property',
			[TxType.AccountTxTypeRestriction]:  'transaction type property',
			[TxType.SecretLock]:                'secret lock',
			[TxType.SecretProof]:               'secret proof',
			[TxType.Transfer]:                  'transfer property',
			[TxType.ModifyMultisigAccount]:     'modify multisig account'
		},
		BasicReceiptType: BasicReceiptType,
		BasicReceiptFileNames: {
			[BasicReceiptType.Other]:           'other',
			[BasicReceiptType.BalanceTransfer]: 'balanceTransfer',
			[BasicReceiptType.BalanceCredit]:   'balanceCredit',
			[BasicReceiptType.BalanceDebit]:    'balanceDebit',
			[BasicReceiptType.ArtifactExpiry]:  'artifactExpiry',
			[BasicReceiptType.Inflation]:       'inflation',
			[BasicReceiptType.Aggregate]:       'aggregate',
			[BasicReceiptType.AliasResolution]: 'aliasResolution'
		},
		ReceiptType: ReceiptType,
		ReceiptTypeName: {
			[ReceiptType.HarvestFee]:             'harvest fee',
			[ReceiptType.Inflation]:              'inflation',
			[ReceiptType.TransactionGroup]:       'transaction group',
			[ReceiptType.AddressAliasResolution]: 'address alias',
			[ReceiptType.MosaicAliasResolution]:  'mosaic alias',
			[ReceiptType.LockHashCreated]:        'lock hash creation',
			[ReceiptType.LockHashCompleted]:      'lock hash completion',
			[ReceiptType.LockHashExpired]:        'lock hash expiration',
			[ReceiptType.LockSecretCreated]:      'lock secret creation',
			[ReceiptType.LockSecretCompleted]:    'lock secret completion',
			[ReceiptType.LockSecretExpired]:      'lock secret expiration',
			[ReceiptType.MosaicExpired]:          'mosaic expiration',
			[ReceiptType.MosaicRentalFee]:        'mosaic rental fee',
			[ReceiptType.NamespaceExpired]:       'namespace expiration',
			[ReceiptType.NamespaceDeleted]:       'namespace deletion',
			[ReceiptType.NamespaceRentalFee]:     'namespace rental fee',
		},
		ReceiptTypeToBasicReceiptType: receiptType => (receiptType & 0xF000) >> 12,
	});
};
