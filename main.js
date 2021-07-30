const runAll = require("npm-run-all");

runAll(["whatsapp", "geraldo"], {parallel: true, race: true})
    .then(() => {
        console.log("Done!");
    })
    .catch(err => {
        console.log(err);
    });