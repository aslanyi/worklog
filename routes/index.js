var express = require("express");
var router = express.Router();
const fs = require("fs");
const multer = require("multer");
var json2xls = require("json2xls");
const excelToJson = require("convert-excel-to-json");
const keys = [];
let workLogs = [];
const storage = multer.diskStorage({
    destination: function(req, file, callback) {
        callback(null, "./uploads/uploaded");
    },
    filename: function(req, file, callback) {
        callback(null, file.fieldname + ".xlsx");
    }
});

var upload = multer({ storage: storage }).single("excel");
/* GET home page. */
router.get("/", function(req, res, next) {
    res.sendFile("/html/index.html");
});

router.post("/upload/excel", function(req, res) {
    upload(req, res, function(err) {
        if (err) {
            return res.end("Error uploading file.");
        }
    });
    res.redirect("/");
});

function getDuration(workLog) {
    const duration = workLog.split(";")[3];
    const newDuration = duration / 3600;
    if (newDuration >= 1) {
        return newDuration;
    }
    return 0;
}

function getLog(workLog) {
    const log = workLog.split(";")[0];
    log.replace("\n", " ");
    return log;
}

function getName(workLog) {
    const name = workLog.split(";")[2];
    return name;
}

function isTodaysLog(workLog) {
    const date = workLog.split(";")[1];
    const day = new Date(Date.now()).getDate();
    const month = new Date(Date.now()).getMonth();
    const year = new Date(Date.now()).getFullYear();
    if (
        new Date(date).getDate() === day &&
        new Date(date).getMonth() === month
    ) {
        return true;
    }

    return false;
}

function getWorkLogKeys(item) {
    for (const key in item) {
        if (item.hasOwnProperty(key)) {
            const element = item[key];
            if (element === "Log Work") {
                keys.push(key);
            }
        }
    }
    return keys;
}

function getWorkLog(keys, item) {
    const workLog = {};
    for (const key in item) {
        if (item.hasOwnProperty(key)) {
            const element = item[key];
            const hasKey = keys.find(x => x === key);
            if (hasKey && element !== "Log Work" && isTodaysLog(element)) {
                if (getLog(element) !== "" && getLog(element)) {
                    workLog.duration = getDuration(element);
                    workLog.log = getLog(element);
                    workLog.name = getName(element);
                    workLogs.push(element);
                    console.log(workLogs);
                }
            }
        }
    }
    return workLog;
}

function getWorkLogs() {
    const imWorkLogs = [];
    workLogs.map(wLog => {
        const object = {};
        object.duration = getDuration(wLog);
        object.log = getLog(wLog);
        object.name = getName(wLog);
        imWorkLogs.push(object);
    });
    return imWorkLogs;
}

router.get("/excel", (req, res, next) => {
    const result = excelToJson({
        sourceFile: "./uploads/uploaded/excel.xlsx"
    });

    const jsonArray = [];
    if (result && result.Worksheet && result.Worksheet.length > 0) {
        result.Worksheet.forEach(item => {
            workLogs = [];
            const workLog = getWorkLog(getWorkLogKeys(item), item);
            if (
                item.A !== "Summary" &&
                (item.B !== "Issue Key" || item.B !== "Issue key")
            ) {
                getWorkLogs().forEach(workLog => {
                    const jsonItem = {
                        Summary: item.A,
                        "Issue Key": item.B,
                        "Duration (h)": workLog.duration,
                        "Work Log By": workLog.name,
                        "Work Info": workLog.log
                    };
                    jsonArray.push(jsonItem);
                });
            }
        });

        var xls = json2xls(jsonArray);
        fs.writeFileSync("data.xlsx", xls, "binary");
        res.download("data.xlsx");
        return;
    }

    res.end("Error: Please ask to Taha that Why is happening?");
});

module.exports = router;
