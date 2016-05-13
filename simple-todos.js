// this needs to be set up http://ec2-52-4-114-184.compute-1.amazonaws.com:4567/files as GET on twilio
Tasks = new Mongo.Collection("tasks");
Router.route('/');
Router.route('/files/', function () {
  this.response.end('hi from the server\n');
  console.log(this.params.query.From);
  var username = this.params.query.From;
  var body = this.params.query.Body;
  username = username.replace(/\+1/g, "");
  console.log(username);
  var user = Meteor.users.findOne({ 'username': username });
  console.log(user._id);

      Tasks.insert({
        text: body,
        createdAt: new Date(),            // current time
        owner: user._id,           // _id of logged in user
        username: username  // username of logged in user
      });

   var reply = "Your reminder has been added. Please see your list here http://ec2-52-4-114-184.compute-1.amazonaws.com:4567/"; 
   Meteor.call("sendSms", reply, username);

}, {where: 'server'});

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish("tasks", function () {
    return Tasks.find({ owner: this.userId });
  });

  Accounts.onCreateUser(function(options, user) {
   var reply = "You have signed up for remind me. Please reply to this number to add stuff to your list";
   Meteor.call("sendSms", reply, user.username);
   return user;
  });

  Meteor.methods({
        sendSms: function (text, phone_number) {
          HTTP.call(
            "POST",
            'https://api.twilio.com/2010-04-01/Accounts/' + 
             'tdb' + '/SMS/Messages.json', {
                params: {
                    From: "+14152149049",
                    To: phone_number,
                    Body: text
                },
                // Set your credentials as environment variables 
                // so that they are not loaded on the client
                auth:
                    'tdb' + ':' +
                    'tdb' 
            },
            // Print error or success to console
            function (error) {
                if (error) {
                    console.log(error);
                }
                else {
                    console.log('SMS sent successfully.');
                }
            }
        );

        }
    });
}
 
if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      // Prevent default browser form submit
      event.preventDefault();
 
      // Get value from form element
      var text = event.target.text.value;
      var phone_number = Meteor.user().username;
 
     // console.log(event)
      Meteor.call("sendSms", text, phone_number);
      // Insert a task into the collection
      Tasks.insert({
        text: text,
        createdAt: new Date(),            // current time
        owner: Meteor.userId(),           // _id of logged in user
        username: Meteor.user().username  // username of logged in user
      });
 
      // Clear form
      event.target.text.value = "";
       },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Tasks.update(this._id, {
        $set: {checked: ! this.checked}
      });
    },
    "click .delete": function () {
      Tasks.remove(this._id);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });

}
