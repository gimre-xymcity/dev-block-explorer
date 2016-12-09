var CatapultTypes = function(app) {
	// sorted by "facility" (second byte)
	this.helpers({
		TxType: {
			AccountLink:           0x414C, // L
			AggregateComplete:     0x4141, // A
			AggregateBonded:       0x4241,
			HashLock:              0x4148, // H
			SecretLock:            0x4152, // R
			SecretProof:           0x4252, //
			MosaicDefinition:      0x414D, // M
			MosaicSupplyChange:    0x424D, // M
			RegisterNamespace:     0x414E, // N
			AliasAddress:          0x424E, // N
			AliasMosaic:           0x434E, // N
			AddressProperty:       0x4150, // P
			MosaicProperty:        0x4250, // P
			TransactionTypeProperty: 0x4350, // P
			Transfer:              0x4154, // T
			ModifyMultisigAccount: 0x4155  // U
		}
	});
};
