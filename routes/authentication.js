const bcrypt = require("bcryptjs");
const {
  User,
  signUpValidation,
  signInValidation,
  validateNewPassword,
  validateAccountRecoveryEmail,
  validatePasswordRecovery
} = require("../models/user.js");
const express = require("express");
const router = express();
const _ = require("lodash");
const emailConfirmation = require("../services/emailConfirmation.js");
const authToken = require("../middlewares/authToken.js");
const accountRecovery = require("../services/accountRecovery.js");

//User registration
router.post("/sign-up", async (req, res) => {
  const { error } = signUpValidation(req.body.signUp);
  if (error) return res.status(400).send(error.details[0].message);

  const checkUser = await User.findOne({ email: req.body.signUp.email });
  if (checkUser) return res.status(400).send("User already exist");

  const checkUserName = await User.findOne({
    displayName: req.body.signUp.displayName
  });
  if (checkUserName) return res.status(400).send("Display name already exist");

  const user = new User(req.body.signUp);
  const salting = await bcrypt.genSalt(10);
  user.isActive = false;
  user.password = await bcrypt.hash(user.password, salting);

  let hashedId = await bcrypt.hash(user._id.toString(), 10);
  hashedId = hashedId.replace(/[/\\&;%@+,]/g, "");
  user.hashedId = hashedId;

  const { smtpTransport, close } = emailConfirmation(user);
  const sendMail = await smtpTransport;

  if (!sendMail) {
    close.close();
    return res
      .status(400)
      .send(
        "There was an error sending the email confirmation please try again"
      );
  }

  close.close();
  await user.save();

  res.send(
    "An email confirmation has been sent to your email. Accounts not confirmed in 12 hours will be automatically deleted"
  );
});

//Email confirmation
router.get("/emailConfirmation/verify/:hash", async (req, res) => {
  const user = await User.findOne({ hashedId: req.params.hash });
  if (!user)
    return res.status(400).send("An error has occur during email confirmation");
  user.expire_at = undefined;
  user.hashedId = undefined;
  user.isActive = true;
  await user.save();
  const token = user.genToken();
  res
    .status(200)
    .header("x-auth-token", token)
    .send(
      "Great, your account is ready to use, you can now log into your account"
    );
});

//Re-send verification
router.post("/reSendVerification/:id", authToken, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(400).send("User not found");

  const { smtpTransport, close } = emailConfirmation(user);
  const sendMail = await smtpTransport;

  if (!sendMail) {
    close.close();
    return res
      .status(400)
      .send(
        "There was an error sending the email confirmation please try again"
      );
  }
  close.close();
  res.send(
    "An email confirmation has been sent to your email. Accounts not confirmed in 12 hours will be automatically deleted"
  );
});

//Change password
router.patch("/change-password", authToken, async (req, res) => {
  if (req.body.changePassword.old === req.body.changePassword.new)
    return res.status(409).send("Old password and New password are the same");

  const { error } = validateNewPassword(req.body.changePassword);
  if (error) return res.status(400).send(error.details[0].message);

  const user = await User.findById(req.user._id);
  const comparePass = await bcrypt.compare(
    req.body.changePassword.old,
    user.password
  );
  if (!comparePass)
    return res
      .status(400)
      .send("Couldn't update the password, please try again");

  const salting = await bcrypt.genSalt(10);
  const newPassHashed = await bcrypt.hash(req.body.changePassword.new, salting);

  try {
    const updatePassword = await User.updateOne(
      { _id: req.user._id },
      { password: newPassHashed }
    );
    if (!updatePassword) {
      return res
        .status(400)
        .send("Couldn't update the password, please try again");
    }
    res.status(200).send("Password updated successfully");
  } catch (error) {
    console.log(error);
  }
});

//Account Recovery Request
router.post("/accountRecovery", async (req, res) => {
  const { error } = validateAccountRecoveryEmail(req.body.accountRecovery);
  if (error) return res.status(400).send("Invalid email format");

  const user = await User.findOne({ email: req.body.accountRecovery.email });
  if (!user) return res.status(404).send("Email not found");

  const hash = await bcrypt.hash(user._id.toString(), 10);
  const hashedId = hash.replace(/[/\\&;%@+,]/g, "");

  const reAddHashId = await User.updateOne(
    { _id: user._id },
    { hashedId: hashedId }
  );
  if (!reAddHashId)
    return res.status(400).send("Error trying to recover account");

  const updatedUser = await User.findOne({
    email: req.body.accountRecovery.email
  });

  const { smtpTransport, close } = accountRecovery(updatedUser);
  const sendMail = await smtpTransport;

  if (!sendMail) {
    close.close();
    return res
      .status(400)
      .send("There was an error trying to recover account please try again");
  }
  close.close();
  res
    .status(200)
    .send(
      `An email confirmation has been sent to your email. Please check your email`
    );
});

//Verify hash first then redirect to add the new password for the account recovery
router.get("/accountRecovery/verify/:hash", async (req, res) => {
  const user = await User.findOne({ hashedId: req.params.hash });
  if (!user)
    return res
      .status(400)
      .send(
        "This account was already validated for recovery or could not be found"
      );
  const hash = await bcrypt.hash(user._id.toString(), 10);
  const hashedId = hash.replace(/[/\\&;%@+,]/g, "");
  const updateHash = await User.updateOne(
    { _id: user._id },
    { hashedId: hashedId }
  );
  user.hashedId = hashedId;
  console.log(updateHash);

  res.status(200).send(user.hashedId);
});

router.post("/accountRecovery/recoverPassword/:hash", (req, res) => {
  if (req.body.recoverAccount.new === req.body.recoverAccount.confirmNew)
    return res
      .status(409)
      .send("Password and password confirmation are not the same");

  const { error } = validatePasswordRecovery(req.body.recoverAccount);
  if (error) return res.status(400).send(error.details[0].message);

 
});

//User authentication
router.post("/sign-in", async (req, res) => {
  const { error } = signInValidation(req.body.signIn);
  if (error) return res.status(400).send(error.details[0].message);

  const checkUser = await User.findOne({ email: req.body.signIn.email });
  if (!checkUser) return res.status(400).send("Invalid email or password");

  const validatePassword = await bcrypt.compare(
    req.body.signIn.password,
    checkUser.password
  );

  if (!validatePassword)
    return res.status(400).send("Invalid email or password");

  const token = checkUser.genToken();

  res
    .header("x-auth-token", token)
    .status(200)
    .send("LogIn successfully");
});

module.exports = router;
