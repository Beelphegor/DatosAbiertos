"use strict";

var orgModule = require("../modules/orgs.js");
var chai = require('chai');
var should = chai.should();
chai.Assertion.includeStack = true;
var database = require("../modules/database.js");
var q = require("q");

describe('Orgs', function() {

	var userId = database.newId();

	var org1 = {
		_id : database.newId(),
		name : "Police",
		admins : [],
		applications : [{
			name : 'Web App',
			_id : database.newId(),
			users : [{
				_id : database.newId(),
				username : 'testUsername1',
				password : 'testPassword1'
			}]
		}]
	};
	var org2 = {
		_id : database.newId(),
		code : "firemenOrg",
		name : "Firemen",
		applications : [{
			name : 'Android App',
			_id : database.newId(),
			users : [{
				_id : database.newId(),
				name : 'testName1',
				username : 'testUsername1',
				email : 'testEmail1',
				password : 'testPassword1'
			}]
		}]
	};
	var org3 = {
		_id : database.newId(),
		name : "Healthcare",
		applications : [{
			name : 'iPhone App',
			_id : database.newId(),
		}]
	};

	var account1 = {
		email : "byron@acklenavenue.com",
		orgs : [1, 2, 3]
	};

	var account2 = {
		email : "colin@acklenavenue.com",
		orgs : []
	};

	beforeEach(function(done) {

		var deleteAll = function(collectionName, callback) {
			database.currentConnection().collection(collectionName, function(err, coll) {
				coll.remove({}, function() {
					callback();
				});
			});
		};

		var createTestData = function(callback) {
			database.collection("accounts").then(function(accountsColl) {
				return accountsColl.add(userId, account1).then(function() {
					return accountsColl.add(userId, account2);
				});
			}).then(function() {
				database.collection("orgs").then(function(orgsColl) {
					orgsColl.add(userId, org1).then(orgsColl.add(userId, org2)).then(orgsColl.add(userId, org3)).done(function() {
						org1.admins.push(account1._id);
						org1.admins.push(account2._id);
						callback();
					});
				});
			});
		};

		deleteAll("orgs", function() {
			deleteAll("accounts", function() {
				createTestData(function() {
					done();
				});
			});
		});
	});

	describe('when changing the org code', function() {
		it('should change the code', function(done) {
			orgModule.changeCode(userId, org2._id, "newCode").then(function(modified) {
				database.collection("orgs").then(function(col) {
					col.getById(modified._id).then(function(orgInDatabase) {
						orgInDatabase.code.should.equal("newCode");
					}).done(done);
				});
			})
		});
	});

	describe('when changing the org code with duplicate in other org', function() {
		it('should throw an error', function(done) {
			orgModule.changeCode(userId, org1._id, "firemenOrg").fail(function(err){
				err.should.equal("The org code 'firemenOrg' already exists in another org!");				
			}).done(function(){
				done();
			});
		});
	});

	describe('when getting an org by id', function() {
		it('should return the expected org', function(done) {
			orgModule.getById(org1._id).then(function(org) {
				org.name.should.equal(org1.name);
			}).done(done);
		});
	});

	describe('when getting an org by code', function() {
		it('should return the expected org', function(done) {
			orgModule.getByCode("firemenOrg").then(function(org) {
				org._id.toString().should.equal(org2._id.toString());
			}).done(done);
		});
	});

	describe('when removing an admin from an org', function() {
		it('should remove the admin', function(done) {
			orgModule.removeAdminUser(userId, org1._id, account1._id).then(function(org) {
				org.admins.should.not.include(account1._id);
			}).done(done);
		});
	});

	describe('when adding an org admin user', function() {
		it('should add the user to the list of admins', function(done) {
			var userIdToAdd = account2._id;
			orgModule.addAdminUser(userId, org2._id, userIdToAdd).then(function(existingOrg) {
				database.collection("orgs").then(function(col) {
					col.getById(existingOrg._id).then(function(orgInDatabase) {
						orgInDatabase.admins[0].toString().should.equal(userIdToAdd.toString());
					}).then(database.collection("accounts").then(function(col) {
						col.getById(account2._id).then(function(accountInDatabase) {
							accountInDatabase.orgs.should.include(org2._id.toString());
						}).done(done);
					}));
				});
			});
		});
	});

	describe("when adding an application to an org", function() {
		it("should add the application in the database", function(done) {
			orgModule.addApplication(userId, org1._id, "application name").then(function(modifiedOrg) {
				database.collection("orgs").then(function(col) {
					col.getById(modifiedOrg._id).then(function(orgFromDatabase) {
						orgFromDatabase.applications[1].name.should.equal("application name");
						orgFromDatabase.applications[1]._id.should.not.be.null;
					}).done(done);
				});
			});
		});
	});

	describe("when adding an application user to an application", function() {
		it("should add the user in the database", function(done) {
			var newUser = {
				name : 'Byron',
				username : 'byron',
				email : 'byron@acklenavenue.com',
				password : 'test1234'
			};
			var app = org3.applications[0];
			orgModule.addApplicationUser(userId, org3._id, app._id, newUser).then(function(modifiedOrg) {
				database.collection("orgs").then(function(col) {
					col.getById(modifiedOrg._id).then(function(orgFromDatabase) {
						orgFromDatabase.applications[0].users[0].name.should.equal(newUser.name);
						orgFromDatabase.applications[0].users[0].username.should.equal(newUser.username);
						orgFromDatabase.applications[0].users[0].email.should.equal(newUser.email);
						orgFromDatabase.applications[0].users[0].password.should.equal(newUser.password);
						orgFromDatabase.applications[0].users[0]._id.should.not.be.null
					}).done(done);
				});
			});
		});
	});

	describe("when modifying an existing application user", function() {
		it("should change the user in the database", function(done) {
			var org = org2;
			var app = org.applications[0];
			var user = app.users[0];
			var modifications = {
				name : 'newName',
				username : 'newUsername',
				email : 'newEmail'
			};
			orgModule.modifyApplicationUser(userId, org._id, app._id, user._id, modifications).then(function(modifiedOrg) {
				database.collection("orgs").then(function(col) {
					col.getById(modifiedOrg._id).then(function(orgFromDatabase) {
						orgFromDatabase.applications[0].users[0].name.should.equal(modifications.name);
						orgFromDatabase.applications[0].users[0].username.should.equal(modifications.username);
						orgFromDatabase.applications[0].users[0].email.should.equal(modifications.email);
						orgFromDatabase.applications[0].users[0].password.should.equal(user.password);
					}).done(done);
				});
			});
		});
	});

	describe('when retrieving an app user with correct credentials', function() {
		it("should return the user data", function(done) {
			var org = org1;
			var app = org.applications[0];
			var user = app.users[0];
			orgModule.getApplicationUser(app._id, user.username, user.password).then(function(userRetrieved) {
				userRetrieved.username.should.equal(user.username)
			}).done(done);
		});
	});

	describe('when retrieving an app user with invalid token', function() {
		it("should reject with the correct message", function(done) {
			orgModule.getApplicationUser(database.newId(), "user.username", "user.password").fail(function(err) {
				err.should.equal("Application user was not found for given credentials. (O1)");
			}).done(done);
		});
	});

	describe('when retrieving an app user with invalid username', function() {
		it("should reject with the correct message", function(done) {
			var org = org1;
			var app = org.applications[0];
			var user = app.users[0];
			orgModule.getApplicationUser(app._id, "invalid_username", "user.password").fail(function(err) {
				err.should.equal("Application user was not found for given credentials. (U1)");
			}).done(done);
		});
	});

	describe('when retrieving an app user with invalid password', function() {
		it("should reject with the correct message", function(done) {
			var org = org1;
			var app = org.applications[0];
			var user = app.users[0];
			orgModule.getApplicationUser(app._id, user.username, "invalid_password").fail(function(err) {
				err.should.equal("Application user was not found for given credentials. (U1)");
			}).done(done);
		});
	});

	describe('when getting all orgs for an account', function() {
		it('should return the expected orgs where account is an admin', function(done) {
			orgModule.create(userId, "org1", "org1Code", account1._id).done(function(newOrg1) {
				orgModule.create(userId, "org2", "org2Code", account1._id).done(function(newOrg2) {
					orgModule.getAllForAccount(account1._id.toString()).then(function(orgs) {
						orgs[0].name.should.equal(newOrg1.name);
						orgs[1].name.should.equal(newOrg2.name);
						orgs.length.should.equal(2);

						database.collection("accounts").then(function(col) {
							return col.getById(account1._id).then(function(accountInDatabase) {
								accountInDatabase._id.toString().should.equal(account1._id.toString());
								accountInDatabase.orgs.should.include(newOrg1._id.toString());
								accountInDatabase.email.should.equal("byron@acklenavenue.com");
							}).done(done);
						});
					});
				});
			})
		});
	});

	describe('when creating a new org', function(specDone) {
		it('should add the org to the database', function(done) {
			var name = "Voting Records Test";
			var code = "voting";
			orgModule.create(userId, name, code, account1._id).then(function(newOrg) {
				database.collection("orgs").then(function(col) {
					return col.getById(newOrg._id).then(function(orgInDatabase) {
						orgInDatabase.name.should.equal(name);
						orgInDatabase.code.should.equal(code);
						orgInDatabase.admins.should.include(account1._id.toString());
					}).done(done);
				});
			});
		});

		it('should add the org to the account', function(done) {
			var name = "Traffic Statistics";
			var code = "trafficstats";
			orgModule.create(userId, name, code, account1._id).then(function(newOrg) {
				database.collection("accounts").then(function(accountCol) {
					accountCol.getById(account1._id).then(function(accountInDatabase) {
						accountInDatabase.orgs.should.include(newOrg._id.toString());
					}).done(done);
				});
			});
		});

		it('should not allow duplicate org codes', function(done){
			var name = "Some other firemen group";
			var duplicateCode = "firemenOrg";
			orgModule.create(userId, name, duplicateCode, account1._id).fail(function(err) {
				err.should.equal("The org code 'firemenOrg' already exists in another org!");				
			}).done(function(){
				done();
			});
		});
	});


    describe('when archiving one org by id', function() {
        it('should set the archive bit', function(done) {
            orgModule.archive(userId, org1._id).then(function(org) {
                org.archived.should.equal(true);
            }).done(done);
        })
    });
});
