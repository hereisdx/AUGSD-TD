var express = require("express");
var router = express.Router();
var mongoose = require("mongoose");
var fq = require("fuzzquire");
var errorFields = [];
var cgTranscriptsModel = fq("schemas/cgTranscripts");
var cgTranscriptUsersModel = fq("schemas/cgTransctipt-users");
var applicationTypesModel = fq("schemas/applicationTypes");
var paytm = require("./paytm-callback/paytm-utility")
var paytm_config = fq('paytm/paytm_config').paytm_config;
var paytm_checksum = fq('paytm/checksum');
var authenticate = function (req, res, next) {
  if (true) {
    return next();
  } else {
    res.status(401).json({
      error: true,
      message: "Unable to authenticate"
    });
    return;
  }
};

var checkErrors = function (req, res, next) {
  if (errorFields.length > 0) {
    res.status(400).json({
      error: errorFields,
      message: `Invalid fields ${errorFields}`
    });
    return true;
  }
  return false;
};

router.all("/", function (req, res, next) {
  errorFields = []; // The error fields must be reset for every query
  next();
});

router.use("/paytm", paytm)

router.get("/test", authenticate, function (req, res) {
  res.json({ message: "API is online." });
});

router.post("/", authenticate, function (req, res, next) {
  if (!req.body.bitsId) {
    errorFields.push("bitsId");
  }
  if (!req.body.email) {
    errorFields.push("email");
  }
  if (!req.body.applicationType) {
    errorFields.push("applicationType");
  }
  if (!req.body.mob) {
    errorFields.push("mob")
  }
  var applicationType = JSON.parse(req.body.applicationType);
  var info = req.body.info ? req.body.info : "No information provided.";
  if (!checkErrors(req, res, next)) {
    var cgtranscript = new cgTranscriptsModel({
      bitsId: req.body.bitsId.toUpperCase(),
      date: Date.now(),
      email: req.body.email,
      applicationType: applicationType,
      status: "Submitted",
      email: req.body.email,
      info: info
    });
    cgtranscript.save(function (err, transcript) {
      if (err) {
        res.json({
          error: err,
          message: `Could not save to database because of this error : ${err}`
        });
      } else {
        var paramarray = {}
        var cost = 0;
        for (element of transcript.applicationType) {
          cost += element.cost
          console.log(cost)
        }
        paramarray["MID"] = paytm_config.MID;
        paramarray["ORDER_ID"] = transcript._id.toString()
        paramarray["CUST_ID"] = transcript.bitsId;
        paramarray["INDUSTRY_TYPE_ID"] = paytm_config["INDUSTRY_TYPE_ID"];
        paramarray["CHANNEL_ID"] = paytm_config["CHANNEL_ID"];
        paramarray['TXN_AMOUNT'] = cost.toString(); // transaction amount
        paramarray['WEBSITE'] = paytm_config["WEBSITE"]; //Provided by Paytm
        paramarray['CALLBACK_URL'] = paytm_config["CALLBACK_URL"] + paramarray["ORDER_ID"];//Provided by Paytm
        paramarray['EMAIL'] = transcript.email; // customer email id
        paramarray['MOBILE_NO'] = req.body.mob.toString(); // customer 10 digit mobile no.
        console.log(paramarray)
        paytm_checksum.genchecksum(paramarray, paytm_config.MERCHANT_KEY, function (err, checksum) {
          if (err) {
            res.status(500).json({
              error: err
            })
          } else {
            paramarray["CHECKSUMHASH"] = checksum;
            transcript.paytminfo = paramarray;
            transcript.save(function (err, transcript) {
              if (err) {
                res.json({
                  error: err
                })
              } else {
                res.json({
                  orderDetails: transcript.paytminfo,
                  application: transcript
                })
              }
            })
          }
        })



      }
    });
  }
});

