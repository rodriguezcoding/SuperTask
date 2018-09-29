const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const joi = require("joi");
const userSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50
  },
  userPicture: {
    type: String
  },
  firstName: {
    type: String,
    required: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 1024
  }
});

userSchema.methods.genToken = function() {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      displayName: this.displayName,
      firstName: this.firstName,
      lastName: this.lastName,
      profilePicture: this.profilePicture
    },
    process.env.SECRET_KEY_GEN_TOKEN
  );
};

const validateUser = user => {
  const userSchema = {
    displayName: joi
      .string()
      .min(5)
      .max(50)
      .required(),
    userPicture: joi.string(),
    firstName: joi
      .string()
      .max(50)
      .required(),
    lastName: joi
      .string()
      .min(5)
      .max(50)
      .required(),
    email: joi
      .string()
      .email()
      .required(),
    password: joi
      .string()
      .min(3)
      .max(1024)
      .required()
  };
  return joi.validate(user, userSchema);
};

exports.signUpValidation = validateUser;
exports.User = mongoose.model("User", userSchema);