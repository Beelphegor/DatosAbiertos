define(['feedBrowser/feedData', 'durandal/app', 'feedBrowser/validation'], function(feedData, app, validation) {

	var viewModel = function(api) {

		var feedId = ko.observable();
		var collectionId = ko.observable();
		var documentId = ko.observable();
		var validationErrors = ko.observableArray([]);

		var collectionName = ko.observable();
		var fields = ko.observableArray([]);

		var closeModal = function() {
		};

		var modify = function() {
			var dataObject = {
				_id : documentId()
			};
			_.each(fields(), function(field) {
				dataObject[field.name] = field.value;
			});
			validation.preValidateModification(feedId(), collectionId(), documentId(), dataObject).then(function(results) {
				if (results.length == 0)
					closeModal(dataObject);
				else
					validationErrors(results);
			});
		};

		var loadCollection = function() {
			return api.getDocument(collectionId(), documentId()).then(function(doc) {

				return api.getById(feedId()).done(function(feed) {

					var collection = _.find(feed.collections, function(c) {
						return c._id == collectionId()
					});

					collectionName(collection.name);

					var fieldsArray = [];

					_.each(collection.fields || [], function(field) {
						fieldsArray.push({
							name : field.name,
							value : doc[field.name]
						});
					});

					fields(fieldsArray);
				});
			});
		};

		return {
			collectionName : collectionName,
			fields : fields,
			modify : modify,
			validationErrors : validationErrors,
			activate : function(args) {
				var self = this;
				feedId(args.feedId);
				collectionId(args.collectionId);
				documentId(args.documentId);
				closeModal = function(obj) {
					self.modal.close(obj);
				};
				return loadCollection(collectionId());
			}
		};

	}(feedData);

	return viewModel;
})
