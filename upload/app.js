var sujeto; // Subject the chart is set to
var level; // The Spanish level that guides the verb list

// Set up refreshing logic
document.addEventListener('DOMContentLoaded', function() {
    init();
    loadData();
    setUpListeners();
})

function init() {
    changeSubject(suj=-1, save=false); // Initialize sujeto to a random value
    level = 5; // Set default to Spanish 5
}

function setUpListeners() {
    // Set up event listeners for saving data
    for(const field of text_fields) {
        document.getElementById(field).addEventListener("blur", saveData);
    }
    document.getElementById("verbSelector").addEventListener("input", saveData);
}

function loadData() {
    const data = JSON.parse(sessionStorage.getItem('inputs'));
    if(!data) return;
    for(const field of text_fields) {
        document.getElementById(field).value = data[field + "_text"];
        document.getElementById(field).style.color = data[field + "_color"];
    }
    changeSubject(data.suj, save=false);
    if(data.level == 6) switchLevel(save=false);
    document.getElementById("verbSelector").value = data.verb;
}

function saveData() {
    const data = {};
    for(const field of text_fields) {
        data[field + "_text"] = document.getElementById(field).value;
        data[field + "_color"] = document.getElementById(field).style.color;
    }
    data.suj = sujeto;
    data.level = level;
    data.verb = document.getElementById("verbSelector").value;
    sessionStorage.setItem('inputs', JSON.stringify(data))
}

// Randomly change the subject the chart is set to (or to given subject)
function changeSubject(suj=-1, save=true) {

    sujeto = suj==-1? Math.floor(Math.random() * 5) : suj;
    switch(sujeto) {
        case 0:
            document.getElementById("sujeto").value = "sujeto--yo";
            break;
        case 1:
            document.getElementById("sujeto").value = "sujeto--tú";
            break;
        case 2:
            document.getElementById("sujeto").value = "sujeto--él";
            break;
        case 3:
            document.getElementById("sujeto").value = "sujeto--nosotros";
            break;
        case 4:
            document.getElementById("sujeto").value = "sujeto--ellos";
            break;
        default:
            break;
    }
    if(save) {saveData();}
}

// Check the chart and output feedback
function checkChart() {
    getSolution(sujeto);
    saveData();
}

// Clear all the cells
function clearScreen() {
    var order = ["inf", "ger", "part_pas", "pres", "imp", "pret", "pres_perf", "plu_perf", "fut", "fut_perf", "cond", "cond_perf", "pres_subj", 
    "imp_subj", "pres_perf_subj", "plu_perf_subj", "tu_pos", "tu_neg", "ud", "uds", "vos", "vos", "nos"];

    for(var i = 0; i < order.length; i++) {
        if(i == 20) {
            document.getElementById(order[i] + "_one_spanish").value = "";
            document.getElementById(order[i] + "_ingles").value = "";

            document.getElementById(order[i] + "_one_spanish").style.color = "black";
            document.getElementById(order[i] + "_ingles").style.color = "black";
        } else if(i == 21) {
            document.getElementById(order[i] + "_two_spanish").value = "";
            document.getElementById(order[i] + "_two_spanish").style.color = "black";
        } else {
            document.getElementById(order[i] + "_spanish").value = "";
            document.getElementById(order[i] + "_ingles").value = "";

            document.getElementById(order[i] + "_spanish").style.color = "black";
            document.getElementById(order[i] + "_ingles").style.color = "black";
        }
    }

    saveData();
}

// Toggle between the verb selector modes
function switchLevel(save=true) {
    if(level == 5) {
        level = 6;
        toggleVerb(SP6_VERBS);
        document.getElementById("level").value = "Spanish 6";
    } else {
        level = 5;
        toggleVerb(SP5_VERBS);
        document.getElementById("level").value = "Spanish 5";
    }

    if(save) {saveData(); }
}

// Internal method to change the verb dropdown selection
function toggleVerb(toSwitch) {
    var dropdown = document.getElementById("verbSelector");
    dropdown.innerHTML = "";
    for(var i = 0; i < toSwitch.length; i++) {
        var opt = document.createElement("option");
        opt.value = toSwitch[i];
        opt.text = toSwitch[i];
        dropdown.appendChild(opt);
    }
}