router.get("/", authenticate, function (req, res, next) {
  if (req.query.id) {
    cgTranscriptsModel.findById(req.query.id, function (err, cgtranscript) {
      if (err) {
        res.status(500).json({
          error: err
        });
      } else if (!cgtranscript) {
        res.status(500).json({
          error: "Application not found"
        });
      } else {
        res.json(cgtranscript);
      }
    });
    return;
  } else if (!req.query.email) {
    cgTranscriptsModel.find(function (err, cgtranscript) {
      if (err) {
        res.json({
          error: err
        });
      } else {
        res.json(cgtranscript);
      }
    });
  } else {
    cgTranscriptsModel.find(
      {
        email: req.query.email
      },
      function (err, cgtranscript) {
        if (err) {
          res.status(500).json({
            error: true,
            message: `Error : ${err}`
          });
        } else {
          res.json(cgtranscript);
        }
      }
    );
  }
});

router.get("/application-types", function (req, res) {
  applicationTypesModel.find(function (err, applicationTypes) {
    if (err) {
      res.status(500).json({
        error: err
      });
    } else {
      res.json(applicationTypes);
    }
  });
});


router.get("/status-types", function (req, res) {
  res.json([
    "Submitted", "Processing", "Cancelled", "Rejected", "Payment Pending", "Payment Completed", "Shipped", "Completed", "Other"
  ]);
})


router.post("/users", authenticate, function (req, res) {
  console.log(req.body.email);
  if (req.body.email) {
    cgTranscriptUsersModel.findOne(
      {
        email: req.body.email
      },
      function (err, user) {
        if (err) {
          res.status(500).json({
            error: err
          });
        } else {
          if (user) {
            if (req.body.name) {
              user.name = req.body.name;
            }
            if (req.body.bitsId) {
              user.bitsId = req.body.bitsId;
            }
            if (req.body.address) {
              user.address = req.body.address;
            }
            if (req.body.mcode) {
              user.mcode = req.body.mcode;
            }
            if (req.body.sex) {
              user.sex = req.body.sex;
            }
            if (req.body.mob) {
              user.mob = req.body.mob;
            }
            user.save(function (err, user) {
              if (err) {
                res.status(500).json({
                  error: err
                });
              } else {
                res.json(user);
              }
            });
          } else {
            errorFields = [];
            if (!req.body.email) {
              errorFields.push("email");
            }
            if (!req.body.name) {
              errorFields.push("name");
            }
            if (!req.body.bitsId) {
              errorFields.push("bitsId");
            }
            if (!req.body.mcode) {
              errorFields.push("mcode");
            }
            if (!req.body.address) {
              errorFields.push("address");
            }
            if (errorFields.length > 0) {
              res.status(500).json({
                error: `Required fields : ${errorFields}`
              });
            } else {
              var user = new cgTranscriptUsersModel();
              user.name = req.body.name;
              user.email = req.body.email;
              user.address = req.body.address;
              user.mcode = req.body.mcode;
              user.mob = req.body.mob;
              user.sex = req.body.sex;
              user.bits = req.body.bitsId;
              user.save(function (err, cgTranscriptUser) {
                if (err) {
                  res.json(err);
                } else {
                  res.json(cgTranscriptUser);
                }
              });
            }
          }
        }
      }
    );
  }
});

router.get("/users", authenticate, function (req, res) {
  if (req.query.bitsId) {
    cgTranscriptUsersModel.findOne(
      {
        bitsId: req.query.bitsId
      },
      function (err, user) {
        if (err) {
          res.status(500).json({
            error: err
          });
        } else {
          res.json(user);
        }
      }
    );
  } else if (req.query.email) {
    cgTranscriptUsersModel.findOne(
      {
        email: req.query.email
      },
      function (err, user) {
        if (err) {
          res.status(500).json({
            error: err
          });
        } else {
          res.json(user);
        }
      }
    );
  } else {
    cgTranscriptUsersModel.find(function (err, user) {
      if (err) {
        res.status(500).json({
          error: err
        });
      } else {
        res.json(user);
      }
    });
  }
});
module.exports = router;
